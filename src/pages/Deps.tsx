import { useMemo } from 'react';
import { useApp } from '../features/store/appStore.js';
import { EmptyState } from '../components/layout/Shell.js';

export function DepsPage() {
  const { result, search } = useApp();
  const deps = useMemo(() => {
    if (!result) return [];
    const q = search.trim().toLowerCase();
    return result.dependencies.filter((d) =>
      !q || (d.name + ' ' + d.version + ' ' + d.manifest + ' ' + d.ecosystem).toLowerCase().includes(q),
    );
  }, [result, search]);

  if (!result) {
    return (
      <div>
        <div className="page-head"><div><h1>Dependency Inventory</h1><p>Declared manifests and lockfiles.</p></div></div>
        <EmptyState title="No dependencies inventoried" body="Import a project with package.json, requirements.txt, pyproject.toml, Cargo.toml, or go.mod." />
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div><h1>Dependency Inventory</h1><p>{deps.length} declared dependencies · metadata only, licenses unverified</p></div>
      </div>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          Version ranges are <b>not</b> installed versions. No lockfile was resolved and no vulnerability database was queried.
          A package being old is <b>not</b> evidence of a vulnerability. License values below mean
          “declared in metadata / unknown” — not legal verification.
        </p>
      </div>
      {deps.length === 0 ? (
        <div className="empty" style={{ marginTop: 12 }}><h2>No supported manifests</h2><p className="muted">No package.json, requirements/pyproject, Cargo.toml, or go.mod entries matched the search.</p></div>
      ) : (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Package</th><th>Version</th><th>Kind</th><th>Ecosystem</th><th>Manifest</th><th>License</th><th>Registry</th></tr></thead>
              <tbody>
                {deps.slice(0, 400).map((d, i) => (
                  <tr key={`${d.manifest}:${d.name}:${i}`}>
                    <td><code>{d.name}</code></td>
                    <td><code>{d.version}</code></td>
                    <td><span className="pill">{d.kind}</span></td>
                    <td>{d.ecosystem}</td>
                    <td className="dim">{d.manifest}</td>
                    <td>{d.license ?? <span className="pill warn">unknown — review</span>}</td>
                    <td>{d.registry ? <a href={d.registry} target="_blank" rel="noreferrer">{d.registry.replace('https://', '').split('/')[0]}</a> : <span className="dim">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="dim">Showing up to 400 rows. Direct vs dev is reliable only where the manifest distinguishes them.</p>
        </div>
      )}
    </div>
  );
}
