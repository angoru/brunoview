(function factory(globalScope) {
  const statusOrder = { error: 0, fail: 1, pass: 2 };

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
      const runObject =
        run && typeof run === "object" && !Array.isArray(run) ? run : {};
      const runResults = Array.isArray(runObject.results) ? runObject.results : [];
      runResults.forEach((result, index) => {
        if (!result || typeof result !== "object" || Array.isArray(result)) {
          return;
        }
        const request =
          result.request &&
          typeof result.request === "object" &&
          !Array.isArray(result.request)
            ? result.request
            : {};
        const response =
          result.response &&
          typeof result.response === "object" &&
          !Array.isArray(result.response)
            ? result.response
            : {};
        const test =
          result.test && typeof result.test === "object" && !Array.isArray(result.test)
            ? result.test
            : {};
        const testFilename =
          typeof test.filename === "string" ? test.filename : "";
        const testStats = collectTestStats(result);
        const httpStatus = response.status;
        const outcome = decideOutcome(result, testStats, httpStatus);

        const name =
          result.name ||
          (testFilename
            ? testFilename.split("/").pop().replace(/\.bru$/i, "")
            : null) ||
          result.path ||
          request.url ||
          `Result ${index + 1}`;

        const path = result.path || testFilename;
        const pathGroup = buildPathGroup(path);
        const method = request.method || "";
        const url = request.url || "";

        results.push({
          id: `${runIndex}-${index}`,
          runIndex,
          resultIndex: index,
          iterationIndex: result.iterationIndex ?? runObject.iterationIndex ?? 0,
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
    const value = typeof path === "string" ? path : String(path);
    const parts = value.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return parts[0];
  }

  function buildSearchIndex(name, path, url, method) {
    return {
      name: String(name || "").toLowerCase(),
      path: String(path || "").toLowerCase(),
      url: String(url || "").toLowerCase(),
      method: String(method || "").toLowerCase(),
      data: "",
    };
  }

  function collectTestStats(result) {
    const source =
      result && typeof result === "object" && !Array.isArray(result) ? result : {};
    const groups = [
      { label: "Tests", items: source.testResults },
      { label: "Pre-request", items: source.preRequestTestResults },
      { label: "Post-response", items: source.postResponseTestResults },
      { label: "Assertions", items: source.assertionResults },
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
    const hasError =
      result &&
      typeof result === "object" &&
      !Array.isArray(result) &&
      Boolean(result.error);
    if (hasError) return "error";
    if (testStats.fail > 0) return "fail";
    if (testStats.total === 0 && Number(httpStatus) >= 400) return "fail";
    return "pass";
  }

  function filterResults(results, filters) {
    const search = filters.search;
    const statusFilter = filters.status;
    const methods = filters.methods;
    const httpFilters = filters.http;
    const runs = filters.runs;
    const paths = filters.paths;
    const scopes = filters.searchScopes;

    const filtered = results.filter((item) => {
      const matchesSearch = !search
        ? true
        : getSearchText(item, scopes).includes(search);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "issues"
          ? item.outcome === "fail" || item.outcome === "error"
          : item.outcome === statusFilter;

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

    return sortResults(filtered, filters.sort);
  }

  function sortResults(results, sortKey) {
    const copy = [...results];
    if (sortKey === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === "stream") {
      copy.sort((a, b) => {
        if (a.runIndex !== b.runIndex) return b.runIndex - a.runIndex;
        if ((a.iterationIndex || 0) !== (b.iterationIndex || 0)) {
          return (b.iterationIndex || 0) - (a.iterationIndex || 0);
        }
        return (b.resultIndex || 0) - (a.resultIndex || 0);
      });
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
    const normalizedItem = item && typeof item === "object" ? item : {};
    const searchIndex =
      normalizedItem.searchIndex && typeof normalizedItem.searchIndex === "object"
        ? normalizedItem.searchIndex
        : buildSearchIndex(
            normalizedItem.name,
            normalizedItem.path,
            normalizedItem.url,
            normalizedItem.method
          );

    const activeScopes =
      scopes && scopes.size ? scopes : new Set(["name", "path", "url", "method"]);

    let buffer = "";
    if (activeScopes.has("name")) buffer += ` ${searchIndex.name}`;
    if (activeScopes.has("path")) buffer += ` ${searchIndex.path}`;
    if (activeScopes.has("url")) buffer += ` ${searchIndex.url}`;
    if (activeScopes.has("method")) buffer += ` ${searchIndex.method}`;
    if (activeScopes.has("data")) {
      if (!searchIndex.data) {
        searchIndex.data = buildSearchData(normalizedItem);
      }
      if (normalizedItem.searchIndex !== searchIndex) {
        normalizedItem.searchIndex = searchIndex;
      }
      buffer += ` ${searchIndex.data}`;
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

  const api = {
    normalizeData,
    validateResultsData,
    isRunWithResults,
    isResultLike,
    buildPathGroup,
    collectTestStats,
    decideOutcome,
    filterResults,
    sortResults,
    bucketHttpStatus,
    getSearchText,
    buildSearchData,
    safeStringify,
  };

  globalScope.BrunoCore = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
