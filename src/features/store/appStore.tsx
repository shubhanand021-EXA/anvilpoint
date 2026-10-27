import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AnalysisResult, AppSettings, ArchiveLimits, PageId, ProjectFile } from '../../types.js';
import { DEFAULT_SETTINGS } from '../../types.js';
import { analyzeInventory } from '../../core/analysis.js';
import { importZipArchive, type ImportProgress } from '../../core/archive/zipImport.js';

const SETTINGS_KEY = 'anvilpoint.settings.v1';
const CHECKLIST_KEY = 'anvilpoint.checklist.v1';
const HISTORY_KEY = 'anvilpoint.history.v1';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      limits: { ...DEFAULT_SETTINGS.limits, ...((parsed.limits ?? {}) as Partial<ArchiveLimits>) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface ChecklistState {
  [findingId: string]: 'todo' | 'done-user' | 'done-verified';
}

export interface HistoryEntry {
  id: string;
  projectName: string;
  fileName: string;
  source: string;
  ecosystems: string[];
  score: number;
  grade: string;
  findings: number;
  missing: number;
  analyzedAt: string;
}

interface AppState {
  page: PageId;
  setPage: (p: PageId) => void;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
  clearAllData: () => void;
  result: AnalysisResult | null;
  fileName: string | null;
  importing: boolean;
  progress: ImportProgress | null;
  importError: string | null;
  importArchive: (file: File) => Promise<void>;
  importBuffer: (buf: ArrayBuffer, displayName: string, source: string) => Promise<void>;
  discardProject: () => void;
  selectFile: (path: string | null) => void;
  selectedFile: ProjectFile | null;
  search: string;
  setSearch: (s: string) => void;
  checklist: ChecklistState;
  toggleChecklist: (id: string) => void;
  history: HistoryEntry[];
  clearHistory: () => void;
  toasts: { id: number; msg: string }[];
  pushToast: (msg: string) => void;
}

const Ctx = createContext<AppState | null>(null);

let toastId = 0;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<PageId>('overview');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [checklist, setChecklist] = useState<ChecklistState>(() => {
    try {
      return JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? '{}') as ChecklistState;
    } catch {
      return {};
    }
  });
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as HistoryEntry[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch { /* storage may be unavailable */ }
    const reduce = settings.reduceMotion === 'on' ? 'reduce'
      : settings.reduceMotion === 'off' ? 'no-preference' : 'system';
    document.documentElement.dataset.reduceMotion = reduce;
    document.documentElement.dataset.theme = settings.theme === 'system'
      ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : settings.theme;
  }, [settings]);

  useEffect(() => {
    if (!settings.retainMetadata) return;
    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklist));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 25)));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklist, settings.retainMetadata, history]);

  const pushToast = useCallback((msg: string) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch { /* ignore */ }
  }, []);

  const clearAllData = useCallback(() => {
    try {
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(CHECKLIST_KEY);
      localStorage.removeItem(HISTORY_KEY);
    } catch { /* ignore */ }
    setSettings(DEFAULT_SETTINGS);
    setChecklist({});
    setHistory([]);
    setResult(null);
    setFileName(null);
    setSelectedPath(null);
    setSearch('');
    setPage('overview');
  }, []);

  const discardProject = useCallback(() => {
    setResult(null);
    setFileName(null);
    setSelectedPath(null);
    setImportError(null);
    setPage('overview');
  }, []);

  const importBuffer = useCallback(async (buf: ArrayBuffer, displayName: string, source: string) => {
    setImporting(true);
    setImportError(null);
    setProgress({ stage: 'Starting', done: 0, total: 1, indeterminate: true });
    try {
      const { inventory } = await importZipArchive(buf, displayName, settings.limits, setProgress);
      const analyzed = analyzeInventory(inventory);
      setResult(analyzed);
      setFileName(displayName);
      setSelectedPath(null);
      setChecklist({});
      if (settings.retainMetadata) {
        const entry: HistoryEntry = {
          id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
          projectName: analyzed.inventory.projectName,
          fileName: displayName,
          source,
          ecosystems: analyzed.inventory.ecosystems,
          score: analyzed.score.percent,
          grade: analyzed.score.grade,
          findings: analyzed.findings.length,
          missing: analyzed.findings.filter((f) => f.status === 'missing').length,
          analyzedAt: analyzed.inventory.analyzedAt,
        };
        setHistory((h) => [entry, ...h].slice(0, 25));
      }
      setPage('overview');
      pushToast(`Imported ${analyzed.inventory.processedFiles} files from ${displayName}`);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }, [settings.limits, settings.retainMetadata, pushToast]);

  const importArchive = useCallback(async (file: File) => {
    await importBuffer(await file.arrayBuffer(), file.name, 'local-zip');
  }, [importBuffer]);

  const selectFile = useCallback((path: string | null) => setSelectedPath(path), []);

  const toggleChecklist = useCallback((id: string) => {
    setChecklist((c) => {
      const cur = c[id] ?? 'todo';
      return { ...c, [id]: cur === 'todo' ? 'done-user' : 'todo' };
    });
  }, []);

  const selectedFile = useMemo(
    () => result?.inventory.files.find((f) => f.path === selectedPath) ?? null,
    [result, selectedPath],
  );

  const value: AppState = {
    page, setPage, settings, updateSettings, resetSettings, clearAllData,
    result, fileName, importing, progress, importError, importArchive, importBuffer, discardProject,
    selectFile, selectedFile, search, setSearch, checklist, toggleChecklist,
    history, clearHistory, toasts, pushToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}
