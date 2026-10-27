# Privacy model

- **Local-first.** ZIP parsing, manifest reading, rules, scoring, doc/CI generation, and exports all run in the browser tab.
- **No network by default.** No analytics, telemetry, fonts, or API calls. The only network use is npm at install time and the optional public-repo lookup (off by default).
- **Nothing stored except settings.** `localStorage` holds theme, limits, export prefs, and (opt-in) checklist progress. Repository file contents are memory-only and released on “Clear workspace”.
- **Clear data.** Settings → Danger zone → “Delete everything”, or the top-bar “Clear workspace” for the project only.
- **Secrets.** Never paste tokens, passwords, or private keys into FORGEKIT. Generated CI templates never contain secrets.
