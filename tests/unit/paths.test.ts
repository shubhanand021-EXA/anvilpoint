import { describe, expect, it } from 'vitest';
import { normalizeArchivePath, stripCommonRoot, isProbablyTextPath, looksBinaryByContent } from '../../src/core/archive/paths.js';

describe('normalizeArchivePath', () => {
  it('accepts normal relative paths', () => {
    expect(normalizeArchivePath('src/index.ts')).toEqual({ ok: true, path: 'src/index.ts', reason: null });
  });
  it('rejects absolute posix paths', () => {
    expect(normalizeArchivePath('/etc/passwd').ok).toBe(false);
  });
  it('rejects windows drive paths', () => {
    expect(normalizeArchivePath('C:\\Windows\\x').ok).toBe(false);
  });
  it('rejects traversal', () => {
    expect(normalizeArchivePath('../../evil.sh').ok).toBe(false);
    expect(normalizeArchivePath('a/../../b').ok).toBe(false);
  });
  it('normalizes backslashes and ./ prefixes', () => {
    expect(normalizeArchivePath('.\\src\\a.ts')).toEqual({ ok: true, path: 'src/a.ts', reason: null });
    expect(normalizeArchivePath('./README.md')).toEqual({ ok: true, path: 'README.md', reason: null });
  });
  it('rejects control characters', () => {
    expect(normalizeArchivePath('a\x00b').ok).toBe(false);
  });
});

describe('stripCommonRoot', () => {
  it('strips a shared top-level folder', () => {
    const m = stripCommonRoot(['repo-1/src/a.ts', 'repo-1/README.md']);
    expect(m.get('repo-1/src/a.ts')).toBe('src/a.ts');
  });
  it('keeps paths without a common root', () => {
    const m = stripCommonRoot(['a/x', 'b/y']);
    expect(m.get('a/x')).toBe('a/x');
  });
});

describe('file classification', () => {
  it('treats manifests and code as text', () => {
    expect(isProbablyTextPath('package.json')).toBe(true);
    expect(isProbablyTextPath('src/main.py')).toBe(true);
    expect(isProbablyTextPath('LICENSE')).toBe(true);
  });
  it('treats archives as non-text', () => {
    expect(isProbablyTextPath('dist/bundle.exe')).toBe(false);
    expect(isProbablyTextPath('img/logo.png')).toBe(false);
  });
  it('detects binary content', () => {
    expect(looksBinaryByContent(new Uint8Array([104, 105, 0, 1]))).toBe(true);
    expect(looksBinaryByContent(new TextEncoder().encode('hello world'))).toBe(false);
  });
});
