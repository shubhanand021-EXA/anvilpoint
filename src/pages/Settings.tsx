import { useState } from 'react';
import { useApp } from '../features/store/appStore.js';
import { DEFAULT_LIMITS } from '../types.js';

export function SettingsPage() {
  const { settings, updateSettings, resetSettings, clearAllData, pushToast } = useApp();
  const [confirm, setConfirm] = useState(false);

  function num(v: string, fallback: number): number {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  }

  return (
    <div>
      <div className="page-head"><div><h1>Settings</h1><p>Every control changes real behavior. Stored locally only.</p></div></div>
      <div className="grid two-eq">
        <div className="card">
          <h2>Appearance</h2>
          <div className="field">
            <label htmlFor="set-theme">Theme</label>
            <select id="set-theme" value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value as never })}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="set-motion">Motion</label>
            <select id="set-motion" value={settings.reduceMotion} onChange={(e) => updateSettings({ reduceMotion: e.target.value as never })}>
              <option value="system">Follow system</option>
              <option value="on">Reduce motion</option>
              <option value="off">Full motion</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="set-export">Default report format</label>
            <select id="set-export" value={settings.defaultExport} onChange={(e) => updateSettings({ defaultExport: e.target.value as never })}>
              <option value="md">Markdown</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
        <div className="card">
          <h2>Analysis limits (safe bounds)</h2>
          <p className="dim">Bounds enforced during import. Upper caps prevent accidental denial-of-service on your own machine.</p>
          <div className="field">
            <label htmlFor="lim-mb">Max archive size (MB, 1–100)</label>
            <input id="lim-mb" type="number" min={1} max={100}
              value={Math.round(settings.limits.maxCompressedBytes / 1048576)}
              onChange={(e) => updateSettings({ limits: { ...settings.limits, maxCompressedBytes: Math.min(100, Math.max(1, num(e.target.value, 50))) * 1048576 } })} />
          </div>
          <div className="field">
            <label htmlFor="lim-entries">Max entries (100–10000)</label>
            <input id="lim-entries" type="number" min={100} max={10000}
              value={settings.limits.maxEntries}
              onChange={(e) => updateSettings({ limits: { ...settings.limits, maxEntries: Math.min(10000, Math.max(100, num(e.target.value, 5000))) } })} />
          </div>
          <div className="field">
            <label htmlFor="lim-file">Max text file (KB, 64–2048)</label>
            <input id="lim-file" type="number" min={64} max={2048}
              value={Math.round(settings.limits.maxTextFileBytes / 1024)}
              onChange={(e) => updateSettings({ limits: { ...settings.limits, maxTextFileBytes: Math.min(2048, Math.max(64, num(e.target.value, 1024))) * 1024 } })} />
          </div>
          <button className="btn small" onClick={() => updateSettings({ limits: DEFAULT_LIMITS })}>Restore default limits</button>
        </div>
        <div className="card">
          <h2>Privacy & storage</h2>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={settings.retainMetadata} onChange={(e) => updateSettings({ retainMetadata: e.target.checked })} />
            <span>Retain project metadata & history locally <span className="dim">(checklist progress + history list; source contents are never stored)</span></span>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
            <input type="checkbox" checked={settings.enablePublicLookup} onChange={(e) => updateSettings({ enablePublicLookup: e.target.checked })} />
            <span>Enable optional public-repo lookup <span className="dim">(requires network; off by default; ZIP import always works offline)</span></span>
          </label>
          <div className="card" style={{ marginTop: 10, background: 'var(--bg-2)' }}>
            <h2>What is stored where</h2>
            <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Settings + limits → localStorage, only on this browser.</li>
              <li>Checklist progress → localStorage only if “retain” is on.</li>
              <li>Repository contents → memory only, never localStorage, cleared on discard.</li>
              <li>Telemetry → none. No analytics, no tracking, no external calls by default.</li>
            </ul>
          </div>
        </div>
        <div className="card">
          <h2>Danger zone</h2>
          <p className="muted">Delete all local ANVILPOINT data (settings, checklist) and unload the project.</p>
          {!confirm ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={resetSettings}>Reset settings</button>
              <button className="btn danger" onClick={() => setConfirm(true)}>Delete local data…</button>
            </div>
          ) : (
            <div>
              <p role="alert"><b>Confirm deletion?</b> This clears settings and checklist state. It cannot be undone.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
                <button className="btn danger" onClick={() => { clearAllData(); setConfirm(false); pushToast('Local data deleted'); }}>Delete everything</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
