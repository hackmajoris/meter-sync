# MeterSync

Track utility meter readings across multiple properties. Log readings for water, gas, electricity, or any other counter per house, and view usage stats over time.

Built as a Go + React SPA with an optional Electron desktop wrapper and an encrypted SQLite database.

## Features

- **Multiple houses and counters** — group any number of counters (electricity, gas, water, custom) per property, each with its own unit and colour.
- **Charts** — line and bar charts grouped by day, month, or year, over a range of the current year, 3 years, 5 years, or all data. Expandable fullscreen mode with average and trend overlays.
- **Dashboard stats** — Today vs Yesterday, Average / day, Month Total, Year Total, Month Peak, and Month Lowest, computed from your entries. Each card can be hidden from the Settings page.
- **Comparison card** — this month vs last month and today vs yesterday, with absolute and percentage deltas.
- **Light and dark themes** plus three interface text sizes (small, medium, large).
- **Persisted preferences** — theme, text size, and stat card visibility are stored in the database, so they survive an app restart even when Electron serves the UI on a new port.
- **CSV import & export** per counter.
- **Encrypted local database** — AES-256 SQLite via `go-sqlcipher`. No cloud, no accounts, no telemetry.
- **Offline-ready fonts** — Inter and Outfit are bundled, so the UI makes no external requests at runtime.

## Prerequisites

- Go 1.25+
- Node 20+
- GCC / CGO toolchain (required for SQLite with encryption)
- [golangci-lint](https://golangci-lint.run/)

## Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Backend  | Go, `net/http`, `go-sqlcipher` (SQLite + AES-256) |
| Frontend | React 19, Vite, Chart.js, i18next                 |
| Desktop  | Electron 33 (wraps the Go binary)                 |

## Project structure

```
cmd/
  server/       — HTTP server entry point
  seed/         — seed script for development data
pkg/
  api/          — REST handlers (houses, counters, entries, stats)
  store/        — SQLite data layer
  web/          — embeds web/dist and serves the SPA
web/            — React frontend (outputs to web/dist/)
electron/       — Electron shell; spawns .bin/server
```

## Development

```bash
make dev              # start Go server + Vite dev server in parallel
make web-dev          # Vite dev server only
make electron-dev     # build everything and open Electron (dev mode)
```

## Build

```bash
make build            # web-build + server-build → .bin/server
make electron-build   # package the Electron app
```

## Other targets

```bash
make test             # go test -race -cover ./...
make lint             # golangci-lint run ./...
make fmt              # gofmt + goimports
make generate         # go generate ./...
make clean            # remove .bin/, pkg/web/dist/, electron/dist/
```

## Seeding

```bash
make seed                            # seed the local dev database
make seed-electron                   # seed the Electron app's database
make seed-electron KEY=your-key      # seed an encrypted Electron database
make seed-electron DB=/path/data.db  # seed a custom database path
```

The Electron database location is resolved automatically per platform:

| OS      | Default path                                     |
|---------|--------------------------------------------------|
| macOS   | `~/Library/Application Support/counters/data.db` |
| Linux   | `~/.config/counters/data.db`                     |
| Windows | `%APPDATA%\counters\data.db`                     |

If `config.json` in that directory specifies a `dbPath`, that value is used instead.

## Database encryption

The SQLite database is encrypted with AES-256 via `go-sqlcipher`. Pass the encryption key through the `DB_KEY` environment variable when running the server or seed commands.

## License

MIT
