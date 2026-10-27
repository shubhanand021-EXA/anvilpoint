import { useMemo, useState } from 'react';
import { useApp } from '../features/store/appStore.js';
import { EmptyState } from '../components/layout/Shell.js';
import type { FindingCategory, FindingStatus } from '../types.js';
import { CATEGORY_LABELS } from '../core/scoring/score.js';

const STATUS_LABEL: Record<FindingStatus, string> = {
  found: 'Found', missing: 'Missing', 'needs-review': 'Needs review',
  'not-applicable': 'N/A', 'unable-to-verify': 'Unable to verify', 'analysis-limited': 'Limited',
};

export function FindingsPage() {
  const { result, search, selectFile, setPage } = useApp();
  const [cat, setCat] = useState<'all' | FindingCategory>('all');
  const [status, setStatus] = useState<'all' | FindingStatus>('all');
  const [sev, setSev] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!result) return [];
    const q = search.trim().toLowerCase();
    return result.findings.filter((f) => {
      if (cat !== 'all' && f.category !== cat) return false;
      if (status !== 'all' && f.status !== status) return false;
      if (sev !== 'all' && f.severity !== sev) return false;
      if (!q) return true;
      return (f.id + ' ' + f.title + ' ' + f.explanation + ' ' + f.evidence.join(' ') + ' ' + f.category)
        .toLowerCase().includes(q);
    });
  }, [result, search, cat, status, sev]);

  if (!result) {
    return (
      <div>
        <div className="page-head"><div><h1>Findings</h1><p>Evidence-backed analysis results.</p></div></div>
        <EmptyState title="No findings yet" body="Import a project archive to generate findings with evidence." />
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div><h1>Findings</h1><p>{filtered.length} of {result.findings.length} shown · every finding cites evidence</p></div>
      </div>
      <div className="filters" role="search">
        <label>Category <select value={cat} onChange={(e) => setCat(e.target.value as never)} aria-label="Filter by category">
          <option value="all">All</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
        <label>Status <select value={status} onChange={(e) => setStatus(e.target.value as never)} aria-label="Filter by status">
          <option value="all">All</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
        <label>Severity <select value={sev} onChange={(e) => setSev(e.target.value)} aria-label="Filter by severity">
          <option value="all">All</option>
          <option value="high">High</option><option value="medium">Medium</option>
          <option value="low">Low</option><option value="info">Info</option>
        </select></label>
        {(cat !== 'all' || status !== 'all' || sev !== 'all') && (
          <button className="btn small" onClick={() => { setCat('all'); setStatus('all'); setSev('all'); }}>Reset filters</button>
        )}
      </div>
      {filtered.length === 0 && <div className="empty"><h2>No findings match</h2><p className="muted">Adjust or reset the filters. Search queries the actual findings — nothing is hard-coded.</p></div>}
      {filtered.map((f) => (
        <article className="finding" key={f.id} aria-label={`${f.id} ${f.title}`}>
          <div className="finding-head">
            <span className="pill accent">{f.id}</span>
            <b>{f.title}</b>
            <span className={`pill ${f.status === 'found' ? 'found' : f.status === 'missing' ? 'missing' : f.status === 'needs-review' || f.status === 'analysis-limited' ? 'warn' : 'info'}`}>{STATUS_LABEL[f.status]}</span>
            <span className="pill">{f.severity}</span>
            <span className="dim">confidence: {f.confidence}{f.autoVerifiable ? '' : ' · human judgment needed'}</span>
            <span style={{ flex: 1 }} />
            <button className="btn small" onClick={() => setOpenId(openId === f.id ? null : f.id)} aria-expanded={openId === f.id}>
              {openId === f.id ? 'Hide detail' : 'Detail'}
            </button>
          </div>
          <p className="muted" style={{ margin: '6px 0' }}>{f.explanation}</p>
          {openId === f.id && (
            <div>
              <p><b>Why it matters:</b> {f.whyItMatters}</p>
              <p><b>Evidence:</b> <span className="evidence">{f.evidence.join(' · ')}</span></p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {f.evidence.filter((e) => !e.startsWith('(')).slice(0, 4).map((e) => (
                  <button key={e} className="btn small" onClick={() => { selectFile(e); setPage('analysis'); }}>Open {e.split('/').pop()}</button>
                ))}
              </div>
              <p><b>Remediation:</b> {f.remediation}</p>
              <p className="dim"><b>Rule:</b> {f.rule} · <b>Verification:</b> {f.verification}</p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
