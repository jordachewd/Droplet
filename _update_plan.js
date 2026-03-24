const fs = require('fs');
let content = fs.readFileSync('ThePlan.md', 'utf8');

const m25Start = content.indexOf('### Milestone 25');
const m25End = content.indexOf('\n---', m25Start + 10);

if (m25Start === -1 || m25End === -1) {
  console.log('ERROR: Could not find Milestone 25 section boundaries');
  console.log('m25Start:', m25Start, 'm25End:', m25End);
  process.exit(1);
}

console.log('Found M25 section: chars', m25Start, 'to', m25End);

const before = content.slice(0, m25Start);
const after = content.slice(m25End);

const lines = [
  '### Milestone 25 — Testing Infrastructure Rebuild & Config Hardening (Owner-Directed, 2026-03-21)',
  '',
  '> **Status: IN PROGRESS** — TDD rebuild underway. Previous 532-test suite deleted per owner directive. Current: 54 suites, 316 tests. Phase 120.2 partially complete (12/~35 utility test files rebuilt).',
  '',
  '**Objective:** Rebuild the entire testing infrastructure from scratch with TDD discipline, achieve coverage gate enforcement, and close remaining E2E quality gaps.',
  '',
  '**Dependencies:** Milestones 0–24 (all complete). Blocks A–F COMPLETE (archived to DONE.md).',
  '',
  '**Completed blocks (archived):** Block A (P1 bug fixes), Block B (config hardening), Block C (unit test rebuild), Block D (E2E test rebuild), Block E (security guards), Block F (coverage & config tightening). Phases 88–103.4, 105, 109, 111.1, 112.1–112.2, 113.1–113.2, 115–117, 120.1 all complete. See DONE.md for full phase records.',
  '',
  '**Block G — TDD Full Rebuild (IN PROGRESS):**',
  '',
  '1. **HIGH** — Phase 97: E2E quality rebuild — **97.1 DONE** (WCAG axe-core). Remaining: admin propagation E2E, Mongo dedup E2E.',
  '2. **HIGH** — Phase 98: Coverage gate — **IN PROGRESS**. Baseline: 78.55/66.3/83.53/78.85.',
  '3. **CRITICAL** — Phase 120.2: TDD utility test rebuild from scratch — **IN PROGRESS** (12/~35 files rebuilt).',
  '',
  '**Remaining Success Criteria:**',
  '',
  '- ⬜ Remaining E2E quality — Phase 97.2+ PENDING.',
  '- ⬜ Coverage gate GREEN (branches ≥78%, statements ≥82%) — Phase 98 IN PROGRESS.',
  '- ⚬ TDD utility test rebuild from scratch — Phase 120.2 IN PROGRESS (12/~35 files).',
  '- ⬜ TDD server action test rebuild — Phase 120.3 PENDING.',
  '- ⬜ TDD API route test rebuild — Phase 120.4 PENDING.',
  '- ⬜ TDD component test rebuild — Phase 120.5 PENDING.',
  '- ⬜ TDD E2E test rebuild — Phase 120.6 PENDING.',
  '- ⬜ Coverage thresholds raised post-rebuild — Phase 120.7 PENDING.',
  '',
];

const newM25 = lines.join('\n');
content = before + newM25 + after;
fs.writeFileSync('ThePlan.md', content, 'utf8');
console.log('Milestone 25 section replaced successfully');
console.log('New file length:', content.length, 'chars');
