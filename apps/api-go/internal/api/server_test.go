package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"riftkeeper/api-go/internal/cards"
	"riftkeeper/api-go/internal/search"
)

func snapshotServer(t *testing.T) (http.Handler, []cards.Card) {
	t.Helper()
	catalog, err := cards.Load("../../../api/data")
	if err != nil {
		t.Fatal(err)
	}
	if len(catalog) == 0 {
		t.Fatal("snapshot contains no cards")
	}
	priceHistory, err := cards.LoadPriceHistory("../../../api/data")
	if err != nil {
		t.Fatal(err)
	}
	return NewHandler(cards.NewService(catalog, priceHistory), search.NewService(catalog)), catalog
}

func TestCardEndpoints(t *testing.T) {
	server, catalog := snapshotServer(t)
	for _, test := range []struct {
		path   string
		status int
	}{
		{"/health", http.StatusOK},
		{"/cards", http.StatusOK},
		{"/search/options", http.StatusOK},
		{"/cards/" + catalog[0].ID, http.StatusOK},
		{"/cards/INVALID", http.StatusBadRequest},
		{"/cards/a%2Fb", http.StatusBadRequest},
		{"/cards/nonexistent-card-id-123456789", http.StatusNotFound},
		{"/unknown", http.StatusNotFound},
	} {
		t.Run(test.path, func(t *testing.T) {
			response := httptest.NewRecorder()
			server.ServeHTTP(response, httptest.NewRequest(http.MethodGet, test.path, nil))
			if response.Code != test.status {
				t.Fatalf("status = %d, want %d", response.Code, test.status)
			}
			if response.Header().Get("Access-Control-Allow-Origin") != "*" {
				t.Fatal("missing CORS header")
			}
			if !json.Valid(response.Body.Bytes()) {
				t.Fatal("response is not valid JSON")
			}
		})
	}
}

func TestSearch(t *testing.T) {
	server, catalog := snapshotServer(t)
	request := func(query string) search.Result {
		t.Helper()
		response := httptest.NewRecorder()
		server.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/search?"+query, nil))
		if response.Code != http.StatusOK {
			t.Fatalf("status %d: %s", response.Code, response.Body.String())
		}
		var result search.Result
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		return result
	}
	if request("").Meta.Total != len(catalog) {
		t.Fatal("empty search does not match all cards")
	}
	result := request("q=" + url.QueryEscape("r:epic"))
	for _, card := range result.Data {
		for _, printing := range card.Printings {
			if printing.Rarity != "epic" {
				t.Fatal("nonmatching printing returned")
			}
		}
	}
	result = request("q=" + url.QueryEscape("cost:>=3 unknown:1"))
	if len(result.Warnings) != 1 || result.Warnings[0].Message != `Unknown keyword "unknown" was ignored.` {
		t.Fatalf("unexpected warnings: %v", result.Warnings)
	}
	if len(result.Parsed.Filters) != 1 {
		t.Fatalf("unexpected filters: %v", result.Parsed)
	}
	first := request("sort=name&page=1").Data
	second := request("sort=name&page=2").Data
	ids := map[string]bool{}
	for _, card := range first {
		ids[card.ID] = true
	}
	for _, card := range second {
		if ids[card.ID] {
			t.Fatal("pages overlap")
		}
	}
}
