import type { AnalysisResult, RepositoryInventory } from '../types.js';
import { detectEcosystems, parseAllManifests } from './parsers/manifests.js';
import { evaluateRules } from './rules/engine.js';
import { computeScore } from './scoring/score.js';
import { RULE_SET_VERSION } from '../types.js';

export function analyzeInventory(inventory: RepositoryInventory): AnalysisResult {
  const manifests = parseAllManifests(inventory.files);
  const ecosystems = detectEcosystems(manifests, inventory.files);
  const inv = { ...inventory, ecosystems, manifests: manifests.map((m) => m.path) };
  const findings = evaluateRules({ inventory: inv, manifests, ecosystems });
  const dependencies = manifests.flatMap((m) => m.dependencies);
  const score = computeScore(findings);
  return { inventory: inv, findings, dependencies, score, ruleSetVersion: RULE_SET_VERSION };
}
