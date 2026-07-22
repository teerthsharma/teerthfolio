### Task 1: Canonical Travel, HUD Truth, and Rail Synchronization

**Agent skills:** investigator, superpowers:systematic-debugging, superpowers:test-driven-development, junni-mascot-guide, bruno-open-world-navigation.

**Files:**
- Modify: `lib/polar-traversal.js`
- Modify: `components/IglooWorld.jsx`
- Modify: `components/IglooHud.jsx`
- Modify: `scripts/check-polar-traversal.mjs`
- Modify: `scripts/check-hud-accessibility.mjs`
- Test: `scripts/verify-hud-accessibility.mjs`

**Interfaces:**
- Consumes: canonical `positionXZ`, `velocityXZ`, station coordinates, selected destination.
- Produces: one presentation snapshot with `destinationId`, `dockedStationId`, `nearestStationId`, `phase`, `progress`, and `isArrived`.

- [ ] **Step 1: Reproduce the reported QPU/Plaque mismatch**

Run the app at QPU and capture the screenshot where the QPU monument is centered while the card, route title, selected rail item, and radar still say Plaque. Record every consumer that disagrees.

- [ ] **Step 2: Write the failing semantic contract**

Add assertions equivalent to:

```js
assert.equal(enRoute.destinationId, "qpu-ice-bridge");
assert.equal(enRoute.dockedStationId, "observatory-plaque");
assert.equal(enRoute.phase, "moving");
assert.equal(arrived.destinationId, "qpu-ice-bridge");
assert.equal(arrived.dockedStationId, "qpu-ice-bridge");
assert.equal(arrived.phase, "arrived");
```

Run: `node scripts/check-polar-traversal.mjs && node scripts/check-hud-accessibility.mjs`

Expected RED: at least one consumer still derives Plaque directly from stale `activeArtifact` or selection mutates focus before arrival.

- [ ] **Step 3: Implement one derived presentation snapshot**

Create or complete a pure selector with this shape:

```js
export function deriveTraversalPresentation(snapshot, stations) {
  return {
    destinationId: snapshot.destinationId,
    dockedStationId: snapshot.dockedStationId,
    nearestStationId: snapshot.nearestStationId,
    phase: snapshot.phase,
    progress: snapshot.progress,
    isArrived: snapshot.phase === "arrived",
  };
}
```

Feed the same snapshot to HUD, station rail, radar, camera intent, and seal halo. Show `EN ROUTE → QPU` before arrival without presenting QPU evidence as docked.

- [ ] **Step 4: Center the selected station rail item**

On destination/arrival change, scroll the active rail button into the nearest centered position using reduced-motion-aware behavior. Preserve keyboard focus.

- [ ] **Step 5: Verify travel, arrival, return, and mobile**

Run:

```powershell
node scripts/check-polar-traversal.mjs
node scripts/check-hud-accessibility.mjs
node scripts/verify-hud-accessibility.mjs
```

Expected GREEN: every semantic consumer agrees at moving/docking/arrival boundaries; Plaque return restores the dome.
