package search_test

import (
	"bytes"
	"encoding/json"
	"testing"

	"riftkeeper/api-go/internal/cards"
	"riftkeeper/api-go/internal/search"
)

func TestSearchDoesNotMutateSnapshot(t *testing.T) {
	catalog, err := cards.Load("../../../api/data")
	if err != nil {
		t.Fatal(err)
	}
	before, err := json.Marshal(catalog)
	if err != nil {
		t.Fatal(err)
	}
	service := search.NewService(catalog)
	if _, err := service.Search(search.Request{Query: "r:epic", Sort: search.SortName, Direction: search.Descending, Page: 1}); err != nil {
		t.Fatal(err)
	}
	after, err := json.Marshal(catalog)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(before, after) {
		t.Fatal("search changed the shared snapshot")
	}
}
