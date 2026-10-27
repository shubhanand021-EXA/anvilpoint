# Anvilpoint Desktop (Windows)

Anvilpoint ships as a real Windows desktop app: an **NSIS installer**
(`Anvilpoint-Setup-<version>.exe`) and a **portable build**
(`Anvilpoint-Portable-<version>.exe`, no install needed). Both wrap the exact
same audited web bundle — analysis still runs locally, nothing is uploaded.

## For users

1. Download the installer or portable EXE from the
   [GitHub Releases page](https://github.com/shubhanand021-EXA/anvilpoint/releases).
2. Run it. The portable build needs no admin rights and writes nothing to the registry.
3. **SmartScreen notice (expected):** the app is *unsigned*. Code-signing
   certificates cost money, and this project keeps a ₹0 budget, so Windows
   SmartScreen will show "Unknown publisher". Click *More info → Run anyway*
   only if you downloaded from the official releases page above.
4. Your data stays in the app's local profile (settings, opt-in history).
   Uninstall via *Settings → Apps*, or just delete the portable EXE.

## For maintainers — building

Prerequisites: Node.js LTS v20+, ~500 MB free for the Electron runtime download.

```powershell
npm ci
npm run dist:win     # builds dist/ then NSIS + portable into dist-desktop/
```

Fast iteration without packaging:

```powershell
npm run desktop      # builds dist/ and launches the Electron shell
```

Headless smoke test (prints version, exits — used in CI-less environments):

```powershell
.\dist-desktop\win-unpacked\Anvilpoint.exe --version
```

## Security notes

- Renderer runs **sandboxed**: `nodeIntegration: false`, `contextIsolation: true`,
  `sandbox: true`. Untrusted ZIP content never gains Node access.
- External links (`target=_blank`, registry links) are intercepted and opened in
  the system browser; in-app navigation to non-`file:` URLs is blocked.
- No auto-updater is bundled: updates are manual downloads from Releases, so a
  compromised update channel cannot silently push code. This is deliberate.
- Unsigned builds: see SmartScreen note above. Reproducible builds are future work.
