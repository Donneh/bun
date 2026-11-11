package search

import (
	"fmt"
	"regexp"
	"slices"
	"strconv"
	"strings"
)

var filterAliases = map[string]string{
	"m": "might", "p": "power", "d": "domain", "c": "domain", "color": "domain",
	"t": "tag", "r": "rarity", "s": "set", "a": "artist",
}

var colorAliases = map[string]string{
	"red": "fury", "green": "calm", "blue": "mind",
	"orange": "body", "purple": "chaos", "yellow": "order",
}

var wholeNumber = regexp.MustCompile(`^-?\d+$`)

const maxSafeInteger = 9007199254740991

func parseFilter(keyword, value string) (filter, string) {
	field := keyword
	if alias, found := filterAliases[field]; found {
		field = alias
	}
	value = strings.TrimSpace(value)
	var condition filter
	var message string
	switch field {
	case "cost", "might", "power":
		condition, message = parseNumericFilter(field, value)
	case "tag", "set", "artist", "ability":
		condition, message = parseTextFilter(field, value)
	case "type", "supertype", "rarity", "variant":
		condition, message = parseSelectFilter(field, value)
	case "domain":
		condition, message = parseDomainFilter(value)
	default:
		return filter{}, unknownKeywordMessage(keyword)
	}
	if message != "" {
		return condition, fmt.Sprintf("Invalid value for \"%s\": %s", keyword, message)
	}
	return condition, ""
}

func unknownKeywordMessage(keyword string) string {
	if keyword == "" {
		return `Missing keyword before ":".`
	}
	if slices.Contains([]string{"promo", "owned", "flavor", "legal", "keyword", "k"}, keyword) {
		return fmt.Sprintf("\"%s\" is not supported yet and was ignored.", keyword)
	}
	return fmt.Sprintf("Unknown keyword \"%s\" was ignored.", keyword)
}

func parseNumericFilter(field, value string) (filter, string) {
	condition := filter{field: field, operator: "="}
	digits := value
	for _, operator := range []string{">=", "<=", "!=", ">", "<", "="} {
		if strings.HasPrefix(value, operator) {
			condition.operator = operator
			digits = value[len(operator):]
			break
		}
	}
	digits = strings.TrimSpace(digits)
	number, err := strconv.ParseInt(digits, 10, 64)
	if err != nil || !wholeNumber.MatchString(digits) || number > maxSafeInteger || number < -maxSafeInteger {
		return condition, fmt.Sprintf("\"%s\" is not a whole number.", value)
	}
	condition.number = number
	return condition, ""
}

func parseTextFilter(field, value string) (filter, string) {
	condition := filter{field: field, text: value}
	if value == "" {
		return condition, strings.ToUpper(field[:1]) + field[1:] + " value cannot be empty."
	}
	return condition, ""
}

func parseSelectFilter(field, value string) (filter, string) {
	condition, message := parseTextFilter(field, value)
	if message != "" {
		return condition, message
	}
	selection := strings.ToLower(value)
	if field == "variant" {
		switch selection {
		case "alt art", "altart":
			selection = "alt-art"
		case "signature":
			selection = "signed"
		}
	}
	if !slices.Contains(filterChoices[field], selection) {
		return condition, invalidChoiceMessage(field, value)
	}
	condition.text = selection
	return condition, ""
}

func invalidChoiceMessage(field, value string) string {
	return fmt.Sprintf("\"%s\" is not a %s. Use one of: %s.", value, field, strings.Join(filterChoices[field], ", "))
}

func parseDomainFilter(value string) (filter, string) {
	condition := filter{field: "domain", anyOf: []string{}, allOf: []string{}, noneOf: []string{}}
	for _, segment := range strings.Split(value, ",") {
		segment = strings.TrimSpace(segment)
		if segment == "" {
			continue
		}
		target := &condition.anyOf
		names := []string{segment}
		if strings.HasPrefix(segment, "-") {
			target = &condition.noneOf
			names = []string{segment[1:]}
		} else if strings.Contains(segment, "+") {
			target = &condition.allOf
			names = strings.Split(segment, "+")
		}
		for _, name := range names {
			name = strings.TrimSpace(name)
			domain := strings.ToLower(name)
			if alias, found := colorAliases[domain]; found {
				domain = alias
			}
			if !slices.Contains(filterChoices["domain"], domain) {
				return condition, invalidChoiceMessage("domain", name)
			}
			*target = append(*target, domain)
		}
	}
	if len(condition.anyOf)+len(condition.allOf)+len(condition.noneOf) == 0 {
		return condition, fmt.Sprintf("\"%s\" is not a valid domain.", value)
	}
	return condition, ""
}
