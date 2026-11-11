package api

import (
	"fmt"
	"net/http"
	"path"
	"strings"

	"riftkeeper/api-go/internal/cards"
	"riftkeeper/api-go/internal/search"
)

type server struct {
	router *http.ServeMux
}

func NewHandler(cardService *cards.Service, searchService *search.Service) http.Handler {
	cardHandler := &CardHandler{service: cardService}
	searchHandler := &SearchHandler{service: searchService}
	return &server{router: routes(cardHandler, searchHandler)}
}

func (s *server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method == http.MethodOptions {
		servePreflight(w, r)
		return
	}
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		serveNotFound(w, r)
		return
	}

	if path.Clean(r.URL.EscapedPath()) != r.URL.EscapedPath() {
		serveNonCanonicalPath(w, r)
		return
	}
	s.router.ServeHTTP(w, r)
}

func servePreflight(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	if headers := r.Header.Get("Access-Control-Request-Headers"); headers != "" {
		w.Header().Set("Access-Control-Allow-Headers", headers)
		w.Header().Add("Vary", "Access-Control-Request-Headers")
	}
	w.WriteHeader(http.StatusNoContent)
}

func serveNotFound(w http.ResponseWriter, r *http.Request) {
	message := fmt.Sprintf("No route for %s %s", r.Method, r.URL.EscapedPath())
	writeError(w, http.StatusNotFound, "not_found", message)
}

func serveNonCanonicalPath(w http.ResponseWriter, r *http.Request) {
	id, isCard := strings.CutPrefix(r.URL.EscapedPath(), "/cards/")
	if isCard && (id == "." || id == "..") {
		writeError(w, http.StatusBadRequest, "invalid_request", "✖ Card id must be a lowercase slug\n  → at id")
		return
	}
	serveNotFound(w, r)
}
