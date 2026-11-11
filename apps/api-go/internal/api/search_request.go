package api

import (
	"math"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"unicode/utf16"

	"riftkeeper/api-go/internal/search"
)

const maxQueryLength = 512
const maxSafeInteger = 9007199254740991

var sortKeys = []string{"set", "collector_number", "name", "rarity", "cost", "might", "power"}

func parseSearchRequest(values url.Values) (search.Request, []string) {
	request := search.Request{
		Query:     values.Get("q"),
		Sort:      queryDefault(values, "sort", "set"),
		Direction: queryDefault(values, "direction", "asc"),
		View:      queryDefault(values, "view", search.ViewCards),
	}
	var issues []string
	if len(utf16.Encode([]rune(request.Query))) > maxQueryLength {
		issues = append(issues, "✖ Too big: expected string to have <=512 characters\n  → at q")
	}
	if !slices.Contains(sortKeys, request.Sort) {
		issues = append(issues, "✖ Invalid option: expected one of \"set\"|\"collector_number\"|\"name\"|\"rarity\"|\"cost\"|\"might\"|\"power\"\n  → at sort")
	}
	if request.Direction != "asc" && request.Direction != "desc" {
		issues = append(issues, "✖ Invalid option: expected one of \"asc\"|\"desc\"\n  → at direction")
	}
	page := parsePage(queryDefault(values, "page", "1"))
	issues = append(issues, validatePage(page)...)
	if request.View != search.ViewCards && request.View != search.ViewPrintings {
		issues = append(issues, "✖ Invalid option: expected one of \"cards\"|\"printings\"\n  → at view")
	}
	if len(issues) == 0 {
		request.Page = int64(page)
	}
	return request, issues
}

func queryDefault(values url.Values, key, fallback string) string {
	if !values.Has(key) {
		return fallback
	}
	return values.Get(key)
}

func parsePage(value string) float64 {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0
	}
	lower := strings.ToLower(value)
	if strings.HasPrefix(lower, "0x") || strings.HasPrefix(lower, "0b") || strings.HasPrefix(lower, "0o") {
		integer, err := strconv.ParseUint(value, 0, 64)
		if err != nil {
			return math.NaN()
		}
		return float64(integer)
	}
	number, err := strconv.ParseFloat(value, 64)
	if err != nil && !math.IsInf(number, 0) {
		return math.NaN()
	}
	return number
}

func validatePage(page float64) []string {
	var messages []string
	switch {
	case math.IsNaN(page):
		messages = append(messages, "Invalid input: expected number, received NaN")
	case math.IsInf(page, 0):
		value := "Infinity"
		if page < 0 {
			value = "-Infinity"
		}
		messages = append(messages, "Invalid input: expected number, received "+value)
	case math.Trunc(page) != page:
		messages = append(messages, "Invalid input: expected int, received number")
	case page > maxSafeInteger:
		messages = append(messages, "Too big: expected int to be <=9007199254740991")
	case page < -maxSafeInteger:
		messages = append(messages, "Too small: expected int to be >=-9007199254740991", "Too small: expected number to be >=1")
	case page < 1:
		messages = append(messages, "Too small: expected number to be >=1")
	}
	for index, message := range messages {
		messages[index] = "✖ " + message + "\n  → at page"
	}
	return messages
}
