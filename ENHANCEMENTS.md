# Enhancement List

## Completed

- [x] Frontend modularization (`core.js`, `state.js`, `filters.js`, `table.js`, `details.js`).
- [x] Core unit tests for normalization and filtering.
- [x] Hardened JSON normalization against malformed entries.
- [x] File-load race condition fixes to avoid stale error UI.
- [x] Table selection update without unsafe Tabulator redraw.
- [x] npm publish retry in CI for transient `E409 Conflict`.

## Next

- [ ] Add UI tests for critical flows (load JSON, apply filters, select row).
- [ ] Add optional "Export filtered results" action from the current table view.
- [ ] Add summary breakdown by HTTP method and path group.
- [ ] Add sorting toggles directly in table headers (while preserving current filter UX).
- [ ] Add "copy request/response JSON" actions in details panel.

## Nice to Have

- [ ] Add i18n-ready labels (ES/EN switch).
- [ ] Add keyboard shortcuts for search focus and row navigation.
- [ ] Add optional dark/light/system theme setting.
