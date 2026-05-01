// Command seed populates the database with the same initial data as the
// frontend mock store (mockDataStore.ts): one house, three counters, and
// 365 days of synthetic readings per counter using the same seasonal formula.
//
// All inserts use INSERT OR IGNORE, so running seed multiple times is safe.
package main

import (
	"database/sql"
	"flag"
	"fmt"
	"math"
	"math/rand"
	"net/url"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mutecomm/go-sqlcipher/v4" // register sqlite3 driver

	"github.com/hackmajoris/counters/pkg/store"
)

func main() {
	dbPath := flag.String("db", "data/data.db", "sqlite database path")
	dbKey := flag.String("key", "", "sqlite encryption key (or set DB_KEY env var)")
	flag.Parse()

	if k := os.Getenv("DB_KEY"); k != "" {
		*dbKey = k
	}

	if err := seed(*dbPath, *dbKey); err != nil {
		fmt.Fprintf(os.Stderr, "seed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("seed complete")
}

func seed(path, key string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create db dir: %w", err)
	}
	// store.New runs the schema migrations so all tables exist.
	st, err := store.New(path, key)
	if err != nil {
		return fmt.Errorf("init schema: %w", err)
	}
	_ = st.Close()

	dsn := path
	if key != "" {
		dsn = "file:" + url.PathEscape(path) +
			"?_pragma_key=" + url.QueryEscape(key) +
			"&_pragma_cipher_page_size=4096"
	}
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return fmt.Errorf("open db: %w", err)
	}
	defer db.Close() //nolint:errcheck

	if _, err := db.Exec(`PRAGMA foreign_keys=ON`); err != nil {
		return err
	}

	// ---- house ----
	if _, err := db.Exec(`INSERT OR IGNORE INTO houses (id, name) VALUES ('h1', 'Home')`); err != nil {
		return fmt.Errorf("insert house: %w", err)
	}

	// ---- counters ----
	type counterDef struct {
		id, name, unit, color string
		baseVal, variance     float64
	}
	counters := []counterDef{
		{"c1", "Electricity", "kWh", "#3b82f6", 14.5, 4},
		{"c2", "Gas", "m³", "#f97316", 3.2, 1},
		{"c3", "Water", "L", "#06b6d4", 180, 40},
	}
	for _, c := range counters {
		if _, err := db.Exec(
			`INSERT OR IGNORE INTO counters (id, name, unit, color, house_id) VALUES (?, ?, ?, ?, 'h1')`,
			c.id, c.name, c.unit, c.color,
		); err != nil {
			return fmt.Errorf("insert counter %s: %w", c.id, err)
		}
	}

	// ---- entries ----
	// Fixed seed → same values on every run (deterministic).
	rng := rand.New(rand.NewSource(42))
	today := time.Now().Truncate(24 * time.Hour)

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	stmt, err := tx.Prepare(
		`INSERT OR IGNORE INTO entries (id, counter_id, date, value, note) VALUES (?, ?, ?, ?, '')`,
	)
	if err != nil {
		return fmt.Errorf("prepare: %w", err)
	}
	defer stmt.Close() //nolint:errcheck

	for _, c := range counters {
		created := 0
		for i := 364; i >= 0; i-- {
			day := today.AddDate(0, 0, -i)

			// Same formula as genSampleEntries in mockDataStore.ts:
			//   month    = JS getMonth() → 0-indexed
			//   seasonal = 1 + 0.25 * cos((month / 12) * 2π)
			//   value    = baseVal * seasonal + (rand − 0.5) * variance * 2
			month := float64(day.Month() - 1)
			seasonal := 1 + 0.25*math.Cos((month/12)*2*math.Pi)
			val := c.baseVal*seasonal + (rng.Float64()-0.5)*c.variance*2
			val = math.Round(val*100) / 100
			if val < 0 {
				val = 0
			}

			date := day.Format("2006-01-02")
			id := fmt.Sprintf("%s-%s", c.id, date) // stable, repeatable ID
			res, err := stmt.Exec(id, c.id, date, val)
			if err != nil {
				return fmt.Errorf("insert entry %s/%s: %w", c.id, date, err)
			}
			if n, _ := res.RowsAffected(); n > 0 {
				created++
			}
		}
		fmt.Printf("  %-12s %d entries inserted\n", c.name, created)
	}

	return tx.Commit()
}
