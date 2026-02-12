# Release Notes

## 0.2.2 - 2026-02-12

### Changed
- Defaulted the main table to a failure-focused stream (`ISSUES`) instead of all results.
- Added `Failure stream` sorting mode to prioritize most recent failing/error entries.
- Updated table heading to `Failure Stream` for clearer triage intent.

### Fixed
- Reduced detail-panel noise by collapsing heavy sections (`Headers`, `Body`, `Data`, `Error`) by default.
- Improved JSON/log readability with smarter truncation and better monospace styling.

### Added
- Core test coverage for `issues` filtering and `stream` sorting behavior.

## 0.2.1 - 2026-02-12

### Added
- Modular frontend architecture with dedicated files: `core.js`, `state.js`, `filters.js`, `table.js`, and `details.js`.
- Unit tests for core normalization and filtering logic.

### Changed
- `index.html` now loads modular frontend scripts in dependency order.
- `app.js` now delegates normalization and validation to shared core logic.
- Filtering behavior is consolidated through `core.filterResults`.

### Fixed
- Resolved intermittent false error message during file load caused by async race conditions.
- Separated JSON parse/validation errors from post-load processing errors for clearer diagnostics.
- Hardened normalization against malformed result entries and invalid data types.
- Removed unsafe Tabulator redraw path that triggered `offsetWidth` null errors during selection updates.
