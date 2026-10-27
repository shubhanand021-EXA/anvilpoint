import type { AnalysisResult, Ecosystem } from '../../types.js';

export type DocKind =
  | 'README.md' | 'CONTRIBUTING.md' | 'SECURITY.md' | 'CODE_OF_CONDUCT.md'
  | 'CHANGELOG.md' | 'issue-bug.md' | 'issue-feature.md' | 'pull-request.md'
  | 'DEVELOPMENT.md' | 'RELEASE_CHECKLIST.md';

export interface DocField {
  key: string;
  label: string;
  placeholder: string;
  multiline: boolean;
}

export const DOC_FIELDS: Record<DocKind, DocField[]> = {
  'README.md': [
    { key: 'projectName', label: 'Project name', placeholder: 'e.g. my-project', multiline: false },
    { key: 'tagline', label: 'Short description', placeholder: 'One sentence: what does it do?', multiline: false },
    { key: 'features', label: 'Main features', placeholder: 'One per line', multiline: true },
    { key: 'install', label: 'Installation', placeholder: 'Verified install steps, or [TODO: fill in]', multiline: true },
    { key: 'usage', label: 'Usage', placeholder: 'Minimal example — do not invent CLI flags', multiline: true },
    { key: 'testing', label: 'Testing', placeholder: 'How to run tests', multiline: true },
    { key: 'license', label: 'License', placeholder: 'e.g. MIT — verify against LICENSE file', multiline: false },
    { key: 'limitations', label: 'Known limitations', placeholder: 'Be honest about what is unverified', multiline: true },
  ],
  'CONTRIBUTING.md': [
    { key: 'prereqs', label: 'Prerequisites', placeholder: 'Runtime versions', multiline: true },
    { key: 'setup', label: 'Setup steps', placeholder: 'Install + verify commands', multiline: true },
    { key: 'tests', label: 'Running tests', placeholder: 'Test command', multiline: true },
    { key: 'style', label: 'Style / lint', placeholder: 'Formatter + linter commands', multiline: true },
  ],
  'SECURITY.md': [
    { key: 'contact', label: 'Report contact', placeholder: '[TODO: security contact email or private channel]', multiline: false },
    { key: 'policy', label: 'Disclosure policy', placeholder: 'Response timeline, scope', multiline: true },
  ],
  'CODE_OF_CONDUCT.md': [
    { key: 'contact', label: 'Enforcement contact', placeholder: '[TODO: CoC enforcement contact]', multiline: false },
  ],
  'CHANGELOG.md': [
    { key: 'entries', label: 'Unreleased entries', placeholder: 'Added / Fixed entries under Unreleased', multiline: true },
  ],
  'issue-bug.md': [{ key: 'extra', label: 'Extra sections', placeholder: 'Optional project-specific fields', multiline: true }],
  'issue-feature.md': [{ key: 'extra', label: 'Extra sections', placeholder: 'Optional project-specific fields', multiline: true }],
  'pull-request.md': [{ key: 'extra', label: 'Extra sections', placeholder: 'Optional checklist additions', multiline: true }],
  'DEVELOPMENT.md': [
    { key: 'prereqs', label: 'Prerequisites', placeholder: 'Toolchain versions', multiline: true },
    { key: 'commands', label: 'Day-to-day commands', placeholder: 'Install / test / lint / build', multiline: true },
  ],
  'RELEASE_CHECKLIST.md': [
    { key: 'steps', label: 'Release steps', placeholder: 'Version bump, changelog, tag, publish', multiline: true },
  ],
};

export function inferredFacts(result: AnalysisResult | null): Record<string, string> {
  const facts: Record<string, string> = {};
  if (!result) return facts;
  facts['projectName'] = result.inventory.projectName;
  const node = result.findings.find((f) => f.id === 'SETUP-01');
  void node;
  return facts;
}

function installFor(eco: Ecosystem[]): string {
  if (eco.includes('node')) return 'npm ci\nnpm test';
  if (eco.includes('python')) return 'python -m venv .venv\npip install -r requirements.txt  # or: pip install -e .';
  if (eco.includes('rust')) return 'cargo build\ncargo test';
  if (eco.includes('go')) return 'go mod download\ngo build ./...\ngo test ./...';
  return '[TODO: document install steps — no ecosystem manifest detected]';
}

function scriptsFor(result: AnalysisResult | null): string {
  if (!result) return '[TODO: test command — verify locally]';
  const t = result.findings.find((f) => f.id === 'TEST-01');
  if (t && t.status === 'found') return `${t.evidence.slice(0, 3).join('\n')}\n[Verify each command locally before publishing]`;
  return '[TODO: test command — none detected; verify locally]';
}

