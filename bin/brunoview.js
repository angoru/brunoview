#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

const platformMap = {
  win32: "windows",
  darwin: "macos",
  linux: "linux",
};

const archMap = {
  x64: "x64",
  arm64: "arm64",
};

const platform = platformMap[process.platform];
const arch = archMap[process.arch];

if (!platform || !arch) {
  console.error("Unsupported platform or architecture.");
  console.error(`platform: ${process.platform}, arch: ${process.arch}`);
  process.exit(1);
}

const exeName = process.platform === "win32" ? "brunoview.exe" : "brunoview";
const binPath = path.join(
  __dirname,
  "..",
  "dist",
  `${platform}-${arch}`,
  exeName
);

if (!fs.existsSync(binPath)) {
  console.error("Missing compiled binary.");
  console.error(`Expected: ${binPath}`);
  process.exit(1);
}

const publicDir = path.join(__dirname, "..", "public");
const args = process.argv.slice(2);

const env = {
  ...process.env,
  BRUNOVIEW_PUBLIC_DIR: publicDir,
};

const result = spawnSync(binPath, args, {
  stdio: "inherit",
  env,
});

process.exit(result.status ?? 1);
