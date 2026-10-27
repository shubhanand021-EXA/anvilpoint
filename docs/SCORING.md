# Scoring methodology

Overall readiness = 100 × (earned weight ÷ possible weight), excluding `not-applicable` rules.

| Status | Points |
|---|---|
| `found` | full weight |
| `needs-review`, `analysis-limited` | half weight |
| `missing`, `unable-to-verify` | zero |

Weights reflect maintenance impact: license/README/CI/testing carry 5–8; editorconfig/cosmetics carry 1–2.
Each category score uses the same formula over its own rules.

This number is a **prioritization aid**, not a grade of quality, security, or production readiness.
Always read the underlying findings and evidence. A high score with a missing LICENSE is still undistributable;
a low score on a well-scoped prototype may be fine.
