package search

import (
	"slices"
	"strings"

	"riftkeeper/api-go/internal/cards"
)

func matches(expression *node, card cards.Card, printing cards.Printing) bool {
	if expression == nil {
		return true
	}
	switch expression.kind {
	case nodeAnd:
		for _, child := range expression.children {
			if !matches(child, card, printing) {
				return false
			}
		}
		return true
	case nodeOr:
		for _, child := range expression.children {
			if matches(child, card, printing) {
				return true
			}
		}
		return false
	case nodeNot:
		return !matches(expression.children[0], card, printing)
	case nodeText:
		return containsText(card.DisplayName(), expression.value) || hasTag(card, expression.value)
	case nodeFilter:
		return matchesFilter(expression.filter, card, printing)
	default:
		return false
	}
}

func matchesFilter(condition filter, card cards.Card, printing cards.Printing) bool {
	switch condition.field {
	case "cost", "might", "power":
		return matchesNumber(card.Stat(condition.field), condition.operator, condition.number)
	case "domain":
		return matchesDomains(card.Domains, condition)
	case "type":
		return equalsOptional(card.Type, condition.text)
	case "supertype":
		return equalsOptional(card.Supertype, condition.text)
	case "rarity":
		return printing.Rarity == condition.text
	case "variant":
		return printing.Variant == condition.text
	case "tag":
		return hasTag(card, condition.text)
	case "set":
		return strings.EqualFold(printing.Set.Code, condition.text) || containsText(printing.Set.Name, condition.text)
	case "artist":
		return containsOptional(printing.Artist, condition.text)
	case "ability":
		return containsOptional(card.Ability, condition.text) || containsOptional(card.Effect, condition.text)
	default:
		return false
	}
}

func matchesNumber(actual *int, operator string, expected int64) bool {
	if actual == nil {
		return false
	}
	value := int64(*actual)
	switch operator {
	case "=":
		return value == expected
	case "!=":
		return value != expected
	case "<":
		return value < expected
	case "<=":
		return value <= expected
	case ">":
		return value > expected
	case ">=":
		return value >= expected
	default:
		return false
	}
}

func matchesDomains(domains []string, condition filter) bool {
	anyMatched := len(condition.anyOf) == 0
	for _, domain := range condition.anyOf {
		anyMatched = anyMatched || slices.Contains(domains, domain)
	}
	if !anyMatched {
		return false
	}
	for _, domain := range condition.allOf {
		if !slices.Contains(domains, domain) {
			return false
		}
	}
	for _, domain := range condition.noneOf {
		if slices.Contains(domains, domain) {
			return false
		}
	}
	return true
}

func hasTag(card cards.Card, value string) bool {
	for _, tag := range card.Tags {
		if strings.EqualFold(tag, value) {
			return true
		}
	}
	return false
}

func containsText(text, value string) bool {
	return strings.Contains(strings.ToLower(text), strings.ToLower(value))
}

func containsOptional(text *string, value string) bool {
	return text != nil && containsText(*text, value)
}

func equalsOptional(text *string, value string) bool {
	return text != nil && *text == value
}
