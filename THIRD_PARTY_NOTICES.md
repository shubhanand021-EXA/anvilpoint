# Third-Party Notices

ANVILPOINT is MIT-licensed. The following runtime and build dependencies are bundled or required,
each verified as free and open-source under its stated license (checked against SPDX records,
October 2026). Only MIT/ISC/Apache-2.0/BSD-licensed packages are used.

## Runtime

| Package | Version | License | Notes |
|---|---|---|---|
| react | 18.3.1 | MIT | UI framework |
| react-dom | 18.3.1 | MIT | DOM rendering |
| jszip | 3.10.1 | MIT | Local ZIP parsing + generation (no network) |
| lucide-react | 0.469.0 | ISC | Icons |

## Build / test (not shipped to users)

| Package | Version | License | Notes |
|---|---|---|---|
| vite | 6.0.7 | MIT | Dev server + production build |
| typescript | 5.7.2 | Apache-2.0 | Strict typechecking |
| vitest | 3.0.0 | MIT | Unit/integration tests |
| jsdom | 25.0.1 | MIT | DOM test environment |
| @testing-library/react | 16.1.0 | MIT | Component tests |
| @testing-library/user-event | 14.5.2 | MIT | Interaction tests |
| @testing-library/jest-dom | 6.6.3 | MIT | DOM assertions |
| @vitejs/plugin-react | 4.3.4 | MIT | React fast refresh |
| @playwright/test | 1.64.1 | MIT | E2E screenshot automation (`scripts/shots.cjs`, dev-only) |
| electron | 45.0.0 | MIT | Desktop shell runtime (dev-only dep; not bundled source) |
| electron-builder | 26.18.0 | MIT | Windows installer/portable packaging (dev-only) |
| @types/node | 22.x | MIT | Node type definitions (build-time only) |
| @types/react | 18.3.18 | MIT | React type definitions (build-time only) |
| @types/react-dom | 18.3.5 | MIT | React DOM type definitions (build-time only) |

## Assets

- `public/ANVILPOINT.svg` — original ANVILPOINT mark, released under the project MIT license.
- System font stack only; no webfont downloads, no icon fonts.

## Unresolved questions

None at release. License texts: MIT and ISC permit the above use with attribution (this file);
Apache-2.0 (TypeScript, build-time only, not distributed) is compatible. If a version bump changes a
license, update this file before release.
