# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Status

**This project is empty — scaffolded, not yet implemented.** As of 2026-09-06 the
directory contains no source files. Update every section below as real code lands;
do not leave stale placeholder text in place.

## Project Overview

Agency_Project — a data-analysis project under
`Documents/Data Desktop/Data_Analysis/`. Purpose, scope, and deliverables are not
yet defined. Fill this in before writing code.

## Environment

- Platform: Windows 11
- Shell: PowerShell (primary). A Bash tool is also available; each takes its own
  syntax. Do not mix them — `&&` and `||` are parser errors in Windows PowerShell 5.1.
- Not a git repository yet. Run `git init` before the first commit.

## Commands

No build, test, lint, or run commands exist yet. Record them here as they are
added, e.g.:

```
# install deps
# run tests
# run the app
```

## Architecture

Nothing to describe yet. When structure emerges, document the parts that are not
obvious from reading a single file: module boundaries, data flow, where inputs
come from, where outputs go.

## Conventions

- Match the style of surrounding code once a codebase exists.
- Keep raw data out of version control; commit the code that produces results,
  not the results themselves, unless they are small and reviewable.

## Codebase Memory

This project is indexed by the codebase-memory MCP server as project
`agency-project`. The shareable graph artifact lives at
`.codebase-memory/graph.db.zst`.

Re-index after significant structural changes:

```
index_repository(repo_path=".", name="agency-project", persistence=true)
```

Useful queries: `search_graph` to find symbols by name pattern, `trace_path` to
find callers/callees, `detect_changes` to map a diff onto affected symbols.
