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
        refreshSelectedRowStyle();
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
        refreshSelectedRowStyle();
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
  refreshSelectedRowStyle();
}

function refreshSelectedRowStyle() {
  const tableEl = $("#results-table");
  if (!tableEl) return;
  const rows = tableEl.querySelectorAll(".tabulator-row");
  rows.forEach((rowEl) => {
    const rowId = rowEl.getAttribute("data-index");
    if (rowId && rowId === state.selectedId) {
      rowEl.classList.add("bruno-selected");
    } else {
      rowEl.classList.remove("bruno-selected");
    }
  });
}

function findResultById(id) {
  return state.results.find((result) => result.id === id);
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
