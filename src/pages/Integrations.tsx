import { useState } from 'react';
import { CloudDownload, Github, Gitlab, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { useApp } from '../features/store/appStore.js';
import {
  ConnectorError,
  fetchGitHubArchive,
  fetchGitLabArchive,
  parseGitHubSpec,
  parseGitLabSpec,
} from '../core/connectors/remote.js';

type Provider = 'github' | 'gitlab';

export function IntegrationsPage() {
  const { importBuffer, importing, importError, history, clearHistory, settings, updateSettings, pushToast } = useApp();
  const [provider, setProvider] = useState<Provider>('github');
  const [spec, setSpec] = useState('');
  const [ref, setRef] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [rateInfo, setRateInfo] = useState<string | null>(null);

  const valid =
    provider === 'github' ? parseGitHubSpec(spec) !== null : parseGitLabSpec(spec) !== null;

  async function connect() {
    setLocalError(null);
    setRateInfo(null);
    setBusy(true);
    try {
      const res = provider === 'github'
        ? await fetchGitHubArchive(spec, { ref: ref || undefined, token: token || undefined })
        : await fetchGitLabArchive(spec, { ref: ref || undefined, token: token || undefined });
      if (res.rateLimitRemaining !== null) setRateInfo(`GitHub API calls remaining this hour: ${res.rateLimitRemaining}`);
      await importBuffer(res.data.slice(0), res.fileName, res.source);
      pushToast(`Connected: ${res.source}`);
    } catch (e) {
      if (e instanceof ConnectorError) setLocalError(e.message);
      else setLocalError(e instanceof Error ? e.message : 'Connection failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Integrations</h1>
          <p>Optional live connections to real repositories. The local ZIP workflow always works without them.</p>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Connect a repository</h2>
          <div className="filters" role="tablist" aria-label="Provider">
            <button role="tab" aria-selected={provider === 'github'} className={'btn small' + (provider === 'github' ? ' primary' : '')} onClick={() => setProvider('github')}>
              <Github size={14} /> GitHub
            </button>
            <button role="tab" aria-selected={provider === 'gitlab'} className={'btn small' + (provider === 'gitlab' ? ' primary' : '')} onClick={() => setProvider('gitlab')}>
              <Gitlab size={14} /> GitLab
            </button>
          </div>
          <div className="field">
            <label htmlFor="conn-spec">{provider === 'github' ? 'Repository (owner/repo or URL)' : 'Project (namespace/project or URL)'}</label>
            <input
              id="conn-spec"
              placeholder={provider === 'github' ? 'e.g. facebook/react' : 'e.g. gitlab-org/gitlab'}
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label htmlFor="conn-ref">Branch (optional — default branch auto-detected)</label>
            <input id="conn-ref" placeholder="e.g. main" value={ref} onChange={(e) => setRef(e.target.value)} autoComplete="off" spellCheck={false} />
          </div>
          <div className="field">
            <label htmlFor="conn-token">
              <KeyRound size={13} /> Access token (optional, memory-only — never stored)
            </label>
            <input
              id="conn-token"
              type={showToken ? 'text' : 'password'}
              placeholder={provider === 'github' ? 'ghp_… (private repos / higher rate limit)' : 'glpat-… (private projects)'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <span className="dim">
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={showToken} onChange={(e) => setShowToken(e.target.checked)} /> Show token
              </label>
              Public repositories need no token (60 API calls/hour unauthenticated). The token is sent only to
              {provider === 'github' ? ' api.github.com / codeload.github.com' : ' your GitLab host'} for this download,
              kept in memory, and discarded when you clear the workspace or reload.
            </span>
          </div>
          <button className="btn primary" disabled={!valid || busy || importing} onClick={connect}>
            <CloudDownload size={15} />{busy || importing ? 'Fetching…' : 'Fetch & analyze'}
          </button>
          {!valid && spec.trim() && (
            <p role="alert" style={{ color: 'var(--warn)' }}>
              {provider === 'github' ? 'Use "owner/repo" or a github.com URL.' : 'Use "namespace/project" or a full repository URL.'}
            </p>
          )}
          {(localError || importError) && <p role="alert" style={{ color: 'var(--bad)' }}>{localError ?? importError}</p>}
          {rateInfo && <p className="pill info">{rateInfo}</p>}
          <div className="card" style={{ marginTop: 12, background: 'var(--bg-2)' }}>
            <h2><ShieldCheck size={13} /> What happens on connect</h2>
            <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Requires internet — the core ZIP workflow does not.</li>
              <li>Downloads the repository archive; the same safety validation and budgets apply.</li>
              <li>Never clones with credentials in URLs; never stores your token.</li>
              <li>No source code leaves your machine — analysis still runs locally after download.</li>
            </ul>
          </div>
        </div>

        <div className="card">
          <h2>Project history {settings.retainMetadata ? '(on this device)' : '(disabled)'}</h2>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={settings.retainMetadata}
              onChange={(e) => updateSettings({ retainMetadata: e.target.checked })}
            />
            <span>Keep project history on this device <span className="dim">(metadata only — names, scores, dates; never source contents)</span></span>
          </label>
          {history.length === 0 && <p className="muted">No analyzed projects recorded yet. History entries appear here after each import while retention is on.</p>}
          {history.map((h) => (
            <div className="check-item" key={h.id}>
              <div>
                <b>{h.projectName}</b> <span className="pill accent">{h.score}%</span>{' '}
                <span className="dim">{h.grade}</span>
                <div className="dim">{h.source} · {h.ecosystems.join(', ') || 'no ecosystem'} · {h.findings} findings ({h.missing} missing) · {new Date(h.analyzedAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {history.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <button className="btn small danger" onClick={() => { clearHistory(); pushToast('History cleared'); }}>
                <Trash2 size={13} /> Clear history
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
