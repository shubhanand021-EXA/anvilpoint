# Troubleshooting (Windows 11)

## `node` is not recognized
Install Node.js LTS v20+ from https://nodejs.org/ (free, open-source-adjacent runtime; check “Add to PATH”).
Close and reopen the terminal, then `node --version`.

## `npm ci` fails
1. `npm cache verify`, then retry `npm ci`.
2. Corporate proxy? `npm config get proxy` / `https-proxy`; unset if stale.
3. Still failing? Delete `node_modules` and `package-lock.json` is **not** recommended — instead run
   `npm install --package-lock-only` and report the error with your Node/npm versions.

## Dev server port in use
`npm run dev -- --port 5174` or close the other Vite instance.

## Import rejected my ZIP
Check the error message: archive over the size/entry budget, or not a ZIP (e.g. `.rar`, `.7z` are unsupported).
Raise limits in Settings only within the documented safe bounds.

## Blank page
Open DevTools (F12) → Console. Most often a stale `dist/` — run `npm run build` again.
