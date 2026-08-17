package api

import (
	"net/http"
)

func (h *Handler) getSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.store.Settings(r.Context())
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, settings)
}

// updateSettings merges the posted keys into the stored set; keys left out keep
// their current value.
func (h *Handler) updateSettings(w http.ResponseWriter, r *http.Request) {
	var body map[string]string
	if err := decode(r, &body); err != nil {
		errResponse(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if err := h.store.SaveSettings(r.Context(), body); err != nil {
		h.storeErr(w, err)
		return
	}
	settings, err := h.store.Settings(r.Context())
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, settings)
}
