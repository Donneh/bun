package search

import (
	"fmt"
	"riftkeeper/api-go/internal/cards"
)

const pageSize = 40
const maxWarnings = 20

type Result struct {
	Data     []cards.Card  `json:"data"`
	Meta     Pagination    `json:"meta"`
	Warnings []Warning     `json:"warnings"`
	Parsed   Decomposition `json:"parsed"`
}

type Pagination struct {
	Page     int64 `json:"page"`
	PageSize int   `json:"pageSize"`
	Total    int   `json:"total"`
}

type Request struct {
	Query     string
	Sort      string
	Direction string
	Page      int64
	View      string
}

func Run(catalog []cards.Card, request Request) (Result, error) {
	if request.View == "" {
		request.View = ViewCards
	}
	if request.View != ViewCards && request.View != ViewPrintings {
		return Result{}, fmt.Errorf("unknown view: %s", request.View)
	}
	if request.Sort == "" {
		request.Sort = SortSet
	}
	if request.Direction == "" {
		request.Direction = Ascending
	}
	if request.Page == 0 {
		request.Page = 1
	}
	if !validSort(request.Sort) {
		return Result{}, fmt.Errorf("unknown sort: %s", request.Sort)
	}
	if request.Direction != Ascending && request.Direction != Descending {
		return Result{}, fmt.Errorf("unknown direction: %s", request.Direction)
	}
	if request.Page < 1 {
		return Result{}, fmt.Errorf("page must be positive")
	}
	for _, card := range catalog {
		if len(card.Printings) == 0 {
			return Result{}, fmt.Errorf("card %s has no printings", card.ID)
		}
	}
	root, warnings := parseQuery(request.Query)
	matched := matchingCards(catalog, root)
	if request.View == ViewPrintings {
		matched = printingEntries(matched)
	}
	sortResults(matched, request.Sort, request.Direction)
	total := len(matched)
	start := total
	if request.Page-1 <= int64(total/pageSize) {
		start = min(int((request.Page-1)*pageSize), total)
	}
	end := min(start+pageSize, total)
	if len(warnings) > maxWarnings {
		warnings = warnings[:maxWarnings]
	}
	return Result{
		Data:     matched[start:end],
		Meta:     Pagination{Page: request.Page, PageSize: pageSize, Total: total},
		Warnings: warnings,
		Parsed:   decompose(request.Query, root),
	}, nil
}

func printingEntries(catalog []cards.Card) []cards.Card {
	entries := []cards.Card{}
	for _, card := range catalog {
		for _, printing := range card.Printings {
			entry := card
			entry.Printings = []cards.Printing{printing}
			entries = append(entries, entry)
		}
	}
	return entries
}

func matchingCards(catalog []cards.Card, root *node) []cards.Card {
	matched := make([]cards.Card, 0, len(catalog))
	for _, card := range catalog {
		if root == nil {
			matched = append(matched, card)
			continue
		}
		printings := make([]cards.Printing, 0, len(card.Printings))
		for _, printing := range card.Printings {
			if matches(root, card, printing) {
				printings = append(printings, printing)
			}
		}
		if len(printings) > 0 {
			card.Printings = printings
			matched = append(matched, card)
		}
	}
	return matched
}
