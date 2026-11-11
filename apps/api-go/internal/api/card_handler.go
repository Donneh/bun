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
	id, valid := validCardID(w, r)
	if !valid {
		return
	}

	card, found := h.service.Find(id)
	if !found {
		writeCardNotFound(w, id)
		return
	}

	writeData(w, card)
}

func (h *CardHandler) PriceHistory(w http.ResponseWriter, r *http.Request) {
	id, valid := validCardID(w, r)
	if !valid {
		return
	}

	history, found := h.service.PriceHistory(id)
	if !found {
		writeCardNotFound(w, id)
		return
	}

	writeData(w, history)
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

func validCardID(w http.ResponseWriter, r *http.Request) (string, bool) {
	id := r.PathValue("id")
	if !cardID.MatchString(id) {
		writeError(w, http.StatusBadRequest, "invalid_request", "✖ Card id must be a lowercase slug\n  → at id")
		return "", false
	}
	return id, true
}

func writeCardNotFound(w http.ResponseWriter, id string) {
	writeError(w, http.StatusNotFound, "card_not_found", fmt.Sprintf("Card %s does not exist", id))
}
