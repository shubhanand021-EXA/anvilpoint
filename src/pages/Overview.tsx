import { ArrowRight, ShieldCheck, Upload } from 'lucide-react';
import { useApp } from '../features/store/appStore.js';
import { EmptyState } from '../components/layout/Shell.js';
import { CATEGORY_LABELS } from '../core/scoring/score.js';
import type { PageId } from '../types.js';

export function OverviewPage() {
  const { result, setPage, importArchive, importing } = useApp();
  if (!result) {
    return (
      <div>
        <div className="page-head">
          <div><h1>Overview</h1><p>Understand your repository. Discover maintenance gaps. Generate useful files.</p></div>
        </div>
        <EmptyState title="No project imported" body="Import a ZIP archive of a repository to get an inventory, evidence-backed findings, and generated starter files. Everything runs locally." />
        <div className="grid two-eq" style={{ marginTop: 14 }}>
          {[
            ['1 · Import locally', 'Drag & drop a ZIP. FORGEKIT validates paths, enforces size budgets, and never executes project code.'],
            ['2 · Review evidence', 'Every finding cites the files (or absence) that triggered it, with severity, confidence, and remediation.'],
            ['3 · Generate & export', 'Starter README, CONTRIBUTING, CI workflows, and reports download as files you own. Nothing auto-commits.'],
          ].map(([t, b]) => (
            <div className="card" key={t}><h2>{t}</h2><p className="muted">{b}</p></div>
          ))}
        </div>
        <div className="card" style={{ marginTop: 14 }}>
          <h2><ShieldCheck size={14} /> Privacy first</h2>
          <p className="muted">Analysis happens in your browser. No repository contents, paths, or results leave your machine. Optional public-repo lookup is off by default and clearly labeled when used.</p>
        </div>
      </div>
    );
  }
  const { inventory, score, findings } = result;
  const go = (p: PageId) => setPage(p);
  const open = findings.filter((f) => f.status === 'missing').length;
  const review = findings.filter((f) => f.status === 'needs-review').length;

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) await importArchive(f);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{inventory.projectName}</h1>
          <p>{inventory.processedFiles} files · {inventory.ecosystems.join(', ') || 'no ecosystem detected'} · analyzed {new Date(inventory.analyzedAt).toLocaleString()}</p>
        </div>
        <div className="actions">
          <label className="btn" style={{ cursor: 'pointer' }}><Upload size={15} />{importing ? 'Importing…' : 'New import'}<input type="file" accept=".zip" className="sr-only" onChange={pick} /></label>
          <button className="btn primary" onClick={() => go('findings')}>Review findings <ArrowRight size={14} /></button>
        </div>
      </div>
      <div className="grid kpi">
        <div className="card"><div className="kpi-num">{score.percent}%</div><div className="kpi-label">Readiness · {score.grade}</div><div className="score-bar" role="img" aria-label={`Readiness ${score.percent} percent`}><span style={{ width: `${score.percent}%` }} /></div></div>
        <div className="card"><div className="kpi-num">{findings.length}</div><div className="kpi-label">Findings total</div></div>
        <div className="card"><div className="kpi-num">{open}</div><div className="kpi-label">Missing items</div></div>
        <div className="card"><div className="kpi-num">{review}</div><div className="kpi-label">Need review</div></div>
        <div className="card"><div className="kpi-num">{inventory.textFiles}</div><div className="kpi-label">Text files read</div></div>
      </div>
      <div className="grid two" style={{ marginTop: 14 }}>
        <div className="card">
          <h2>Category scores</h2>
          <table className="data">
            <thead><tr><th>Category</th><th>Score</th><th style={{ width: 130 }}>Progress</th></tr></thead>
            <tbody>
              {score.categories.map((c) => (
                <tr key={c.category}>
                  <td>{CATEGORY_LABELS[c.category]}</td>
                  <td>{c.percent}% <span className="dim">({c.earned}/{c.possible})</span></td>
                  <td><div className="score-bar"><span style={{ width: `${c.percent}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="dim">Heuristic maintenance signal — not a security certification. <button className="btn small" onClick={() => go('reports')}>Methodology in Reports</button></p>
        </div>
        <div>
          <div className="card">
            <h2>Top gaps</h2>
            {findings.filter((f) => f.status === 'missing').slice(0, 5).map((f) => (
              <div key={f.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <span className="pill missing">{f.id}</span> <b>{f.title}</b>
                <div className="dim">{f.remediation}</div>
              </div>
            ))}
            {open === 0 && <p className="muted">No missing items — review the “needs review” findings next.</p>}
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button className="btn small" onClick={() => go('docs')}>Documentation Studio</button>
              <button className="btn small" onClick={() => go('ci')}>CI Builder</button>
              <button className="btn small" onClick={() => go('checklist')}>Checklist</button>
            </div>
          </div>
          {inventory.analysisLimited && (
            <div className="card" style={{ marginTop: 12, borderColor: 'var(--warn)' }}>
              <h2>Analysis limited</h2>
              <p className="muted">{inventory.skipped.length} entries skipped or truncated. See Repository Analysis for reasons.</p>
              <button className="btn small" onClick={() => go('analysis')}>View inventory</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
