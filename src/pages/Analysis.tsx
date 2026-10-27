import { useMemo, useState } from 'react';
import { ChevronRight, FileText, Folder } from 'lucide-react';
import { useApp } from '../features/store/appStore.js';
import { EmptyState } from '../components/layout/Shell.js';

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: '', path: '', children: new Map(), isFile: false };
  for (const p of paths) {
    const parts = p.split('/');
    let node = root;
    let acc = '';
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, path: acc, children: new Map(), isFile: false };
        node.children.set(part, child);
      }
      if (i === parts.length - 1) child.isFile = true;
      node = child;
    });
  }
  return root;
}

export function AnalysisPage() {
  const { result, selectFile, selectedFile } = useApp();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['src', '.github']));
  const [showSkipped, setShowSkipped] = useState(false);

  const tree = useMemo(
    () => (result ? buildTree(result.inventory.files.map((f) => f.path)) : null),
    [result],
  );

  if (!result || !tree) {
    return (
      <div>
        <div className="page-head"><div><h1>Repository Analysis</h1><p>Inventory of the imported archive.</p></div></div>
        <EmptyState title="No project imported" body="Import a ZIP archive to browse its structure and scope." />
      </div>
    );
  }
  const inv = result.inventory;

  function toggle(dir: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(dir)) n.delete(dir); else n.add(dir);
      return n;
    });
  }

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const kids = [...node.children.values()].sort((a, b) =>
      a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1,
    );
    return kids.map((k) => {
      if (k.isFile) {
        const meta = inv.files.find((f) => f.path === k.path);
        return (
          <button
            key={k.path}
            className={'tree-row' + (selectedFile?.path === k.path ? ' selected' : '')}
            style={{ paddingLeft: 6 + depth * 10 }}
            onClick={() => selectFile(k.path)}
            title={meta?.skippedReason ?? k.path}
          >
            <FileText size={13} aria-hidden />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.name}</span>
            {meta?.binary && <span className="pill">binary</span>}
            {meta?.truncated && <span className="pill warn">truncated</span>}
          </button>
        );
      }
      const open = expanded.has(k.path);
      return (
        <div key={k.path}>
          <button className="tree-row" style={{ paddingLeft: 6 + depth * 10 }} onClick={() => toggle(k.path)} aria-expanded={open}>
            <ChevronRight size={13} aria-hidden style={{ transform: open ? 'rotate(90deg)' : undefined }} />
            <Folder size={13} aria-hidden /><span>{k.name}</span>
          </button>
          {open && <div className="tree-children">{renderNode(k, depth + 1)}</div>}
        </div>
      );
    });
  }

  return (
    <div>
      <div className="page-head">
        <div><h1>Repository Analysis</h1><p>{inv.projectName} · {inv.processedFiles}/{inv.totalEntries} entries · {inv.textFiles} text files</p></div>
      </div>
      <div className="grid kpi">
        <div className="card"><div className="kpi-num">{inv.processedFiles}</div><div className="kpi-label">Files inventoried</div></div>
        <div className="card"><div className="kpi-num">{inv.directories.length}</div><div className="kpi-label">Directories</div></div>
        <div className="card"><div className="kpi-num">{inv.manifests.length}</div><div className="kpi-label">Manifests</div></div>
        <div className="card"><div className="kpi-num">{inv.skipped.length}</div><div className="kpi-label">Skipped / truncated</div></div>
        <div className="card"><div className="kpi-num">{inv.ecosystems.join(', ') || '—'}</div><div className="kpi-label">Ecosystems</div></div>
      </div>
      {inv.manifests.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h2>Detected manifests</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {inv.manifests.map((m) => <button key={m} className="pill info" style={{ cursor: 'pointer' }} onClick={() => selectFile(m)}>{m}</button>)}
          </div>
        </div>
      )}
      <div className="grid two" style={{ marginTop: 12 }}>
        <div className="card">
          <h2>File tree</h2>
          <div className="tree" role="tree" aria-label="Repository file tree">{renderNode(tree, 0)}</div>
          <div style={{ marginTop: 10 }}>
            <button className="btn small" onClick={() => setShowSkipped((s) => !s)} aria-expanded={showSkipped}>
              {showSkipped ? 'Hide' : 'Show'} skipped entries ({inv.skipped.length})
            </button>
            {showSkipped && (
              <table className="data" style={{ marginTop: 8 }}>
                <thead><tr><th>Path</th><th>Reason</th></tr></thead>
                <tbody>
                  {inv.skipped.slice(0, 200).map((s, i) => <tr key={i}><td><code>{s.path}</code></td><td className="dim">{s.reason}</td></tr>)}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card">
          <h2>File preview</h2>
          {!selectedFile && <p className="muted">Select a file to preview its text. Binary files show metadata only. Code is never executed.</p>}
          {selectedFile && (
            <div>
              <p><code>{selectedFile.path}</code> <span className="dim">· {(selectedFile.size / 1024).toFixed(1)} KB{selectedFile.truncated ? ' · truncated to budget' : ''}</span></p>
              {selectedFile.binary && <p className="pill warn">Binary or unsupported — metadata only ({selectedFile.skippedReason})</p>}
              {selectedFile.text !== null && <pre aria-label={`Preview of ${selectedFile.path}`}>{selectedFile.text.slice(0, 20000)}</pre>}
              {selectedFile.truncated && <p className="dim">Preview truncated to the per-file text budget. Increase it in Settings (within safe bounds).</p>}
            </div>
          )}
          {inv.warnings.map((w) => <p key={w.code} className="pill warn">{w.message}</p>)}
        </div>
      </div>
    </div>
  );
}
