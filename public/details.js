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
  meta.appendChild(makeMetaChip(item.method || "method", "text-bg-info"));
  meta.appendChild(makeMetaChip(`HTTP ${item.httpStatus || "-"}`, "text-bg-light"));

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
  meta.appendChild(makeMetaChip(`Iteration ${item.iterationIndex}`, "text-bg-light"));
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
  addKeyValue(
    list,
    "Content Length",
    response.headers && response.headers["content-length"]
      ? response.headers["content-length"]
      : "-"
  );
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
    fullText = typeof value === "string" ? value : JSON.stringify(value, null, 2);
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

