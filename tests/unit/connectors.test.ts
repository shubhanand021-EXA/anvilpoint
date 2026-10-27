import { describe, expect, it, vi } from 'vitest';
import {
  ConnectorError,
  fetchGitHubArchive,
  fetchGitLabArchive,
  gitHubZipUrl,
  gitLabZipUrl,
  parseGitHubSpec,
  parseGitLabSpec,
} from '../../src/core/connectors/remote.js';

function res(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } as Headers,
    json: async () => body,
    arrayBuffer: async () => new TextEncoder().encode('fake-zip-bytes').buffer as ArrayBuffer,
  } as unknown as Response;
}

describe('connector spec parsing', () => {
  it('parses owner/repo and github urls', () => {
    expect(parseGitHubSpec('facebook/react')).toEqual({ owner: 'facebook', repo: 'react' });
    expect(parseGitHubSpec('https://github.com/facebook/react')).toEqual({ owner: 'facebook', repo: 'react' });
    expect(parseGitHubSpec('https://github.com/facebook/react.git')).toEqual({ owner: 'facebook', repo: 'react' });
  });
  it('rejects garbage specs', () => {
    expect(parseGitHubSpec('not a repo!!')).toBeNull();
    expect(parseGitHubSpec('onlyowner')).toBeNull();
    expect(parseGitHubSpec('')).toBeNull();
  });
  it('parses gitlab paths and urls', () => {
    expect(parseGitLabSpec('gitlab-org/gitlab')?.host).toBe('gitlab.com');
    expect(parseGitLabSpec('https://gitlab.com/gitlab-org/gitlab')?.projectPath).toBe('gitlab-org%2Fgitlab');
    expect(parseGitLabSpec('https://git.example.com/g/a')?.host).toBe('git.example.com');
    expect(parseGitLabSpec('???')).toBeNull();
  });
  it('builds archive urls', () => {
    expect(gitHubZipUrl('o', 'r', 'main')).toBe('https://codeload.github.com/o/r/zip/refs/heads/main');
    expect(gitLabZipUrl('gitlab.com', 'a%2Fb', 'main')).toContain('archive.zip?sha=main');
  });
});

describe('github fetch', () => {
  it('resolves default branch then downloads', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(res(200, { default_branch: 'main' }))
      .mockResolvedValueOnce(res(200, {}, { 'x-ratelimit-remaining': '59' }));
    const out = await fetchGitHubArchive('o/r', {}, f as unknown as typeof fetch);
    expect(out.source).toBe('github:o/r@main');
    expect(out.rateLimitRemaining).toBe('59');
    expect(f.mock.calls[1]?.[0]).toContain('codeload.github.com');
  });
  it('maps 404 to not-found with private-repo hint', async () => {
    const f = vi.fn().mockResolvedValue(res(404, { message: 'Not Found' }));
    await expect(fetchGitHubArchive('o/r', {}, f as unknown as typeof fetch))
      .rejects.toMatchObject({ kind: 'not-found' });
  });
  it('maps 403 to rate-limited', async () => {
    const f = vi.fn().mockResolvedValue(res(403, { message: 'API rate limit exceeded' }));
    const err = await fetchGitHubArchive('o/r', {}, f as unknown as typeof fetch).catch((e) => e);
    expect(err).toBeInstanceOf(ConnectorError);
    expect((err as ConnectorError).kind).toBe('rate-limited');
  });
  it('sends the token only as a Bearer header when provided', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(res(200, { default_branch: 'dev' }))
      .mockResolvedValueOnce(res(200, {}));
    await fetchGitHubArchive('o/r', { token: 'secret-token' }, f as unknown as typeof fetch);
    expect((f.mock.calls[0]?.[1] as { headers: Record<string, string> }).headers['Authorization']).toBe('Bearer secret-token');
  });
  it('maps network failure to network kind', async () => {
    const f = vi.fn().mockRejectedValue(new Error('down'));
    await expect(fetchGitHubArchive('o/r', {}, f as unknown as typeof fetch))
      .rejects.toMatchObject({ kind: 'network' });
  });
});

describe('gitlab fetch', () => {
  it('downloads archive and maps 404', async () => {
    const ok = vi.fn().mockResolvedValue(res(200, {}));
    const out = await fetchGitLabArchive('a/b', { ref: 'main' }, ok as unknown as typeof fetch);
    expect(out.fileName).toBe('gitlab-archive.zip');
    expect(ok.mock.calls[0]?.[0]).toContain('archive.zip?sha=main');
    const nf = vi.fn().mockResolvedValue(res(404, {}));
    await expect(fetchGitLabArchive('a/b', {}, nf as unknown as typeof fetch))
      .rejects.toMatchObject({ kind: 'not-found' });
  });
});
