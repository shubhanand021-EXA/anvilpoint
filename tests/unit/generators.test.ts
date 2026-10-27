import { describe, expect, it } from 'vitest';
import { renderDoc } from '../../src/core/generators/docs.js';
import { renderCiWorkflow } from '../../src/core/generators/ci.js';
import { findingsAsCsv, reportAsJson, reportAsMarkdown } from '../../src/core/exports/reports.js';
import { analyzeInventory } from '../../src/core/analysis.js';
import type { ProjectFile, RepositoryInventory } from '../../src/types.js';

function f(path: string, text = ''): ProjectFile {
  return { path, name: path, dir: '', size: text.length, text, truncated: false, binary: false, skippedReason: null };
}

function sample() {
  const files = [f('package.json', JSON.stringify({ name: 'demo', scripts: { test: 'x' } })), f('README.md', '# demo')];
  const inv: RepositoryInventory = {
    projectName: 'demo', totalEntries: 2, processedFiles: 2, textFiles: 2, skipped: [], warnings: [],
    directories: [], files, manifests: [], ecosystems: [], analysisLimited: false, analyzedAt: new Date().toISOString(),
  };
  return analyzeInventory(inv);
}

describe('generators and exports', () => {
  it('renders README with placeholders, not invented claims', () => {
    const r = sample();
    const md = renderDoc('README.md', {}, r);
    expect(md).toMatch(/\[TODO/);
    expect(md).not.toMatch(/benchmark|npm install -g|sponsor/i);
  });
  it('renders CI with pinned versions and least privilege', () => {
    const { yaml } = renderCiWorkflow({ ecosystem: 'node', runs: ['install', 'test'], os: 'ubuntu-latest', scheduleWeekly: false });
    expect(yaml).toMatch(/contents: read/);
    expect(yaml).toMatch(/setup-node@v4/);
    expect(yaml).not.toMatch(/secret/i);
  });
  it('exports valid JSON/MD/CSV', () => {
    const r = sample();
    expect(() => JSON.parse(reportAsJson(r))).not.toThrow();
    expect(reportAsMarkdown(r)).toMatch(/# FORGEKIT/);
    const csv = findingsAsCsv(r);
    expect(csv.split('\n')[0]).toMatch(/id,title,category/);
  });
  it('never embeds source contents in exports (privacy)', () => {
    const files = [
      f('package.json', JSON.stringify({ name: 'demo' })),
      f('.env', 'API_KEY=SUPERSECRET123'),
    ];
    const inv: RepositoryInventory = {
      projectName: 'demo', totalEntries: 2, processedFiles: 2, textFiles: 2, skipped: [], warnings: [],
      directories: [], files, manifests: [], ecosystems: [], analysisLimited: false, analyzedAt: new Date().toISOString(),
    };
    const r = analyzeInventory(inv);
    const json = reportAsJson(r);
    const md = reportAsMarkdown(r);
    const csv = findingsAsCsv(r);
    for (const out of [json, md, csv]) {
      expect(out).not.toContain('SUPERSECRET123');
    }
    expect(json).not.toContain('API_KEY');
  });
  it('escapes untrusted text in CSV', () => {
    const r = sample();
    r.findings[0]!.title = 'x",=evil';
    const csv = findingsAsCsv(r);
    expect(csv).toContain('"x"",=evil"');
  });
});
