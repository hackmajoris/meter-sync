package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"strings"

	_ "github.com/mutecomm/go-sqlcipher/v4" // register sqlite3 driver with AES-256 encryption support
)

var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("conflict")
)

// storeErr carries a user-facing message while wrapping a sentinel for errors.Is checks.
type storeErr struct {
	msg string
	err error
}

func (e *storeErr) Error() string { return e.msg }
func (e *storeErr) Unwrap() error { return e.err }

func notFound(format string, args ...any) error {
	return &storeErr{msg: fmt.Sprintf(format, args...), err: ErrNotFound}
}
func conflict(format string, args ...any) error {
	return &storeErr{msg: fmt.Sprintf(format, args...), err: ErrConflict}
}

// ---- domain types ----

type House struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Counter struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Unit    string `json:"unit"`
	Color   string `json:"color"`
	HouseID string `json:"houseId"`
}

type Entry struct {
	ID    string  `json:"id"`
	Date  string  `json:"date"`
	Value float64 `json:"value"`
	Note  string  `json:"note"`
}

type Stats struct {
	Avg   float64 `json:"avg"`
	Total float64 `json:"total"`
	Max   float64 `json:"max"`
	Min   float64 `json:"min"`
	Count int     `json:"count"`
}

type EntryFilters struct {
	StartDate string
	EndDate   string
	Offset    int
	Limit     int
}

type StatsFilters struct {
	StartDate string
	EndDate   string
}

type CreateCounterInput struct {
	Name    string
	Unit    string
	Color   string
	HouseID string
}

type UpdateCounterInput struct {
	Name    string
	Unit    string
	Color   string
	HouseID string
}

type CreateEntryInput struct {
	Date  string
	Value float64
	Note  string
}

type UpdateEntryInput struct {
	Date  string
	Value float64
	Note  string
}

type BulkEntryInput struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
	Note  string  `json:"note"`
}

type BulkResult struct {
	Created int      `json:"created"`
	Skipped int      `json:"skipped"`
	Errors  []string `json:"errors"`
}

// ---- store ----

type Store struct {
	db *sql.DB
}

type Option func(*Store)

// migrations holds sequential schema changes; index 0 = migration 1.
// Append new SQL blocks here when the schema changes; never edit existing entries.
var migrations = []string{
	// 1: initial schema
	`CREATE TABLE IF NOT EXISTS houses (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS counters (
    id       TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    unit     TEXT NOT NULL,
    color    TEXT NOT NULL,
    house_id TEXT NOT NULL REFERENCES houses(id)
);
CREATE TABLE IF NOT EXISTS entries (
    id         TEXT PRIMARY KEY,
    counter_id TEXT NOT NULL REFERENCES counters(id),
    date       TEXT NOT NULL,
    value      REAL NOT NULL,
    note       TEXT NOT NULL DEFAULT '',
    UNIQUE(counter_id, date)
);`,
}

func buildDSN(path, key string) string {
	if key == "" {
		return path
	}
	return "file:" + url.PathEscape(path) +
		"?_pragma_key=" + url.QueryEscape(key) +
		"&_pragma_cipher_page_size=4096"
}

func New(path, key string, opts ...Option) (*Store, error) {
	db, err := sql.Open("sqlite3", buildDSN(path, key))
	if err != nil {
		return nil, fmt.Errorf("opening db: %w", err)
	}
	db.SetMaxOpenConns(1)

	s := &Store{db: db}
	for _, o := range opts {
		o(s)
	}
	if err := s.setupConn(); err != nil {
		db.Close()
		return nil, fmt.Errorf("setup connection: %w", err)
	}
	if err := s.migrate(); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return s, nil
}

func (s *Store) Close() error { return s.db.Close() }

// setupConn runs per-connection pragmas (not persisted across connections).
func (s *Store) setupConn() error {
	_, err := s.db.Exec(`
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA busy_timeout=5000;`)
	return err
}

