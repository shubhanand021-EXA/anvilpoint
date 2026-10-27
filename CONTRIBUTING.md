# Contributing to ANVILPOINT

Thanks for your interest. ANVILPOINT is MIT-licensed and built only with free, open-source tooling.

## Setup

1. Install Node.js LTS v20+ and npm 10+ (https://nodejs.org/).
2. `npm ci` — installs pinned dependencies from `package-lock.json`.
3. `npm run dev` — start the app at http://localhost:5173.
4. `npm test` and `npm run typecheck` — must pass before a PR.

## How to contribute

- Small, focused PRs: one rule, one parser, one page fix at a time.
- Core logic (`src/core/`) must have or update unit tests under `tests/unit/`.
- Never add a paid dependency, telemetry, or network call without explicit discussion and a privacy update.
- Rules must cite evidence (paths or explicit absence) and use honest statuses — never mark “passing” what was not inspected.
- Follow the existing TypeScript style: strict mode, no unexplained `any`, no suppressed errors.

## Pull requests

Fill in `.github/PULL_REQUEST_TEMPLATE.md`: what changed, how you tested (`npm test`, `npm run build`), and any limitations.
A maintainer will review for correctness, privacy, and scope honesty.
