package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/hackmajoris/counters/pkg/store"
)

type Handler struct {
	store *store.Store
}

// Register mounts all API routes on mux.
func Register(mux *http.ServeMux, s *store.Store) {
	h := &Handler{store: s}

	mux.HandleFunc("GET /api/houses", h.listHouses)
	mux.HandleFunc("GET /api/houses/{id}", h.getHouse)
	mux.HandleFunc("POST /api/houses", h.createHouse)
	mux.HandleFunc("PUT /api/houses/{id}", h.updateHouse)
	mux.HandleFunc("DELETE /api/houses/{id}", h.deleteHouse)

	mux.HandleFunc("GET /api/counters", h.listCounters)
	mux.HandleFunc("GET /api/counters/{id}", h.getCounter)
	mux.HandleFunc("POST /api/counters", h.createCounter)
	mux.HandleFunc("PUT /api/counters/{id}", h.updateCounter)
	mux.HandleFunc("DELETE /api/counters/{id}", h.deleteCounter)

	// bulk must be registered before the {id} wildcard to take precedence
	mux.HandleFunc("POST /api/counters/{counterId}/entries/bulk", h.bulkCreateEntries)
	mux.HandleFunc("GET /api/counters/{counterId}/entries", h.listEntries)
	mux.HandleFunc("GET /api/counters/{counterId}/entries/{id}", h.getEntry)
	mux.HandleFunc("POST /api/counters/{counterId}/entries", h.createEntry)
	mux.HandleFunc("PUT /api/counters/{counterId}/entries/{id}", h.updateEntry)
	mux.HandleFunc("DELETE /api/counters/{counterId}/entries/{id}", h.deleteEntry)

	mux.HandleFunc("GET /api/counters/{counterId}/stats", h.getStats)
}

// ---- helpers ----

func respond(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		json.NewEncoder(w).Encode(v) //nolint:errcheck
	}
}

func errResponse(w http.ResponseWriter, status int, msg string) {
	respond(w, status, map[string]string{"message": msg})
}

func decode(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func (h *Handler) storeErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		errResponse(w, http.StatusNotFound, err.Error())
	case errors.Is(err, store.ErrConflict):
		errResponse(w, http.StatusConflict, err.Error())
	default:
		log.Printf("store error: %v", err)
		errResponse(w, http.StatusInternalServerError, "internal server error")
	}
}
