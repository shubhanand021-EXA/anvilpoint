import type { DependencyEntry, Ecosystem, ProjectFile } from '../../types.js';

export interface ParsedManifest {
  ecosystem: Ecosystem;
  path: string;
  dependencies: DependencyEntry[];
  /** Raw facts the doc/CI generators may reuse (scripts, versions). */
  facts: Record<string, unknown>;
  parseError: string | null;
}

function fileByName(files: ProjectFile[], name: string): ProjectFile[] {
  const lower = name.toLowerCase();
  return files.filter((f) => (f.path.toLowerCase().split('/').pop() ?? '') === lower);
}

function safeJson(text: string): { value: unknown; error: string | null } {
  try {
    return { value: JSON.parse(text) as unknown, error: null };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message.slice(0, 200) : 'Invalid JSON' };
  }
}

function registryFor(eco: Ecosystem): string {
  switch (eco) {
    case 'node': return 'https://www.npmjs.com/package/';
    case 'python': return 'https://pypi.org/project/';
    case 'rust': return 'https://crates.io/crates/';
    case 'go': return 'https://pkg.go.dev/';
  }
}

/** Very small TOML-subset reader: top-level [sections], key = "value", arrays. Good enough for name/version/deps. */
export function parseTomlSubset(text: string): Map<string, Map<string, string>> {
  const sections = new Map<string, Map<string, string>>();
  let current = 'root';
  sections.set(current, new Map());
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const sec = line.match(/^\[([^\]]+)\]$/);
    if (sec?.[1]) {
      current = sec[1].trim();
      if (!sections.has(current)) sections.set(current, new Map());
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/);
    if (kv?.[1] && kv[2] !== undefined) {
      let v = kv[2].trim().replace(/\s*#.*$/, '').trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      sections.get(current)?.set(kv[1].trim(), v);
    }
  }
  return sections;
}

export function parsePackageJson(files: ProjectFile[]): ParsedManifest[] {
  const out: ParsedManifest[] = [];
  for (const f of fileByName(files, 'package.json')) {
    if (f.text === null) {
      out.push({ ecosystem: 'node', path: f.path, dependencies: [], facts: {}, parseError: 'Unreadable (binary or skipped)' });
      continue;
    }
    const { value, error } = safeJson(f.text);
    if (error || typeof value !== 'object' || value === null) {
      out.push({ ecosystem: 'node', path: f.path, dependencies: [], facts: {}, parseError: `Invalid package.json: ${error ?? 'not an object'}` });
      continue;
    }
    const pkg = value as Record<string, unknown>;
    const deps: DependencyEntry[] = [];
    const push = (obj: unknown, kind: DependencyEntry['kind']) => {
      if (typeof obj !== 'object' || obj === null) return;
      for (const [name, ver] of Object.entries(obj as Record<string, unknown>)) {
        deps.push({
          name,
          version: typeof ver === 'string' ? ver : String(ver ?? 'unknown'),
          kind,
          ecosystem: 'node',
          manifest: f.path,
          license: null,
          licenseStatus: 'unknown',
          registry: registryFor('node') + name,
          verified: false,
        });
      }
    };
    push(pkg['dependencies'], 'direct');
    push(pkg['devDependencies'], 'dev');
    push(pkg['peerDependencies'], 'direct');
    const license = typeof pkg['license'] === 'string' ? (pkg['license'] as string) : null;
    out.push({
      ecosystem: 'node',
      path: f.path,
      dependencies: deps,
      facts: {
        name: pkg['name'],
        version: pkg['version'],
        scripts: pkg['scripts'],
        license,
        type: pkg['type'],
      },
      parseError: null,
    });
  }
  return out;
}

