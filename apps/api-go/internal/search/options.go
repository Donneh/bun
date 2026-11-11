package search

import (
	"riftkeeper/api-go/internal/cards"
	"sort"
)

var filterChoices = map[string][]string{
	"domain":    {"fury", "calm", "mind", "body", "chaos", "order", "colorless"},
	"type":      {"legend", "unit", "spell", "gear", "rune", "battlefield"},
	"supertype": {"champion", "signature", "basic", "token"},
	"rarity":    {"common", "uncommon", "rare", "epic", "showcase"},
	"variant":   {"standard", "alt-art", "signed", "special", "token", "rune"},
}

type Options struct {
	Domains    []string        `json:"domains"`
	Types      []string        `json:"types"`
	Supertypes []string        `json:"supertypes"`
	Rarities   []string        `json:"rarities"`
	Variants   []string        `json:"variants"`
	Sets       []cards.CardSet `json:"sets"`
}

func BuildOptions(catalog []cards.Card) Options {
	sets := []cards.CardSet{}
	positions := map[string]int{}
	for _, card := range catalog {
		for _, printing := range card.Printings {
			set := printing.Set
			if index, found := positions[set.Code]; found {
				sets[index] = set
			} else {
				positions[set.Code] = len(sets)
				sets = append(sets, set)
			}
		}
	}
	sort.SliceStable(sets, func(i, j int) bool {
		return setRank(sets[i].Code) < setRank(sets[j].Code)
	})
	return Options{
		Domains:    filterChoices["domain"],
		Types:      filterChoices["type"],
		Supertypes: filterChoices["supertype"],
		Rarities:   filterChoices["rarity"],
		Variants:   filterChoices["variant"],
		Sets:       sets,
	}
}

func setRank(code string) int {
	for index, known := range []string{"OGS", "OGN", "SFD", "UNL", "VEN", "RAD"} {
		if code == known {
			return index
		}
	}
	return 6
}
