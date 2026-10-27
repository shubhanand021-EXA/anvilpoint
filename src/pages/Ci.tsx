import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useApp } from '../features/store/appStore.js';
import { EmptyState } from '../components/layout/Shell.js';
import { CI_STEPS, renderCiWorkflow } from '../core/generators/ci.js';
import type { Ecosystem } from '../types.js';
import { downloadTextFile } from '../core/exports/reports.js';

export function CiPage() {
  const { result, pushToast } = useApp();
  const detected: Ecosystem = result?.inventory.ecosystems[0] ?? 'node';
  const [eco, setEco] = useState<Ecosystem>(detected);
  const [runs, setRuns] = useState<string[]>(['install', 'test']);
  const [os, setOs] = useState('ubuntu-latest');
  const [weekly, setWeekly] = useState(false);

  const { yaml, notes } = useMemo(
    () => renderCiWorkflow({ ecosystem: eco, runs, os, scheduleWeekly: weekly }),
    [eco, runs, os, weekly],
  );

  if (!result) {
    return (
      <div>
        <div className="page-head"><div><h1>CI Workflow Builder</h1><p>Reviewable GitHub Actions starters.</p></div></div>
        <EmptyState title="Import a project first" body="The builder pre-selects the detected ecosystem, but every step and command stays editable and reviewable." />
      </div>
    );
  }

  function toggle(id: string) {
    setRuns((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  }

  return (
    <div>
      <div className="page-head">
        <div><h1>CI Workflow Builder</h1><p>Generates <code>.github/workflows/ci.yml</code> — preview before committing. Never auto-commits.</p></div>
        <div className="actions">
          <button className="btn primary" onClick={() => { downloadTextFile('ci.yml', yaml, 'text/yaml'); pushToast('Downloaded ci.yml'); }}>
            <Download size={14} /> Download ci.yml
          </button>
        </div>
      </div>
      <div className="grid two">
        <div className="card">
          <h2>Configuration</h2>
          <div className="field">
            <label htmlFor="ci-eco">Ecosystem {result.inventory.ecosystems.length > 0 && <span className="dim">(detected: {result.inventory.ecosystems.join(', ')})</span>}</label>
            <select id="ci-eco" value={eco} onChange={(e) => { setEco(e.target.value as Ecosystem); setRuns(['install', 'test']); }}>
              <option value="node">JavaScript / TypeScript (npm)</option>
              <option value="python">Python</option>
              <option value="rust">Rust</option>
              <option value="go">Go</option>
            </select>
          </div>
          <fieldset style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: 10 }}>
            <legend className="dim">Steps</legend>
            {CI_STEPS[eco].map((s) => (
              <label key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0' }}>
                <input type="checkbox" checked={runs.includes(s.id)} onChange={() => toggle(s.id)} />
                <span><b>{s.label}</b><br /><code className="dim">{s.commands.join(' && ')}</code></span>
              </label>
            ))}
          </fieldset>
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="ci-os">Runner</label>
            <select id="ci-os" value={os} onChange={(e) => setOs(e.target.value)}>
              <option value="ubuntu-latest">ubuntu-latest</option>
              <option value="windows-latest">windows-latest</option>
              <option value="macos-latest">macos-latest</option>
            </select>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} /> Weekly scheduled run
          </label>
          <div className="card" style={{ marginTop: 12, background: 'var(--bg-2)' }}>
            <h2>Review notes</h2>
            <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              {notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        </div>
        <div className="card">
          <h2>Preview — ci.yml</h2>
          <pre aria-label="Generated CI workflow preview">{yaml}</pre>
          <p className="dim">Validated structure only — this workflow has not executed. Commands referencing missing scripts will fail; verify each command exists in your repo.</p>
        </div>
      </div>
    </div>
  );
}
