import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { Copy, Download, RotateCcw } from 'lucide-react';
import { useApp } from '../features/store/appStore.js';
import { EmptyState } from '../components/layout/Shell.js';
import { DOC_FIELDS, renderDoc, type DocKind } from '../core/generators/docs.js';
import { downloadTextFile } from '../core/exports/reports.js';

const DOCS: { kind: DocKind; label: string; file: string }[] = [
  { kind: 'README.md', label: 'README', file: 'README.md' },
  { kind: 'CONTRIBUTING.md', label: 'Contributing', file: 'CONTRIBUTING.md' },
  { kind: 'SECURITY.md', label: 'Security policy', file: 'SECURITY.md' },
  { kind: 'CODE_OF_CONDUCT.md', label: 'Code of conduct', file: 'CODE_OF_CONDUCT.md' },
  { kind: 'CHANGELOG.md', label: 'Changelog', file: 'CHANGELOG.md' },
  { kind: 'issue-bug.md', label: 'Bug template', file: '.github/ISSUE_TEMPLATE/bug_report.md' },
  { kind: 'issue-feature.md', label: 'Feature template', file: '.github/ISSUE_TEMPLATE/feature_request.md' },
  { kind: 'pull-request.md', label: 'PR template', file: '.github/PULL_REQUEST_TEMPLATE.md' },
  { kind: 'DEVELOPMENT.md', label: 'Development setup', file: 'DEVELOPMENT.md' },
  { kind: 'RELEASE_CHECKLIST.md', label: 'Release checklist', file: 'RELEASE_CHECKLIST.md' },
];

export function DocsPage() {
  const { result, pushToast } = useApp();
  const [kind, setKind] = useState<DocKind>('README.md');
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [preview, setPreview] = useState(true);

  const current = values[kind] ?? {};
  const text = useMemo(() => renderDoc(kind, current, result), [kind, current, result]);
  const fields = DOC_FIELDS[kind];

  if (!result) {
    return (
      <div>
        <div className="page-head"><div><h1>Documentation Studio</h1><p>Editable, downloadable project files.</p></div></div>
        <EmptyState title="Import a project first" body="Documentation fields are pre-filled from verified repository facts. Placeholders are explicit — nothing is invented." />
      </div>
    );
  }

  function setField(key: string, v: string) {
    setValues((all) => ({ ...all, [kind]: { ...(all[kind] ?? {}), [key]: v } }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      pushToast('Copied to clipboard');
    } catch {
      pushToast('Clipboard unavailable — select the preview text manually');
    }
  }

  async function downloadAll() {
    const zip = new JSZip();
    for (const d of DOCS) {
      zip.file(d.file, renderDoc(d.kind, values[d.kind] ?? {}, result));
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${result?.inventory.projectName ?? 'ANVILPOINT'}-docs.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    pushToast('Downloaded docs bundle (.zip)');
  }

  return (
    <div>
      <div className="page-head">
        <div><h1>Documentation Studio</h1><p>Prefilled from verified facts. [TODO] marks what you must confirm.</p></div>
        <div className="actions">
          <button className="btn" onClick={copy}><Copy size={14} /> Copy</button>
          <button className="btn" onClick={() => downloadTextFile(DOCS.find((d) => d.kind === kind)?.file ?? kind, text, 'text/markdown')}>
            <Download size={14} /> Download file
          </button>
          <button className="btn primary" onClick={downloadAll}><Download size={14} /> Download all (.zip)</button>
        </div>
      </div>
      <div className="filters" role="tablist" aria-label="Document templates">
        {DOCS.map((d) => (
          <button key={d.kind} role="tab" aria-selected={kind === d.kind} className={'btn small' + (kind === d.kind ? ' primary' : '')} onClick={() => setKind(d.kind)}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="grid two">
        <div className="card">
          <h2>Fields — {DOCS.find((d) => d.kind === kind)?.file}</h2>
          {fields.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={`doc-${f.key}`}>{f.label}</label>
              {f.multiline ? (
                <textarea id={`doc-${f.key}`} value={current[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setField(f.key, e.target.value)} />
              ) : (
                <input id={`doc-${f.key}`} value={current[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setField(f.key, e.target.value)} />
              )}
            </div>
          ))}
          <button className="btn small" onClick={() => setValues((all) => ({ ...all, [kind]: {} }))}><RotateCcw size={13} /> Reset to template</button>
          <p className="dim">Never silently replaces your files: downloads are new files you review before committing. Existing repo files are never overwritten.</p>
        </div>
        <div className="card">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <h2>Preview</h2><span style={{ flex: 1 }} />
            <button className="btn small" onClick={() => setPreview((p) => !p)}>{preview ? 'Show source' : 'Show rendered'}</button>
          </div>
          {preview ? <pre aria-label="Generated document preview">{text}</pre> : <pre>{text}</pre>}
        </div>
      </div>
    </div>
  );
}
