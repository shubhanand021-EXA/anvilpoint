/* Optional remote connectors. All network use is user-initiated, clearly labeled,
   and never required for the core local ZIP workflow. Tokens live in memory only. */

export interface ConnectorResult {
  data: ArrayBuffer;
  fileName: string;
  source: string;
  rateLimitRemaining: string | null;
}

export type ConnectorErrorKind =
  | 'not-found'
  | 'rate-limited'
  | 'unauthorized'
  | 'network'
  | 'too-large'
  | 'invalid';

export class ConnectorError extends Error {
  kind: ConnectorErrorKind;
  constructor(kind: ConnectorErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

/** Parse "owner/repo" (or a github.com URL) into parts. Pure — unit tested. */
export function parseGitHubSpec(input: string): { owner: string; repo: string } | null {
  const t = input.trim().replace(/\/+$/, '');
  const urlMatch = t.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  const short = t.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  const m = urlMatch ?? short;
  if (!m?.[1] || !m?.[2]) return null;
  if (m[1].length > 100 || m[2].length > 100) return null;
  return { owner: m[1], repo: m[2] };
}

/** Parse "namespace/project" (or a gitlab.com URL) into an encoded project path. Pure — unit tested. */
export function parseGitLabSpec(input: string, host = 'gitlab.com'): { projectPath: string; host: string } | null {
  const t = input.trim().replace(/\/+$/, '');
  const custom = t.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/i);
  let pathPart: string | null = null;
  let h = host;
  if (custom?.[1] && custom[2]) {
    h = custom[1].toLowerCase();
    pathPart = custom[2];
  } else if (/^[A-Za-z0-9_.\-/]+$/.test(t) && t.includes('/')) {
    pathPart = t;
  }
  if (!pathPart || pathPart.length > 300) return null;
  return { projectPath: encodeURIComponent(pathPart), host: h };
}

export function gitHubZipUrl(owner: string, repo: string, ref: string): string {
  return `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${ref}`;
}

export function gitLabZipUrl(host: string, projectPath: string, ref?: string): string {
  const base = `https://${host}/api/v4/projects/${projectPath}/repository/archive.zip`;
  return ref ? `${base}?sha=${encodeURIComponent(ref)}` : base;
}

export type FetchLike = typeof fetch;

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: unknown };
    return typeof j.message === 'string' ? j.message.slice(0, 200) : `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/**
 * Fetch a GitHub repository as a ZIP archive.
 * @param ref optional branch; when omitted the default branch is resolved via the API.
 * @param token optional PAT, sent only to api.github.com / codeload as the user requested; never stored.
 * @param fetchImpl injectable for tests.
 */
export async function fetchGitHubArchive(
  spec: string,
  opts: { ref?: string; token?: string } = {},
  fetchImpl: FetchLike = fetch,
): Promise<ConnectorResult> {
  const parsed = parseGitHubSpec(spec);
  if (!parsed) throw new ConnectorError('invalid', 'Enter a repository as "owner/repo" or a github.com URL.');
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  const token = opts.token?.trim();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let ref = opts.ref?.trim() || '';
  if (!ref) {
    let res: Response;
    try {
      res = await fetchImpl(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers });
    } catch {
      throw new ConnectorError('network', 'Could not reach api.github.com. Check your connection.');
    }
    if (res.status === 404) throw new ConnectorError('not-found', 'Repository not found. It may be private (add a token) or the name is wrong.');
    if (res.status === 401) throw new ConnectorError('unauthorized', 'Token rejected (401). Check the token and try again.');
    if (res.status === 403) throw new ConnectorError('rate-limited', `GitHub rate limit reached. ${await readError(res)} Add a token to raise the limit.`);
    if (!res.ok) throw new ConnectorError('network', await readError(res));
    const meta = (await res.json()) as { default_branch?: unknown };
    ref = typeof meta.default_branch === 'string' ? meta.default_branch : 'main';
  }

  let zip: Response;
  try {
    zip = await fetchImpl(gitHubZipUrl(parsed.owner, parsed.repo, ref), { headers });
  } catch {
    throw new ConnectorError('network', 'Download failed. Check your connection.');
  }
  if (zip.status === 404) throw new ConnectorError('not-found', `Branch "${ref}" not found, or repository is private.`);
  if (!zip.ok) throw new ConnectorError('network', await readError(zip));
  const buf = await zip.arrayBuffer();
  return {
    data: buf,
    fileName: `${parsed.repo}-${ref}.zip`,
    source: `github:${parsed.owner}/${parsed.repo}@${ref}`,
    rateLimitRemaining: zip.headers.get('x-ratelimit-remaining'),
  };
}

/** Fetch a public (or token-authorized) GitLab project archive. */
export async function fetchGitLabArchive(
  spec: string,
  opts: { ref?: string; token?: string; host?: string } = {},
  fetchImpl: FetchLike = fetch,
): Promise<ConnectorResult> {
  const parsed = parseGitLabSpec(spec, opts.host ?? 'gitlab.com');
  if (!parsed) throw new ConnectorError('invalid', 'Enter a project as "namespace/project" or a full repository URL.');
  const headers: Record<string, string> = {};
  const token = opts.token?.trim();
  if (token) headers['PRIVATE-TOKEN'] = token;
  const url = gitLabZipUrl(parsed.host, parsed.projectPath, opts.ref?.trim() || undefined);
  let res: Response;
  try {
    res = await fetchImpl(url, { headers });
  } catch {
    throw new ConnectorError('network', `Could not reach ${parsed.host}. Check your connection.`);
  }
  if (res.status === 404) throw new ConnectorError('not-found', 'Project not found. It may be private (add a token) or the path is wrong.');
  if (res.status === 401) throw new ConnectorError('unauthorized', 'Token rejected (401).');
  if (!res.ok) throw new ConnectorError('network', `HTTP ${res.status}.`);
  const buf = await res.arrayBuffer();
  return { data: buf, fileName: 'gitlab-archive.zip', source: `gitlab:${parsed.host}/${opts.ref ?? 'default'}`, rateLimitRemaining: null };
}
