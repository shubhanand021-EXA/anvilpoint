import { describe, expect, it } from 'vitest';
import { parsePackageJson, parsePythonManifests, parseCargo, parseGoMod } from '../../src/core/parsers/manifests.js';
import type { ProjectFile } from '../../src/types.js';

function f(path: string, text: string | null): ProjectFile {
  return { path, name: path.split('/').pop() ?? path, dir: '', size: text?.length ?? 0, text, truncated: false, binary: text === null, skippedReason: null };
}

describe('manifest parsers', () => {
  it('parses package.json deps and facts', () => {
    const [m] = parsePackageJson([f('package.json', JSON.stringify({ name: 'a', version: '1.0.0', dependencies: { react: '^18.0.0' }, devDependencies: { vitest: '^3.0.0' }, scripts: { test: 'vitest' }, license: 'MIT' }))]);
    expect(m?.dependencies).toHaveLength(2);
    expect(m?.facts['license']).toBe('MIT');
    expect(m?.parseError).toBeNull();
  });
  it('reports malformed package.json without throwing', () => {
    const [m] = parsePackageJson([f('package.json', '{oops')]);
    expect(m?.parseError).toMatch(/invalid/i);
    expect(m?.dependencies).toHaveLength(0);
  });
  it('parses requirements.txt', () => {
    const [m] = parsePythonManifests([f('requirements.txt', 'requests>=2.0\n# comment\nflask==3.0\n')]);
    expect(m?.dependencies.map((d) => d.name)).toEqual(['requests', 'flask']);
  });
  it('parses cargo deps', () => {
    const [m] = parseCargo([f('Cargo.toml', '[package]\nname = "x"\n[dependencies]\nserde = "1.0"\n')]);
    expect(m?.dependencies[0]?.name).toBe('serde');
  });
  it('parses go.mod requires', () => {
    const [m] = parseGoMod([f('go.mod', 'module example.com/x\n\ngo 1.22\n\nrequire (\n\tgithub.com/a/b v1.2.3\n)\n')]);
    expect(m?.dependencies[0]?.name).toBe('github.com/a/b');
    expect(m?.facts['module']).toBe('example.com/x');
  });
  it('never executes scripts — setup.py is metadata-only', () => {
    // setup.py content is not evaluated; parser only reads requirements-style manifests here
    const out = parsePythonManifests([f('setup.py', '__import__("os").system("evil")')]);
    expect(out).toHaveLength(0); // setup.py alone yields no parsed deps (heuristic only), and nothing ran
  });
});
