# BrunoView

**Made with AI**

BrunoView is a local, web-based viewer for Bruno JSON test logs. It can load a
`results.json` file automatically or via drag-and-drop.

## Run (Bun)

```bash
bun run brunoview.ts /path/to/results.json
```

This starts a local server, opens your browser, and preloads the JSON file.

## Install with npm

Global install:

```bash
npm install -g @angoru/brunoview
brunoview /path/to/results.json
```

One-off run (no global install):

```bash
npx @angoru/brunoview /path/to/results.json
```

> **Note:** BrunoView requires [Bun](https://bun.sh) to run. If Bun is not installed, the CLI will attempt to use it via npx.

## Load manually

- Click **Load JSON file** and select a file.
- Or drag a JSON file onto the drop zone.

## Notes

- Large files may take a few seconds to parse in the browser.
- The viewer is static HTML/JS and runs fully offline.

## Release automation

Tag a version like `v0.1.0` and push. GitHub Actions will create a GitHub
release and publish the package to npm.
