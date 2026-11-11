package cards

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

type priceSnapshot struct {
	Currency  string                  `json:"currency"`
	Source    string                  `json:"source"`
	UpdatedAt string                  `json:"updatedAt"`
	Printings map[string]FinishPrices `json:"printings"`
}

func readJSON(path string, destination any) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()
	decoder := json.NewDecoder(file)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return fmt.Errorf("decode %s: %w", path, err)
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return fmt.Errorf("decode %s: expected exactly one JSON value", path)
	}
	return nil
}

func Load(dataDir string) ([]Card, error) {
	var cards []Card
	if err := readJSON(filepath.Join(dataDir, "cards.json"), &cards); err != nil {
		return nil, err
	}
	var prices priceSnapshot
	if err := readJSON(filepath.Join(dataDir, "prices.json"), &prices); err != nil {
		return nil, err
	}
	if err := validateCards(cards); err != nil {
		return nil, err
	}
	if err := prices.validate(); err != nil {
		return nil, err
	}
	for cardIndex := range cards {
		card := &cards[cardIndex]
		if len(card.Printings) == 0 {
			return nil, fmt.Errorf("card %s has no printings", card.ID)
		}
		for printingIndex := range card.Printings {
			printing := &card.Printings[printingIndex]
			printing.Prices = prices.forPrinting(printing.ID)
		}
	}
	return cards, nil
}

func (snapshot priceSnapshot) forPrinting(id string) *PrintingPrices {
	quotes, found := snapshot.Printings[id]
	if !found {
		return nil
	}
	return &PrintingPrices{
		FinishPrices: quotes,
		Currency:     snapshot.Currency,
		Source:       snapshot.Source,
		UpdatedAt:    snapshot.UpdatedAt,
	}
}
