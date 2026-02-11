const state = {
  runs: [],
  results: [],
  filtered: [],
  selectedId: null,
  selectedItem: null,
  table: null,
  tableClickBound: false,
  manualLoad: false,
  filters: {
    search: "",
    status: "all",
    methods: new Set(),
    http: new Set(["2xx", "3xx", "4xx", "5xx", "other"]),
    runs: new Set(),
    paths: new Set(),
    searchScopes: new Set(["name", "path", "url", "method"]),
    sort: "status",
  },
};

const $ = (selector) => document.querySelector(selector);

const statusOrder = { error: 0, fail: 1, pass: 2 };

function init() {
  const fileInput = $("#file-input");
  const dropZone = $("#drop-zone");

  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        readFile(file);
      }
    });
  }

  if (dropZone) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add("dragging");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove("dragging");
      });
    });

    dropZone.addEventListener("drop", (event) => {
      const file = event.dataTransfer.files[0];
      if (file) {
        readFile(file);
      }
    });
  }

  const searchInput = $("#search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.filters.search = event.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  const sortSelect = $("#sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (event) => {
      state.filters.sort = event.target.value;
      applyFilters();
    });
  }

  const resetButton = $("#reset-filters");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      resetFilters();
    });
  }

  buildSearchScopes();
  buildStatusFilters();
  buildHttpFilters();
  buildRunFilters();
  buildPathSelect();

  loadFromServer();
}

async function loadFromServer() {
  try {
    const response = await fetch("/api/results", { cache: "no-store" });
    if (!response.ok || state.manualLoad) {
      return;
    }
    const size = Number(response.headers.get("content-length") || 0);
    const name = response.headers.get("x-results-file") || "results.json";
    const data = await response.json();
    if (state.manualLoad) {
      return;
    }
    const errorMessage = validateResultsData(data);
    if (errorMessage) {
      return;
    }
    consumeData(data, { name, size, source: "server" });
  } catch (error) {
    // Silent if no server file is configured.
  }
}

function readFile(file) {
  state.manualLoad = true;
  clearLoadError();
  showToast(`Loading ${file.name}...`);
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const data = JSON.parse(reader.result);
      const errorMessage = validateResultsData(data);
      if (errorMessage) {
        showLoadError("No se ha podido cargar el archivo. Revisa el formato JSON.");
        return;
      }
      consumeData(data, { name: file.name, size: file.size, source: "file" });
    } catch (error) {
      showLoadError("No se ha podido cargar el archivo. Revisa el formato JSON.");
    }
  };
  reader.readAsText(file);
}

function consumeData(data, meta) {
  clearLoadError();
  const normalized = normalizeData(data);
  state.runs = normalized.runs;
  state.results = normalized.results;
  state.selectedId = state.results[0] ? state.results[0].id : null;
  state.selectedItem = state.results[0] || null;
  resetFilters(false);

  buildMethodFilters();
  buildRunFilters();
  buildPathSelect();
  buildSearchScopes();
  buildStatusFilters();
  buildHttpFilters();
  updateFileMeta(meta, normalized);
  renderSummary();
  applyFilters();
  renderDetails();

  showToast(`Loaded ${state.results.length} results.`);
}

function resetFilters(shouldRender = true) {
  state.filters.search = "";
  state.filters.status = "all";
  state.filters.methods = new Set();
  state.filters.http = new Set(["2xx", "3xx", "4xx", "5xx", "other"]);
  state.filters.runs = new Set();
  state.filters.paths = new Set();
  state.filters.searchScopes = new Set(["name", "path", "url", "method"]);
  state.filters.sort = "status";

  const searchInput = $("#search-input");
  if (searchInput) searchInput.value = "";

  const sortSelect = $("#sort-select");
  if (sortSelect) sortSelect.value = "status";

  buildMethodFilters();
  buildRunFilters();
  buildPathSelect();
  buildSearchScopes();
  buildStatusFilters();
  buildHttpFilters();

  if (shouldRender) {
    applyFilters();
  }
}