export function parsePythonManifests(files: ProjectFile[]): ParsedManifest[] {
  const out: ParsedManifest[] = [];
  for (const f of fileByName(files, 'requirements.txt')) {
    if (f.text === null) {
      out.push({ ecosystem: 'python', path: f.path, dependencies: [], facts: {}, parseError: 'Unreadable' });
      continue;
    }
    const deps: DependencyEntry[] = [];
    for (const line of f.text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || t.startsWith('-')) continue;
      const m = t.match(/^([A-Za-z0-9_.-]+)\s*(.*)$/);
      if (m?.[1]) {
        deps.push({
          name: m[1],
          version: (m[2] ?? '').trim() || 'unpinned',
          kind: 'direct',
          ecosystem: 'python',
          manifest: f.path,
          license: null,
          licenseStatus: 'unknown',
          registry: registryFor('python') + m[1],
          verified: false,
        });
      }
    }
    out.push({ ecosystem: 'python', path: f.path, dependencies: deps, facts: {}, parseError: null });
  }
  for (const f of fileByName(files, 'pyproject.toml')) {
    if (f.text === null) {
      out.push({ ecosystem: 'python', path: f.path, dependencies: [], facts: {}, parseError: 'Unreadable' });
      continue;
    }
    try {
      const sections = parseTomlSubset(f.text);
      const deps: DependencyEntry[] = [];
      const proj = sections.get('project');
      const name = proj?.get('name') ?? null;
      const version = proj?.get('version') ?? null;
      const depLine = proj?.get('dependencies') ?? null;
      // dependencies may be inline array — fall back to regex scan
      const depMatches = f.text.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
      if (depMatches?.[1]) {
        for (const q of depMatches[1].match(/["']([^"']+)["']/g) ?? []) {
          const clean = q.replace(/["']/g, '');
          const m = clean.match(/^([A-Za-z0-9_.-]+)\s*(.*)$/);
          if (m?.[1]) {
            deps.push({
              name: m[1], version: (m[2] ?? '').trim() || 'unpinned', kind: 'direct',
              ecosystem: 'python', manifest: f.path, license: null, licenseStatus: 'unknown',
              registry: registryFor('python') + m[1], verified: false,
            });
          }
        }
      } else if (depLine) {
        deps.push({
          name: depLine, version: 'declared', kind: 'direct', ecosystem: 'python',
          manifest: f.path, license: null, licenseStatus: 'unknown', registry: null, verified: false,
        });
      }
      out.push({ ecosystem: 'python', path: f.path, dependencies: deps, facts: { name, version }, parseError: null });
    } catch (e) {
      out.push({ ecosystem: 'python', path: f.path, dependencies: [], facts: {}, parseError: e instanceof Error ? e.message : 'TOML parse error' });
    }
  }
  return out;
}

export function parseCargo(files: ProjectFile[]): ParsedManifest[] {
  const out: ParsedManifest[] = [];
  for (const f of fileByName(files, 'cargo.toml')) {
    if (f.text === null) {
      out.push({ ecosystem: 'rust', path: f.path, dependencies: [], facts: {}, parseError: 'Unreadable' });
      continue;
    }
    const sections = parseTomlSubset(f.text);
    const deps: DependencyEntry[] = [];
    for (const [secName, kv] of sections) {
      if (secName === 'dependencies' || secName.endsWith('.dependencies') || secName === 'dev-dependencies') {
        const kind = secName.includes('dev') ? 'dev' : 'direct';
        for (const [name, ver] of kv) {
          deps.push({
            name, version: ver || 'unpinned', kind, ecosystem: 'rust',
            manifest: f.path, license: null, licenseStatus: 'unknown',
            registry: registryFor('rust') + name, verified: false,
          });
        }
      }
    }
    out.push({
      ecosystem: 'rust', path: f.path, dependencies: deps,
      facts: { name: sections.get('package')?.get('name'), version: sections.get('package')?.get('version') },
      parseError: null,
    });
  }
  return out;
}

export function parseGoMod(files: ProjectFile[]): ParsedManifest[] {
  const out: ParsedManifest[] = [];
  for (const f of fileByName(files, 'go.mod')) {
    if (f.text === null) {
      out.push({ ecosystem: 'go', path: f.path, dependencies: [], facts: {}, parseError: 'Unreadable' });
      continue;
    }
    const deps: DependencyEntry[] = [];
    const modMatch = f.text.match(/^\s*module\s+(\S+)/m);
    const goMatch = f.text.match(/^\s*go\s+(\S+)/m);
    const requireBlocks = f.text.match(/require\s*\(([\s\S]*?)\)/g) ?? [];
    const pushLine = (line: string, kind: DependencyEntry['kind']) => {
      const m = line.trim().match(/^(\S+)\s+(\S+)/);
      if (m?.[1] && !m[1].startsWith('//')) {
        deps.push({
          name: m[1], version: m[2] ?? 'unknown', kind, ecosystem: 'go',
          manifest: f.path, license: null, licenseStatus: 'unknown',
          registry: registryFor('go') + m[1], verified: false,
        });
      }
    };
    for (const b of requireBlocks) {
      const inner = b.replace(/^require\s*\(/, '').replace(/\)$/, '');
      for (const line of inner.split('\n')) {
        if (line.trim()) pushLine(line, 'direct');
      }
    }
    for (const line of f.text.split('\n')) {
      const m = line.match(/^\s*require\s+(\S+)\s+(\S+)/);
      if (m?.[1]) pushLine(`${m[1]} ${m[2]}`, 'direct');
    }
    out.push({
      ecosystem: 'go', path: f.path, dependencies: deps,
      facts: { module: modMatch?.[1] ?? null, goVersion: goMatch?.[1] ?? null },
      parseError: null,
    });
  }
  return out;
}

export function parseAllManifests(files: ProjectFile[]): ParsedManifest[] {
  return [
    ...parsePackageJson(files),
    ...parsePythonManifests(files),
    ...parseCargo(files),
    ...parseGoMod(files),
  ];
}

export function detectEcosystems(manifests: ParsedManifest[], files: ProjectFile[]): Ecosystem[] {
  const set = new Set<Ecosystem>(manifests.map((m) => m.ecosystem));
  // Heuristic source-dir detection when no manifest (still evidence-backed, low confidence)
  if (set.size === 0) {
    if (files.some((f) => /\.py$/.test(f.path))) set.add('python');
    if (files.some((f) => /\.rs$/.test(f.path))) set.add('rust');
    if (files.some((f) => /\.go$/.test(f.path))) set.add('go');
    if (files.some((f) => /\.(ts|tsx|js|jsx)$/.test(f.path))) set.add('node');
  }
  return [...set];
}
