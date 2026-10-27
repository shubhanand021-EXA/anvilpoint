import type {
  Ecosystem,
  Finding,
  FindingCategory,
  ProjectFile,
  RepositoryInventory,
  Severity,
} from '../../types.js';
import type { ParsedManifest } from '../parsers/manifests.js';

function hasPath(files: ProjectFile[], exactLower: string): ProjectFile | undefined {
  return files.find((f) => f.path.toLowerCase() === exactLower);
}

function hasBasename(files: ProjectFile[], base: string): ProjectFile | undefined {
  const b = base.toLowerCase();
  return files.find((f) => (f.path.toLowerCase().split('/').pop() ?? '') === b);
}

function hasDir(files: ProjectFile[], dir: string, inv: RepositoryInventory): boolean {
  const d = dir.toLowerCase();
  if (inv.directories.some((x) => x.toLowerCase() === d || x.toLowerCase().startsWith(d + '/'))) return true;
  return files.some((f) => f.path.toLowerCase().startsWith(d + '/'));
}

function hasGlob(files: ProjectFile[], re: RegExp): ProjectFile[] {
  return files.filter((f) => re.test(f.path.toLowerCase()));
}

export interface RuleContext {
  inventory: RepositoryInventory;
  manifests: ParsedManifest[];
  ecosystems: Ecosystem[];
}

let n = 0;
function mk(
  id: string,
  title: string,
  category: FindingCategory,
  severity: Severity,
  status: Finding['status'],
  explanation: string,
  whyItMatters: string,
  evidence: string[],
  rule: string,
  remediation: string,
  verification: string,
  confidence: Finding['confidence'],
  autoVerifiable: boolean,
  weight: number,
): Finding {
  n++;
  void n;
  return { id, title, category, severity, status, explanation, whyItMatters, evidence, rule, remediation, verification, confidence, autoVerifiable, weight };
}

