# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BrunoView is a local, web-based viewer for Bruno API test JSON logs. It consists of a Bun TypeScript backend server and a vanilla JavaScript frontend (no framework). Published as `@angoru/brunoview` on npm (source-only, no compiled binaries in npm).

## Build & Run Commands

```bash
# Run directly with Bun
bun run brunoview.ts /path/to/results.json

# Compile standalone binary for current platform
bun run build:bin

# Platform-specific binaries (output to dist/<platform>/)
bun run build:linux-x64
bun run build:macos-x64
bun run build:macos-arm64
bun run build:windows-x64
```

There is no test suite, no linter, and no tsconfig.json (Bun handles TypeScript natively).

## Release Process

Tag a version like `v0.1.0` and push. GitHub Actions (`.github/workflows/release.yml`) creates a GitHub release and publishes to npm.

## Architecture

### Backend: `brunoview.ts`

Bun HTTP server (~180 lines) with two routes:
- `/api/results` — serves the preloaded JSON file
- Everything else — static file serving from `public/`

Auto-opens the browser on startup. CLI supports `--host`, `--port`, `--no-open`, `--file`, `--public` flags. Public dir resolution checks multiple locations (CLI arg, env var `BRUNOVIEW_PUBLIC_DIR`, import path, executable dir, cwd).

### CLI wrapper: `bin/brunoview.js`

npm bin entry point. Tries `bun run brunoview.ts` first, falls back to `npx --yes bun run` if Bun isn't locally installed.

### Frontend: `public/app.js`

Single-file vanilla JS app (~1300 lines) with no build step. Dependencies loaded via CDN: Bootstrap 5.3 (CSS) and Tabulator.js 6.3 (table).

**State management**: Central `state` object at the top of the file acts as single source of truth. Filter changes trigger `applyFilters()` which re-renders the table and details panel.

**Data normalization** (`normalizeData`): Accepts multiple Bruno JSON formats (array of runs, array of results, single run, single result) and normalizes into `{ runs: [...], results: [...] }`. Each result gets a composite `id` (`runIndex-itemIndex`).

**Outcome logic**: `error` (explicit error) > `fail` (test failures or no tests + HTTP ≥ 400) > `pass`.

**Test stats**: Aggregated from 4 sources — `testResults`, `preRequestTestResults`, `postResponseTestResults`, `assertionResults`.

**Filtering**: All filters combined with AND logic. Supports search (configurable scopes: name/path/url/method/data), status, HTTP methods, HTTP status buckets (2xx/3xx/4xx/5xx/other), runs, and paths.

### Styling: `public/styles.css`

Custom CSS on top of Bootstrap. Design tokens use `--bruno-*` CSS variables (e.g., `--bruno-accent: #ffb347`).
