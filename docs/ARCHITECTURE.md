# Architecture

```
User ZIP ─▶ validate limits ─▶ JSZip parse ─▶ normalize + reject unsafe paths
        ─▶ strip common root ─▶ classify text/binary ─▶ budget reads
        ─▶ RepositoryInventory ─▶ parse manifests ─▶ rule engine (evidence)
        ─▶ findings + deps + score ─▶ React pages (import/inventory/findings/docs/deps/ci/checklist/reports/settings)
```

## Key decisions

- **Frontend-only.** No server, DB, or auth. `JSZip` runs in-browser; all analysis is synchronous local computation.
- **Untrusted input.** Archive entries are data: absolute paths, `..`, NUL bytes, and duplicates are rejected; budgets cap entries/bytes; text decode is fatal-strict with a safe fallback.
- **Never execute.** No `eval`, no `new Function`, no script running, no dependency install from the analyzed repo.
- **Evidence-first rules.** Each finding carries `evidence[]`, rule id, remediation, verification method, confidence, and an honest status enum.
- **Transparent scoring.** Weights 1–8; found = full, needs-review/limited = half, missing/unable = zero, N/A excluded. Methodology string ships in every report.
- **Generators are templates.** Docs render from verified fields + explicit `[TODO]` placeholders; CI renders pinned-action YAML with `contents: read`. Nothing auto-commits.

## State

`AppProvider` holds: current page, settings (localStorage), import result (memory only),
selected file, search, checklist, toasts. Repository text is never written to storage.
