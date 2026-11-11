package search

import (
	"fmt"
	"strings"
)

const maxGroupDepth = 64

type parser struct {
	tokens           []token
	warnings         []Warning
	cursor           int
	groupDepth       int
	operandsConsumed int
	warnedTooDeep    bool
}

func parseQuery(query string) (*node, []Warning) {
	tokens, warnings := tokenize(query)
	parser := &parser{tokens: tokens, warnings: warnings}
	terms := []*node{parser.parseOr()}
	for parser.peek().kind != tokenEnd {
		unexpected := parser.advance()
		parser.warnUnexpected(unexpected)
		terms = append(terms, parser.parseOr())
	}
	return combine(nodeAnd, terms), parser.warnings
}

func (p *parser) parseOr() *node {
	operators := &pendingOperators{parser: p}
	branches := []*node{p.parseOperand(operators, p.parseAnd)}
	for p.peek().kind == tokenOr {
		operators.operator(p.advance())
		branches = append(branches, p.parseOperand(operators, p.parseAnd))
	}
	operators.finish()
	return combine(nodeOr, branches)
}

func (p *parser) parseAnd() *node {
	operators := &pendingOperators{parser: p}
	terms := []*node{}
	words := []string{}
	for !p.endsConjunction() {
		switch p.peek().kind {
		case tokenAnd:
			operators.operator(p.advance())
		case tokenWord:
			operators.operand()
			if word := unquote(p.advance().raw); word != "" {
				words = append(words, word)
			}
		default:
			terms = append(terms, p.parseOperand(operators, p.parseNot))
		}
	}
	operators.finish()
	if len(words) > 0 {
		terms = append(terms, &node{kind: nodeText, value: strings.Join(words, " ")})
	}
	return combine(nodeAnd, terms)
}

func (p *parser) endsConjunction() bool {
	switch p.peek().kind {
	case tokenEnd, tokenCloseGroup, tokenOr:
		return true
	default:
		return false
	}
}

func (p *parser) parseNot() *node {
	negations := 0
	var firstOperator token
	for p.peek().kind == tokenNot {
		if negations == 0 {
			firstOperator = p.peek()
		}
		p.advance()
		negations++
	}
	inner := p.parsePrimary()
	if negations == 0 {
		return inner
	}
	if inner == nil {
		p.warn(fmt.Sprintf("Nothing to negate after \"%s\".", firstOperator.raw), firstOperator.span)
		return nil
	}
	if inner.kind == nodeFilter {
		inner.negated = true
	}
	if negations%2 == 1 {
		return &node{kind: nodeNot, children: []*node{inner}}
	}
	return inner
}

func (p *parser) parsePrimary() *node {
	current := p.peek()
	switch current.kind {
	case tokenOpenGroup:
		return p.parseGroup()
	case tokenWord:
		p.advance()
		return &node{kind: nodeText, value: unquote(current.raw)}
	case tokenFilter:
		p.advance()
		return p.resolveFilter(current)
	case tokenCloseGroup, tokenOr, tokenEnd:
		return nil
	default:
		p.warnUnexpected(p.advance())
		return nil
	}
}

func (p *parser) parseGroup() *node {
	open := p.advance()
	if p.groupDepth >= maxGroupDepth {
		if !p.warnedTooDeep {
			p.warn("Groups nested deeper than 64 levels were ignored.", open.span)
			p.warnedTooDeep = true
		}
		return nil
	}
	contentStart := p.cursor
	p.groupDepth++
	inner := p.parseOr()
	p.groupDepth--
	isEmpty := p.cursor == contentStart
	if p.peek().kind != tokenCloseGroup {
		p.warn(`Missing closing ")" for the group starting here; its contents were still used.`, open.span)
		return inner
	}
	close := p.advance()
	if isEmpty {
		p.warn("Empty group was ignored.", Span{Start: open.span.Start, End: close.span.End})
	}
	return inner
}

func (p *parser) resolveFilter(current token) *node {
	keyword := strings.ToLower(strings.TrimSpace(unquote(current.keyword)))
	condition, message := parseFilter(keyword, unquote(current.value))
	if message != "" {
		p.warn(message, current.span)
		return nil
	}
	return &node{kind: nodeFilter, filter: condition, span: current.span, depth: p.groupDepth}
}

func (p *parser) parseOperand(operators *pendingOperators, parse func() *node) *node {
	before := p.operandsConsumed
	expression := parse()
	if p.operandsConsumed > before {
		operators.operand()
	}
	return expression
}

func (p *parser) peek() token {
	return p.tokens[p.cursor]
}

func (p *parser) advance() token {
	current := p.peek()
	if current.kind != tokenEnd {
		p.cursor++
	}
	if current.kind == tokenWord || current.kind == tokenFilter {
		p.operandsConsumed++
	}
	return current
}

func (p *parser) warn(message string, location Span) {
	p.warnings = append(p.warnings, Warning{Message: message, Span: location})
}

func (p *parser) warnUnexpected(current token) {
	p.warn(fmt.Sprintf("Unexpected \"%s\" was ignored.", current.raw), current.span)
}

func combine(kind string, terms []*node) *node {
	present := []*node{}
	for _, term := range terms {
		if term != nil {
			present = append(present, term)
		}
	}
	switch len(present) {
	case 0:
		return nil
	case 1:
		return present[0]
	default:
		return &node{kind: kind, children: present}
	}
}

type pendingOperators struct {
	parser     *parser
	hasOperand bool
	pending    *token
}

func (operators *pendingOperators) operator(current token) {
	if !operators.hasOperand {
		operators.warnDangling(current)
		return
	}
	operators.finish()
	operators.pending = &current
}

func (operators *pendingOperators) operand() {
	operators.hasOperand = true
	operators.pending = nil
}

func (operators *pendingOperators) finish() {
	if operators.pending != nil {
		operators.warnDangling(*operators.pending)
	}
}

func (operators *pendingOperators) warnDangling(current token) {
	operators.parser.warn(fmt.Sprintf("Dangling \"%s\" was ignored.", current.raw), current.span)
}
