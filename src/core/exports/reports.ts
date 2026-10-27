import type { AnalysisResult } from '../../types.js';

function csvCell(v: string): string {
  const s = v.replace(/\r?\n/g, ' | ');
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function reportAsJson(result: AnalysisResult): string {
  const { inventory, findings, dependencies, score, ruleSetVersion } = result;
  return JSON.stringify(
    {
      tool: 'ANVILPOINT',
      ruleSetVersion,
      generatedAt: new Date().toISOString(),
      disclaimer: 'Heuristic file-presence analysis. Not a security certification, audit, or legal compliance statement.',
      project: {
        name: inventory.projectName,
        ecosystems: inventory.ecosystems,
        totalEntries: inventory.totalEntries,
        processedFiles: inventory.processedFiles,
        textFiles: inventory.textFiles,
        manifests: inventory.manifests,
        skipped: inventory.skipped,
        warnings: inventory.warnings,
        analysisLimited: inventory.analysisLimited,
      },
      score,
      findings,
      dependencies: dependencies.map((d) => ({ ...d, note: 'Declared metadata only; license unverified unless stated.' })),
      limitations: [
        'Only files within configured archive budgets were read.',
        'Project code was never executed.',
        'No vulnerability database was queried.',
        'License fields are declared metadata, not legal verification.',
      ],
    },
    null,
    2,
  ) + '\n';
}

export function reportAsMarkdown(result: AnalysisResult): string {
  const { inventory, findings, dependencies, score, ruleSetVersion } = result;
  const lines: string[] = [];
  lines.push(`# ANVILPOINT Analysis Report — ${inventory.projectName}`);
  lines.push('');
  lines.push(`> Generated ${new Date().toISOString()} · Rules ${ruleSetVersion} · Heuristic analysis only — not a security certification or legal compliance statement.`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`- Readiness: **${score.percent}%** (${score.grade}) — ${score.total}/${score.max} weighted points`);
  lines.push(`- Ecosystems: ${inventory.ecosystems.join(', ') || 'none detected'}`);
  lines.push(`- Entries: ${inventory.processedFiles}/${inventory.totalEntries} processed, ${inventory.textFiles} text files read`);
  lines.push(`- Manifests: ${inventory.manifests.join(', ') || 'none'}`);
  lines.push(`- Dependencies declared: ${dependencies.length}`);
  lines.push(`- Skipped: ${inventory.skipped.length} entr${inventory.skipped.length === 1 ? 'y' : 'ies'}`);
  lines.push('');
  lines.push(`### Scoring methodology`);
  lines.push('');
  lines.push(score.methodology);
  lines.push('');
  lines.push(`### Category scores`);
  lines.push('');
  lines.push(`| Category | Score |`);
  lines.push(`|---|---|`);
  for (const c of score.categories) {
    lines.push(`| ${c.category} | ${c.percent}% (${c.earned}/${c.possible}) |`);
  }
  lines.push('');
  lines.push(`## Findings (${findings.length})`);
  lines.push('');
  for (const f of findings) {
    lines.push(`### ${f.id} — ${f.title} [${f.status}]`);
    lines.push('');
    lines.push(`- Category: ${f.category} · Severity: ${f.severity} · Confidence: ${f.confidence}`);
    lines.push(`- ${f.explanation}`);
    lines.push(`- Why it matters: ${f.whyItMatters}`);
    lines.push(`- Evidence: ${f.evidence.join('; ') || 'none'}`);
    lines.push(`- Remediation: ${f.remediation}`);
    lines.push(`- Verification: ${f.verification}`);
    lines.push('');
  }
  lines.push(`## Dependency inventory (${dependencies.length})`);
  lines.push('');
  lines.push(`Declared metadata only. Licenses unverified; version ranges are not installed versions.`);
  lines.push('');
  if (dependencies.length > 0) {
    lines.push(`| Package | Version | Kind | Ecosystem | Manifest | License |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const d of dependencies.slice(0, 300)) {
      lines.push(`| ${d.name} | ${d.version} | ${d.kind} | ${d.ecosystem} | ${d.manifest} | ${d.license ?? 'unknown'} |`);
    }
  } else {
    lines.push(`No supported manifest dependencies detected.`);
  }
  lines.push('');
  lines.push(`## Scope & limitations`);
  lines.push('');
  lines.push(`- Only files within configured archive budgets were read; skipped entries are listed in the JSON export.`);
  lines.push(`- Project code was never executed. Tests and workflows were not run.`);
  lines.push(`- No vulnerability database was queried. Age of a dependency is not a vulnerability finding.`);
  lines.push(`- License output is declared metadata, not legal advice.`);
  return lines.join('\n') + '\n';
}

export function findingsAsCsv(result: AnalysisResult): string {
  const header = ['id', 'title', 'category', 'severity', 'status', 'confidence', 'evidence', 'remediation'].map(csvCell).join(',');
  const rows = result.findings.map((f) =>
    [f.id, f.title, f.category, f.severity, f.status, f.confidence, f.evidence.join(' | '), f.remediation].map(csvCell).join(','),
  );
  return [header, ...rows].join('\n') + '\n';
}

export function downloadTextFile(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
