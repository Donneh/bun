package search

import (
	"cmp"
	"slices"

	"riftkeeper/api-go/internal/cards"
)

var rarityRanks = map[string]int{"common": 0, "uncommon": 1, "rare": 2, "epic": 3, "showcase": 4}

type rankedCard struct {
	card     cards.Card
	printing cards.Printing
}

func sortResults(catalog []cards.Card, key, direction string) {
	sign := 1
	if direction == Descending {
		sign = -1
	}
	if key == SortSet || key == SortCollectorNumber || key == SortRarity {
		sortByPrinting(catalog, key, sign)
		return
	}
	slices.SortStableFunc(catalog, func(left, right cards.Card) int {
		var order int
		if key == SortName {
			order = sign * compareNames(left, right)
		} else {
			order = compareStats(left.Stat(key), right.Stat(key), sign)
		}
		if order == 0 {
			return compareTieBreakers(left, right)
		}
		return order
	})
}

func sortByPrinting(catalog []cards.Card, key string, sign int) {
	ranked := make([]rankedCard, len(catalog))
	for index, card := range catalog {
		ranked[index] = rankedCard{card: card, printing: representativePrinting(card)}
	}
	slices.SortStableFunc(ranked, func(left, right rankedCard) int {
		order := sign * comparePrintingKey(left.printing, right.printing, key)
		if order == 0 {
			return compareTieBreakers(left.card, right.card)
		}
		return order
	})
	for index, entry := range ranked {
		catalog[index] = entry.card
	}
}

func representativePrinting(card cards.Card) cards.Printing {
	best := card.Printings[0]
	for _, printing := range card.Printings[1:] {
		if comparePrintingKey(printing, best, SortSet) < 0 {
			best = printing
		}
	}
	return best
}

func comparePrintingKey(left, right cards.Printing, key string) int {
	switch key {
	case SortSet:
		if order := cmp.Compare(setRank(left.Set.Code), setRank(right.Set.Code)); order != 0 {
			return order
		}
	case SortRarity:
		return cmp.Compare(rarityRanks[left.Rarity], rarityRanks[right.Rarity])
	}
	if order := cmp.Compare(left.CollectorNumber, right.CollectorNumber); order != 0 {
		return order
	}
	return cmp.Compare(left.PublicCode, right.PublicCode)
}

func compareNames(left, right cards.Card) int {
	if order := cmp.Compare(left.Name, right.Name); order != 0 {
		return order
	}
	if left.Subtitle == nil && right.Subtitle == nil {
		return 0
	}
	if left.Subtitle == nil {
		return -1
	}
	if right.Subtitle == nil {
		return 1
	}
	return cmp.Compare(*left.Subtitle, *right.Subtitle)
}

func compareTieBreakers(left, right cards.Card) int {
	if order := compareNames(left, right); order != 0 {
		return order
	}
	return cmp.Compare(left.ID, right.ID)
}

func compareStats(left, right *int, sign int) int {
	if left == nil && right == nil {
		return 0
	}
	if left == nil {
		return 1
	}
	if right == nil {
		return -1
	}
	return sign * cmp.Compare(*left, *right)
}
