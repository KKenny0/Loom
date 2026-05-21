import { EVIDENCE_TAGS } from './quality-rules.js';

export interface ProcessedOutput {
  raw: string;
  compliance: {
    hasEvidenceTags: boolean;
    hasConflictSection: boolean;
    unverifiedCount: number;
    sourceRefCount: number;
  };
  rendered: string;
}

const CONFLICT_PATTERNS = [
  /^#{1,3}\s.*(?:冲突|矛盾|disagree|conflict|争议|分歧)/im,
  /^#{1,3}\s.*(?:谁说了什么|who says what)/im,
];

function checkCompliance(raw: string): ProcessedOutput['compliance'] {
  // Evidence tags: [Strong], [Moderate], [Weak], [Contested]
  const tagPattern = new RegExp(`\\[(${EVIDENCE_TAGS.join('|')})\\]`, 'g');
  const tagMatches = raw.match(tagPattern);
  const hasEvidenceTags = (tagMatches?.length ?? 0) > 0;

  // Conflict section
  const hasConflictSection = CONFLICT_PATTERNS.some((p) => p.test(raw));

  // [待验证] markers
  const unverifiedMatches = raw.match(/\[待验证\]/g);
  const unverifiedCount = unverifiedMatches?.length ?? 0;

  // Source references S1, S2, etc.
  const sourceMatches = raw.match(/\bS\d+\b/g);
  const sourceRefCount = sourceMatches?.length ?? 0;

  return {
    hasEvidenceTags,
    hasConflictSection,
    unverifiedCount,
    sourceRefCount,
  };
}

function buildComplianceSummary(compliance: ProcessedOutput['compliance']): string {
  const checks: string[] = [];

  checks.push(compliance.hasEvidenceTags ? '✓ Evidence weight tags present' : '✗ Missing evidence weight tags');
  checks.push(compliance.hasConflictSection ? '✓ Conflict/disagreement section present' : '✗ Missing conflict section');
  checks.push(`Unverified claims [待验证]: ${compliance.unverifiedCount}`);
  checks.push(`Source references: ${compliance.sourceRefCount}`);

  const score = [compliance.hasEvidenceTags, compliance.hasConflictSection].filter(Boolean).length;
  checks.push(`Compliance score: ${score}/2`);

  return checks.join('\n');
}

export function processOutput(raw: string): ProcessedOutput {
  const compliance = checkCompliance(raw);

  const summary = buildComplianceSummary(compliance);
  const rendered = `${raw}

---

## Loom Compliance Report

${summary}
`;

  return { raw, compliance, rendered };
}
