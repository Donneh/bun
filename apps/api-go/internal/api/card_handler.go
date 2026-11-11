package api

import (
	"fmt"
	"net/http"
	"regexp"

	"riftkeeper/api-go/internal/cards"
)

var cardID = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type CardHandler struct {
	service *cards.Service
}

func (h *CardHandler) Show(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !cardID.MatchString(id) {
		writeError(w, http.StatusBadRequest, "invalid_request", "✖ Card id must be a lowercase slug\n  → at id")
		return
	}

	card, found := h.service.Find(id)
	if !found {
		writeError(w, http.StatusNotFound, "card_not_found", fmt.Sprintf("Card %s does not exist", id))
		return
	}

	writeData(w, card)
}

func (h *CardHandler) List(w http.ResponseWriter, r *http.Request) {
	writeData(w, h.service.List())
}

func (h *CardHandler) Health(w http.ResponseWriter, r *http.Request) {
	writeData(w, struct {
		Status  string  `json:"status"`
		Cards   int     `json:"cards"`
		Version *string `json:"version"`
	}{Status: "ok", Cards: h.service.Count()})
}