function normalizeData(data) {
  let runs = [];
  if (Array.isArray(data)) {
    const hasRunResults = data.some((run) => isRunWithResults(run));
    if (hasRunResults) {
      runs = data;
    } else if (data.every((item) => isResultLike(item))) {
      runs = [{ results: data }];
    } else {
      runs = data;
    }
  } else if (isRunWithResults(data)) {
    runs = [data];
  } else if (isResultLike(data)) {
    runs = [{ results: [data] }];
  } else {
    runs = [data];
  }
  const results = [];

  runs.forEach((run, runIndex) => {
    const runResults = Array.isArray(run.results) ? run.results : [];
    runResults.forEach((result, index) => {
      const request = result.request || {};
      const response = result.response || {};
      const testStats = collectTestStats(result);
      const httpStatus = response.status;
      const outcome = decideOutcome(result, testStats, httpStatus);

      const name =
        result.name ||
        (result.test && result.test.filename
          ? result.test.filename.split("/").pop().replace(/\.bru$/i, "")
          : null) ||
        result.path ||
        request.url ||
        `Result ${index + 1}`;

      const path = result.path || (result.test ? result.test.filename : "");
      const pathGroup = buildPathGroup(path);
      const method = request.method || "";
      const url = request.url || "";

      results.push({
        id: `${runIndex}-${index}`,
        runIndex,
        iterationIndex: result.iterationIndex ?? run.iterationIndex ?? 0,
        name,
        path,
        pathGroup,
        method,
        url,
        request,
        response,
        httpStatus,
        statusText: response.statusText || "",
        runDuration: result.runDuration,
        error: result.error,
        testStats,
        outcome,
        raw: result,
        searchIndex: buildSearchIndex(name, path, url, method),
        searchExtra: {},
      });
    });
  });

  return { runs, results };
}

function validateResultsData(data) {
  if (!data || typeof data !== "object") {
    return "Invalid results JSON: expected an object or array.";
  }
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return "Invalid results JSON: no runs found.";
    }
    if (data.some((run) => isRunWithResults(run))) {
      return "";
    }
    if (data.every((item) => isResultLike(item))) {
      return "";
    }
    return "Invalid results JSON: missing results array.";
  }
  if (isRunWithResults(data) || isResultLike(data)) {
    return "";
  }
  return "Invalid results JSON: missing results array.";
}

function isRunWithResults(run) {
  return (
    run &&
    typeof run === "object" &&
    !Array.isArray(run) &&
    Array.isArray(run.results)
  );
}

function isResultLike(result) {
  return (
    result &&
    typeof result === "object" &&
    !Array.isArray(result) &&
    ("request" in result ||
      "response" in result ||
      "testResults" in result ||
      "assertionResults" in result ||
      "runDuration" in result ||
      "path" in result ||
      "name" in result ||
      "error" in result)
  );
}

function buildPathGroup(path) {
  if (!path) return "Uncategorized";
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

function buildSearchIndex(name, path, url, method) {
  return {
    name: (name || "").toLowerCase(),
    path: (path || "").toLowerCase(),
    url: (url || "").toLowerCase(),
    method: (method || "").toLowerCase(),
    data: "",
  };
}

function collectTestStats(result) {
  const groups = [
    { label: "Tests", items: result.testResults },
    { label: "Pre-request", items: result.preRequestTestResults },
    { label: "Post-response", items: result.postResponseTestResults },
    { label: "Assertions", items: result.assertionResults },
  ];

  const stats = {
    total: 0,
    pass: 0,
    fail: 0,
    groups: [],
  };

  groups.forEach((group) => {
    const list = Array.isArray(group.items) ? group.items : [];
    let pass = 0;
    let fail = 0;

    list.forEach((item) => {
      if (!item || typeof item !== "object") return;
      if (item.status === "fail") fail += 1;
      if (item.status === "pass") pass += 1;
    });

    stats.total += pass + fail;
    stats.pass += pass;
    stats.fail += fail;

    stats.groups.push({
      label: group.label,
      items: list,
      pass,
      fail,
    });
  });

  return stats;
}

function decideOutcome(result, testStats, httpStatus) {
  if (result.error) return "error";
  if (testStats.fail > 0) return "fail";
  if (testStats.total === 0 && Number(httpStatus) >= 400) return "fail";
  return "pass";
}

function buildStatusFilters() {
  const container = $("#status-filters");
  container.innerHTML = "";
  ["all", "pass", "fail", "error"].forEach((status) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `btn btn-sm btn-outline-secondary bruno-chip ${status}`;
    chip.textContent = status.toUpperCase();
    chip.setAttribute("role", "switch");
    if (status === state.filters.status) {
      chip.classList.add("active");
      chip.setAttribute("aria-pressed", "true");
    } else {
      chip.setAttribute("aria-pressed", "false");
    }
    chip.addEventListener("click", () => {
      state.filters.status = status;
      buildStatusFilters();
      applyFilters();
    });
    container.appendChild(chip);
  });
}