// migrate applies any pending migrations using PRAGMA user_version as the schema version counter.
func (s *Store) migrate() error {
	var version int
	if err := s.db.QueryRow(`PRAGMA user_version`).Scan(&version); err != nil {
		return fmt.Errorf("read user_version: %w", err)
	}

	for i, ddl := range migrations[version:] {
		target := version + i + 1
		tx, err := s.db.Begin()
		if err != nil {
			return fmt.Errorf("begin migration %d: %w", target, err)
		}
		if _, err := tx.Exec(ddl); err != nil {
			tx.Rollback() //nolint:errcheck
			return fmt.Errorf("migration %d: %w", target, err)
		}
		// user_version must be set outside the transaction body in SQLite
		if _, err := tx.Exec(fmt.Sprintf(`PRAGMA user_version = %d`, target)); err != nil {
			tx.Rollback() //nolint:errcheck
			return fmt.Errorf("bump user_version to %d: %w", target, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %d: %w", target, err)
		}
	}
	return nil
}

func newID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// isUniqueConflict reports whether err is a SQLite UNIQUE constraint violation.
func isUniqueConflict(err error) bool {
	return err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed")
}

// ---- houses ----

func (s *Store) Houses(ctx context.Context) ([]House, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, name FROM houses ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("query houses: %w", err)
	}
	defer rows.Close()
	out := make([]House, 0)
	for rows.Next() {
		var h House
		if err := rows.Scan(&h.ID, &h.Name); err != nil {
			return nil, fmt.Errorf("scan house: %w", err)
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

func (s *Store) House(ctx context.Context, id string) (House, error) {
	var h House
	err := s.db.QueryRowContext(ctx, `SELECT id, name FROM houses WHERE id = ?`, id).
		Scan(&h.ID, &h.Name)
	if errors.Is(err, sql.ErrNoRows) {
		return House{}, notFound("house not found")
	}
	if err != nil {
		return House{}, fmt.Errorf("query house: %w", err)
	}
	return h, nil
}

func (s *Store) CreateHouse(ctx context.Context, name string) (House, error) {
	h := House{ID: newID(), Name: name}
	if _, err := s.db.ExecContext(ctx, `INSERT INTO houses (id, name) VALUES (?, ?)`, h.ID, h.Name); err != nil {
		return House{}, fmt.Errorf("insert house: %w", err)
	}
	return h, nil
}

func (s *Store) UpdateHouse(ctx context.Context, id, name string) (House, error) {
	res, err := s.db.ExecContext(ctx, `UPDATE houses SET name = ? WHERE id = ?`, name, id)
	if err != nil {
		return House{}, fmt.Errorf("update house: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return House{}, notFound("house not found")
	}
	return House{ID: id, Name: name}, nil
}

func (s *Store) DeleteHouse(ctx context.Context, id string) error {
	var count int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM counters WHERE house_id = ?`, id).Scan(&count); err != nil {
		return fmt.Errorf("check counters: %w", err)
	}
	if count > 0 {
		return conflict("cannot delete house: it has %d counter(s), please delete them first", count)
	}
	res, err := s.db.ExecContext(ctx, `DELETE FROM houses WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete house: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("house not found")
	}
	return nil
}

// ---- counters ----

func (s *Store) Counters(ctx context.Context, houseID string) ([]Counter, error) {
	q := `SELECT id, name, unit, color, house_id FROM counters`
	args := []any{}
	if houseID != "" {
		q += ` WHERE house_id = ?`
		args = append(args, houseID)
	}
	q += ` ORDER BY name`
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query counters: %w", err)
	}
	defer rows.Close()
	out := make([]Counter, 0)
	for rows.Next() {
		var c Counter
		if err := rows.Scan(&c.ID, &c.Name, &c.Unit, &c.Color, &c.HouseID); err != nil {
			return nil, fmt.Errorf("scan counter: %w", err)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) Counter(ctx context.Context, id string) (Counter, error) {
	var c Counter
	err := s.db.QueryRowContext(ctx, `SELECT id, name, unit, color, house_id FROM counters WHERE id = ?`, id).
		Scan(&c.ID, &c.Name, &c.Unit, &c.Color, &c.HouseID)
	if errors.Is(err, sql.ErrNoRows) {
		return Counter{}, notFound("counter not found")
	}
	if err != nil {
		return Counter{}, fmt.Errorf("query counter: %w", err)
	}
	return c, nil
}

func (s *Store) CreateCounter(ctx context.Context, in CreateCounterInput) (Counter, error) {
	var exists int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM houses WHERE id = ?`, in.HouseID).Scan(&exists); err != nil {
		return Counter{}, fmt.Errorf("check house: %w", err)
	}
	if exists == 0 {
		return Counter{}, notFound("house not found")
	}
	c := Counter{ID: newID(), Name: in.Name, Unit: in.Unit, Color: in.Color, HouseID: in.HouseID}
	if _, err := s.db.ExecContext(ctx,
		`INSERT INTO counters (id, name, unit, color, house_id) VALUES (?, ?, ?, ?, ?)`,
		c.ID, c.Name, c.Unit, c.Color, c.HouseID); err != nil {
		return Counter{}, fmt.Errorf("insert counter: %w", err)
	}
	return c, nil
}

func (s *Store) UpdateCounter(ctx context.Context, id string, in UpdateCounterInput) (Counter, error) {
	var exists int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM houses WHERE id = ?`, in.HouseID).Scan(&exists); err != nil {
		return Counter{}, fmt.Errorf("check house: %w", err)
	}
	if exists == 0 {
		return Counter{}, notFound("house not found")
	}
	res, err := s.db.ExecContext(ctx,
		`UPDATE counters SET name = ?, unit = ?, color = ?, house_id = ? WHERE id = ?`,
		in.Name, in.Unit, in.Color, in.HouseID, id)
	if err != nil {
		return Counter{}, fmt.Errorf("update counter: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Counter{}, notFound("counter not found")
	}
	return Counter{ID: id, Name: in.Name, Unit: in.Unit, Color: in.Color, HouseID: in.HouseID}, nil
}

func (s *Store) DeleteCounter(ctx context.Context, id string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM entries WHERE counter_id = ?`, id); err != nil {
		return fmt.Errorf("delete entries: %w", err)
	}
	res, err := tx.ExecContext(ctx, `DELETE FROM counters WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete counter: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("counter not found")
	}
	return tx.Commit()
}

// ---- entries ----

func (s *Store) Entries(ctx context.Context, counterID string, f EntryFilters) ([]Entry, error) {
	q := `SELECT id, date, value, note FROM entries WHERE counter_id = ?`
	args := []any{counterID}
	if f.StartDate != "" {
		q += ` AND date >= ?`
		args = append(args, f.StartDate)
	}
	if f.EndDate != "" {
		q += ` AND date <= ?`
		args = append(args, f.EndDate)
	}
	q += ` ORDER BY date DESC`
	if f.Limit > 0 {
		q += ` LIMIT ?`
		args = append(args, f.Limit)
	} else if f.Offset > 0 {
		q += ` LIMIT -1` // SQLite requires LIMIT before OFFSET
	}
	if f.Offset > 0 {
		q += ` OFFSET ?`
		args = append(args, f.Offset)
	}

	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query entries: %w", err)
	}
	defer rows.Close()
	out := make([]Entry, 0)
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.ID, &e.Date, &e.Value, &e.Note); err != nil {
			return nil, fmt.Errorf("scan entry: %w", err)
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Store) Entry(ctx context.Context, counterID, id string) (Entry, error) {
	var e Entry
	err := s.db.QueryRowContext(ctx,
		`SELECT id, date, value, note FROM entries WHERE id = ? AND counter_id = ?`, id, counterID).
		Scan(&e.ID, &e.Date, &e.Value, &e.Note)
	if errors.Is(err, sql.ErrNoRows) {
		return Entry{}, notFound("entry not found")
	}
	if err != nil {
		return Entry{}, fmt.Errorf("query entry: %w", err)
	}
	return e, nil
}

func (s *Store) CreateEntry(ctx context.Context, counterID string, in CreateEntryInput) (Entry, error) {
	var exists int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM counters WHERE id = ?`, counterID).Scan(&exists); err != nil {
		return Entry{}, fmt.Errorf("check counter: %w", err)
	}
	if exists == 0 {
		return Entry{}, notFound("counter not found")
	}
	// Upsert: if an entry already exists for this date, update it.
	id := newID()
	if _, err := s.db.ExecContext(ctx,
		`INSERT INTO entries (id, counter_id, date, value, note) VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT(counter_id, date) DO UPDATE SET value = excluded.value, note = excluded.note`,
		id, counterID, in.Date, in.Value, in.Note); err != nil {
		return Entry{}, fmt.Errorf("upsert entry: %w", err)
	}
	// Fetch back to get the actual ID (may differ on upsert).
	var e Entry
	if err := s.db.QueryRowContext(ctx,
		`SELECT id, date, value, note FROM entries WHERE counter_id = ? AND date = ?`, counterID, in.Date).
		Scan(&e.ID, &e.Date, &e.Value, &e.Note); err != nil {
		return Entry{}, fmt.Errorf("fetch entry: %w", err)
	}
	return e, nil
}

func (s *Store) UpdateEntry(ctx context.Context, counterID, id string, in UpdateEntryInput) (Entry, error) {
	res, err := s.db.ExecContext(ctx,
		`UPDATE entries SET date = ?, value = ?, note = ? WHERE id = ? AND counter_id = ?`,
		in.Date, in.Value, in.Note, id, counterID)
	if err != nil {
		if isUniqueConflict(err) {
			return Entry{}, conflict("an entry for date %s already exists", in.Date)
		}
		return Entry{}, fmt.Errorf("update entry: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Entry{}, notFound("entry not found")
	}
	return Entry{ID: id, Date: in.Date, Value: in.Value, Note: in.Note}, nil
}

func (s *Store) DeleteEntry(ctx context.Context, counterID, id string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM entries WHERE id = ? AND counter_id = ?`, id, counterID)
	if err != nil {
		return fmt.Errorf("delete entry: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("entry not found")
	}
	return nil
}

func (s *Store) BulkCreateEntries(ctx context.Context, counterID string, entries []BulkEntryInput, skipExisting bool) (BulkResult, error) {
	var exists int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM counters WHERE id = ?`, counterID).Scan(&exists); err != nil {
		return BulkResult{}, fmt.Errorf("check counter: %w", err)
	}
	if exists == 0 {
		return BulkResult{}, notFound("counter not found")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return BulkResult{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	var result BulkResult
	result.Errors = make([]string, 0)

	for _, e := range entries {
		if skipExisting {
			res, err := tx.ExecContext(ctx,
				`INSERT OR IGNORE INTO entries (id, counter_id, date, value, note) VALUES (?, ?, ?, ?, ?)`,
				newID(), counterID, e.Date, e.Value, e.Note)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("date %s: %v", e.Date, err))
				continue
			}
			if n, _ := res.RowsAffected(); n == 0 {
				result.Skipped++
			} else {
				result.Created++
			}
		} else {
			if _, err := tx.ExecContext(ctx,
				`INSERT INTO entries (id, counter_id, date, value, note) VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT(counter_id, date) DO UPDATE SET value = excluded.value, note = excluded.note`,
				newID(), counterID, e.Date, e.Value, e.Note); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("date %s: %v", e.Date, err))
				continue
			}
			result.Created++
		}
	}

	if err := tx.Commit(); err != nil {
		return BulkResult{}, fmt.Errorf("commit: %w", err)
	}
	return result, nil
}

// ---- stats ----

func (s *Store) CounterStats(ctx context.Context, counterID string, f StatsFilters) (Stats, error) {
	q := `SELECT AVG(value), SUM(value), MAX(value), MIN(value), COUNT(*) FROM entries WHERE counter_id = ?`
	args := []any{counterID}
	if f.StartDate != "" {
		q += ` AND date >= ?`
		args = append(args, f.StartDate)
	}
	if f.EndDate != "" {
		q += ` AND date <= ?`
		args = append(args, f.EndDate)
	}

	var avg, total, maxVal, minVal sql.NullFloat64
	var count sql.NullInt64
	if err := s.db.QueryRowContext(ctx, q, args...).Scan(&avg, &total, &maxVal, &minVal, &count); err != nil {
		return Stats{}, fmt.Errorf("query stats: %w", err)
	}
	return Stats{
		Avg:   avg.Float64,
		Total: total.Float64,
		Max:   maxVal.Float64,
		Min:   minVal.Float64,
		Count: int(count.Int64),
	}, nil
}
