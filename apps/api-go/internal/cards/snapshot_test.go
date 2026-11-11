package cards

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func validTestCard() Card {
	return Card{
		ID: "test-card", Name: "Test card", Domains: []string{}, Tags: []string{},
		Printings: []Printing{{ID: "test-printing", PublicCode: "OGN-001", Set: CardSet{Code: "OGN", Name: "Origins"}, Variant: "standard", Rarity: "common", Orientation: "portrait", ImageURL: "https://example.com/card.png"}},
	}
}

func TestRejectInvalidCards(t *testing.T) {
	for _, test := range []struct {
		name    string
		change  func([]Card) []Card
		message string
	}{
		{"missing ID", func(c []Card) []Card { c[0].ID = ""; return c }, "invalid ID"},
		{"missing name", func(c []Card) []Card { c[0].Name = ""; return c }, "name is required"},
		{"duplicate card", func(c []Card) []Card { return append(c, c[0]) }, "duplicate card"},
		{"duplicate printing", func(c []Card) []Card { c[0].Printings = append(c[0].Printings, c[0].Printings[0]); return c }, "duplicate printing"},
		{"missing printings", func(c []Card) []Card { c[0].Printings = nil; return c }, "printing is required"},
		{"missing domains", func(c []Card) []Card { c[0].Domains = nil; return c }, "must be arrays"},
		{"invalid rarity", func(c []Card) []Card { c[0].Printings[0].Rarity = "mythic"; return c }, "invalid rarity"},
	} {
		t.Run(test.name, func(t *testing.T) {
			err := validateCards(test.change([]Card{validTestCard()}))
			if err == nil || !strings.Contains(err.Error(), test.message) {
				t.Fatalf("error = %v, want %q", err, test.message)
			}
		})
	}
}

func TestLoadPricesAndMissingQuotes(t *testing.T) {
	directory := t.TempDir()
	catalog := []Card{validTestCard()}
	catalog[0].Printings = append(catalog[0].Printings, catalog[0].Printings[0])
	catalog[0].Printings[1].ID = "unpriced"
	write := func(name string, value any) {
		t.Helper()
		body, err := json.Marshal(value)
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(directory, name), body, 0600); err != nil {
			t.Fatal(err)
		}
	}
	write("cards.json", catalog)
	write("prices.json", priceSnapshot{Currency: "USD", Source: "TCGplayer via TCGCSV", UpdatedAt: "2026-01-01T00:00:00Z", Printings: map[string]FinishPrices{"test-printing": {Normal: &PriceQuote{}}}})
	loaded, err := Load(directory)
	if err != nil {
		t.Fatal(err)
	}
	if loaded[0].Printings[0].Prices == nil || loaded[0].Printings[1].Prices != nil {
		t.Fatal("incorrect price join")
	}
}

func TestRejectTrailingJSON(t *testing.T) {
	path := filepath.Join(t.TempDir(), "cards.json")
	if err := os.WriteFile(path, []byte("[] []"), 0600); err != nil {
		t.Fatal(err)
	}
	var catalog []Card
	if err := readJSON(path, &catalog); err == nil {
		t.Fatal("accepted trailing JSON")
	}
}

func TestRejectMissingFieldEvenWhenZeroIsValid(t *testing.T) {
	body, err := json.Marshal(validTestCard().Printings[0])
	if err != nil {
		t.Fatal(err)
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(body, &fields); err != nil {
		t.Fatal(err)
	}
	delete(fields, "collectorNumber")
	body, err = json.Marshal(fields)
	if err != nil {
		t.Fatal(err)
	}
	var printing Printing
	if err := json.Unmarshal(body, &printing); err == nil || !strings.Contains(err.Error(), "collectorNumber") {
		t.Fatalf("expected missing collector number error, got %v", err)
	}
}
