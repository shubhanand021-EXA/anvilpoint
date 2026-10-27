import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { importZipArchive } from '../../src/core/archive/zipImport.js';
import { DEFAULT_LIMITS } from '../../src/types.js';

async function makeZip(entries: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const [k, v] of Object.entries(entries)) zip.file(k, v);
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('importZipArchive', () => {
  it('imports a valid archive and strips the common root', async () => {
    const buf = await makeZip({
      'demo-1/package.json': JSON.stringify({ name: 'demo', scripts: { test: 'vitest' } }),
      'demo-1/src/index.ts': 'export const x = 1;',
      'demo-1/README.md': '# demo',
    });
    const { inventory } = await importZipArchive(buf, 'demo.zip', DEFAULT_LIMITS);
    expect(inventory.projectName).toBe('demo');
    expect(inventory.processedFiles).toBe(3);
    expect(inventory.files.map((f) => f.path)).toContain('src/index.ts');
  });

  it('rejects absolute and traversal entries', async () => {
    const zip = new JSZip();
    zip.file('ok.txt', 'hi');
    zip.file('/abs.txt', 'nope');
    zip.file('../../evil.sh', 'nope');
    const buf = await zip.generateAsync({ type: 'arraybuffer' });
    const { inventory } = await importZipArchive(buf, 'evil.zip', DEFAULT_LIMITS);
    const paths = inventory.files.map((f) => f.path);
    expect(paths).toContain('ok.txt');
    // No file may retain an absolute or traversal path, however JSZip pre-normalized them.
    expect(paths.every((p) => !p.startsWith('/') && !p.split('/').includes('..'))).toBe(true);
    expect(paths).not.toContain('/abs.txt');
    expect(inventory.skipped.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects duplicate case-insensitive paths', async () => {
    const buf = await makeZip({ 'README.md': '# a' });
    // Add duplicate manually via raw zip with both cases
    const zip = await JSZip.loadAsync(buf);
    zip.file('readme.md', '# b');
    const buf2 = await zip.generateAsync({ type: 'arraybuffer' });
    const { inventory } = await importZipArchive(buf2, 'dup.zip', DEFAULT_LIMITS);
    const lowers = inventory.files.map((f) => f.path.toLowerCase());
    expect(new Set(lowers).size).toBe(lowers.length);
    expect(inventory.skipped.some((s) => /duplicate/i.test(s.reason))).toBe(true);
  });

  it('rejects oversized archives', async () => {
    await expect(
      importZipArchive(new ArrayBuffer(10), 'tiny.zip', { ...DEFAULT_LIMITS, maxCompressedBytes: 5 }),
    ).rejects.toThrow();
  });

  it('rejects malformed zips', async () => {
    await expect(
      importZipArchive(new TextEncoder().encode('not a zip').buffer as ArrayBuffer, 'bad.zip', DEFAULT_LIMITS),
    ).rejects.toThrow(/not a valid ZIP/i);
  });

  it('truncates oversized text files instead of crashing', async () => {
    const big = 'x'.repeat(1000);
    const buf = await makeZip({ 'big.txt': big });
    const { inventory } = await importZipArchive(
      buf, 'big.zip', { ...DEFAULT_LIMITS, maxTextFileBytes: 100 },
    );
    const f = inventory.files.find((x) => x.path === 'big.txt');
    expect(f?.truncated).toBe(true);
    expect(f?.text?.length).toBeLessThanOrEqual(100);
  });
});
