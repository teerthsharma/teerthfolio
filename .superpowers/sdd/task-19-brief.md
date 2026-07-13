# Task 19 — Wave G User-Facing Copy and Evidence Audit

## Objective

Every visible string must earn its place. A string stays only when it communicates current state, supplies verified evidence, enables an action, identifies a place, or provides an accessible equivalent. Remove decorative technical noise, generic AI copy, repeated labels, stale station metadata, and any number whose scope is ambiguous.

## Required questions for every surface

1. What state or fact does this text communicate?
2. What is its authoritative source?
3. What action can the user take because it is visible?
4. Why must it be visible now rather than on arrival, focus, or request?
5. Is the same information already present elsewhere?
6. Does its wording name the actual place/project/action without buzzwords?
7. Is its numeric scope explicit: total, live, sampled, cached, or fallback?
8. Does screen-reader-only copy remain meaningful without the 3D scene?

If questions 1–4 have no concrete answer, remove the string.

## Surfaces

- Entry gate and safe/reduced-motion fallback
- World masthead, control hint, sparse seal guidance
- Route/docking side instrument and station rail
- Station evidence card and live/fallback GitHub radar
- Topology archive prompt, archive page, and return path
- Project index, language bytes, repository scope, commit/path samples
- Quality controls, contrast control, WebGL error/fallback copy
- Navigation, contact, source links, focus labels, and screen-reader status
- Eight station names, descriptions, signals, and project lists

## Binding wording and truth rules

- Gate CTA: `Start the adventure into Seal's Topological Land`.
- Gate alternate: `Scroll left if boring`.
- Archive actions: `Enter the topology archive` and `Stay in the polar world`.
- Curated `evidenceFiles` arrays are always `sampled paths` or `evidence samples`, never total files.
- Total repository counts require a complete GitHub tree (`truncated: false`) or a dated verified snapshot.
- Live GitHub data and research snapshot fallback must always be labeled distinctly.
- A selected destination must not overwrite the arrived station evidence before docking.
- No large route/progress prose may occupy the center hero plane.
- Avoid generic CTAs (`Get started`, `Learn more`, `Explore more`) when a precise action exists.
- Remove anti-slop patterns from UI-authored text: buzzword clusters, empty intensifiers, meta-commentary, unexplained pseudo-technical labels, and redundant qualifiers.
- Preserve repository/project wording quoted from external source evidence, but never promote it into UI marketing copy without attribution.

## Deliverables

1. `docs/research/2026-07-12-user-facing-copy-audit.md` with one row per visible surface: current copy, decision, purpose, source/state, final copy.
2. `scripts/check-user-facing-copy.mjs` enforcing high-confidence anti-slop and evidence-scope rules.
3. Focused component/data edits required by the audit.
4. `.superpowers/sdd/task-19-report.md` with files, removed/rewritten strings, checks, accessibility risks, and self-review.

Do not redesign geometry, shaders, or traversal mechanics in this task.