export function renderDoc(kind: DocKind, values: Record<string, string>, result: AnalysisResult | null): string {
  const eco = result?.inventory.ecosystems ?? [];
  const name = values['projectName']?.trim() || result?.inventory.projectName || '[TODO: project name]';
  const v = (k: string, fallback: string) => {
    const s = (values[k] ?? '').trim();
    return s ? s : fallback;
  };
  switch (kind) {
    case 'README.md':
      return `# ${name}\n\n${v('tagline', '[TODO: one-sentence description]')}\n\n> Generated with ANVILPOINT. Fields marked [TODO] are placeholders — verify before publishing. Do not ship invented install commands or API claims.\n\n## Features\n\n${v('features', '[TODO: list verified features]')}\n\n## Installation\n\n\`\`\`sh\n${v('install', installFor(eco))}\n\`\`\`\n\n## Usage\n\n${v('usage', '[TODO: minimal verified example]')}\n\n## Development\n\n${v('testing', scriptsFor(result))}\n\n## Contributing\n\nSee [CONTRIBUTING.md](CONTRIBUTING.md).\n\n## Security\n\nSee [SECURITY.md](SECURITY.md).\n\n## License\n\n${v('license', '[TODO: license — verify against LICENSE file]')}\n\n## Limitations\n\n${v('limitations', '[TODO: known limitations and unverified claims]')}\n`;
    case 'CONTRIBUTING.md':
      return `# Contributing\n\n## Prerequisites\n\n${v('prereqs', installFor(eco))}\n\n## Setup\n\n\`\`\`sh\n${v('setup', installFor(eco))}\n\`\`\`\n\n## Tests\n\n\`\`\`sh\n${v('tests', scriptsFor(result))}\n\`\`\`\n\n## Style\n\n${v('style', '[TODO: formatter/linter commands — verify locally]')}\n\n## Pull requests\n\n- Keep changes focused; describe what and why.\n- Update docs and CHANGELOG where relevant.\n- Do not commit secrets. Never paste tokens or private keys.\n`;
    case 'SECURITY.md':
      return `# Security Policy\n\n## Reporting\n\n${v('contact', '[TODO: private security contact — do not use public issues for vulnerabilities]')}\n\n## Expectations\n\n${v('policy', 'We aim to acknowledge reports promptly. Please include affected versions, reproduction steps, and impact. Do not disclose publicly before a fix is available.')}\n\n> ANVILPOINT findings are heuristic file-presence checks, not a security audit.\n`;
    case 'CODE_OF_CONDUCT.md':
      return `# Code of Conduct\n\nWe follow the spirit of the [Contributor Covenant](https://www.contributor-covenant.org/). Be respectful, inclusive, and constructive.\n\n## Enforcement\n\n${v('contact', '[TODO: enforcement contact]')}\n\nUnacceptable behavior may result in moderation action by maintainers.\n`;
    case 'CHANGELOG.md':
      return `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).\n\n## [Unreleased]\n\n${v('entries', '### Added\n- [TODO]\n\n### Fixed\n- [TODO]')}\n`;
    case 'issue-bug.md':
      return `---\nname: Bug report\nabout: Report a reproducible problem\nlabels: bug\n---\n\n## Description\n\n[TODO: what happened]\n\n## Reproduction\n\n1. [TODO: steps]\n2. [TODO: expected vs actual]\n\n## Environment\n\n- Version/commit: [TODO]\n- OS / runtime: [TODO]\n\n${v('extra', '')}\n`;
    case 'issue-feature.md':
      return `---\nname: Feature request\nabout: Suggest an improvement\nlabels: enhancement\n---\n\n## Problem\n\n[TODO: what problem does this solve]\n\n## Proposal\n\n[TODO: proposed change]\n\n## Alternatives\n\n[TODO]\n\n${v('extra', '')}\n`;
    case 'pull-request.md':
      return `## Summary\n\n[TODO: what and why]\n\n## Changes\n\n- [TODO]\n\n## Verification\n\n- [ ] Tests added/updated\n- [ ] Docs updated\n- [ ] CHANGELOG updated\n- [ ] No secrets committed\n\n${v('extra', '')}\n`;
    case 'DEVELOPMENT.md':
      return `# Development Setup\n\n_Ecosystems detected: ${eco.length > 0 ? eco.join(', ') : 'none (verify manually)'}._\n\n## Prerequisites\n\n${v('prereqs', installFor(eco))}\n\n## Commands\n\n\`\`\`sh\n${v('commands', scriptsFor(result))}\n\`\`\`\n\n> Commands marked [TODO] or inferred from manifests must be verified locally. ANVILPOINT never executes project code.\n`;
    case 'RELEASE_CHECKLIST.md':
      return `# Release Checklist\n\n${v('steps', '- [ ] Bump version (semver)\n- [ ] Update CHANGELOG.md\n- [ ] Run full test suite locally\n- [ ] Verify license + third-party notices\n- [ ] Tag release and publish notes\n- [ ] Verify install from a clean checkout')}\n`;
  }
}
