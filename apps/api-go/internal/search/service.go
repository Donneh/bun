package search

import "riftkeeper/api-go/internal/cards"

type Service struct {
	catalog []cards.Card
	options Options
}

func NewService(catalog []cards.Card) *Service {
	return &Service{catalog: catalog, options: BuildOptions(catalog)}
}

func (s *Service) Search(request Request) (Result, error) {
	return Run(s.catalog, request)
}

func (s *Service) Options() Options {
	return s.options
}
