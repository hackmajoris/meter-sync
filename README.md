# MeterSync

Track utility meter readings across multiple properties. Log readings for water, gas, electricity, or any other counter per house, and view usage stats over time.

Built as a Go + React SPA with an optional Electron desktop wrapper and an encrypted SQLite database.

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
