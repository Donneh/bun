package api

import (
	"net/http"
	"strings"

	"riftkeeper/api-go/internal/search"
)

type SearchHandler struct {
	service *search.Service
}

func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	request, issues := parseSearchRequest(r.URL.Query())
	if len(issues) > 0 {
		writeError(w, http.StatusBadRequest, "invalid_request", strings.Join(issues, "\n"))
		return
	}
	result, err := h.service.Search(request)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Internal server error")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *SearchHandler) Options(w http.ResponseWriter, r *http.Request) {
	writeData(w, h.service.Options())
}
