package search

import "unicode/utf16"

const (
	tokenWord       = "word"
	tokenFilter     = "keywordValue"
	tokenAnd        = "and"
	tokenOr         = "or"
	tokenNot        = "not"
	tokenOpenGroup  = "lparen"
	tokenCloseGroup = "rparen"
	tokenEnd        = "eof"
	nodeAnd         = "and"
	nodeOr          = "or"
	nodeNot         = "not"
	nodeText        = "text"
	nodeFilter      = "filter"
)

type Span struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

type Warning struct {
	Message string `json:"message"`
	Span    Span   `json:"span"`
}

type token struct {
	kind    string
	raw     string
	keyword string
	value   string
	span    Span
}

type node struct {
	kind     string
	children []*node
	filter   filter
	span     Span
	depth    int
	negated  bool
	value    string
}

type filter struct {
	field    string
	text     string
	operator string
	number   int64
	anyOf    []string
	allOf    []string
	noneOf   []string
}

func utf16Length(text string) int {
	return len(utf16.Encode([]rune(text)))
}

func utf16Slice(text string, location Span) string {
	units := utf16.Encode([]rune(text))
	if location.Start < 0 || location.End > len(units) || location.Start > location.End {
		return ""
	}
	return string(utf16.Decode(units[location.Start:location.End]))
}
