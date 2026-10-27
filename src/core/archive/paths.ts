import type { ArchiveLimits } from '../../types.js';

/** Normalize a zip entry path and reject unsafe entries. */
export interface NormalizedPath {
  ok: boolean;
  path: string | null;
  reason: string | null;
}

export function normalizeArchivePath(raw: string): NormalizedPath {
  if (!raw) return { ok: false, path: null, reason: 'Empty path' };
  // Reject absolute paths (posix, windows drive, UNC)
  if (
    raw.startsWith('/') ||
    raw.startsWith('\\') ||
    /^[a-zA-Z]:[\\/]/.test(raw) ||
    raw.startsWith('\\\\')
  ) {
    return { ok: false, path: null, reason: 'Absolute path rejected' };
  }
  // Normalize separators
  let p = raw.replace(/\\/g, '/');
  // Strip leading ./ segments
  while (p.startsWith('./')) p = p.slice(2);
  if (p.startsWith('/')) return { ok: false, path: null, reason: 'Absolute path rejected' };
  const parts = p.split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      return { ok: false, path: null, reason: 'Path traversal rejected' };
    }
    out.push(part);
  }
  const normalized = out.join('/');
  if (!normalized) return { ok: false, path: null, reason: 'Empty normalized path' };
  if (normalized.length > 512) return { ok: false, path: null, reason: 'Path too long' };
  // Reject NUL and control chars
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(normalized)) {
    return { ok: false, path: null, reason: 'Control characters in path' };
  }
  return { ok: true, path: normalized, reason: null };
}

/** Strip a single top-level folder when it wraps the whole archive (typical GitHub zip). */
export function stripCommonRoot(paths: string[]): Map<string, string> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const firstSegments = paths
    .filter((p) => p.includes('/'))
    .map((p) => p.split('/')[0] as string);
  if (firstSegments.length === 0) {
    for (const p of paths) map.set(p, p);
    return map;
  }
  const candidate = firstSegments[0] as string;
  const allShare = paths.every((p) => p === candidate || p.startsWith(candidate + '/'));
  if (allShare && firstSegments.length >= Math.max(2, paths.length * 0.8)) {
    for (const p of paths) {
      map.set(p, p === candidate ? '' : p.slice(candidate.length + 1));
    }
  } else {
    for (const p of paths) map.set(p, p);
  }
  return map;
}

const TEXT_EXTENSIONS = new Set([
  'md', 'markdown', 'txt', 'json', 'yaml', 'yml', 'toml', 'ini', 'cfg',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py', 'rs', 'go', 'java', 'rb',
  'php', 'cs', 'cpp', 'c', 'h', 'hpp', 'css', 'scss', 'html', 'htm', 'xml',
  'svg', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'dockerfile', 'makefile',
  'gitignore', 'gitattributes', 'editorconfig', 'env', 'example', 'lock',
  'mod', 'sum', 'cfg', 'toml', 'gradle', 'properties', 'rst',
]);

const TEXT_BASENAMES = new Set([
  'dockerfile', 'makefile', 'license', 'licence', 'readme', 'changelog',
  'contributing', 'security', 'code_of_conduct', 'gemfile', 'rakefile',
]);

export function isProbablyTextPath(path: string): boolean {
  const lower = path.toLowerCase();
  const base = lower.split('/').pop() ?? lower;
  const noExt = base.replace(/\.[^.]+$/, '');
  if (TEXT_BASENAMES.has(base) || TEXT_BASENAMES.has(noExt)) return true;
  const ext = base.includes('.') ? (base.split('.').pop() as string) : '';
  if (!ext) {
    // Extensionless files: .github workflows have no ext sometimes; treat small ones as text later
    return true;
  }
  if (TEXT_EXTENSIONS.has(ext)) return true;
  return false;
}

export function looksBinaryByContent(sample: Uint8Array): boolean {
  const n = Math.min(sample.length, 4096);
  for (let i = 0; i < n; i++) {
    if (sample[i] === 0) return true;
  }
  return false;
}

export function validateLimits(
  compressedBytes: number,
  limits: ArchiveLimits,
): string | null {
  if (compressedBytes > limits.maxCompressedBytes) {
    return `Archive is ${(compressedBytes / 1048576).toFixed(1)} MB; limit is ${(limits.maxCompressedBytes / 1048576).toFixed(0)} MB.`;
  }
  return null;
}
