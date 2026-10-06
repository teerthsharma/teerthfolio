// EASTER EGGS (bible section 7), all pure in the display clock:
//   1. Holy Grail, floating black at the dome top, 2.3 s: lathe cup + black core + dripping red glow.
//   2. Enkidu's chains from a left portal, 3.0 s: 22 torus links on a sagging line, extend over 0.8 s, hold, retract 4.6 to 5.2 s.
//   3. Gae Bolg is in volley.js (the red spear at 5.0 s).
//   4. Mismatched frees 16 -> 0: sixteen sword hilts on the plateau rim, pop in at 14.0 s, fade out one by one (0.4 s apart) down to zero.
//   5. A tiny DNA ring pair (two linked tori) on the cloak hem, glint at 14.0 s.
//   6. The laugh 'Hah' is SFX lettering: it lives in scene.sfx (direction), not here.
import { propMat, mergeColored, instGeo, smooth } from "./common.js";

export default function easter(ctx, S) {
  const { THREE, U, flares } = S;
  const r = ctx.rng("gate-eggs");
  const group = new THREE.Group();
  const disposables = [];

  // ---- 1. Holy Grail
  const GR = new THREE.Vector3(0, 24, -14);
  const prof = [[0, 0], [0.18, 0.02], [0.2, 0.5], [0.5, 0.55], [0.95, 1.05], [1.05, 1.5], [0.92, 1.52], [0.8, 1.2], [0.0, 1.0]].map(([x, y]) => new THREE.Vector2(x, y));
  const cupGeo = new THREE.LatheGeometry(prof, 24);
  const cupMat = propMat(THREE, U, { col: "#0a0408", shade: "#000000", rim: "#d3122e", life: [2.3, 14.2, 15.4] });
  const cup = new THREE.Mesh(cupGeo, cupMat);
  cup.position.copy(GR); cup.scale.setScalar(1.6); cup.renderOrder = 3;
  const coreGeo = new THREE.SphereGeometry(0.9, 16, 12);
  const core = new THREE.Mesh(coreGeo, cupMat);
  core.position.set(GR.x, GR.y + 1.7, GR.z); core.scale.setScalar(1.3);
  flares.add({ c: [GR.x, GR.y + 1.2, GR.z], size: 7, t0: 2.3, t1: 15.4, kind: 1, col: "#8a0c1e", fi: 1.0, fo: 1.2, flick: 0.1 });
  flares.add({ c: [GR.x, GR.y + 2.6, GR.z], size: 3.5, t0: 2.3, t1: 14.8, kind: 2, col: "#d3122e", fi: 1.0, fo: 1.0 });
  group.add(cup, core);
  disposables.push(cupGeo, coreGeo, cupMat);

  // ---- 2. Enkidu's chains
  const left = S.portals.filter((p) => p.near && p.open < 3.0).sort((a, b) => a.pos.x - b.pos.x)[0] || S.portals[0];
  const CA = left.pos.clone();
  const CT = CA.clone().lerp(new THREE.Vector3(-5, 1.2, 2), 0.82);
  const NL = 22;
  const linkGeo = new THREE.TorusGeometry(0.5, 0.13, 8, 16);
  const chainMat = propMat(THREE, U, { col: "#8a98b8", shade: "#3a4560", rim: "#ffb020" });
  const chain = new THREE.InstancedMesh(linkGeo, chainMat, NL);
  chain.frustumCulled = false; chain.renderOrder = 3;
  group.add(chain);
  flares.add({ c: CA.toArray(), size: left.R * 1.4, t0: 3.0, t1: 3.5, kind: 0, col: "#e8f0ff", fi: 0.03, fo: 0.3 });
  const dummy = new THREE.Object3D(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
  const at = (s, out) => out.copy(CA).lerp(CT, s).add(new THREE.Vector3(0, -3.5 * 4 * s * (1 - s), 0));
  disposables.push(linkGeo, chainMat);

  // ---- 4. sixteen hilts on the rim
  const geoH = mergeColored(THREE, [
    { geo: new THREE.BoxGeometry(0.07, 0.6, 0.02), col: "#e8f0ff", at: [0, 0.3, 0] },
    { geo: new THREE.BoxGeometry(0.36, 0.045, 0.06), col: "#ffb020", at: [0, 0.62, 0] },
    { geo: new THREE.BoxGeometry(0.05, 0.3, 0.05), col: "#8a0c1e", at: [0, 0.8, 0] },
    { geo: new THREE.BoxGeometry(0.09, 0.09, 0.09), col: "#ffe27a", at: [0, 0.99, 0] },
  ]);
  const NH = 16;
  const life = new Float32Array(NH * 3);
  const hiltMat = propMat(THREE, U, { perLife: true, vcol: true, rim: "#ffe27a" });
  const hGeo = instGeo(THREE, geoH, NH, { aLife: [3, life] });
  const hilts = new THREE.InstancedMesh(hGeo, hiltMat, NH);
  hilts.frustumCulled = false; hilts.renderOrder = 3;
  for (let i = 0; i < NH; i++) {
    const a = (i / NH) * Math.PI * 2 + 0.2, R0 = 6.0;
    dummy.position.set(Math.sin(a) * R0, -0.15, Math.cos(a) * R0);
    dummy.rotation.set((r() - 0.5) * 0.2, r() * 6.28, (r() - 0.5) * 0.2);
    dummy.scale.setScalar(1.15); dummy.updateMatrix(); hilts.setMatrixAt(i, dummy.matrix);
    const t0 = 13.95 + i * 0.03, tf = 14.9 + i * 0.4;
    life.set([t0, tf, tf + 0.35], i * 3);
    flares.add({ c: [Math.sin(a) * R0, 0.65, Math.cos(a) * R0], size: 0.45, t0: tf - 0.05, t1: tf + 0.3, kind: 0, col: "#fff2c0", fi: 0.02, fo: 0.25 }); // glint as it fades
  }
  group.add(hilts);
  disposables.push(geoH, hGeo, hiltMat);

  // ---- 5. DNA ring pair on the cloak hem (seal-local, behind the seal, at the hem)
  const dna = new THREE.Group();
  dna.position.set(0, 0.14, -0.3);
  const tg = new THREE.TorusGeometry(0.05, 0.012, 8, 20);
  const dm1 = propMat(THREE, U, { col: "#ffb020", shade: "#c98a12", rim: "#fff2c0", life: [14.0, 27.5, 28.3] });
  const dm2 = propMat(THREE, U, { col: "#d3122e", shade: "#8a0c1e", rim: "#ff4a5a", life: [14.0, 27.5, 28.3] });
  const ring1 = new THREE.Mesh(tg, dm1), ring2 = new THREE.Mesh(tg, dm2);
  ring2.position.x = 0.05; ring2.rotation.y = Math.PI / 2;
  dna.add(ring1, ring2); dna.renderOrder = 4;
  group.add(dna);
  flares.add({ c: [0, 0.14, -0.3], size: 0.22, t0: 14.0, t1: 14.6, kind: 0, col: "#fff2c0", fi: 0.03, fo: 0.4 });
  disposables.push(tg, dm1, dm2);

  const sun = ctx.engine && ctx.engine.sun;
  return {
    group,
    update(t, dt, cue) {
      const T = cue.t;
      // chain: extend 3.0 -> 3.8, hold, retract 4.6 -> 5.2
      const ext = smooth(3.0, 3.8, T) * (1 - smooth(4.6, 5.2, T));
      chain.visible = ext > 0.001;
      for (let i = 0; i < NL; i++) {
        const s = i / (NL - 1);
        if (s > ext) { dummy.scale.setScalar(0.0001); dummy.position.copy(CA); dummy.updateMatrix(); chain.setMatrixAt(i, dummy.matrix); continue; }
        at(s, pa); at(Math.min(1, s + 0.02), pb);
        dummy.position.copy(pa); dummy.up.set(0, 1, 0); dummy.lookAt(pb);
        dummy.rotateZ(i % 2 ? Math.PI / 2 : 0); dummy.scale.setScalar(1);
        dummy.updateMatrix(); chain.setMatrixAt(i, dummy.matrix);
      }
      chain.instanceMatrix.needsUpdate = true;
      // grail slow turn, dna rings counter-turn
      cup.rotation.y = T * 0.3; core.position.y = GR.y + 1.7 + Math.sin(T * 1.3) * 0.12; cup.position.y = GR.y + Math.sin(T * 1.3) * 0.12;
      ring1.rotation.x = T * 1.2; ring2.rotation.x = -T * 1.2;
      // gold god-rays toward the Gate (the shared light-shaft anchor)
      if (sun && sun.set) { const k = S.G ? S.G.position : null; sun.set((k ? k.x : 0) + GR.x, (k ? k.y : 0) + GR.y, (k ? k.z : 0) + GR.z); }
    },
    dispose() { disposables.forEach((d) => { try { d.dispose(); } catch { /* ignore */ } }); },
  };
}
