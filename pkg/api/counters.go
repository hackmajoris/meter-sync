package api

import (
	"net/http"

	"github.com/hackmajoris/meter-sync/pkg/store"
)

func (h *Handler) listCounters(w http.ResponseWriter, r *http.Request) {
	counters, err := h.store.Counters(r.Context(), r.URL.Query().Get("houseId"))
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, counters)
}

func (h *Handler) getCounter(w http.ResponseWriter, r *http.Request) {
	counter, err := h.store.Counter(r.Context(), r.PathValue("id"))
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, counter)
}

func (h *Handler) createCounter(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name    string `json:"name"`
		Unit    string `json:"unit"`
		Color   string `json:"color"`
		HouseID string `json:"houseId"`
	}
	if err := decode(r, &body); err != nil {
		errResponse(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if body.Name == "" || body.Unit == "" || body.Color == "" || body.HouseID == "" {
		errResponse(w, http.StatusBadRequest, "name, unit, color, and houseId are required")
		return
	}
	counter, err := h.store.CreateCounter(r.Context(), store.CreateCounterInput{
		Name: body.Name, Unit: body.Unit, Color: body.Color, HouseID: body.HouseID,
	})
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusCreated, counter)
}

func (h *Handler) updateCounter(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name    string `json:"name"`
		Unit    string `json:"unit"`
		Color   string `json:"color"`
		HouseID string `json:"houseId"`
	}
	if err := decode(r, &body); err != nil {
		errResponse(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if body.Name == "" || body.Unit == "" || body.Color == "" || body.HouseID == "" {
		errResponse(w, http.StatusBadRequest, "name, unit, color, and houseId are required")
		return
	}
	counter, err := h.store.UpdateCounter(r.Context(), r.PathValue("id"), store.UpdateCounterInput{
		Name: body.Name, Unit: body.Unit, Color: body.Color, HouseID: body.HouseID,
	})
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, counter)
}

func (h *Handler) deleteCounter(w http.ResponseWriter, r *http.Request) {
	if err := h.store.DeleteCounter(r.Context(), r.PathValue("id")); err != nil {
		h.storeErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
