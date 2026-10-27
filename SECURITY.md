# Security Policy

## Reporting

Do not open public issues for suspected vulnerabilities. Contact the maintainers privately through the
repository's private security advisory channel, or email the address listed in the repository profile.

Include: affected version/commit, reproduction steps, and impact. We aim to acknowledge within 5 business days.

## Scope

FORGEKIT analyzes repositories **locally without executing their code**. Its findings are heuristic
file-presence checks — they are **not** a security audit, penetration test, or certification.

- FORGEKIT never runs imported project scripts, installs project dependencies, or evaluates project code.
- FORGEKIT does not query vulnerability databases; absence of findings is not evidence of safety.
- Secret handling: never commit tokens or private keys. FORGEKIT flags committed `.env` files by name only;
  it is not a secret scanner.

## Supported versions

Latest `main` only for this initial release. Security fixes are published as source patches.
