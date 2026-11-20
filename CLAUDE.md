# Working in this tree

The root holds the project and nothing else: product code (`app/`, `components/`, `lib/`, `public/`, `data/`), tooling (`scripts/`), knowledge (`docs/`), evidence (`experiments/`, `lean/`) and configuration. Root files: `README.md`, `CLAUDE.md`, `package.json`, the lockfile and tool configs. No notes, drafts, status files or scratch at the root.

## File system rules

1. One purpose per directory. Every top-level directory has a `README.md` that says what belongs in it and what does not. A directory with no stated purpose is not created.
2. Documentation lives in `docs/<topic>/`. The topics are `architecture`, `testing`, `backgrounds`, `shaders` (generated), `site`, `design` (dated decision records), `research` (dated records of what was read and found) and `thesis`. A new topic gets an entry in `docs/README.md` in the same commit. A topic with one file still gets its directory.
3. Names are lowercase kebab-case with no spaces. No tool or agent brand appears in a path (no `superpowers`, `oneshot`, `claude`). Upper case is for `README.md`, `CLAUDE.md`, `LICENSE` and files a generator names. Dated records are `YYYY-MM-DD-<slug>.md`; living documents carry no date.
4. One canonical home per fact. Link to it; do not copy it.
5. A move is `git mv`, and the same commit rewrites every reference to the old path. `npm run check:docs` passes before a commit that touches `docs/`.
6. An experiment is `experiments/<name>/`, self-contained: `README.md`, `PREREGISTRATION.md` (written before the first run, never edited after), code, `test/`, and `out/` with the committed results. Bars are fixed before the run; a result never edits them.
7. Formal proofs are `lean/<project>/` with a `README.md` listing each statement, its file, its exit code and the axioms it uses.
8. A generated tree (`docs/shaders/`) moves only by editing its generator (`scripts/shader-catalog.mjs`).
9. Measured output (`verification/`, `.next/`) stays local and ignored. The numbers that matter are quoted in a doc with the commit, the machine and the adapter.
10. A document pinned to a commit (`docs/thesis/`) states that commit and is not rewritten when paths move.
11. Scratch lives outside the repository. Agents work in their own branch or worktree and leave no status files in the tree.

## Deploys

Vercel deploys this repository. A push to `main` builds a Production deployment, even for a documentation-only commit; every other branch builds a Preview. Do not push to `main` without the owner's instruction.
