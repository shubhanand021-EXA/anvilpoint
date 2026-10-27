import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useApp } from '../features/store/appStore.js';

export function ImportDialog({ onClose, onImport }: { onClose: () => void; onImport: (f: File) => Promise<void> }) {
  const { importing, progress, importError, settings } = useApp();
  const [picked, setPicked] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function confirm() {
    if (!picked) return;
    await onImport(picked);
    if (!importError) onClose();
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Import repository archive" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Import repository ZIP</h2>
          <span style={{ flex: 1 }} />
          <button className="btn small" onClick={onClose} aria-label="Close import dialog"><X size={14} /></button>
        </div>
        <p className="muted">Processed locally in your browser. Limits: {(settings.limits.maxCompressedBytes / 1048576).toFixed(0)} MB archive, {settings.limits.maxEntries} entries.</p>
        <div
          className={'dropzone' + (over ? ' over' : '')}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) setPicked(f);
          }}
        >
          <Upload size={22} aria-hidden />
          <p>{picked ? picked.name : 'Drag & drop a .zip here, or'}</p>
          <button className="btn" onClick={() => inputRef.current?.click()}>Browse files</button>
          <input ref={inputRef} type="file" accept=".zip,application/zip" className="sr-only"
            onChange={(e) => setPicked(e.target.files?.[0] ?? null)} aria-label="Choose ZIP file" />
          {picked && <p className="dim">{picked.name} · {(picked.size / 1024).toFixed(1)} KB</p>}
        </div>
        {importing && progress && (
          <div aria-live="polite">
            <p className="muted">{progress.stage}… {progress.indeterminate ? '' : `${progress.done}/${progress.total}`}</p>
            {!progress.indeterminate && progress.total > 0 && (
              <div className="progress"><span style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} /></div>
            )}
          </div>
        )}
        {importError && <p role="alert" style={{ color: 'var(--bad)' }}>{importError}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!picked || importing} onClick={confirm}>
            {importing ? 'Analyzing…' : 'Import & analyze'}
          </button>
        </div>
      </div>
    </div>
  );
}
