package store_test

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/hackmajoris/meter-sync/pkg/store"
)

// Entries are cumulative meter readings, so stats must describe consumption
// (differences between readings), never the readings themselves.
func TestCounterStats(t *testing.T) {
	ctx := context.Background()
	s, err := store.New(filepath.Join(t.TempDir(), "test.db"), "")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })

	h, err := s.CreateHouse(ctx, "Home")
	if err != nil {
		t.Fatal(err)
	}
	c, err := s.CreateCounter(ctx, store.CreateCounterInput{Name: "Energy", Unit: "kWh", Color: "#000", HouseID: h.ID})
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range []store.CreateEntryInput{
		{Date: "2026-08-31", Value: 9670},
		{Date: "2026-09-06", Value: 9679},
		{Date: "2026-09-07", Value: 9680},
		{Date: "2026-09-08", Value: 9703},
		{Date: "2026-09-11", Value: 9713},
	} {
		if _, err := s.CreateEntry(ctx, c.ID, e); err != nil {
			t.Fatal(err)
		}
	}

	tests := []struct {
		name string
		f    store.StatsFilters
		want store.Stats
	}{
		{
			// Gaps count one day per calendar day, so the average is per day, not per reading.
			name: "all readings",
			want: store.Stats{Avg: 43.0 / 11, Total: 43, Max: 23, Min: 1, Count: 11},
		},
		{
			// The 08-31 → 09-06 gap is spread over 09-01..09-06, so September gets
			// its first days even though the reading before them is in August.
			name: "range uses reading before start",
			f:    store.StatsFilters{StartDate: "2026-09-01", EndDate: "2026-09-07"},
			want: store.Stats{Avg: 10.0 / 7, Total: 10, Max: 1.5, Min: 1, Count: 7},
		},
		{
			// Without spreading, the whole 9 kWh would land on 09-06 and inflate the peak.
			name: "range inside a gap gets its share",
			f:    store.StatsFilters{StartDate: "2026-09-03", EndDate: "2026-09-04"},
			want: store.Stats{Avg: 1.5, Total: 3, Max: 1.5, Min: 1.5, Count: 2},
		},
		{
			// 10 over 3 days: last day takes the remainder so the total stays exact.
			name: "uneven split keeps total",
			f:    store.StatsFilters{StartDate: "2026-09-09"},
			want: store.Stats{Avg: 10.0 / 3, Total: 10, Max: 3.34, Min: 3.33, Count: 3},
		},
		{
			name: "single reading has no consumption",
			f:    store.StatsFilters{EndDate: "2026-08-31"},
			want: store.Stats{},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := s.CounterStats(ctx, c.ID, tt.f)
			if err != nil {
				t.Fatal(err)
			}
			if got != tt.want {
				t.Errorf("got %+v, want %+v", got, tt.want)
			}
		})
	}
}
