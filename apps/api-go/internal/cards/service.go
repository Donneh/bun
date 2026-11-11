package cards

type Service struct {
	catalog      []Card
	byID         map[string]Card
	priceHistory PriceHistory
}

func NewService(catalog []Card, priceHistory PriceHistory) *Service {
	byID := make(map[string]Card, len(catalog))
	for _, card := range catalog {
		byID[card.ID] = card
	}
	return &Service{catalog: catalog, byID: byID, priceHistory: priceHistory}
}

func (s *Service) List() []Card {
	return s.catalog
}

func (s *Service) Find(id string) (Card, bool) {
	card, found := s.byID[id]
	return card, found
}

func (s *Service) PriceHistory(id string) (PriceHistory, bool) {
	card, found := s.byID[id]
	if !found {
		return PriceHistory{}, false
	}
	return s.priceHistory.ForPrintings(card.Printings), true
}

func (s *Service) Count() int {
	return len(s.catalog)
}
