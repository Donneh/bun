package api

import "net/http"

func routes(cards *CardHandler, search *SearchHandler) *http.ServeMux {
	router := http.NewServeMux()

	router.HandleFunc("GET /health", cards.Health)
	router.HandleFunc("GET /cards", cards.List)
	router.HandleFunc("GET /cards/{id}", cards.Show)
	router.HandleFunc("GET /cards/{id}/price-history", cards.PriceHistory)
	router.HandleFunc("GET /search", search.Search)
	router.HandleFunc("GET /search/options", search.Options)

	router.HandleFunc("/", serveNotFound)
	return router
}
