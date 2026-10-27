import { useState } from 'react';
import { Download } from 'lucide-react';
import { useApp } from '../features/store/appStore.js';
import { EmptyState } from '../components/layout/Shell.js';
import { findingsAsCsv, reportAsJson, reportAsMarkdown, downloadTextFile } from '../core/exports/reports.js';

export function ReportsPage() {
  const { result, settings, pushToast } = useApp();
  const [fmt, setFmt] = useState<'md' | 'json' | 'csv'>(settings.defaultExport);

  if (!result) {
    return (
      <div>
        <div className="page-head"><div><h1>Reports</h1><p>Portable analysis exports.</p></div></div>
        <EmptyState title="No report available" body="Import a project to export JSON, Markdown, or CSV findings." />
      </div>
    );
  }

  function exportNow() {
    if (!result) return;
    if (fmt === 'json') downloadTextFile(`${result?.inventory.projectName}-forgekit.json`, reportAsJson(result), 'application/json');
    else if (fmt === 'md') downloadTextFile(`${result?.inventory.projectName}-forgekit.md`, reportAsMarkdown(result), 'text/markdown');
    else downloadTextFile(`${result?.inventory.projectName}-findings.csv`, findingsAsCsv(result), 'text/csv');
    pushToast(`Exported ${fmt.toUpperCase()} report`);
  }

  const md = reportAsMarkdown(result);

  return (
    <div>
      <div className="page-head">
        <div><h1>Reports</h1><p>Rules {result.ruleSetVersion} · {new Date(result.inventory.analyzedAt).toLocaleString()} · source contents never embedded</p></div>
        <div className="actions">
          <select value={fmt} onChange={(e) => setFmt(e.target.value as never)} aria-label="Export format">
            <option value="md">Markdown</option>
            <option value="json">JSON</option>
            <option value="csv">CSV findings</option>
          </select>
          <button className="btn primary" onClick={exportNow}><Download size={14} /> Export</button>
        </div>
      </div>
      <div className="grid two">
        <div className="card">
          <h2>Report contents</h2>
          <ul className="muted">
            <li>Inventory: {result.inventory.processedFiles}/{result.inventory.totalEntries} files, {result.inventory.textFiles} text, {result.inventory.skipped.length} skipped</li>
            <li>Ecosystems: {result.inventory.ecosystems.join(', ') || 'none detected'}</li>
            <li>Findings: {result.findings.length} with severity, evidence, remediation</li>
            <li>Readiness: {result.score.percent}% ({result.score.grade})</li>
            <li>Methodology: {result.score.methodology.slice(0, 160)}…</li>
          </ul>
          <h2>Assumptions & limitations</h2>
          <ul className="muted">
            <li>Only files within archive budgets were read; skipped entries listed in JSON export.</li>
            <li>Project code was never executed; tests and workflows were not run.</li>
            <li>No vulnerability database queried; age ≠ vulnerability.</li>
            <li>Licenses are declared metadata, not legal verification.</li>
          </ul>
        </div>
        <div className="card">
          <h2>Markdown preview</h2>
          <pre aria-label="Markdown report preview">{md.slice(0, 8000)}</pre>
        </div>
      </div>
    </div>
  );
}
