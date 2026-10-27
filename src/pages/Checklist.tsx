import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { useApp } from '../features/store/appStore.js';
import { EmptyState } from '../components/layout/Shell.js';
import { downloadTextFile } from '../core/exports/reports.js';

export function ChecklistPage() {
  const { result, checklist, toggleChecklist, pushToast } = useApp();

  const items = useMemo(() => {
    if (!result) return [];
    return result.findings
      .filter((f) => f.status === 'missing' || f.status === 'needs-review' || f.status === 'analysis-limited')
      .sort((a, b) => b.weight - a.weight);
  }, [result]);

  if (!result) {
    return (
      <div>
        <div className="page-head"><div><h1>Project Checklist</h1><p>Findings turned into tasks.</p></div></div>
        <EmptyState title="No checklist yet" body="Import a project to turn missing items into prioritized tasks." />
      </div>
    );
  }

  const done = items.filter((i) => (checklist[i.id] ?? 'todo') !== 'todo').length;

  function exportMd() {
    const lines = [
      `# Release-readiness checklist — ${result?.inventory.projectName}`,
      '',
      `> ${done}/${items.length} marked complete by user. “Verified” requires re-importing after the fix; FORGEKIT distinguishes user-marked from verified.`,
      '',
      ...items.map((i) => `- [${(checklist[i.id] ?? 'todo') !== 'todo' ? 'x' : ' '}] **${i.id} ${i.title}** — ${i.remediation} (evidence: ${i.evidence.join('; ')})`),
    ];
    downloadTextFile('CHECKLIST.md', lines.join('\n') + '\n', 'text/markdown');
    pushToast('Exported CHECKLIST.md');
  }

  return (
    <div>
      <div className="page-head">
        <div><h1>Project Checklist</h1><p>{done}/{items.length} marked complete · prioritized by weight × severity</p></div>
        <div className="actions"><button className="btn" onClick={exportMd}><Download size={14} /> Export checklist</button></div>
      </div>
      <div className="score-bar" role="img" aria-label={`${done} of ${items.length} tasks complete`}>
        <span style={{ width: items.length ? `${Math.round((done / items.length) * 100)}%` : '0%' }} />
      </div>
      <div style={{ marginTop: 12 }}>
        {items.map((i) => {
          const state = checklist[i.id] ?? 'todo';
          return (
            <div className="check-item" key={i.id}>
              <input
                type="checkbox"
                checked={state !== 'todo'}
                onChange={() => toggleChecklist(i.id)}
                aria-label={`Mark ${i.id} ${i.title} complete`}
              />
              <div>
                <b>{i.id} — {i.title}</b> <span className="pill">{i.severity}</span>{' '}
                <span className="dim">weight {i.weight} · confidence {i.confidence}</span>
                <div className="muted"><b>Why:</b> {i.whyItMatters}</div>
                <div className="muted"><b>Do:</b> {i.remediation}</div>
                <div className="dim">Evidence: {i.evidence.join('; ')} · Verify: {i.verification}</div>
                {state !== 'todo' && <span className="pill ok">Marked complete by user — re-import to verify</span>}
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div className="empty"><h2>Nothing outstanding</h2><p className="muted">All rules currently report “found” or “not applicable”.</p></div>}
      </div>
    </div>
  );
}
