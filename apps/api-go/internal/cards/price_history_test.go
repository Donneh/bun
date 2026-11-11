package cards

import (
	"encoding/json"
	"strings"
	"testing"
)

func amount(value float64) *float64 {
	return &value
}

func validTestHistory() PriceHistory {
	return PriceHistory{
		Currency: "USD",
		Source:   "TCGplayer via TCGCSV",
		Dates:    []string{"2026-10-30", "2026-10-31"},
		Printings: map[string]PrintingHistory{
			"test-printing": {Normal: MarketSeries{amount(0.11), amount(0.1)}, Foil: MarketSeries{nil, amount(0.19)}},
			"other-card":    {Normal: MarketSeries{amount(1), amount(2)}},
		},
	}
}

func TestPriceHistoryKeepsOnlyTheCardsPrintings(t *testing.T) {
	card := validTestCard()
	card.Printings = append(card.Printings, Printing{ID: "unpriced"})

	history := validTestHistory().ForPrintings(card.Printings)

	if len(history.Printings) != 1 {
		t.Fatalf("printings = %v, want only test-printing", history.Printings)
	}
	body, err := json.Marshal(history)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"currency":"USD","source":"TCGplayer via TCGCSV","dates":["2026-10-30","2026-10-31"],` +
		`"printings":{"test-printing":{"normal":[0.11,0.1],"foil":[null,0.19]}}}`
	if string(body) != want {
		t.Fatalf("JSON = %s\nwant %s", body, want)
	}
}

func TestPriceHistoryWithoutPricesIsAnEmptyObject(t *testing.T) {
	body, err := json.Marshal(validTestHistory().ForPrintings(nil))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(body), `"printings":{}`) {
		t.Fatalf("JSON = %s, want empty printings object", body)
	}
}

func TestRejectInvalidPriceHistory(t *testing.T) {
	for _, test := range []struct {
		name    string
		change  func(*PriceHistory)
		message string
	}{
		{"descending dates", func(h *PriceHistory) { h.Dates = []string{"2026-10-31", "2026-10-30"} }, "ascending"},
		{"repeated date", func(h *PriceHistory) { h.Dates = []string{"2026-10-31", "2026-10-31"} }, "ascending"},
		{"invalid date", func(h *PriceHistory) { h.Dates[0] = "2026-13-01" }, "invalid date"},
		{"short series", func(h *PriceHistory) {
			h.Printings["test-printing"] = PrintingHistory{Normal: MarketSeries{amount(1)}}
		}, "one value per date"},
		{"price below a cent", func(h *PriceHistory) {
			h.Printings["test-printing"] = PrintingHistory{Normal: MarketSeries{amount(0), amount(1)}}
		}, "at least"},
		{"wrong currency", func(h *PriceHistory) { h.Currency = "EUR" }, "currency"},
	} {
		t.Run(test.name, func(t *testing.T) {
			history := validTestHistory()
			test.change(&history)
			err := history.validate()
			if err == nil || !strings.Contains(err.Error(), test.message) {
				t.Fatalf("error = %v, want %q", err, test.message)
			}
		})
	}
}
