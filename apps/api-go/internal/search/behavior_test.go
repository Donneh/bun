package search

import (
	"math"
	"reflect"
	"testing"

	"riftkeeper/api-go/internal/cards"
)

func testCatalog() []cards.Card {
	low, high := 1, 5
	return []cards.Card{
		{ID: "alpha", Name: "Alpha", Domains: []string{"fury"}, EnergyCost: &low, Printings: []cards.Printing{
			{ID: "alpha-common", Set: cards.CardSet{Code: "OGN"}, Rarity: "common", PublicCode: "001"},
			{ID: "alpha-epic", Set: cards.CardSet{Code: "SFD"}, Rarity: "epic", PublicCode: "002"},
		}},
		{ID: "beta", Name: "Beta", Domains: []string{"calm"}, EnergyCost: &high, Printings: []cards.Printing{
			{ID: "beta", Set: cards.CardSet{Code: "OGN"}, Rarity: "common", PublicCode: "003"},
		}},
		{ID: "gamma", Name: "Gamma", Domains: []string{"calm"}, Printings: []cards.Printing{
			{ID: "gamma", Set: cards.CardSet{Code: "OGN"}, Rarity: "epic", PublicCode: "004"},
		}},
	}
}

func TestQueryBehavior(t *testing.T) {
	for _, test := range []struct {
		name, query string
		ids         []string
		warnings    int
	}{
		{"and binds tighter", "c:fury or c:calm cost:>=5", []string{"alpha", "beta"}, 0},
		{"group overrides precedence", "(c:fury or c:calm) cost:>=5", []string{"beta"}, 0},
		{"negation", "not c:fury", []string{"beta", "gamma"}, 0},
		{"unknown filter recovery", "unknown:1 c:fury", []string{"alpha"}, 1},
		{"unclosed group", "(c:fury", []string{"alpha"}, 1},
		{"unclosed quote", `"Alpha`, []string{"alpha"}, 1},
		{"printing conjunction", "s:ogn r:epic", []string{"gamma"}, 0},
	} {
		t.Run(test.name, func(t *testing.T) {
			result, err := Run(testCatalog(), Request{Query: test.query, Sort: SortName})
			if err != nil {
				t.Fatal(err)
			}
			ids := []string{}
			for _, card := range result.Data {
				ids = append(ids, card.ID)
			}
			if !reflect.DeepEqual(ids, test.ids) {
				t.Fatalf("IDs = %v, want %v", ids, test.ids)
			}
			if len(result.Warnings) != test.warnings {
				t.Fatalf("warnings = %v", result.Warnings)
			}
		})
	}
}

func TestPrintingReduction(t *testing.T) {
	result, err := Run(testCatalog(), Request{Query: "r:epic", Sort: SortName})
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Data) != 2 || len(result.Data[0].Printings) != 1 || result.Data[0].Printings[0].ID != "alpha-epic" {
		t.Fatalf("unexpected printings: %+v", result.Data)
	}
}

func TestPrintingView(t *testing.T) {
	result, err := Run(testCatalog(), Request{View: ViewPrintings, Sort: SortRarity})
	if err != nil {
		t.Fatal(err)
	}
	if result.Meta.Total != 4 {
		t.Fatalf("total = %d", result.Meta.Total)
	}
	for _, card := range result.Data {
		if len(card.Printings) != 1 {
			t.Fatal("expected one printing per entry")
		}
	}
	if result.Data[0].Printings[0].Rarity != "common" || result.Data[3].Printings[0].Rarity != "epic" {
		t.Fatal("wrong rarity order")
	}
	filtered, err := Run(testCatalog(), Request{View: ViewPrintings, Query: "r:epic"})
	if err != nil || filtered.Meta.Total != 2 {
		t.Fatalf("filtered = %+v, %v", filtered, err)
	}
	if _, err := Run(testCatalog(), Request{View: "unknown"}); err == nil {
		t.Fatal("accepted unknown view")
	}
}

func TestMissingStatsSortLast(t *testing.T) {
	for _, test := range []struct {
		direction string
		ids       []string
	}{
		{Ascending, []string{"alpha", "beta", "gamma"}},
		{Descending, []string{"beta", "alpha", "gamma"}},
	} {
		result, err := Run(testCatalog(), Request{Sort: SortCost, Direction: test.direction})
		if err != nil {
			t.Fatal(err)
		}
		for index, card := range result.Data {
			if card.ID != test.ids[index] {
				t.Fatalf("%s: unexpected order %+v", test.direction, result.Data)
			}
		}
	}
}

func TestDirectRequestContract(t *testing.T) {
	result, err := Run(testCatalog(), Request{})
	if err != nil || result.Meta.Page != 1 || result.Meta.Total != 3 {
		t.Fatalf("defaults: %+v, %v", result, err)
	}
	result, err = Run(testCatalog(), Request{Page: math.MaxInt64})
	if err != nil || len(result.Data) != 0 {
		t.Fatalf("large page: %+v, %v", result, err)
	}
	for _, request := range []Request{{Page: -1}, {Sort: "unknown"}, {Direction: "backwards"}} {
		if _, err := Run(testCatalog(), request); err == nil {
			t.Fatalf("accepted invalid request: %+v", request)
		}
	}
	if _, err := Run([]cards.Card{{ID: "no-printings"}}, Request{}); err == nil {
		t.Fatal("accepted card without printings")
	}
}

func TestUnicodeSpans(t *testing.T) {
	query := "😀 c:fury unknown:1"
	root, warnings := parseQuery(query)
	parsed := decompose(query, root)
	if len(parsed.Filters) != 1 || parsed.Filters[0].Span != (Span{Start: 3, End: 9}) || parsed.Filters[0].Expression != "c:fury" {
		t.Fatalf("unexpected filter spans: %+v", parsed.Filters)
	}
	if len(warnings) != 1 || warnings[0].Span != (Span{Start: 10, End: 19}) {
		t.Fatalf("unexpected warnings: %+v", warnings)
	}
}
