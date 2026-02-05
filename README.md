# BrunoView

**Made with AI**

BrunoView is a local, web-based viewer for Bruno JSON test logs. It can load a
`results.json` file automatically or via drag-and-drop.

## Run (Bun)

```bash
bun run brunoview.ts /path/to/results.json
```

This starts a local server, opens your browser, and preloads the JSON file.

## Load manually

- Click **Load JSON file** and select a file.
- Or drag a JSON file onto the drop zone.

## Notes

- Large files may take a few seconds to parse in the browser.
- The viewer is static HTML/JS and runs fully offline.

## Distribute (npm with prebuilt binaries)

1) Build a binary for each platform you want to ship:

```bash
bun build --compile ./brunoview.ts --outfile dist/linux-x64/brunoview
bun build --compile ./brunoview.ts --outfile dist/macos-arm64/brunoview
bun build --compile ./brunoview.ts --outfile dist/macos-x64/brunoview
bun build --compile ./brunoview.ts --outfile dist/windows-x64/brunoview.exe
```

2) Publish to npm from this repo (package name is `@angoru/brunoview`).

The CLI will run the correct binary and point it at the packaged `public/`
assets automatically.

## Release automation

Tag a version like `v0.1.0` and push. GitHub Actions will build binaries for
Linux, macOS (x64 + arm64), and Windows, then attach zips to the release.
