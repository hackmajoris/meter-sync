package api

import (
	"net/http"

	"github.com/hackmajoris/meter-sync/pkg/store"
)

func (h *Handler) getStats(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	stats, err := h.store.CounterStats(r.Context(), r.PathValue("counterId"), store.StatsFilters{
		StartDate: q.Get("startDate"),
		EndDate:   q.Get("endDate"),
	})
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, stats)
}
