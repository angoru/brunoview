(function initTheme() {
  const saved = localStorage.getItem("brunoview-theme");
  const theme = saved || "dark";
  document.documentElement.setAttribute("data-bs-theme", theme);
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector("#theme-toggle");
    if (!btn) return;
    btn.textContent = theme === "dark" ? "\u2600" : "\u263E";
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-bs-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-bs-theme", next);
      btn.textContent = next === "dark" ? "\u2600" : "\u263E";
      localStorage.setItem("brunoview-theme", next);
    });
  });
})();

const state = {
  runs: [],
  results: [],
  filtered: [],
  selectedId: null,
  selectedItem: null,
  table: null,
  tableClickBound: false,
  manualLoad: false,
  activeReadId: 0,
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

const core = window.BrunoCore || null;
const $ = (selector) => document.querySelector(selector);
