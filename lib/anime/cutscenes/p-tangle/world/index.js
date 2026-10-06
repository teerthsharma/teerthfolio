// WORLD layer for p-tangle (Your Name, kataware-doki above Lake Itomori's crater). Layer 0 = baked plate, layer 1 = animated set.
// Bible: scripts/p-tangle.md sections 2, 3.1-3.6, 3.14 and the FX table. Look: Shinkai light, painted skies and water, no line on backgrounds.
//
// WHAT IS HERE
//   sky.js      four baked domes (kataware-doki / comet night / rose sunset / deep blue), ramp pinned to the film's sampled hex,
//               cloud sea + far ranges + flecks + stars, the sun glow and the poster's pink streak (maths in the file header)
//   terrain.js  the crater rim (notch toward the sun, so the lake spills into the cloud sea), the wooded spit, the two islets,
//               tiered cedars, faceted boulders, 3-tone reeds with wind sway, the town on both banks
//   shrine.js   stair, 3 torii, 8 lanterns, hall on the spit (one merged mesh)
//   water.js    the mirror lake (Fresnel sky + far-shore reflection, glare field, 2 px glitter, rust shafts, 4 ripple slots), mist, sky shafts
//   materials.js the painted-lit material and merge helper
// LAYOUT (world metres, +z toward the camera of the original staging, the sun at -z):
//   seal islet (0,0,0) flat top y -0.02 | girl islet (2,0,-26) (28 m of cord away) | spit + shrine (-30,0,6) | lake y -0.12 | rim beyond.
//   Nothing solid stands within 3 m of the seal or the girl, and reeds near them are ankle high: nothing covers the seal.
// CUES READ: link, impact, pull, retract (ripple rings; fall back to the bible's times if the scene has no such beat).
//   Stage changes follow the shot colour script at 11.0, 14.0, 19.4 s (override with scene.worldStages = [a, b, c]).
import { Vector3 } from "three";
import { SKY_DECL, SKY_BODY, STAGES, makeUniforms, applyStage, domeUniforms } from "./sky.js";
import { ISLETS, SPIT, LAKE, groundH, buildTerrain } from "./terrain.js";
import { buildShrine } from "./shrine.js";
import { buildLake, buildMist, buildSkyShafts } from "./water.js";

const RIP = [ // beat name, centre (x, z), amp, fallback real time (bible: link 10.2, impact 13.9, pull 14.2, retract 22.4)
  ["link", 0, -13, 0.9, 10.2],
  ["impact", 4, -40, 1.5, 13.9],
  ["pull", 1, -12, 1.0, 14.2],
  ["retract", 0, -10, 0.8, 22.4],
];

export default function build(ctx) {
  const { THREE, engine } = ctx;
  const group = new THREE.Group();
  const toDispose = [];
  const dispose = (o) => { if (o) toDispose.push(o); };
  const add = (o, layer) => { o.userData.layer = layer; group.add(o); return o; };
  const noise = ctx.tools.glslFor(["noise"]);
  const U = makeUniforms();
  applyStage(U, 0);

  // ---- four baked domes, one shader program (the uniforms differ) ----
  const domes = [];
  for (let n = 0; n < STAGES.length; n++) {
    const d = ctx.bake.sky(SKY_DECL + SKY_BODY, { az: [-Math.PI, Math.PI], el: [-0.4, 1.3], pxPerRad: 540, tools: ["noise"], uniforms: domeUniforms(n) });
    d.visible = n === 0; group.add(d); domes.push(d);
    toDispose.push({ dispose: () => { d.userData.target?.dispose(); d.material.dispose(); d.geometry.dispose(); } });
  }

  buildTerrain(ctx, U, noise, add, dispose);
  buildShrine(ctx, U, noise, add, dispose);
  buildLake(ctx, U, noise, add, dispose);
  buildMist(ctx, U, noise, add, dispose);
  buildSkyShafts(ctx, U, add, dispose);

  // where things are, for the other layers (read-only; they may ignore it)
  ctx.worldMarks = {
    sealIslet: [ISLETS[0].x, 0, ISLETS[0].z], girlIslet: [ISLETS[1].x, 0, ISLETS[1].z], spit: [SPIT.x, 0, SPIT.z],
    lakeY: LAKE.y, sunDir: [0, 0.014, -1], groundH,
  };

  const beats = new Set((ctx.scene.beats ?? []).map((b) => b.name));
  const stageTimes = ctx.scene.worldStages ?? [11.0, 14.0, 19.4];
  let stage = 0;
  const sunPos = new Vector3(0, 6, -400);
  engine.sun = sunPos;

  function setStage(n) {
    stage = n;
    applyStage(U, n);
    domes.forEach((d, i) => { d.visible = i === n; });
    engine.sun = STAGES[n].disc > 0 ? sunPos : null;
  }

  return {
    group,
    update(t, dt, cue) {
      const now = cue.t ?? t;
      U.uTime.value = now;
      let n = 0; for (const s of stageTimes) if (now >= s) n++;
      if (n !== stage) setStage(n);
      // ripple slots: pure functions of the clock, so a scrub equals a play
      RIP.forEach(([name, cx, cz, amp, fb], i) => {
        let t0 = -99;
        if (beats.has(name)) { const s = cue.since(name); if (Number.isFinite(s)) t0 = now - s; }
        else t0 = fb;
        U.uRip.value[i].set(cx, cz, t0, amp);
      });
    },
    dispose() { for (const o of toDispose) o.dispose?.(); },
  };
}
