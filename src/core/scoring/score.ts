import type { CategoryScore, Finding, FindingCategory, ReadinessScore } from '../../types.js';

export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  documentation: 'Documentation',
  organization: 'Organization',
  setup: 'Setup',
  testing: 'Testing',
  formatting: 'Formatting',
  ci: 'CI',
  licensing: 'Licensing',
  security: 'Security',
  dependencies: 'Dependencies',
  contribution: 'Contribution',
  release: 'Release',
  maintainability: 'Maintainability',
};

export const SCORING_METHODOLOGY =
  'Each rule carries a weight (1–8). A rule scores its full weight when status is "found" (or "not-applicable", excluded from the denominator). ' +
  '"needs-review" and "analysis-limited" score half weight. "missing", "unable-to-verify" score zero. ' +
  'Category percent = earned / possible. Overall percent = total earned / total possible. ' +
  'This is a heuristic maintenance-readiness signal, not a security certification or production-readiness verdict.';

/** Transparent, deterministic scoring over evidence-backed findings. */
export function computeScore(findings: Finding[]): ReadinessScore {
  const cats = Object.keys(CATEGORY_LABELS) as FindingCategory[];
  const categories: CategoryScore[] = cats.map((c) => {
    const rel = findings.filter((f) => f.category === c && f.status !== 'not-applicable' && f.weight > 0);
    const possible = rel.reduce((s, f) => s + f.weight, 0);
    const earned = rel.reduce((s, f) => {
      if (f.status === 'found') return s + f.weight;
      if (f.status === 'needs-review' || f.status === 'analysis-limited') return s + f.weight / 2;
      return s;
    }, 0);
    return {
      category: c,
      earned: Math.round(earned * 10) / 10,
      possible,
      percent: possible === 0 ? 100 : Math.round((earned / possible) * 100),
    };
  });
  const applicable = findings.filter((f) => f.status !== 'not-applicable' && f.weight > 0);
  const max = applicable.reduce((s, f) => s + f.weight, 0);
  const total = applicable.reduce((s, f) => {
    if (f.status === 'found') return s + f.weight;
    if (f.status === 'needs-review' || f.status === 'analysis-limited') return s + f.weight / 2;
    return s;
  }, 0);
  const percent = max === 0 ? 0 : Math.round((total / max) * 100);
  const grade = percent >= 85 ? 'A — Strong baseline' : percent >= 70 ? 'B — Good, gaps to close' : percent >= 50 ? 'C — Needs work' : percent >= 30 ? 'D — Early stage' : 'E — Getting started';
  return { total: Math.round(total * 10) / 10, max, percent, grade, categories, methodology: SCORING_METHODOLOGY };
}
