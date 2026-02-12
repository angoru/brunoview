const { describe, expect, test } = require("bun:test");
const {
  normalizeData,
  decideOutcome,
  collectTestStats,
  filterResults,
} = require("../public/core.js");

describe("normalizeData", () => {
  test("normalizes an array of result-like items into one run", () => {
    const input = [
      {
        path: "users/get.bru",
        request: { method: "GET", url: "https://api.local/users" },
        response: { status: 200 },
      },
      {
        path: "users/create.bru",
        request: { method: "POST", url: "https://api.local/users" },
        response: { status: 201 },
      },
    ];

    const normalized = normalizeData(input);
    expect(normalized.runs.length).toBe(1);
    expect(normalized.results.length).toBe(2);
    expect(normalized.results[0].id).toBe("0-0");
    expect(normalized.results[1].id).toBe("0-1");
    expect(normalized.results[0].pathGroup).toBe("users/get.bru");
  });

  test("skips invalid entries inside run results without throwing", () => {
    const input = [
      {
        iterationIndex: 2,
        results: [
          null,
          "invalid",
          {
            path: "health/check.bru",
            request: { method: "GET", url: "https://api.local/health" },
            response: { status: 200 },
          },
        ],
      },
    ];

    const normalized = normalizeData(input);
    expect(normalized.runs.length).toBe(1);
    expect(normalized.results.length).toBe(1);
    expect(normalized.results[0].name).toBe("health/check.bru");
    expect(normalized.results[0].iterationIndex).toBe(2);
  });

  test("handles non-string test.filename without throwing", () => {
    const input = {
      results: [
        {
          test: { filename: { bad: true } },
          request: { method: "GET", url: "https://api.local/ping" },
          response: { status: 200 },
        },
      ],
    };

    const normalized = normalizeData(input);
    expect(normalized.results.length).toBe(1);
    expect(normalized.results[0].name).toBe("https://api.local/ping");
  });
});

describe("decideOutcome", () => {
  test("prioritizes error over failing tests and HTTP status", () => {
    const result = { error: { message: "network" } };
    const testStats = { total: 2, pass: 1, fail: 1 };
    expect(decideOutcome(result, testStats, 500)).toBe("error");
  });

  test("marks fail when tests fail", () => {
    const result = {};
    const testStats = { total: 3, pass: 2, fail: 1 };
    expect(decideOutcome(result, testStats, 200)).toBe("fail");
  });

  test("marks fail on 4xx/5xx with no tests", () => {
    const result = {};
    const testStats = { total: 0, pass: 0, fail: 0 };
    expect(decideOutcome(result, testStats, 404)).toBe("fail");
  });

  test("marks pass when no error, no failed tests, and good HTTP", () => {
    const result = {};
    const testStats = { total: 1, pass: 1, fail: 0 };
    expect(decideOutcome(result, testStats, 200)).toBe("pass");
  });
});

describe("filterResults", () => {
  test("applies all filters with AND semantics", () => {
    const base = normalizeData([
      {
        name: "Get users",
        path: "users/list.bru",
        runDuration: 0.7,
        request: { method: "GET", url: "https://api.local/users" },
        response: { status: 200 },
      },
      {
        name: "Create user",
        path: "users/create.bru",
        runDuration: 1.2,
        request: { method: "POST", url: "https://api.local/users" },
        response: { status: 201 },
      },
      {
        name: "Delete user",
        path: "users/delete.bru",
        runDuration: 0.9,
        request: { method: "DELETE", url: "https://api.local/users/1" },
        response: { status: 500 },
      },
    ]);

    const filters = {
      search: "create",
      status: "pass",
      methods: new Set(["POST"]),
      http: new Set(["2xx"]),
      runs: new Set([0]),
      paths: new Set(["users/create.bru"]),
      searchScopes: new Set(["name", "path", "url", "method"]),
      sort: "status",
    };

    const filtered = filterResults(base.results, filters);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe("Create user");
  });

  test("uses aggregated stats when deriving outcomes before filtering", () => {
    const result = {
      request: { method: "GET", url: "https://api.local/failing" },
      response: { status: 200 },
      testResults: [{ status: "fail", name: "should be 2xx" }],
    };

    const stats = collectTestStats(result);
    const outcome = decideOutcome(result, stats, result.response.status);
    expect(outcome).toBe("fail");
  });
});
