### Task 8: Integrated Production Proof and Independent Review

**Agent skills:** superpowers:verification-before-completion, superpowers:requesting-code-review, investigator.

**Files:**
- Modify: `package.json` only for missing check wiring
- Modify: stale verifier expectations only when production code proves the new contract
- Create: `.verification/one-hour-rescue/report.json`

- [ ] **Step 1: Run focused static checks**

```powershell
node scripts/check-polar-traversal.mjs
node scripts/check-hud-accessibility.mjs
node scripts/check-polar-biome-world.mjs
node scripts/check-polar-color-continuity.mjs
node scripts/check-polar-station-mechanisms-ne.mjs
node scripts/check-polar-station-mechanisms-sw.mjs
node scripts/check-dome-crystal-material.mjs
node scripts/check-polar-camera-composition.mjs
node scripts/check-gpu-lifecycle.mjs
npm run lint
```

- [ ] **Step 2: Run the clean production build**

Run: `npm run build`

Expected: exit 0 with no missing module, hydration, shader, or verifier failure.

- [ ] **Step 3: Capture the evidence matrix**

Capture gate desktop/mobile; all eight stations desktop; Plaque/QPU/Assembly mobile; travel/docking/arrival; dome touch/collision; reduced motion; low/medium/high; portal suspension; archive/fallback.

Include HUD-hidden grayscale thumbnails for all eight monuments and an anonymized contact sheet. The award claim fails if any building remains identifiable mainly by color or text rather than silhouette and material behavior.

- [ ] **Step 4: Run an independent review**

Give a fresh reviewer the plan, current diff, before/after frames, and report. Require separate spec-compliance and quality verdicts. Fix Critical/Important findings and re-review.

- [ ] **Step 5: Make the award claim honestly**

Do not call the goal complete unless the current frames no longer show the reported structural defects and the production evidence proves every preserved contract. If the hour ends first, report exact achieved work and remaining named gaps without claiming perfection.
