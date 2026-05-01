package api

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/hackmajoris/meter-sync/pkg/store"
)

func validDate(s string) bool {
	_, err := time.Parse("2006-01-02", s)
	return err == nil
}

func (h *Handler) listEntries(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := store.EntryFilters{
		StartDate: q.Get("startDate"),
		EndDate:   q.Get("endDate"),
	}
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			f.Limit = n
		}
	}
	if v := q.Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			f.Offset = n
		}
	}
	entries, err := h.store.Entries(r.Context(), r.PathValue("counterId"), f)
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, entries)
}

func (h *Handler) getEntry(w http.ResponseWriter, r *http.Request) {
	entry, err := h.store.Entry(r.Context(), r.PathValue("counterId"), r.PathValue("id"))
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, entry)
}

func (h *Handler) createEntry(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Date  string  `json:"date"`
		Value float64 `json:"value"`
		Note  string  `json:"note"`
	}
	if err := decode(r, &body); err != nil {
		errResponse(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if body.Date == "" {
		errResponse(w, http.StatusBadRequest, "date is required")
		return
	}
	if !validDate(body.Date) {
		errResponse(w, http.StatusBadRequest, "date must be in YYYY-MM-DD format")
		return
	}
	entry, err := h.store.CreateEntry(r.Context(), r.PathValue("counterId"), store.CreateEntryInput{
		Date: body.Date, Value: body.Value, Note: body.Note,
	})
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusCreated, entry)
}

func (h *Handler) updateEntry(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Date  string  `json:"date"`
		Value float64 `json:"value"`
		Note  string  `json:"note"`
	}
	if err := decode(r, &body); err != nil {
		errResponse(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if body.Date == "" {
		errResponse(w, http.StatusBadRequest, "date is required")
		return
	}
	if !validDate(body.Date) {
		errResponse(w, http.StatusBadRequest, "date must be in YYYY-MM-DD format")
		return
	}
	entry, err := h.store.UpdateEntry(r.Context(), r.PathValue("counterId"), r.PathValue("id"), store.UpdateEntryInput{
		Date: body.Date, Value: body.Value, Note: body.Note,
	})
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, entry)
}

func (h *Handler) deleteEntry(w http.ResponseWriter, r *http.Request) {
	if err := h.store.DeleteEntry(r.Context(), r.PathValue("counterId"), r.PathValue("id")); err != nil {
		h.storeErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) bulkCreateEntries(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Entries      []store.BulkEntryInput `json:"entries"`
		SkipExisting bool                   `json:"skipExisting"`
	}
	if err := decode(r, &body); err != nil {
		errResponse(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	// Validate all dates before hitting the store.
	for i, e := range body.Entries {
		if !validDate(e.Date) {
			errResponse(w, http.StatusBadRequest, fmt.Sprintf("entry[%d]: date must be in YYYY-MM-DD format", i))
			return
		}
	}
	result, err := h.store.BulkCreateEntries(r.Context(), r.PathValue("counterId"), body.Entries, body.SkipExisting)
	if err != nil {
		h.storeErr(w, err)
		return
	}
	respond(w, http.StatusOK, result)
}
