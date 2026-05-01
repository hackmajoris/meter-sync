.PHONY: build server-build dev test lint fmt clean generate seed seed-electron web-dev web-build electron-dev electron-build

APP := server
BIN := .bin/$(APP)

# Resolve the Electron app's db path at Make parse time.
# Reads config.json if it exists (user may have chosen a custom folder),
# otherwise falls back to the platform-specific default userData location.
# 'counters-electron' = dev (package name), 'counters' = packaged (productName).
# Prefer whichever has a config.json; fall back to the default db in that dir.
ELECTRON_DB := $(shell python3 -c "\
import json,os,platform; \
p=platform.system(); h=os.path.expanduser('~'); \
base=os.path.join(h,'Library','Application Support') if p=='Darwin' else os.path.join(h,'.config') if p=='Linux' else os.environ.get('APPDATA',''); \
dirs=['counters-electron','counters']; \
ud=next((os.path.join(base,d) for d in dirs if os.path.exists(os.path.join(base,d,'config.json'))),os.path.join(base,'counters')); \
cfg=os.path.join(ud,'config.json'); \
d=json.load(open(cfg)) if os.path.exists(cfg) else {}; \
print(d.get('dbPath',os.path.join(ud,'data.db')))")

server-build:
	CGO_ENABLED=1 go build -tags release -ldflags="-s -w" -o $(BIN) ./cmd/$(APP)

build: web-build server-build

dev:
	@trap 'kill 0' SIGINT; \
	CGO_ENABLED=1 go run ./cmd/server & \
	(cd web && npm run dev) & \
	wait

seed:
	go run ./cmd/seed

# Seed the database used by the Electron app.
# If the database is encrypted, pass the key: make seed-electron KEY=your-key
# Override the path:                           make seed-electron DB=/your/path/data.db
seed-electron:
	DB_KEY="$(KEY)" go run ./cmd/seed -db "$(or $(DB),$(ELECTRON_DB))"

test:
	go test -race -cover ./...

lint:
	golangci-lint run ./...

fmt:
	gofmt -w .
	goimports -w .

clean:
	rm -rf .bin/ web/dist/ electron/dist/

generate:
	go generate ./...

web-dev:
	cd web && npm run dev

web-build:
	cd web && npm ci && npm run build

electron-dev: web-build server-build
	cd electron && npm run dev

electron-build: web-build server-build
	cd electron && npm ci && npm run dist
