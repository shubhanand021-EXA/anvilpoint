import JSZip from 'jszip';
import type { ArchiveLimits, ProjectFile, RepositoryInventory, SkippedEntry } from '../../types.js';
import {
  isProbablyTextPath,
  looksBinaryByContent,
  normalizeArchivePath,
  stripCommonRoot,
  validateLimits,
} from './paths.js';

export interface ImportProgress {
  stage: string;
  done: number;
  total: number;
  indeterminate: boolean;
}

export interface ImportOutcome {
  inventory: RepositoryInventory;
}

/** Derive a project name from the top-level directory or first manifest. */
function deriveProjectName(files: ProjectFile[]): string {
  const pkg = files.find((f) => f.path.toLowerCase() === 'package.json');
  if (pkg?.text) {
    try {
      const parsed = JSON.parse(pkg.text) as { name?: unknown };
      if (typeof parsed.name === 'string' && parsed.name.trim()) {
        return parsed.name.trim().slice(0, 80);
      }
    } catch {
      /* ignore malformed manifest here; parser reports it */
    }
  }
  const pyproject = files.find((f) => f.path.toLowerCase() === 'pyproject.toml');
  if (pyproject?.text) {
    const m = pyproject.text.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
    if (m?.[1]) return m[1].slice(0, 80);
  }
  const cargo = files.find((f) => f.path.toLowerCase() === 'cargo.toml');
  if (cargo?.text) {
    const m = cargo.text.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
    if (m?.[1]) return m[1].slice(0, 80);
  }
  const first = files[0]?.path.split('/')[0];
  if (first && files[0]?.path.includes('/')) return first.slice(0, 80);
  return 'imported-project';
}

const MANIFEST_BASENAMES = new Set([
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'requirements.txt',
  'pyproject.toml',
  'setup.py',
  'setup.cfg',
  'pipfile',
  'poetry.lock',
  'cargo.toml',
  'cargo.lock',
  'go.mod',
  'go.sum',
]);

/**
 * Import a ZIP archive safely: validates limits, normalizes paths,
 * reads only text files within budget. Never executes anything.
 */
