#!/usr/bin/env node
const path = require("path");
const { spawnSync } = require("child_process");

const script = path.join(__dirname, "..", "brunoview.ts");
const publicDir = path.join(__dirname, "..", "public");
const args = process.argv.slice(2);

const env = {
  ...process.env,
  BRUNOVIEW_PUBLIC_DIR: publicDir,
};

// Try bun first, fall back to npx bunx
const runners = [
  { cmd: "bun", args: ["run", script, ...args] },
  { cmd: "npx", args: ["--yes", "bun", "run", script, ...args] },
];

for (const runner of runners) {
  const result = spawnSync(runner.cmd, runner.args, { stdio: "inherit", env });
  if (result.error && result.error.code === "ENOENT") continue;
  process.exit(result.status ?? 1);
}

console.error("BrunoView requires Bun. Install it: https://bun.sh");
process.exit(1);
