# counters

> Short description of the project.

## Prerequisites

- Go 1.22+
- Node 20+
- [golangci-lint](https://golangci-lint.run/)

## Development

```bash
make build            # build everything
make test             # run tests
make lint             # run linter
make web-dev          # frontend dev server
make electron-dev     # run Electron in dev mode
make electron-build   # package Electron app
```

## License

MIT


What changed

Go (pkg/store/store.go)
- Swapped modernc.org/sqlite (pure-Go) for github.com/mutecomm/go-sqlcipher/v4 (CGO, AES-256 encryption)
- Added buildDSN(path, key) — returns a plain path when key is empty (no encryption), or a file:...?_pragma_key=... DSN when a key is set
- Replaced the flat initDB() with a setupConn() (runs per-connection pragmas: WAL, foreign keys, busy timeout) and a versioned migrate() using PRAGMA user_version as the schema version   
  counter — add new SQL blocks to the migrations slice as the schema evolves, never editing existing entries

Go (cmd/server/main.go)
- Reads DB_PATH, DB_KEY, PORT env vars (Electron sets these); falls back to -db/-addr flags so the dev workflow and tests still work
- Uses net.Listen + dynamic port (PORT=0) and prints Server running on http://localhost:PORT — parsed by Electron to know which port to load

Electron (electron/src/main.ts)
- On first launch (no config): loads the SPA index.html from disk as a fixed-size 520×640 non-resizable window — Go does not start yet
- After setup: starts Go with DB_PATH, DB_KEY, PORT=0 env vars, parses the port from stdout, then navigates the window to the app
- Config stored as {userData}/config.json; key encrypted via Electron's safeStorage and saved as {userData}/db.key.enc
- IPC handlers: get-config, pick-db-folder, pick-db-file, complete-setup, change-key, reset-config

Electron (electron/electron-builder.yml)
- web/dist added as an extra resource so the SPA can be loadFile()'d for the setup screen before Go starts

Web
- App.tsx: checking → setup → ready state machine; renders <SetupView> when not configured
- SetupView.tsx (new): two-mode onboarding — "New database" (choose folder + set password + confirm) or "Open existing" (pick .db file + enter password)
- SettingsPage.tsx: Database section (Electron-only) — shows file path, change-password form, disconnect/reset button
- Translations added in both en.json and ro.json

Important note for dev workflow: CGO_ENABLED=1 is now required. The Makefile already sets it. If you run go build or go run manually, prefix with CGO_ENABLED=1. The existing data/data.db
was created without encryption — running the server without DB_KEY will open it as before (unencrypted). Once you go through the Electron onboarding flow, it creates a new encrypted      
database at the chosen path.       