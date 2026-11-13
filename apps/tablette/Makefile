.PHONY: build serve

# Public-release Makefile: basic build and serve only.
# Installed as Makefile in the release snapshot (see scripts/release.sh).
# Usage: make serve [PORT=8090]
PORT ?= 8090

build:
	npm run build

serve:
	VITE_FORGE_PROXY=/forge-proxy/ npm run build
	npm run preview -- --host 127.0.0.1 --port $(PORT) --strictPort
