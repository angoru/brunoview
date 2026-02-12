function init() {
  if (!core) {
    showLoadError("No se pudo inicializar Brunoview (core.js no está cargado).");
    return;
  }

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
    const errorMessage = validateInputData(data);
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
  state.activeReadId += 1;
  const readId = state.activeReadId;
  clearLoadError();
  showToast(`Loading ${file.name}...`);
  const reader = new FileReader();
  reader.onload = async () => {
    if (readId !== state.activeReadId) return;
    let data;
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (readId !== state.activeReadId) return;
      data = JSON.parse(reader.result);
      const errorMessage = validateInputData(data);
      if (errorMessage) {
        if (readId !== state.activeReadId) return;
        showLoadError("No se ha podido cargar el archivo. Revisa el formato JSON.");
        return;
      }
    } catch (error) {
      if (readId !== state.activeReadId) return;
      showLoadError("No se ha podido cargar el archivo. Revisa el formato JSON.");
      return;
    }

    if (readId !== state.activeReadId) return;
    try {
      consumeData(data, { name: file.name, size: file.size, source: "file" });
    } catch (error) {
      if (readId !== state.activeReadId) return;
      showLoadError("Se cargó el JSON, pero falló el procesamiento de resultados.");
      console.error(error);
    }
  };
  reader.onerror = () => {
    if (readId !== state.activeReadId) return;
    showLoadError("No se ha podido cargar el archivo. Revisa el formato JSON.");
  };
  reader.readAsText(file);
}

function consumeData(data, meta) {
  clearLoadError();
  const normalized = normalizeInputData(data);
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
  state.filters.status = "issues";
  state.filters.methods = new Set();
  state.filters.http = new Set(["2xx", "3xx", "4xx", "5xx", "other"]);
  state.filters.runs = new Set();
  state.filters.paths = new Set();
  state.filters.searchScopes = new Set(["name", "path", "url", "method"]);
  state.filters.sort = "stream";

  const searchInput = $("#search-input");
  if (searchInput) searchInput.value = "";

  const sortSelect = $("#sort-select");
  if (sortSelect) sortSelect.value = "stream";

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

function normalizeInputData(data) {
  if (core && typeof core.normalizeData === "function") {
    return core.normalizeData(data);
  }
  return { runs: [], results: [] };
}

function validateInputData(data) {
  if (core && typeof core.validateResultsData === "function") {
    return core.validateResultsData(data);
  }
  return "Invalid results JSON: missing core validator.";
}

window.addEventListener("DOMContentLoaded", init);