function buildSearchScopes() {
  const container = $("#search-scope");
  if (!container) return;

  const scopes = [
    { id: "name", label: "Name" },
    { id: "path", label: "Path" },
    { id: "url", label: "URL" },
    { id: "method", label: "Method" },
    { id: "data", label: "Data" },
  ];

  if (state.filters.searchScopes.size === 0) {
    scopes
      .filter((scope) => scope.id !== "data")
      .forEach((scope) => state.filters.searchScopes.add(scope.id));
  }

  container.innerHTML = "";
  scopes.forEach((scope) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "btn btn-sm btn-outline-secondary bruno-chip";
    chip.textContent = scope.label;
    chip.setAttribute("role", "switch");
    if (state.filters.searchScopes.has(scope.id)) {
      chip.classList.add("active");
      chip.setAttribute("aria-pressed", "true");
    } else {
      chip.setAttribute("aria-pressed", "false");
    }
    chip.addEventListener("click", () => {
      const isActive = state.filters.searchScopes.has(scope.id);
      if (isActive && state.filters.searchScopes.size === 1) return;
      if (isActive) {
        state.filters.searchScopes.delete(scope.id);
      } else {
        state.filters.searchScopes.add(scope.id);
      }
      buildSearchScopes();
      applyFilters();
    });
    container.appendChild(chip);
  });
}

function buildMethodFilters() {
  const container = $("#method-filters");
  const methods = Array.from(
    new Set(state.results.map((item) => item.method).filter(Boolean))
  ).sort();

  if (state.filters.methods.size === 0) {
    methods.forEach((method) => state.filters.methods.add(method));
  }

  container.innerHTML = "";
  methods.forEach((method) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "btn btn-sm btn-outline-secondary bruno-chip";
    chip.textContent = method;
    chip.setAttribute("role", "switch");
    if (state.filters.methods.has(method)) {
      chip.classList.add("active");
      chip.setAttribute("aria-pressed", "true");
    } else {
      chip.setAttribute("aria-pressed", "false");
    }
    chip.addEventListener("click", () => {
      if (state.filters.methods.has(method)) {
        state.filters.methods.delete(method);
      } else {
        state.filters.methods.add(method);
      }
      buildMethodFilters();
      applyFilters();
    });
    container.appendChild(chip);
  });
}

function buildHttpFilters() {
  const container = $("#http-filters");
  container.innerHTML = "";
  ["2xx", "3xx", "4xx", "5xx", "other"].forEach((bucket) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "btn btn-sm btn-outline-secondary bruno-chip";
    chip.textContent = bucket.toUpperCase();
    chip.setAttribute("role", "switch");
    if (state.filters.http.has(bucket)) {
      chip.classList.add("active");
      chip.setAttribute("aria-pressed", "true");
    } else {
      chip.setAttribute("aria-pressed", "false");
    }
    chip.addEventListener("click", () => {
      if (state.filters.http.has(bucket)) {
        state.filters.http.delete(bucket);
      } else {
        state.filters.http.add(bucket);
      }
      buildHttpFilters();
      applyFilters();
    });
    container.appendChild(chip);
  });
}

function buildRunFilters() {
  const container = $("#run-filters");
  if (!container) return;

  const runs = Array.from(new Set(state.results.map((item) => item.runIndex))).sort(
    (a, b) => a - b
  );

  if (state.filters.runs.size === 0) {
    runs.forEach((run) => state.filters.runs.add(run));
  }

  container.innerHTML = "";
  runs.forEach((run) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "btn btn-sm btn-outline-secondary bruno-chip";
    chip.textContent = `Run ${run + 1}`;
    chip.setAttribute("role", "switch");
    if (state.filters.runs.has(run)) {
      chip.classList.add("active");
      chip.setAttribute("aria-pressed", "true");
    } else {
      chip.setAttribute("aria-pressed", "false");
    }
    chip.addEventListener("click", () => {
      if (state.filters.runs.has(run)) {
        if (state.filters.runs.size === 1) return;
        state.filters.runs.delete(run);
      } else {
        state.filters.runs.add(run);
      }
      buildRunFilters();
      applyFilters();
    });
    container.appendChild(chip);
  });
}

