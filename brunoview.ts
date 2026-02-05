#!/usr/bin/env bun
import { basename, join, normalize, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const args = Bun.argv.slice(2);

const options = {
  file: "",
  host: "127.0.0.1",
  port: 0,
  open: true,
  publicDir: "",
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  }
  if (arg === "--no-open") {
    options.open = false;
    continue;
  }
  if (arg === "--host") {
    options.host = args[i + 1] || options.host;
    i += 1;
    continue;
  }
  if (arg === "--port") {
    const next = Number(args[i + 1]);
    if (!Number.isNaN(next)) {
      options.port = next;
    }
    i += 1;
    continue;
  }
  if (arg === "--file") {
    options.file = args[i + 1] || options.file;
    i += 1;
    continue;
  }
  if (arg === "--public") {
    options.publicDir = args[i + 1] || options.publicDir;
    i += 1;
    continue;
  }
  if (!arg.startsWith("-") && !options.file) {
    options.file = arg;
  }
}

const publicPath = resolvePublicDir(options.publicDir);

const resultsPath = options.file ? Bun.file(options.file) : null;
if (options.file && resultsPath && !(await resultsPath.exists())) {
  console.error(`Results file not found: ${options.file}`);
  process.exit(1);
}

const server = Bun.serve({
  hostname: options.host,
  port: options.port,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname.startsWith("/api/results")) {
      if (!resultsPath) {
        return new Response("No results file configured", { status: 404 });
      }
      const headers = new Headers({
        "Content-Type": "application/json",
        "X-Results-File": basename(options.file),
      });
      const size = resultsPath.size;
      if (typeof size === "number") {
        headers.set("Content-Length", String(size));
      }
      return new Response(resultsPath, { headers });
    }

    const requested = url.pathname === "/" ? "index.html" : url.pathname;
    const normalized = normalize(requested).replace(/^([/\\])+/, "");
    const safePath = normalized.replace(/^(\.\.[/\\])+/, "");
    const filePath = join(publicPath, safePath);

    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not found", { status: 404 });
  },
});

const address = server.hostname || "127.0.0.1";
const port = server.port;
const url = `http://${address}:${port}/`;

console.log(`BrunoView running at ${url}`);
if (options.file) {
  console.log(`Loaded ${options.file}`);
}

if (options.open) {
  openBrowser(url);
}

function printHelp() {
  console.log(`\nBrunoView (Bun)\n\nUsage:\n  bun run brunoview.ts [results.json]\n\nOptions:\n  --file <path>      Path to results.json to preload\n  --public <path>    Override path to the public assets directory\n  --host <host>      Host interface to bind (default: 127.0.0.1)\n  --port <port>      Port to bind (default: auto)\n  --no-open          Do not open the browser automatically\n`);
}

function openBrowser(targetUrl) {
  const platform = process.platform;
  let command = [];

  if (platform === "darwin") {
    command = ["open", targetUrl];
  } else if (platform === "win32") {
    command = ["cmd", "/c", "start", "", targetUrl];
  } else {
    command = ["xdg-open", targetUrl];
  }

  try {
    Bun.spawn(command, { stdout: "ignore", stderr: "ignore", stdin: "ignore" });
  } catch {
    // Ignore failures to open the browser.
  }
}

function resolvePublicDir(override) {
  if (override) {
    const resolved = normalizePath(override);
    if (existsSync(resolved)) return resolved;
  }

  const envPath = process.env.BRUNOVIEW_PUBLIC_DIR;
  if (envPath) {
    const resolved = normalizePath(envPath);
    if (existsSync(resolved)) return resolved;
  }

  const fromImport = fileURLToPath(new URL("./public/", import.meta.url));
  if (existsSync(fromImport)) return fromImport;

  const fromExec = join(process.execPath ? dirname(process.execPath) : ".", "public");
  if (existsSync(fromExec)) return fromExec;

  const fromCwd = join(process.cwd(), "public");
  if (existsSync(fromCwd)) return fromCwd;

  throw new Error("Could not locate public assets directory.");
}

function normalizePath(value) {
  return resolve(value);
}
