import { describe, expect, it } from 'vitest';
import { analyzeInventory } from '../../src/core/analysis.js';
import type { ProjectFile, RepositoryInventory } from '../../src/types.js';

function f(path: string, text: string | null = ''): ProjectFile {
  return { path, name: path.split('/').pop() ?? path, dir: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '', size: text?.length ?? 0, text, truncated: false, binary: text === null, skippedReason: null };
}

function inv(files: ProjectFile[]): RepositoryInventory {
  return {
    projectName: 'fixture', totalEntries: files.length, processedFiles: files.length,
    textFiles: files.filter((x) => x.text !== null).length, skipped: [], warnings: [],
    directories: ['src'], files, manifests: ['package.json'], ecosystems: [], analysisLimited: false,
    analyzedAt: new Date().toISOString(),
  };
}

describe('rule engine + scoring', () => {
  it('finds README and license, flags missing CI honestly', () => {
    const r = analyzeInventory(inv([
      f('package.json', JSON.stringify({ name: 'x', scripts: { test: 'vitest' }, license: 'MIT' })),
      f('README.md', '# x'), f('LICENSE', 'MIT text'), f('src/a.ts', 'x'),
    ]));
    const byId = Object.fromEntries(r.findings.map((x) => [x.id, x]));
    expect(byId['DOC-01']?.status).toBe('found');
    expect(byId['LIC-01']?.status).toBe('found');
    expect(byId['CI-01']?.status).toBe('missing');
    expect(r.score.percent).toBeGreaterThan(0);
    expect(r.score.methodology).toMatch(/heuristic/i);
  });

  it('marks empty repos as missing without fake passes', () => {
    const r = analyzeInventory(inv([f('notes.txt', 'hi')]));
    expect(r.findings.find((x) => x.id === 'DOC-01')?.status).toBe('missing');
    expect(r.findings.find((x) => x.id === 'TEST-01')?.status).toBe('missing');
    expect(r.findings.every((x) => x.evidence.length > 0)).toBe(true);
  });

  it('scores needs-review at half weight (transparent)', () => {
    const r = analyzeInventory(inv([f('package.json', JSON.stringify({ name: 'x' })), f('.env', 'KEY=1')]));
    const sec = r.findings.find((x) => x.id === 'SEC-02');
    expect(sec?.status).toBe('needs-review');
  });

  it('never claims security from absence of findings', () => {
    const r = analyzeInventory(inv([f('README.md', '# x')]));
    const texts = r.findings.map((x) => x.explanation + x.verification).join(' ');
    expect(texts).not.toMatch(/secure|no vulnerab/i);
  });
});