function buildPathSelect() {
  const select = $("#path-filter");
  if (!select) return;

  const paths = Array.from(new Set(state.results.map((item) => item.pathGroup))).sort();
  if (state.filters.paths.size === 0) {
    paths.forEach((path) => state.filters.paths.add(path));
  }

  select.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "__all__";
  allOption.textContent = "All paths";
  select.appendChild(allOption);

  paths.forEach((path) => {
    const option = document.createElement("option");
    option.value = path;
    option.textContent = path;
    select.appendChild(option);
  });

  if (state.filters.paths.size === 0 || state.filters.paths.size >= paths.length) {
    select.value = "__all__";
  } else if (state.filters.paths.size === 1) {
    select.value = Array.from(state.filters.paths)[0];
  } else {
    select.value = "__all__";
  }

  if (!select.dataset.bound) {
    select.addEventListener("change", () => {
      const value = select.value;
      if (value === "__all__") {
        state.filters.paths = new Set(paths);
      } else {
        state.filters.paths = new Set([value]);
      }
      applyFilters();
    });
    select.dataset.bound = "true";
  }
}

function updateFileMeta(meta, normalized) {
  const fileMeta = $("#file-meta");
  if (!meta) {
    fileMeta.textContent = "No file loaded";
    return;
  }
  const runCount = normalized.runs.length;
  const size = meta.size ? ` - ${formatBytes(meta.size)}` : "";
  fileMeta.textContent = `${meta.name}${size} - ${runCount} run${runCount === 1 ? "" : "s"}`;
}

function applyFilters() {
  const search = state.filters.search;
  const statusFilter = state.filters.status;
  const methods = state.filters.methods;
  const httpFilters = state.filters.http;
  const runs = state.filters.runs;
  const paths = state.filters.paths;
  const scopes = state.filters.searchScopes;

  let filtered = state.results.filter((item) => {
    const matchesSearch = !search
      ? true
      : getSearchText(item, scopes).includes(search);

    const matchesStatus =
      statusFilter === "all" ? true : item.outcome === statusFilter;

    const matchesMethod = methods.size === 0 ? true : methods.has(item.method);

    const httpBucket = bucketHttpStatus(item.httpStatus);
    const matchesHttp = httpFilters.has(httpBucket);

    const matchesRun = runs.size === 0 ? true : runs.has(item.runIndex);
    const matchesPath = paths.size === 0 ? true : paths.has(item.pathGroup);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesMethod &&
      matchesHttp &&
      matchesRun &&
      matchesPath
    );
  });

  filtered = sortResults(filtered, state.filters.sort);

  state.filtered = filtered;

  if (state.selectedId && !filtered.some((item) => item.id === state.selectedId)) {
    state.selectedId = filtered[0] ? filtered[0].id : null;
    state.selectedItem = filtered[0] || null;
  }

  renderTable();
  renderDetails();
}

