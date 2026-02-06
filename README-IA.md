# BrunoView: A Bruno API Test Log Viewer Built Entirely with AI

*This is a submission for the [GitHub Copilot CLI Challenge](https://dev.to/challenges/github-2026-01-21)*

## What I Built

**BrunoView** is a local, web-based viewer for [Bruno](https://www.usebruno.com/) JSON test logs. Bruno is an open-source API client (like Postman), and when you run test collections, it outputs JSON logs. BrunoView makes those logs easy to browse, filter, and debug.

Key features:
- 🚀 **Instant startup** — runs a local server and opens your browser automatically
- 📂 **Drag-and-drop** — load JSON files via file picker or drop zone
- 🔍 **Smart filtering** — filter by status, HTTP method, path, and full-text search
- 📊 **Rich details panel** — inspect request/response headers, bodies, and assertions
- 💻 **Cross-platform** — works on Linux, macOS, and Windows via npm or standalone binary

Built with Bun and vanilla JavaScript, BrunoView runs fully offline and handles large test logs efficiently.

## Demo

📦 **Install:** `npx @angoru/brunoview /path/to/results.json`

🔗 **Repository:** [github.com/angoru/brunoview](https://github.com/angoru/brunoview)

<!-- Add your screenshot or video here -->

## My Experience with GitHub Copilot CLI

**BrunoView was built 100% with GitHub Copilot CLI** — I didn't write a single line of code manually.

### How I used it:

1. **Project scaffolding** — I described what I wanted ("a local web viewer for Bruno JSON logs using Bun") and Copilot CLI generated the initial server, HTML, CSS, and JavaScript.

2. **Iterative refinement** — Each feature was added through conversation: "add a filter for HTTP methods", "make the table sortable", "add drag-and-drop support". Copilot understood context and made surgical edits.

3. **Cross-platform support** — Setting up npm packaging with prebuilt binaries for multiple platforms was complex, but Copilot handled `package.json` configuration, build scripts, and the CLI wrapper.

4. **Debugging** — When something didn't work, I'd describe the issue and Copilot would investigate, identify the root cause, and fix it.

### Impact on development:

- ⏱️ **Speed** — What would have taken days took hours
- 🎯 **Focus** — I focused on *what* I wanted, not *how* to implement it
- 📚 **Learning** — Watching Copilot's approach taught me new patterns (Bun APIs, Tabulator.js)
- 🔄 **Iteration** — Easy to experiment with different approaches without rewriting code

The "Made with AI" badge in BrunoView isn't marketing — it's literally true. GitHub Copilot CLI transformed me from a coder into a product designer who happens to ship working software.
