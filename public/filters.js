function buildStatusFilters() {
  const container = $("#status-filters");
  container.innerHTML = "";
  ["issues", "all", "pass", "fail", "error"].forEach((status) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `btn btn-sm btn-outline-secondary bruno-chip ${status}`;
    chip.textContent = status === "issues" ? "ISSUES" : status.toUpperCase();
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

  const paths = getAvailablePathGroups();
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
        state.filters.paths = new Set(getAvailablePathGroups());
      } else {
        state.filters.paths = new Set([value]);
      }
      applyFilters();
    });
    select.dataset.bound = "true";
  }
}

function getAvailablePathGroups() {
  return Array.from(new Set(state.results.map((item) => item.pathGroup))).sort();
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
  const filtered =
    core && typeof core.filterResults === "function"
      ? core.filterResults(state.results, state.filters)
      : state.results;

  state.filtered = filtered;

  if (state.selectedId && !filtered.some((item) => item.id === state.selectedId)) {
    state.selectedId = filtered[0] ? filtered[0].id : null;
    state.selectedItem = filtered[0] || null;
  }

  renderTable();
  renderDetails();
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
