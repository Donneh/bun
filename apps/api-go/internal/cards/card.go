package cards

type Card struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Subtitle   *string    `json:"subtitle"`
	Type       *string    `json:"type"`
	Supertype  *string    `json:"supertype"`
	Domains    []string   `json:"domains"`
	EnergyCost *int       `json:"energyCost"`
	PowerCost  *int       `json:"powerCost"`
	Might      *int       `json:"might"`
	MightBonus *int       `json:"mightBonus"`
	Ability    *string    `json:"ability"`
	Effect     *string    `json:"effect"`
	Tags       []string   `json:"tags"`
	Printings  []Printing `json:"printings"`
}

type Printing struct {
	ID              string          `json:"id"`
	PublicCode      string          `json:"publicCode"`
	Set             CardSet         `json:"set"`
	CollectorNumber int             `json:"collectorNumber"`
	Variant         string          `json:"variant"`
	Rarity          string          `json:"rarity"`
	Artist          *string         `json:"artist"`
	ImageURL        string          `json:"imageUrl"`
	Orientation     string          `json:"orientation"`
	Prices          *PrintingPrices `json:"prices"`
}

type CardSet struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type PriceQuote struct {
	Market *float64 `json:"market"`
	Low    *float64 `json:"low"`
	Mid    *float64 `json:"mid"`
	High   *float64 `json:"high"`
}

type FinishPrices struct {
	Normal *PriceQuote `json:"normal,omitempty"`
	Foil   *PriceQuote `json:"foil,omitempty"`
}

type PrintingPrices struct {
	FinishPrices
	Currency  string `json:"currency"`
	Source    string `json:"source"`
	UpdatedAt string `json:"updatedAt"`
}

func (card Card) DisplayName() string {
	if card.Subtitle == nil {
		return card.Name
	}
	return card.Name + ", " + *card.Subtitle
}

func (card Card) Stat(field string) *int {
	switch field {
	case "cost":
		return card.EnergyCost
	case "might":
		return card.Might
	case "power":
		return card.PowerCost
	default:
		return nil
	}
}
