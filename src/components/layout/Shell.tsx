import { useState } from 'react';
import {
  AlertTriangle, BookOpen, CheckSquare, CloudDownload, Cog, FileText, FlaskConical,
  LayoutDashboard, Package, Search, FolderTree, Upload, ScrollText, Workflow,
} from 'lucide-react';
import { useApp } from '../../features/store/appStore.js';
import type { PageId } from '../../types.js';
import { ImportDialog } from '../ImportDialog.js';

const NAV: { id: PageId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard /> },
  { id: 'analysis', label: 'Repository Analysis', icon: <FolderTree /> },
  { id: 'findings', label: 'Findings', icon: <FlaskConical /> },
  { id: 'docs', label: 'Documentation Studio', icon: <BookOpen /> },
  { id: 'deps', label: 'Dependency Inventory', icon: <Package /> },
  { id: 'ci', label: 'CI Workflow Builder', icon: <Workflow /> },
  { id: 'checklist', label: 'Project Checklist', icon: <CheckSquare /> },
  { id: 'reports', label: 'Reports', icon: <ScrollText /> },
  { id: 'integrations', label: 'Integrations', icon: <CloudDownload /> },
  { id: 'settings', label: 'Settings', icon: <Cog /> },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { page, setPage, result, search, setSearch, fileName, importing, importArchive, toasts, discardProject } = useApp();
  const [importOpen, setImportOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const findingsCount = result?.findings.length ?? 0;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <img src="./forgekit.svg" alt="FORGEKIT logo" />
          <div><b>FORGEKIT</b><small>Readiness Workbench</small></div>
        </div>
        <nav aria-label="Sections">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={'nav-btn' + (page === n.id ? ' active' : '')}
              onClick={() => setPage(n.id)}
              aria-current={page === n.id ? 'page' : undefined}
            >
              {n.icon}<span>{n.label}</span>
              {n.id === 'findings' && result && <span className="count">{findingsCount}</span>}
            </button>
          ))}
        </nav>
        <div className="dim" style={{ marginTop: 'auto', padding: '10px', fontSize: 11.5 }}>
          Local-first · no upload.<br />v1.1.0 · MIT licensed.
        </div>
      </aside>
      <div className="main-col">
        <div className="topbar">
          <label className="sr-only" htmlFor="global-search">Search findings, files, dependencies</label>
          <Search size={15} aria-hidden style={{ color: 'var(--text-3)' }} />
          <input
            id="global-search"
            type="search"
            placeholder="Search findings, files, dependencies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {fileName && <span className="pill info" title="Current project archive">{fileName}</span>}
          {result && <span className="pill ok">{result.inventory.projectName}</span>}
          <span style={{ flex: 1 }} />
          {result && (
            <button className="btn small" onClick={() => setConfirmDiscard(true)}>Clear workspace</button>
          )}
          <button className="btn primary" onClick={() => setImportOpen(true)} disabled={importing}>
            <Upload />{importing ? 'Importing…' : result ? 'Import' : 'Import ZIP'}
          </button>
        </div>
        <main className="content" id="main">{children}</main>
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((t) => <div key={t.id} className="toast">{t.msg}</div>)}
        </div>
        {importOpen && <ImportDialog onClose={() => setImportOpen(false)} onImport={importArchive} />}
        {confirmDiscard && (
          <div className="modal-back" onClick={() => setConfirmDiscard(false)}>
            <div className="modal" role="dialog" aria-modal="true" aria-label="Clear workspace" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginTop: 0 }}>Clear workspace?</h2>
              <p className="muted">This discards the imported inventory, findings, and generated previews from memory. Settings are kept unless you delete them in Settings.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setConfirmDiscard(false)}>Cancel</button>
                <button className="btn danger" onClick={() => { discardProject(); setConfirmDiscard(false); }}>Discard project</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const { importArchive, importing } = useApp();
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) await importArchive(f);
  }
  return (
    <div className="empty">
      <FileText size={28} aria-hidden style={{ opacity: 0.6 }} />
      <h2 style={{ margin: '8px 0 4px' }}>{title}</h2>
      <p className="muted">{body}</p>
      <label className="btn primary" style={{ cursor: 'pointer' }}>
        <Upload />{importing ? 'Importing…' : 'Select a ZIP archive'}
        <input type="file" accept=".zip" className="sr-only" onChange={pick} />
      </label>
      <p className="dim"><AlertTriangle size={12} /> Archives are processed locally in your browser. Nothing is uploaded.</p>
    </div>
  );
}
