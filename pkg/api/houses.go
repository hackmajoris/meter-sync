package api

import (
	"net/http"
)

func (h *Handler) listHouses(w http.ResponseWriter, r *http.Request) {
	houses, err := h.store.Houses(r.Context())
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, houses)
}

func (h *Handler) getHouse(w http.ResponseWriter, r *http.Request) {
	house, err := h.store.House(r.Context(), r.PathValue("id"))
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, house)
}

func (h *Handler) createHouse(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := decode(r, &body); err != nil {
		errResponse(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if body.Name == "" {
		errResponse(w, http.StatusBadRequest, "name is required")
		return
	}
	house, err := h.store.CreateHouse(r.Context(), body.Name)
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusCreated, house)
}

func (h *Handler) updateHouse(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := decode(r, &body); err != nil {
		errResponse(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if body.Name == "" {
		errResponse(w, http.StatusBadRequest, "name is required")
		return
	}
	house, err := h.store.UpdateHouse(r.Context(), r.PathValue("id"), body.Name)
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, house)
}

func (h *Handler) deleteHouse(w http.ResponseWriter, r *http.Request) {
	if err := h.store.DeleteHouse(r.Context(), r.PathValue("id")); err != nil {
		h.storeErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
