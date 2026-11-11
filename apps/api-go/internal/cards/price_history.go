package cards

import (
	"fmt"
	"path/filepath"
	"time"
)

const smallestPrice = 0.01

type MarketSeries []*float64

type PrintingHistory struct {
	Normal MarketSeries `json:"normal,omitempty"`
	Foil   MarketSeries `json:"foil,omitempty"`
}

type PriceHistory struct {
	Currency  string                     `json:"currency"`
	Source    string                     `json:"source"`
	Dates     []string                   `json:"dates"`
	Printings map[string]PrintingHistory `json:"printings"`
}

func LoadPriceHistory(dataDir string) (PriceHistory, error) {
	var history PriceHistory
	if err := readJSON(filepath.Join(dataDir, "price-history.json"), &history); err != nil {
		return PriceHistory{}, err
	}
	if err := history.validate(); err != nil {
		return PriceHistory{}, err
	}
	return history, nil
}

func (history PriceHistory) ForPrintings(printings []Printing) PriceHistory {
	selected := make(map[string]PrintingHistory, len(printings))
	for _, printing := range printings {
		if series, found := history.Printings[printing.ID]; found {
			selected[printing.ID] = series
		}
	}
	history.Printings = selected
	return history
}

func (history PriceHistory) validate() error {
	if history.Currency != "USD" || history.Source != "TCGplayer via TCGCSV" {
		return fmt.Errorf("price history: invalid currency or source")
	}
	if history.Dates == nil || history.Printings == nil {
		return fmt.Errorf("price history: dates and printings are required")
	}
	for index, date := range history.Dates {
		if _, err := time.Parse(time.DateOnly, date); err != nil {
			return fmt.Errorf("price history: invalid date %q", date)
		}
		if index > 0 && date <= history.Dates[index-1] {
			return fmt.Errorf("price history: dates must be ascending and unique")
		}
	}
	for id, printing := range history.Printings {
		if !slugPattern.MatchString(id) {
			return fmt.Errorf("price history: invalid printing ID %q", id)
		}
		for _, series := range []MarketSeries{printing.Normal, printing.Foil} {
			if err := series.validate(len(history.Dates)); err != nil {
				return fmt.Errorf("price history, printing %s: %w", id, err)
			}
		}
	}
	return nil
}

func (series MarketSeries) validate(days int) error {
	if series == nil {
		return nil
	}
	if len(series) != days {
		return fmt.Errorf("every series needs one value per date")
	}
	for _, amount := range series {
		if amount != nil && *amount < smallestPrice {
			return fmt.Errorf("prices must be at least %.2f", smallestPrice)
		}
	}
	return nil
}
