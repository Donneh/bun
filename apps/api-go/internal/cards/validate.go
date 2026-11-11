package cards

import (
	"fmt"
	"net/url"
	"regexp"
	"slices"
	"strings"
	"time"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var setCodePattern = regexp.MustCompile(`^[A-Z0-9]+$`)

func validateCards(catalog []Card) error {
	cardIDs := map[string]bool{}
	printingIDs := map[string]bool{}
	for index, card := range catalog {
		if !slugPattern.MatchString(card.ID) {
			return fmt.Errorf("card at index %d: invalid ID %q", index, card.ID)
		}
		if cardIDs[card.ID] {
			return fmt.Errorf("duplicate card ID %q", card.ID)
		}
		cardIDs[card.ID] = true
		if err := card.validate(); err != nil {
			return fmt.Errorf("card %s: %w", card.ID, err)
		}
		for _, printing := range card.Printings {
			if printingIDs[printing.ID] {
				return fmt.Errorf("card %s: duplicate printing ID %q", card.ID, printing.ID)
			}
			printingIDs[printing.ID] = true
			if err := printing.validate(); err != nil {
				return fmt.Errorf("card %s, printing %s: %w", card.ID, printing.ID, err)
			}
		}
	}
	return nil
}

func (card Card) validate() error {
	if strings.TrimSpace(card.Name) == "" {
		return fmt.Errorf("name is required")
	}
	if card.Domains == nil || card.Tags == nil {
		return fmt.Errorf("domains and tags must be arrays")
	}
	if len(card.Printings) == 0 {
		return fmt.Errorf("at least one printing is required")
	}
	if card.Type != nil && !slices.Contains([]string{"legend", "unit", "spell", "gear", "rune", "battlefield"}, *card.Type) {
		return fmt.Errorf("invalid type %q", *card.Type)
	}
	if card.Supertype != nil && !slices.Contains([]string{"champion", "signature", "basic", "token"}, *card.Supertype) {
		return fmt.Errorf("invalid supertype %q", *card.Supertype)
	}
	for _, domain := range card.Domains {
		if !slices.Contains([]string{"fury", "calm", "mind", "body", "chaos", "order", "colorless"}, domain) {
			return fmt.Errorf("invalid domain %q", domain)
		}
	}
	for _, tag := range card.Tags {
		if tag == "" {
			return fmt.Errorf("tags cannot contain empty strings")
		}
	}
	for _, stat := range []*int{card.EnergyCost, card.PowerCost, card.Might, card.MightBonus} {
		if stat != nil && *stat < 0 {
			return fmt.Errorf("stats must be nonnegative")
		}
	}
	return nil
}

func (printing Printing) validate() error {
	if !slugPattern.MatchString(printing.ID) {
		return fmt.Errorf("invalid ID")
	}
	if printing.PublicCode == "" {
		return fmt.Errorf("public code is required")
	}
	if !setCodePattern.MatchString(printing.Set.Code) || printing.Set.Name == "" {
		return fmt.Errorf("valid set code and name are required")
	}
	if printing.CollectorNumber < 0 {
		return fmt.Errorf("collector number must be nonnegative")
	}
	if !slices.Contains([]string{"standard", "alt-art", "signed", "special", "token", "rune"}, printing.Variant) {
		return fmt.Errorf("invalid variant %q", printing.Variant)
	}
	if !slices.Contains([]string{"common", "uncommon", "rare", "epic", "showcase"}, printing.Rarity) {
		return fmt.Errorf("invalid rarity %q", printing.Rarity)
	}
	if printing.Orientation != "portrait" && printing.Orientation != "landscape" {
		return fmt.Errorf("invalid orientation %q", printing.Orientation)
	}
	image, err := url.Parse(printing.ImageURL)
	if err != nil || image.Scheme == "" || image.Host == "" {
		return fmt.Errorf("valid image URL is required")
	}
	return nil
}

func (snapshot priceSnapshot) validate() error {
	if snapshot.Currency != "USD" || snapshot.Source != "TCGplayer via TCGCSV" {
		return fmt.Errorf("price snapshot: invalid currency or source")
	}
	if _, err := time.Parse(time.RFC3339Nano, snapshot.UpdatedAt); err != nil {
		return fmt.Errorf("price snapshot: invalid updatedAt: %w", err)
	}
	if snapshot.Printings == nil {
		return fmt.Errorf("price snapshot: printings must be an object")
	}
	for id, prices := range snapshot.Printings {
		if !slugPattern.MatchString(id) {
			return fmt.Errorf("price snapshot: invalid printing ID %q", id)
		}
		if prices.Normal == nil && prices.Foil == nil {
			return fmt.Errorf("printing %s: at least one price finish is required", id)
		}
		for _, quote := range []*PriceQuote{prices.Normal, prices.Foil} {
			if quote == nil {
				continue
			}
			for _, amount := range []*float64{quote.Market, quote.Low, quote.Mid, quote.High} {
				if amount != nil && *amount < smallestPrice {
					return fmt.Errorf("printing %s: price must be at least %.2f", id, smallestPrice)
				}
			}
		}
	}
	return nil
}
