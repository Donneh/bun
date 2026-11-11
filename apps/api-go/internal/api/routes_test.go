package api

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"riftkeeper/api-go/internal/cards"
	"riftkeeper/api-go/internal/search"
)

func TestRoutes(t *testing.T) {
	catalog := []cards.Card{{ID: "test-card", Name: "Test", Printings: []cards.Printing{{ID: "test-printing"}}}}
	history := cards.PriceHistory{Currency: "USD", Source: "TCGplayer via TCGCSV", Dates: []string{}, Printings: map[string]cards.PrintingHistory{}}
	handler := NewHandler(cards.NewService(catalog, history), search.NewService(catalog))
	for _, test := range []struct {
		method string
		path   string
		status int
		code   string
	}{
		{"GET", "/health", 200, ""},
		{"GET", "/cards", 200, ""},
		{"GET", "/cards/test-card", 200, ""},
		{"GET", "/cards/%74est-card", 200, ""},
		{"GET", "/cards/a%2Fb", 400, "invalid_request"},
		{"GET", "/cards/missing", 404, "card_not_found"},
		{"GET", "/cards/test-card/price-history", 200, ""},
		{"GET", "/cards/missing/price-history", 404, "card_not_found"},
		{"GET", "/cards/Not_A_Slug/price-history", 400, "invalid_request"},
		{"GET", "/search", 200, ""},
		{"GET", "/search/options", 200, ""},
		{"HEAD", "/cards/test-card", 200, ""},
		{"POST", "/cards", 404, "not_found"},
		{"GET", "/cards/", 404, "not_found"},
		{"GET", "/cards/.", 400, "invalid_request"},
		{"GET", "/search/../health", 404, "not_found"},
		{"GET", "//health", 404, "not_found"},
		{"GET", "/unknown", 404, "not_found"},
		{"OPTIONS", "/unknown", 204, ""},
	} {
		t.Run(test.method+" "+test.path, func(t *testing.T) {
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, httptest.NewRequest(test.method, test.path, nil))
			if response.Code != test.status {
				t.Fatalf("status %d, want %d: %s", response.Code, test.status, response.Body.String())
			}
			if response.Header().Get("Access-Control-Allow-Origin") != "*" {
				t.Fatal("missing CORS header")
			}
			if test.code != "" {
				var body struct {
					Error apiError `json:"error"`
				}
				if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
					t.Fatal(err)
				}
				if body.Error.Code != test.code {
					t.Fatalf("error code %q, want %q", body.Error.Code, test.code)
				}
			}
		})
	}
}
