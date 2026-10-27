/* FORGEKIT core data model. All repository analysis is local and evidence-backed. */

export type Ecosystem = 'node' | 'python' | 'rust' | 'go';

export type FindingStatus =
  | 'found'
  | 'missing'
  | 'needs-review'
  | 'not-applicable'
  | 'unable-to-verify'
  | 'analysis-limited';

export type Severity = 'info' | 'low' | 'medium' | 'high';

export type FindingCategory =
  | 'documentation'
  | 'organization'
  | 'setup'
  | 'testing'
  | 'formatting'
  | 'ci'
  | 'licensing'
  | 'security'
  | 'dependencies'
  | 'contribution'
  | 'release'
  | 'maintainability';

export interface ProjectFile {
  /** Normalized relative path using forward slashes. */
  path: string;
  name: string;
  dir: string;
  size: number;
  /** Text content when the file was readable and within limits. */
  text: string | null;
  truncated: boolean;
  binary: boolean;
  skippedReason: string | null;
}

export interface SkippedEntry {
  path: string;
  reason: string;
}

export interface InventoryWarning {
  code: string;
  message: string;
}

export interface RepositoryInventory {
  projectName: string;
  totalEntries: number;
  processedFiles: number;
  textFiles: number;
  skipped: SkippedEntry[];
  warnings: InventoryWarning[];
  directories: string[];
  files: ProjectFile[];
  manifests: string[];
  ecosystems: Ecosystem[];
  analysisLimited: boolean;
  analyzedAt: string;
}

export interface Finding {
  id: string;
  title: string;
  category: FindingCategory;
  severity: Severity;
  status: FindingStatus;
  explanation: string;
  whyItMatters: string;
  evidence: string[];
  rule: string;
  remediation: string;
  verification: string;
  confidence: 'high' | 'medium' | 'low';
  autoVerifiable: boolean;
  weight: number;
}

export interface DependencyEntry {
  name: string;
  version: string;
  kind: 'direct' | 'dev' | 'transitive' | 'unknown';
  ecosystem: Ecosystem;
  manifest: string;
  license: string | null;
  licenseStatus: 'declared' | 'unknown' | 'needs-review';
  registry: string | null;
  verified: boolean;
}

export interface AnalysisResult {
  inventory: RepositoryInventory;
  findings: Finding[];
  dependencies: DependencyEntry[];
  score: ReadinessScore;
  ruleSetVersion: string;
}

export interface CategoryScore {
  category: FindingCategory;
  earned: number;
  possible: number;
  percent: number;
}

export interface ReadinessScore {
  total: number;
  max: number;
  percent: number;
  grade: string;
  categories: CategoryScore[];
  methodology: string;
}

export interface ArchiveLimits {
  maxCompressedBytes: number;
  maxEntries: number;
  maxTotalUncompressedBytes: number;
  maxTextFileBytes: number;
  maxTextFiles: number;
}

export const DEFAULT_LIMITS: ArchiveLimits = {
  maxCompressedBytes: 50 * 1024 * 1024,
  maxEntries: 5000,
  maxTotalUncompressedBytes: 200 * 1024 * 1024,
  maxTextFileBytes: 1024 * 1024,
  maxTextFiles: 800,
};

export const RULE_SET_VERSION = 'forgekit-rules-1.0.0';

export type PageId =
  | 'overview'
  | 'analysis'
  | 'findings'
  | 'docs'
  | 'deps'
  | 'ci'
  | 'checklist'
  | 'reports'
  | 'integrations'
  | 'settings';

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  reduceMotion: 'system' | 'on' | 'off';
  limits: ArchiveLimits;
  retainMetadata: boolean;
  defaultExport: 'md' | 'json' | 'csv';
  enablePublicLookup: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  reduceMotion: 'system',
  limits: DEFAULT_LIMITS,
  retainMetadata: false,
  defaultExport: 'md',
  enablePublicLookup: false,
};
