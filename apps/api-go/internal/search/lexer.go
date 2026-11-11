package search

import (
	"strings"
	"unicode"
)

type lexer struct {
	characters []rune
	offsets    []int
	position   int
	warnings   []Warning
}

func tokenize(query string) ([]token, []Warning) {
	characters := []rune(query)
	offsets := make([]int, len(characters)+1)
	for index, character := range characters {
		width := 1
		if character > 0xffff {
			width = 2
		}
		offsets[index+1] = offsets[index] + width
	}
	scanner := lexer{characters: characters, offsets: offsets, warnings: []Warning{}}
	tokens := []token{}
	for scanner.position < len(characters) {
		if unicode.IsSpace(characters[scanner.position]) {
			scanner.position++
			continue
		}
		tokens = append(tokens, scanner.nextToken())
	}
	end := offsets[len(characters)]
	tokens = append(tokens, token{kind: tokenEnd, span: Span{Start: end, End: end}})
	return tokens, scanner.warnings
}

func (scanner *lexer) nextToken() token {
	start := scanner.position
	character := scanner.characters[start]
	kind := ""
	switch {
	case character == '(':
		kind = tokenOpenGroup
	case character == ')':
		kind = tokenCloseGroup
	case scanner.startsNegation():
		kind = tokenNot
	}
	if kind != "" {
		scanner.position++
		return token{kind: kind, raw: string(character), span: scanner.location(start)}
	}
	return scanner.readWord()
}

func (scanner *lexer) startsNegation() bool {
	position := scanner.position
	characters := scanner.characters
	return characters[position] == '-' && position+1 < len(characters) &&
		!unicode.IsSpace(characters[position+1]) && characters[position+1] != ')'
}

func (scanner *lexer) location(start int) Span {
	return Span{Start: scanner.offsets[start], End: scanner.offsets[scanner.position]}
}

func (scanner *lexer) readWord() token {
	start := scanner.position
	colon := -1
	for scanner.position < len(scanner.characters) {
		character := scanner.characters[scanner.position]
		if unicode.IsSpace(character) || character == '(' || character == ')' {
			break
		}
		switch {
		case character == '\\' && scanner.position+1 < len(scanner.characters):
			scanner.position += 2
		case character == '"':
			close := closingQuote(scanner.characters, scanner.position)
			if close < 0 {
				scanner.position = len(scanner.characters)
				scanner.warnings = append(scanner.warnings, Warning{
					Message: "Unterminated quote; the rest of the query was treated as part of this value.",
					Span:    scanner.location(start),
				})
			} else {
				scanner.position = close + 1
			}
		default:
			if character == ':' && colon < 0 {
				colon = scanner.position
			}
			scanner.position++
		}
	}
	raw := string(scanner.characters[start:scanner.position])
	result := token{kind: tokenWord, raw: raw, span: scanner.location(start)}
	switch strings.ToLower(raw) {
	case tokenAnd, tokenOr, tokenNot:
		result.kind = strings.ToLower(raw)
	default:
		if colon >= 0 {
			result.kind = tokenFilter
			result.keyword = string(scanner.characters[start:colon])
			result.value = string(scanner.characters[colon+1 : scanner.position])
		}
	}
	return result
}

func closingQuote(characters []rune, open int) int {
	for index := open + 1; index < len(characters); index++ {
		if characters[index] == '\\' && index+1 < len(characters) {
			index++
		} else if characters[index] == '"' {
			return index
		}
	}
	return -1
}

func unclosedQuote(characters []rune) int {
	for index := 0; index < len(characters); index++ {
		if characters[index] == '\\' && index+1 < len(characters) {
			index++
			continue
		}
		if characters[index] == '"' {
			close := closingQuote(characters, index)
			if close < 0 {
				return index
			}
			index = close
		}
	}
	return -1
}

func unquote(raw string) string {
	characters := []rune(raw)
	if open := unclosedQuote(characters); open >= 0 {
		characters = append(characters[:open], characters[open+1:]...)
	} else if len(characters) >= 2 && characters[0] == '"' && characters[len(characters)-1] == '"' {
		characters = characters[1 : len(characters)-1]
	}
	unescaped := make([]rune, 0, len(characters))
	for index := 0; index < len(characters); index++ {
		if characters[index] == '\\' && index+1 < len(characters) {
			index++
		}
		unescaped = append(unescaped, characters[index])
	}
	return string(unescaped)
}
