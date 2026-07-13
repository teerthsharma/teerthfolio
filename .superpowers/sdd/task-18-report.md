# Task 18 Report — Repository Evidence Integrity

Status: DONE_WITH_CONCERNS (implementation and focused contract pass; independent review and full build pending)

## Root cause

`components/ProjectIndex.jsx` derived `fileCount` from `project.evidenceFiles.length`. The corpus deliberately stores six representative evidence paths for Epsilon-Hollow, but the UI rendered that sample as `6 files`, falsely presenting it as repository scope.

## Authoritative evidence

Public GitHub REST API on 2026-07-12:

- Repository: `teerthsharma/Epsilon-Hollow`
- Default branch: `main`
- Recursive tree: complete (`truncated: false`)
- Tracked blob count: `1,013`
- Rust `.rs` blob count: `397`
- Directory count: `256`
- GitHub language bytes already present in the corpus: Rust `4,137,497`, C `3,895`

No Rust line count is claimed because the public repository metadata/tree endpoints do not provide an authoritative line total.

## Changes

- `lib/github-live.js`
  - Added pure complete-tree summarization.
  - Added server-side live repository metrics with Next cache revalidation.
  - Rejects truncated trees as total scope.
  - Falls back only to a dated verified complete-tree snapshot.
- `data/project-intelligence.json`
  - Added dated Epsilon-Hollow GitHub tree snapshot.
- `app/page.jsx`, `components/PortfolioPage.jsx`
  - Pass live/fallback repository metrics into the project index.
- `components/ProjectIndex.jsx`
  - Total scope reads `1,013 tracked / 397 Rust` when complete metrics exist.
  - Curated lists read `sampled paths` and `recent commits` when totals do not exist.
  - Language sizes use explicit MiB/KiB units.
- `scripts/check-project-evidence-integrity.mjs`, `package.json`
  - Added build-gated integrity contract.

## Focused proof

Command:

`node scripts/check-project-evidence-integrity.mjs`

Result:

`project evidence integrity contract passed: complete trees show repository scope; curated paths remain explicitly sampled`

Focused lint:

`npx eslint components\\ProjectIndex.jsx components\\PortfolioPage.jsx app\\page.jsx lib\\github-live.js scripts\\check-project-evidence-integrity.mjs`

Result: exit code `0`, no findings.

Live development server returned `GET / 200` after the data-flow change with no stderr output.

## Remaining concerns

- Full lint/build and rendered browser capture remain part of Wave E.
- Task 19 must audit every other user-facing metric/string for the same sample/total ambiguity.
- An independent reviewer must confirm the fallback remains truthful under GitHub rate-limit/failure simulation.