/** Rule engine: every finding cites evidence paths or states the absence explicitly. */
export function evaluateRules(ctx: RuleContext): Finding[] {
  const { inventory, manifests, ecosystems } = ctx;
  const files = inventory.files;
  const out: Finding[] = [];

  // --- Documentation ---
  const readme = hasBasename(files, 'readme.md') ?? hasBasename(files, 'readme');
  out.push(mk('DOC-01', 'Project README', 'documentation', readme ? 'info' : 'medium',
    readme ? 'found' : 'missing',
    readme ? `README found at ${readme.path}.` : 'No README.md found at any level.',
    'The README is the entry point for users and contributors.',
    readme ? [readme.path] : ['(no readme.md in inventory)'],
    'readme-present', readme ? 'Keep it current.' : 'Add a README.md describing purpose, install, usage, and license.',
    'File presence check', 'high', true, 8));

  const contributing = hasBasename(files, 'contributing.md');
  out.push(mk('DOC-02', 'Contribution guidance file', 'documentation', contributing ? 'info' : 'low',
    contributing ? 'found' : 'missing',
    contributing ? `CONTRIBUTING.md at ${contributing.path}.` : 'No CONTRIBUTING.md found.',
    'Explicit contribution steps reduce maintainer burden.',
    contributing ? [contributing.path] : ['(no contributing.md)'],
    'contributing-present', 'Generate one in Documentation Studio.', 'File presence check', 'high', true, 3));

  const changelog = hasBasename(files, 'changelog.md') ?? hasBasename(files, 'changelog');
  out.push(mk('DOC-03', 'Changelog practice', 'release', changelog ? 'info' : 'low',
    changelog ? 'found' : 'missing',
    changelog ? `Changelog at ${changelog.path}.` : 'No CHANGELOG found; release history is unverifiable from files.',
    'Changelogs communicate breaking changes and upgrade paths.',
    changelog ? [changelog.path] : ['(no changelog)'],
    'changelog-present', 'Add CHANGELOG.md (Keep a Changelog format).', 'File presence check', 'high', true, 3));

  // --- Organization ---
  const srcDir = hasDir(files, 'src', inventory) || hasDir(files, 'lib', inventory) || hasDir(files, 'app', inventory);
  out.push(mk('ORG-01', 'Conventional source layout', 'organization', 'low',
    srcDir ? 'found' : 'needs-review',
    srcDir ? 'A conventional source directory (src/, lib/ or app/) is present.' : 'No src/, lib/ or app/ directory detected.',
    'Predictable layout helps new contributors navigate.',
    srcDir ? inventory.directories.filter((d) => /^(src|lib|app)/i.test(d)).slice(0, 5) : ['(no src/lib/app dir)'],
    'source-layout', 'Document the layout in README if unconventional.', 'Directory listing', 'medium', true, 2));

  const testDir = hasDir(files, 'tests', inventory) || hasDir(files, 'test', inventory) || hasDir(files, '__tests__', inventory);
  const testFiles = hasGlob(files, /(\.test\.|\.spec\.|_test\.go|test_.*\.py|tests?\/)/i);
  out.push(mk('ORG-02', 'Test locations discoverable', 'organization', testDir || testFiles.length > 0 ? 'info' : 'medium',
    testDir || testFiles.length > 0 ? 'found' : 'missing',
    testDir || testFiles.length > 0
      ? `Test locations: ${[...inventory.directories.filter((d) => /test/i.test(d)), ...testFiles.slice(0, 3).map((f) => f.path)].slice(0, 5).join(', ') || 'test files present'}.`
      : 'No test directory or test-named files detected.',
    'Discoverable tests are a prerequisite for repeatable verification.',
    testDir || testFiles.length > 0 ? [...inventory.directories.filter((d) => /test/i.test(d)).slice(0, 3), ...testFiles.slice(0, 3).map((f) => f.path)] : ['(no test paths)'],
    'test-layout', 'Add a tests/ directory and document how to run tests.', 'Path scan', 'medium', true, 4));

  // --- Setup ---
  const nodeManifest = manifests.find((m) => m.ecosystem === 'node');
  if (ecosystems.includes('node')) {
    const scripts = (nodeManifest?.facts['scripts'] as Record<string, unknown> | undefined) ?? undefined;
    const keys = scripts && typeof scripts === 'object' ? Object.keys(scripts) : [];
    out.push(mk('SETUP-01', 'Node scripts documented', 'setup', keys.length > 0 ? 'info' : 'medium',
      keys.length > 0 ? 'found' : 'missing',
      keys.length > 0 ? `package.json scripts: ${keys.slice(0, 8).join(', ')}.` : 'package.json has no scripts, or package.json is missing/unparseable.',
      'Scripts make install/test/build repeatable.',
      nodeManifest ? [nodeManifest.path] : ['(no package.json)'],
      'node-scripts', 'Add test/build/lint scripts and document them.', 'package.json scripts field', 'high', true, 4));
  }

  const gitignore = hasBasename(files, '.gitignore');
  out.push(mk('SETUP-02', 'VCS ignore rules', 'setup', gitignore ? 'info' : 'low',
    gitignore ? 'found' : 'missing',
    gitignore ? `.gitignore at ${gitignore.path}.` : 'No .gitignore found; build artifacts or secrets may be committed accidentally.',
    'Ignore rules prevent leaking node_modules, .env, and build output.',
    gitignore ? [gitignore.path] : ['(no .gitignore)'],
    'gitignore-present', 'Add a .gitignore appropriate to the ecosystem.', 'File presence check', 'high', true, 3));

  // --- Testing ---
  const testConfig = hasGlob(files, /(vitest\.config|jest\.config|pytest\.ini|tox\.ini|\.coveragerc|codecov\.ya?ml)/i);
  const hasTestScript = (() => {
    const s = nodeManifest?.facts['scripts'] as Record<string, unknown> | undefined;
    return !!(s && typeof s === 'object' && 'test' in s);
  })();
  const testingEvidence = [...testConfig.map((f) => f.path), ...(nodeManifest && hasTestScript ? [`${nodeManifest.path}#scripts.test`] : [])];
  const testingFound = testConfig.length > 0 || hasTestScript || testFiles.length > 0;
  out.push(mk('TEST-01', 'Repeatable test entry point', 'testing', testingFound ? 'info' : 'high',
    testingFound ? (testConfig.length > 0 || hasTestScript ? 'found' : 'needs-review') : 'missing',
    testingFound
      ? `Test evidence: ${testingEvidence.concat(testFiles.slice(0, 2).map((f) => f.path)).join(', ') || 'test files present'}.`
      : 'No test config, test script, or test files detected. FORGEKIT did not run anything; it only looked for entry points.',
    'Without a repeatable test command, regressions go unnoticed.',
    testingFound ? testingEvidence.concat(testFiles.slice(0, 3).map((f) => f.path)) : ['(no test config/script/files)'],
    'test-entry-point', 'Add a test script/config and document the command.', 'Static presence check only — tests were not executed', 'medium', true, 7));

  // --- Formatting ---
  const formatter = hasGlob(files, /(\.prettierrc|prettier\.config|eslint|biome\.json|\.flake8|ruff\.toml|pyproject\.toml|rustfmt\.toml|\.golangci)/i);
  out.push(mk('FMT-01', 'Formatter / linter configuration', 'formatting', formatter.length > 0 ? 'info' : 'low',
    formatter.length > 0 ? 'found' : 'missing',
    formatter.length > 0 ? `Config: ${formatter.slice(0, 4).map((f) => f.path).join(', ')}.` : 'No formatter or linter config detected.',
    'Automated formatting reduces review friction.',
    formatter.length > 0 ? formatter.slice(0, 4).map((f) => f.path) : ['(no formatter config)'],
    'formatter-present', 'Adopt Prettier/ESLint, Ruff, rustfmt, or gofmt config.', 'File presence check', 'medium', true, 3));

  const editorconfig = hasBasename(files, '.editorconfig');
  out.push(mk('FMT-02', 'Editor consistency (EditorConfig)', 'formatting', 'low',
    editorconfig ? 'found' : 'missing',
    editorconfig ? `.editorconfig at ${editorconfig.path}.` : 'No .editorconfig; indentation/line-ending conventions are implicit.',
    'EditorConfig keeps whitespace consistent across editors.',
    editorconfig ? [editorconfig.path] : ['(no .editorconfig)'],
    'editorconfig-present', 'Add a small .editorconfig.', 'File presence check', 'high', true, 1));

  // --- CI ---
  const workflows = hasGlob(files, /\.github\/workflows\/.*\.ya?ml/i);
  out.push(mk('CI-01', 'Continuous integration workflow', 'ci', workflows.length > 0 ? 'info' : 'medium',
    workflows.length > 0 ? 'found' : 'missing',
    workflows.length > 0 ? `Workflows: ${workflows.slice(0, 4).map((f) => f.path).join(', ')}.` : 'No .github/workflows/*.yml detected.',
    'CI runs tests automatically on every change.',
    workflows.length > 0 ? workflows.slice(0, 4).map((f) => f.path) : ['(no workflows)'],
    'ci-workflow-present', 'Generate a starter workflow in the CI Builder.', 'File presence check — workflow was not executed', 'high', true, 6));

  // --- Licensing ---
  const licenseFile = hasBasename(files, 'license') ?? hasBasename(files, 'license.md') ?? hasGlob(files, /^license(\.|$)/i)[0];
  out.push(mk('LIC-01', 'License file evidence', 'licensing', licenseFile ? 'info' : 'high',
    licenseFile ? 'found' : 'missing',
    licenseFile ? `License file at ${licenseFile.path}. FORGEKIT does not verify its legal sufficiency.` : 'No LICENSE file detected; reuse and contribution terms are unclear.',
    'A license file states how others may use the code.',
    licenseFile ? [licenseFile.path] : ['(no license file)'],
    'license-file', 'Add an OSI-approved license text (e.g. MIT) as LICENSE.', 'Filename scan only — not legal advice', 'high', true, 8));

  const declaredLicense = (() => {
    if (nodeManifest?.facts['license']) return String(nodeManifest.facts['license']);
    const py = manifests.find((m) => m.ecosystem === 'python');
    if (py && fHasLicenseField(files, py.path)) return 'declared-in-manifest';
    return null;
  })();
  out.push(mk('LIC-02', 'License declared in manifest', 'licensing', declaredLicense ? 'info' : 'low',
    declaredLicense ? 'found' : 'needs-review',
    declaredLicense ? `Manifest declares license: ${declaredLicense}.` : 'No machine-readable license field detected in manifests.',
    'Registry listings surface the manifest license field.',
    nodeManifest ? [nodeManifest.path] : manifests.length > 0 ? [manifests[0]?.path ?? '(manifests)'] : ['(no manifests)'],
    'license-field', 'Set the license field (e.g. "MIT" SPDX id) in the manifest.', 'Manifest field read', 'medium', true, 2));

  // --- Security ---
  const security = hasBasename(files, 'security.md');
  out.push(mk('SEC-01', 'Security reporting policy', 'security', security ? 'info' : 'medium',
    security ? 'found' : 'missing',
    security ? `SECURITY.md at ${security.path}.` : 'No SECURITY.md; reporters have no documented private channel.',
    'A reporting policy routes vulnerabilities away from public issues.',
    security ? [security.path] : ['(no security.md)'],
    'security-policy', 'Add SECURITY.md with contact and disclosure expectations.', 'File presence check', 'high', true, 5));

  const envExample = hasBasename(files, '.env.example') ?? hasBasename(files, '.env.sample');
  const envFile = hasGlob(files, /(^|\/)\.env$/i)[0];
  out.push(mk('SEC-02', 'Secret handling hygiene', 'security', 'low',
    envFile && !envExample ? 'needs-review' : 'found',
    envFile && !envExample
      ? `${envFile.path} is committed without a documented .env.example. Verify no real secrets are stored.`
      : envExample ? `.env.example at ${envExample.path}; no live .env committed (or .env absent).` : 'No .env committed. Nothing to review.',
    'Committed secrets are a common breach vector.',
    envExample ? [envExample.path] : envFile ? [envFile.path] : ['(no .env files)'],
    'secret-hygiene', 'Never commit real secrets; provide .env.example instead.', 'Filename scan only — content not audited as a secret scanner', 'low', false, 2));

  // --- Dependencies ---
  const lockfile = hasBasename(files, 'package-lock.json') ?? hasBasename(files, 'yarn.lock') ?? hasBasename(files, 'pnpm-lock.yaml') ?? hasBasename(files, 'poetry.lock') ?? hasBasename(files, 'cargo.lock') ?? hasBasename(files, 'go.sum') ?? hasBasename(files, 'pipfile.lock');
  const anyManifest = manifests.length > 0;
  out.push(mk('DEP-01', 'Dependency lockfile', 'dependencies', !anyManifest ? 'info' : lockfile ? 'info' : 'medium',
    !anyManifest ? 'not-applicable' : lockfile ? 'found' : 'missing',
    !anyManifest ? 'No dependency manifest detected, so no lockfile is expected.' : lockfile ? `Lockfile at ${lockfile.path}.` : 'Manifest present but no lockfile detected; installed versions may drift.',
    'Lockfiles pin reproducible installs.',
    !anyManifest ? ['(no manifests)'] : lockfile ? [lockfile.path] : manifests.map((m) => m.path).slice(0, 3),
    'lockfile-present', 'Commit the ecosystem lockfile.', 'File presence check', 'high', true, 5));

  const malformed = manifests.filter((m) => m.parseError);
  out.push(mk('DEP-02', 'Manifests parse cleanly', 'dependencies', malformed.length > 0 ? 'high' : 'info',
    malformed.length > 0 ? 'needs-review' : anyManifest ? 'found' : 'not-applicable',
    malformed.length > 0 ? `Unparseable: ${malformed.map((m) => `${m.path} (${m.parseError})`).join('; ')}.` : anyManifest ? `Parsed ${manifests.length} manifest(s) without errors.` : 'No manifests to parse.',
    'Broken manifests break installs and tooling.',
    malformed.length > 0 ? malformed.map((m) => m.path) : anyManifest ? manifests.map((m) => m.path).slice(0, 4) : ['(no manifests)'],
    'manifest-parse', 'Fix the reported syntax error.', 'Local parse attempt', 'high', true, 4));

  // --- Contribution ---
  const coc = hasBasename(files, 'code_of_conduct.md') ?? hasBasename(files, 'code-of-conduct.md');
  out.push(mk('CONTRIB-01', 'Code of conduct', 'contribution', coc ? 'info' : 'low',
    coc ? 'found' : 'missing',
    coc ? `Code of conduct at ${coc.path}.` : 'No code of conduct; community expectations are undocumented.',
    'A CoC sets enforceable community standards.',
    coc ? [coc.path] : ['(no code of conduct)'],
    'coc-present', 'Add CODE_OF_CONDUCT.md (e.g. Contributor Covenant).', 'File presence check', 'high', true, 2));

  const templates = hasGlob(files, /(\.github\/(issue_template|pull_request_template)|pull_request_template\.md)/i);
  out.push(mk('CONTRIB-02', 'Issue / PR templates', 'contribution', templates.length > 0 ? 'info' : 'low',
    templates.length > 0 ? 'found' : 'missing',
    templates.length > 0 ? `Templates: ${templates.slice(0, 4).map((f) => f.path).join(', ')}.` : 'No issue or PR templates detected.',
    'Templates raise report quality and speed up review.',
    templates.length > 0 ? templates.slice(0, 4).map((f) => f.path) : ['(no templates)'],
    'templates-present', 'Generate templates in Documentation Studio.', 'File presence check', 'high', true, 2));

  // --- Release ---
  const pkgVersion = (() => {
    try {
      const v = nodeManifest?.facts['version'];
      return typeof v === 'string' ? v : null;
    } catch { return null; }
  })();
  out.push(mk('REL-01', 'Versioned releases', 'release', pkgVersion || changelog ? 'info' : 'low',
    pkgVersion || changelog ? 'found' : 'needs-review',
    pkgVersion ? `Manifest version ${pkgVersion}.` : changelog ? 'Changelog exists but no manifest version detected.' : 'No manifest version or changelog; release practice unverifiable.',
    'Versions let users pin and upgrade safely.',
    pkgVersion && nodeManifest ? [nodeManifest.path] : changelog ? [changelog.path] : ['(no version evidence)'],
    'release-version', 'Version releases (semver) and record them.', 'Manifest field read', 'medium', true, 2));

  // --- Maintainability ---
  const depUpdate = hasBasename(files, 'renovate.json') ?? hasBasename(files, '.renovate.json') ?? hasPath(files, '.github/dependabot.yml') ?? hasPath(files, '.github/dependabot.yaml');
  out.push(mk('MAINT-01', 'Dependency-update automation', 'maintainability', depUpdate ? 'info' : 'low',
    depUpdate ? 'found' : 'needs-review',
    depUpdate ? `Update config at ${depUpdate.path}.` : 'No Dependabot or Renovate config detected.',
    'Automated updates keep dependencies fresh with less toil.',
    depUpdate ? [depUpdate.path] : ['(no update config)'],
    'dep-update-config', 'Enable Dependabot or document a manual update cadence.', 'File presence check', 'medium', true, 2));

  const largeRepo = inventory.processedFiles > 1500;
  out.push(mk('MAINT-02', 'Repository size within tool budget', 'maintainability', 'low',
    largeRepo || inventory.analysisLimited ? 'analysis-limited' : 'found',
    largeRepo || inventory.analysisLimited
      ? `Inventory covered ${inventory.processedFiles}/${inventory.totalEntries} entries; ${inventory.skipped.length} skipped. Findings apply only to analyzed files.`
      : `All ${inventory.processedFiles} entries analyzed within budget.`,
    'Scope limits keep results honest about what was actually inspected.',
    ['(inventory summary)'],
    'analysis-scope', 'Narrow imports or raise limits in Settings if appropriate.', 'Inventory counters', 'high', true, 1));

  // Ecosystem-specific: python setup guidance, go module, etc.
  if (ecosystems.includes('python')) {
    const hasInstallDoc = readme || hasBasename(files, 'requirements.txt') !== undefined;
    void hasInstallDoc;
  }

  // Unsupported-ecosystem notice
  if (ecosystems.length === 0) {
    out.push(mk('ECO-01', 'Ecosystem identification', 'dependencies', 'low', 'unable-to-verify',
      'No supported manifest (package.json, pyproject/requirements, Cargo.toml, go.mod) detected. Language-specific checks are limited to filename heuristics.',
      'Ecosystem detection scopes dependency and CI guidance.',
      ['(no supported manifest)'], 'ecosystem-detect',
      'If this is a JS/TS, Python, Rust, or Go project, ensure its manifest is included in the archive.',
      'Manifest scan', 'medium', true, 0));
  }

  return out;
}

function fHasLicenseField(files: ProjectFile[], manifestPath: string): boolean {
  const f = files.find((x) => x.path === manifestPath);
  if (!f?.text) return false;
  return /licen[cs]e/i.test(f.text);
}
