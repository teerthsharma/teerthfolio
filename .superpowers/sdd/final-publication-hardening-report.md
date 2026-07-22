# Final publication hardening

Date: 2026-07-22

## Whole-review RED

- Packaging contract failed because `.verification/` was not ignored and `.vercelignore` did not exist.
- CI/browser-boundary contract failed because production `build` launched `verify:biome-shaders`, while CI neither provisioned Chromium nor ran an explicit browser proof.
- Browser-diagnostic contract failed because the particle verifier had no typed, statically inspectable fatal-log predicate; arbitrary console errors were not unconditionally fatal.
- `git diff --check origin/main...HEAD` reported trailing whitespace or extra EOF blanks in the historical SDD/research/spec range.

## GREEN

- `.gitignore` and `.vercelignore` exclude local verification output, `donotcommit/`, and local SDD review diffs; a static packaging contract enforces the boundary.
- Production `build` is browser-independent. CI installs Chromium explicitly and runs `verify:ci-browser`; a static workflow/package contract enforces ordering and separation.
- Particle and station verifiers ignore only the known Chromium/driver ReadPixels warning before treating every `pageerror`, console `error`, or fatal warning signature as fatal. Particle diagnostics retain event type.
- Focused contracts, lint, production build, explicit browser proof, the full 8-station particle proof, and the full 7-station mechanism proof passed against the live HTTP 200 server on port 3000. Live proofs used `VERIFY_RENDER_URL=http://localhost:3000` to avoid Next dev-server HMR cross-origin noise from the `127.0.0.1` alias.
- Both working-tree and authoritative-range whitespace checks are clean after this report is committed.

## Remaining publication action

The root integrator must still strip tracked `.verification` content from this branch's history before publication. This commit intentionally does not delete or rewrite that history.