export async function importZipArchive(
  data: ArrayBuffer,
  fileName: string,
  limits: ArchiveLimits,
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportOutcome> {
  const limitError = validateLimits(data.byteLength, limits);
  if (limitError) throw new Error(limitError);

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error(`"${fileName}" is not a valid ZIP archive or it is corrupted.`);
  }

  const rawPaths = Object.keys(zip.files).filter((k) => !zip.files[k]?.dir);
  if (rawPaths.length > limits.maxEntries) {
    throw new Error(
      `Archive has ${rawPaths.length} entries; limit is ${limits.maxEntries}. Refusing to process.`,
    );
  }
  onProgress?.({ stage: 'Validating entries', done: 0, total: rawPaths.length, indeterminate: false });

  const normalized: { original: string; path: string }[] = [];
  const skipped: SkippedEntry[] = [];
  const seen = new Set<string>();

  for (const raw of rawPaths) {
    const r = normalizeArchivePath(raw);
    if (!r.ok || !r.path) {
      skipped.push({ path: raw.slice(0, 120), reason: r.reason ?? 'Rejected path' });
      continue;
    }
    const lower = r.path.toLowerCase();
    if (seen.has(lower)) {
      skipped.push({ path: r.path, reason: 'Duplicate path (case-insensitive)' });
      continue;
    }
    seen.add(lower);
    normalized.push({ original: raw, path: r.path });
  }

  const stripMap = stripCommonRoot(normalized.map((n) => n.path));
  const finalPaths = normalized
    .map((n) => ({ original: n.original, path: stripMap.get(n.path) ?? n.path }))
    .filter((n) => n.path !== '');

  // Budget text reads
  const files: ProjectFile[] = [];
  const skippedFinal: SkippedEntry[] = [...skipped];
  let totalUncompressed = 0;
  let textCount = 0;

  let i = 0;
  for (const entry of finalPaths) {
    i++;
    if (i % 25 === 0 || i === finalPaths.length) {
      onProgress?.({ stage: 'Reading files', done: i, total: finalPaths.length, indeterminate: false });
    }
    const zobj = zip.files[entry.original];
    if (!zobj || zobj.dir) continue;
    // Use internal size if known; JSZip exposes _data?.uncompressedSize in some builds.
    const declared = (zobj as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    if (typeof declared === 'number' && declared > limits.maxTotalUncompressedBytes) {
      skippedFinal.push({ path: entry.path, reason: 'Single entry exceeds total uncompressed budget' });
      continue;
    }
    let buffer: Uint8Array;
    try {
      buffer = await zobj.async('uint8array');
    } catch {
      skippedFinal.push({ path: entry.path, reason: 'Unreadable entry' });
      continue;
    }
    totalUncompressed += buffer.length;
    if (totalUncompressed > limits.maxTotalUncompressedBytes) {
      skippedFinal.push({ path: entry.path, reason: 'Total uncompressed budget exceeded' });
      // Mark analysis limited but continue to record remaining as skipped without reading
      for (const rest of finalPaths.slice(i)) {
        skippedFinal.push({ path: rest.path, reason: 'Skipped after budget exceeded' });
      }
      break;
    }

    if (!isProbablyTextPath(entry.path)) {
      files.push({
        path: entry.path,
        name: entry.path.split('/').pop() ?? entry.path,
        dir: entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '',
        size: buffer.length,
        text: null,
        truncated: false,
        binary: true,
        skippedReason: 'Binary or unsupported type (metadata only)',
      });
      continue;
    }
    if (looksBinaryByContent(buffer)) {
      files.push({
        path: entry.path,
        name: entry.path.split('/').pop() ?? entry.path,
        dir: entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '',
        size: buffer.length,
        text: null,
        truncated: false,
        binary: true,
        skippedReason: 'Binary content detected',
      });
      continue;
    }
    if (textCount >= limits.maxTextFiles) {
      skippedFinal.push({ path: entry.path, reason: 'Text-file count budget exceeded' });
      continue;
    }
    let slice = buffer;
    let truncated = false;
    if (buffer.length > limits.maxTextFileBytes) {
      slice = buffer.slice(0, limits.maxTextFileBytes);
      truncated = true;
    }
    let text: string | null = null;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(slice);
    } catch {
      try {
        text = new TextDecoder('utf-8', { fatal: false }).decode(slice);
      } catch {
        files.push({
          path: entry.path,
          name: entry.path.split('/').pop() ?? entry.path,
          dir: entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '',
          size: buffer.length,
          text: null,
          truncated: false,
          binary: true,
          skippedReason: 'Undecodable text',
        });
        continue;
      }
    }
    textCount++;
    files.push({
      path: entry.path,
      name: entry.path.split('/').pop() ?? entry.path,
      dir: entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '',
      size: buffer.length,
      text,
      truncated,
      binary: false,
      skippedReason: truncated ? 'Truncated to budget' : null,
    });
    if (truncated) skippedFinal.push({ path: entry.path, reason: 'Truncated: exceeds per-file text budget' });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  const dirs = Array.from(new Set(files.map((f) => f.dir).filter(Boolean))).sort();
  const manifests = files.map((f) => f.path).filter((p) => MANIFEST_BASENAMES.has(p.toLowerCase().split('/').pop() ?? ''));
  const textFiles = files.filter((f) => f.text !== null).length;

  const inventory: RepositoryInventory = {
    projectName: deriveProjectName(files),
    totalEntries: rawPaths.length,
    processedFiles: files.length,
    textFiles,
    skipped: skippedFinal,
    warnings: totalUncompressed > limits.maxTotalUncompressedBytes * 0.8
      ? [{ code: 'near-budget', message: 'Archive approached the uncompressed-size budget; some entries may have been skipped.' }]
      : [],
    directories: dirs,
    files,
    manifests,
    ecosystems: [],
    analysisLimited: skippedFinal.length > 0,
    analyzedAt: new Date().toISOString(),
  };
  return { inventory };
}