function sortResults(results, sortKey) {
  const copy = [...results];
  if (sortKey === "name") {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortKey === "duration") {
    copy.sort((a, b) => (a.runDuration || 0) - (b.runDuration || 0));
  } else if (sortKey === "http") {
    copy.sort((a, b) => (a.httpStatus || 0) - (b.httpStatus || 0));
  } else if (sortKey === "path") {
    copy.sort((a, b) => a.path.localeCompare(b.path));
  } else {
    copy.sort((a, b) => {
      const diff = statusOrder[a.outcome] - statusOrder[b.outcome];
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }
  return copy;
}

function renderSummary() {
  const summary = buildSummary(state.results);
  const summaryEl = $("#summary");
  summaryEl.innerHTML = "";

  const cards = [
    { label: "Total Requests", value: summary.total },
    { label: "Passed", value: summary.pass },
    { label: "Failed", value: summary.fail },
    { label: "Errors", value: summary.error },
    { label: "Avg Duration", value: summary.avgDuration },
    { label: "HTTP 4xx/5xx", value: summary.httpBad },
  ];

  cards.forEach((card) => {
    const column = document.createElement("div");
    column.className = "col-6 col-lg-2";

    const cardEl = document.createElement("div");
    cardEl.className = "card summary-card h-100";

    const body = document.createElement("div");
    body.className = "card-body p-3";

    const title = document.createElement("div");
    title.className = "summary-label";
    title.textContent = card.label;

    const value = document.createElement("div");
    value.className = "summary-value";
    value.textContent = card.value;
    body.appendChild(title);
    body.appendChild(value);
    cardEl.appendChild(body);

    column.appendChild(cardEl);
    summaryEl.appendChild(column);
  });

}

function buildSummary(results) {
  const summary = {
    total: results.length,
    pass: 0,
    fail: 0,
    error: 0,
    httpBad: 0,
    avgDuration: "-",
  };

  let durationSum = 0;
  let durationCount = 0;

  results.forEach((item) => {
    if (item.outcome === "pass") summary.pass += 1;
    if (item.outcome === "fail") summary.fail += 1;
    if (item.outcome === "error") summary.error += 1;
    if (Number(item.httpStatus) >= 400) summary.httpBad += 1;

    if (typeof item.runDuration === "number") {
      durationSum += item.runDuration;
      durationCount += 1;
    }
  });

  if (durationCount > 0) {
    summary.avgDuration = formatDuration(durationSum / durationCount);
  }

  return summary;
}

function renderTable() {
  const countEl = $("#results-count");
  if (countEl) {
    countEl.textContent = `${state.filtered.length} of ${state.results.length}`;
  }

  const tableEl = $("#results-table");
  if (!tableEl || typeof Tabulator === "undefined") {
    return;
  }

  if (!state.table) {
    state.table = new Tabulator(tableEl, {
      data: state.filtered,
      layout: "fitColumns",
      height: "65vh",
      index: "id",
      selectable: 1,
      selectableRows: 1,
      placeholder: "No results to display.",
      rowFormatter: (row) => {
        const el = row.getElement();
        if (!el) return;
        if (row.getData().id === state.selectedId) {
          el.classList.add("bruno-selected");
        } else {
          el.classList.remove("bruno-selected");
        }
      },
      columns: [
        {
          title: "Status",
          field: "outcome",
          width: 110,
          formatter: statusFormatter,
          headerSort: false,
        },
        {
          title: "Name",
          field: "name",
          minWidth: 180,
          headerSort: false,
        },
        {
          title: "Method",
          field: "method",
          width: 100,
          formatter: methodFormatter,
          headerSort: false,
        },
        {
          title: "HTTP",
          field: "httpStatus",
          width: 90,
          formatter: httpStatusFormatter,
          headerSort: false,
        },
        {
          title: "Duration",
          field: "runDuration",
          width: 120,
          formatter: durationFormatter,
          headerSort: false,
        },
        {
          title: "Path",
          field: "path",
          minWidth: 200,
          headerSort: false,
        },
      ],
      rowClick: (event, row) => {
        const data = row.getData();
        state.selectedId = data.id;
        state.selectedItem = data;
        if (typeof row.select === "function") {
          row.select();
        }
        state.table.redraw(true);
        renderDetails(data);
      },
    });

    state.table.on("rowSelected", (row) => {
      const data = row.getData();
      state.selectedId = data.id;
      state.selectedItem = data;
      renderDetails(data);
    });

    if (!state.tableClickBound) {
      tableEl.addEventListener("click", (event) => {
        const rowEl = event.target.closest(".tabulator-row");
        if (!rowEl || !state.table) return;
        const rowId = rowEl.getAttribute("data-index");
        if (!rowId) return;
        const row = state.table.getRow(rowId);
        const data = row ? row.getData() : findResultById(rowId);
        if (!data) return;
        state.selectedId = data.id;
        state.selectedItem = data;
        if (row && typeof row.select === "function") {
          row.select();
        }
        state.table.redraw(true);
        renderDetails(data);
      });
      state.tableClickBound = true;
    }
  } else {
    const result = state.table.replaceData(state.filtered);
    if (result && typeof result.then === "function") {
      result.then(() => selectTableRow());
    }
  }

  selectTableRow();
}

function selectTableRow() {
  if (!state.table || !state.selectedId) return;
  if (typeof state.table.deselectRow === "function") {
    state.table.deselectRow();
  }
  const row = state.table.getRow(state.selectedId);
  if (row && typeof row.select === "function") {
    row.select();
    state.selectedItem = row.getData();
  }
  state.table.redraw(true);
}

function findResultById(id) {
  return state.results.find((result) => result.id === id);
}

function renderDetails(selectedItem) {
  const container = $("#detail-content");
  const empty = $("#detail-empty");

  if (!state.selectedId && !selectedItem && !state.selectedItem) {
    container.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  const item =
    selectedItem ||
    state.selectedItem ||
    state.results.find((result) => result.id === state.selectedId);
  if (!item) {
    container.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "detail-header";

  const title = document.createElement("h3");
  title.className = "h6 mb-1";
  title.textContent = item.name;
  header.appendChild(title);

  if (item.url) {
    const url = document.createElement("p");
    url.className = "text-muted small mb-2";
    url.textContent = item.url;
    header.appendChild(url);
  }

  const meta = document.createElement("div");
  meta.className = "detail-meta d-flex flex-wrap gap-2";
  meta.appendChild(
    makeMetaChip(item.method || "method", "text-bg-info")
  );
  meta.appendChild(
    makeMetaChip(`HTTP ${item.httpStatus || "-"}`, "text-bg-light")
  );

  const statusTone =
    item.outcome === "pass"
      ? "text-bg-success"
      : item.outcome === "fail"
      ? "text-bg-danger"
      : item.outcome === "error"
      ? "text-bg-warning"
      : "text-bg-secondary";
  meta.appendChild(makeMetaChip(item.outcome.toUpperCase(), statusTone));

  meta.appendChild(
    makeMetaChip(`Duration ${formatDuration(item.runDuration)}`, "text-bg-light")
  );
  meta.appendChild(makeMetaChip(`Run ${item.runIndex + 1}`, "text-bg-light"));
  meta.appendChild(
    makeMetaChip(`Iteration ${item.iterationIndex}`, "text-bg-light")
  );
  header.appendChild(meta);

  container.appendChild(header);

  container.appendChild(buildOverviewSection(item));
  container.appendChild(buildRequestSection(item));
  container.appendChild(buildResponseSection(item));
  container.appendChild(buildTestsSection(item));
  container.appendChild(buildRawSection(item));
}

function buildOverviewSection(item) {
  const details = document.createElement("details");
  details.className = "detail-section";
  details.open = true;

  const summary = document.createElement("summary");
  summary.textContent = "Overview";
  details.appendChild(summary);

  const list = document.createElement("dl");
  list.className = "kv-list";

  addKeyValue(list, "Name", item.name);
  addKeyValue(list, "Path", item.path || "-");
  addKeyValue(list, "Method", item.method || "-");
  addKeyValue(list, "URL", item.url || "-");
  addKeyValue(list, "HTTP Status", item.httpStatus || "-");
  addKeyValue(list, "Status", item.outcome);
  addKeyValue(list, "Duration", formatDuration(item.runDuration));
  addKeyValue(list, "Run Index", item.runIndex + 1);
  addKeyValue(list, "Iteration", item.iterationIndex);

  details.appendChild(list);
  return details;
}

function buildRequestSection(item) {
  const details = document.createElement("details");
  details.className = "detail-section";

  const summary = document.createElement("summary");
  summary.textContent = "Request";
  details.appendChild(summary);

  const request = item.request || {};
  const list = document.createElement("dl");
  list.className = "kv-list";
  addKeyValue(list, "Method", request.method || "-");
  addKeyValue(list, "URL", request.url || "-");
  details.appendChild(list);

  if (request.headers && Object.keys(request.headers).length) {
    const headersTitle = document.createElement("h4");
    headersTitle.className = "h6 mt-3";
    headersTitle.textContent = "Headers";
    details.appendChild(headersTitle);
    details.appendChild(renderKeyValueTable(request.headers));
  }

  if (request.body !== undefined) {
    const bodyTitle = document.createElement("h4");
    bodyTitle.className = "h6 mt-3";
    bodyTitle.textContent = "Body";
    details.appendChild(bodyTitle);
    details.appendChild(renderJsonBlock(request.body));
  }

  return details;
}

function buildResponseSection(item) {
  const details = document.createElement("details");
  details.className = "detail-section";
  details.open = true;

  const summary = document.createElement("summary");
  summary.textContent = "Response";
  details.appendChild(summary);

  const response = item.response || {};
  const list = document.createElement("dl");
  list.className = "kv-list";
  addKeyValue(list, "Status", response.status || "-");
  addKeyValue(list, "Status Text", response.statusText || "-");
  addKeyValue(list, "Content Length",
    response.headers && response.headers["content-length"]
      ? response.headers["content-length"]
      : "-");
  details.appendChild(list);

  if (response.headers && Object.keys(response.headers).length) {
    const headersTitle = document.createElement("h4");
    headersTitle.className = "h6 mt-3";
    headersTitle.textContent = "Headers";
    details.appendChild(headersTitle);
    details.appendChild(renderKeyValueTable(response.headers));
  }

  if (response.data !== undefined) {
    const dataTitle = document.createElement("h4");
    dataTitle.className = "h6 mt-3";
    dataTitle.textContent = "Data";
    details.appendChild(dataTitle);
    details.appendChild(renderJsonBlock(response.data, true));
  }

  if (item.error) {
    const errorTitle = document.createElement("h4");
    errorTitle.className = "h6 mt-3";
    errorTitle.textContent = "Error";
    details.appendChild(errorTitle);
    details.appendChild(renderJsonBlock(item.error, true));
  }

  return details;
}

function buildTestsSection(item) {
  const details = document.createElement("details");
  details.className = "detail-section";

  const summary = document.createElement("summary");
  summary.textContent = "Tests";
  details.appendChild(summary);

  const stats = item.testStats;
  const summaryText = document.createElement("p");
  summaryText.className = "muted";
  summaryText.textContent = `${stats.pass} passed, ${stats.fail} failed`;
  details.appendChild(summaryText);

  stats.groups.forEach((group) => {
    const groupTitle = document.createElement("h4");
    groupTitle.className = "h6 mt-3";
    groupTitle.textContent = group.label;
    details.appendChild(groupTitle);

    if (!group.items.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No results.";
      details.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "tests-list";
    group.items.forEach((test) => {
      const itemEl = document.createElement("div");
      itemEl.className = `test-item ${test.status || ""}`;

      const desc = document.createElement("div");
      desc.textContent = test.description || test.name || "Test";

      const status = document.createElement("span");
      status.textContent = test.status || "-";

      itemEl.appendChild(desc);
      itemEl.appendChild(status);
      list.appendChild(itemEl);
    });

    details.appendChild(list);
  });

  return details;
}

function buildRawSection(item) {
  const details = document.createElement("details");
  details.className = "detail-section";

  const summary = document.createElement("summary");
  summary.textContent = "Raw JSON";
  details.appendChild(summary);

  details.appendChild(renderJsonBlock(item.raw, true, 40000));
  return details;
}

function renderKeyValueTable(obj) {
  const list = document.createElement("dl");
  list.className = "kv-list";
  Object.entries(obj).forEach(([key, value]) => {
    addKeyValue(list, key, value);
  });
  return list;
}

function renderJsonBlock(value, light = false, maxChars = 20000) {
  const container = document.createElement("div");
  const actions = document.createElement("div");
  actions.className = "json-actions";

  let fullText = "";
  try {
    fullText =
      typeof value === "string"
        ? value
        : JSON.stringify(value, null, 2);
  } catch (error) {
    fullText = String(value);
  }

  const pre = document.createElement("pre");
  pre.className = `json-block ${light ? "light" : ""}`;

  if (fullText.length > maxChars) {
    const truncated = `${fullText.slice(0, maxChars)}\n... truncated ...`;
    pre.textContent = truncated;

    const toggle = document.createElement("button");
    toggle.textContent = "Show full";
    toggle.addEventListener("click", () => {
      if (toggle.textContent === "Show full") {
        pre.textContent = fullText;
        toggle.textContent = "Show less";
      } else {
        pre.textContent = truncated;
        toggle.textContent = "Show full";
      }
    });
    actions.appendChild(toggle);
  } else {
    pre.textContent = fullText;
  }

  if (actions.children.length) {
    container.appendChild(actions);
  }
  container.appendChild(pre);
  return container;
}

function statusFormatter(cell) {
  const value = cell.getValue();
  return createStatusPill(value);
}

function methodFormatter(cell) {
  const value = cell.getValue();
  if (!value) return "-";
  const tag = document.createElement("span");
  tag.className = "badge text-bg-light border text-dark";
  tag.textContent = value;
  return tag;
}

function httpStatusFormatter(cell) {
  const value = cell.getValue();
  if (!value) return "-";
  const tag = document.createElement("span");
  tag.className = "badge text-bg-light border text-dark";
  tag.textContent = String(value);
  return tag;
}

function durationFormatter(cell) {
  return formatDuration(cell.getValue());
}

function createStatusPill(status) {
  const pill = document.createElement("span");
  pill.className = "badge";
  const statusText = (status || "unknown").toString().toLowerCase();

  if (statusText === "pass") pill.classList.add("text-bg-success");
  else if (statusText === "fail") pill.classList.add("text-bg-danger");
  else if (statusText === "error") pill.classList.add("text-bg-warning");
  else pill.classList.add("text-bg-secondary");

  pill.textContent = statusText.toUpperCase();
  return pill;
}

function makeMetaChip(text, tone = "text-bg-light") {
  const chip = document.createElement("span");
  chip.className = `badge rounded-pill ${tone}`;
  chip.textContent = text;
  return chip;
}

function addKeyValue(list, key, value) {
  const dt = document.createElement("dt");
  dt.textContent = key;
  const dd = document.createElement("dd");
  dd.textContent = value === undefined || value === null ? "-" : String(value);
  list.appendChild(dt);
  list.appendChild(dd);
}

function bucketHttpStatus(status) {
  const code = Number(status);
  if (!code) return "other";
  if (code >= 200 && code < 300) return "2xx";
  if (code >= 300 && code < 400) return "3xx";
  if (code >= 400 && code < 500) return "4xx";
  if (code >= 500 && code < 600) return "5xx";
  return "other";
}

function getSearchText(item, scopes) {
  const activeScopes =
    scopes && scopes.size
      ? scopes
      : new Set(["name", "path", "url", "method"]);

  let buffer = "";
  if (activeScopes.has("name")) buffer += ` ${item.searchIndex.name}`;
  if (activeScopes.has("path")) buffer += ` ${item.searchIndex.path}`;
  if (activeScopes.has("url")) buffer += ` ${item.searchIndex.url}`;
  if (activeScopes.has("method")) buffer += ` ${item.searchIndex.method}`;
  if (activeScopes.has("data")) {
    if (!item.searchIndex.data) {
      item.searchIndex.data = buildSearchData(item);
    }
    buffer += ` ${item.searchIndex.data}`;
  }

  return buffer;
}

function buildSearchData(item) {
  const payload = {
    request: item.request,
    response: item.response,
    tests: item.raw ? item.raw.testResults : undefined,
    assertions: item.raw ? item.raw.assertionResults : undefined,
    error: item.error,
  };

  return safeStringify(payload, 60000).toLowerCase();
}

function formatDuration(value) {
  if (value === undefined || value === null || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";

  if (number < 1) {
    return `${Math.round(number * 1000)} ms`;
  }
  if (number < 60) {
    return `${number.toFixed(2)} s`;
  }
  return `${(number / 60).toFixed(1)} min`;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    sizes.length - 1
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${sizes[i]}`;
}

function safeStringify(value, limit) {
  let text = "";
  try {
    text = typeof value === "string" ? value : JSON.stringify(value);
  } catch (error) {
    text = String(value);
  }
  if (limit && text.length > limit) {
    return text.slice(0, limit);
  }
  return text;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function showLoadError(message) {
  const errorEl = $("#file-error");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.add("show");
}

function clearLoadError() {
  const errorEl = $("#file-error");
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.classList.remove("show");
}

window.addEventListener("DOMContentLoaded", init);
