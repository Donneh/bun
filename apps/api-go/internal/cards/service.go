package cards

type Service struct {
	catalog []Card
	byID    map[string]Card
}

func NewService(catalog []Card) *Service {
	byID := make(map[string]Card, len(catalog))
	for _, card := range catalog {
		byID[card.ID] = card
	}
	return &Service{catalog: catalog, byID: byID}
}

func (s *Service) List() []Card {
	return s.catalog
}

func (s *Service) Find(id string) (Card, bool) {
	card, found := s.byID[id]
	return card, found
}

func (s *Service) Count() int {
	return len(s.catalog)
}
