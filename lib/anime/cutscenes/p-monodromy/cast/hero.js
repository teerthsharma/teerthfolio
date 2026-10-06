// HERO SEAL dressing for p-monodromy: Sinbad (costume 0.9-1.5) then Baal Djinn Equip (1.9-3.1). The pup itself is never edited:
// every piece is a rigid figure attached with ctx.seal.attach (rides the body, emission 0, shared lit-luma cap 0.92).
// Sinbad: purple ponytail #7a3fb8/#3d1a70, gold circlet + turquoise jewel #2ad0c8, hoop earrings, gold ring vessels with a #7fd8ff halo, sword (hilt #2b1a52, gem #7ff3e6).
// Baal: lens scales on pauldrons and sleeves (4-tone ramp), serpent tail with a blade fin, gold necklace + red tassel #c0262e, white sash, belt #14122a,
//       blue hair #4aa8e0/#123c78, thin cyan tattoo arcs.
// Scale placement (maths): a scale is the ellipsoid diag(sx,sy,0.011) in the basis (x tangent, y = z cross x, z outward normal) at p = c + R n;
//   tone = ramp[ n . L ] with L = normalize(-0.5, 0.8, 0.4) (top-left key): >0.75 highlight, >0.3 lit, >-0.2 mid, else shadow.
// Pop-in: easeOutBack  s(x) = 1 + 2.4 (x-1)^3 + 1.4 (x-1)^2, x = (t - t0)/d.
import { sm, pop, mergeInstances } from "./util.js";

const TONES = [["#d8fbff", "#7fe0ee"], ["#7fe0ee", "#3aa8c8"], ["#3aa8c8", "#1c6486"], ["#1c6486", "#0e3350"]];
const HEAD = { pos: [0, 0.555, 0.03], fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 };

export function buildHero(ctx) {
  const { THREE, engine, seal, kit } = ctx;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const fig = (geo, col, shade, pos, rot, lm = 0.9) => {
    const f = engine.figure(ctx.sdf.painted(geo, ctx.sdf.paint(col, shade ?? col, { line: 1 })), { lineMul: lm, constant: true });
    f.position.set(...(pos ?? [0, 0, 0])); if (rot) f.rotation.set(...rot); return f;
  };
  const flat = (geo, col, op, pos, rot, additive) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    m.position.set(...(pos ?? [0, 0, 0])); if (rot) m.rotation.set(...rot); return m;
  };
  // a part that scales about its own pivot (so pop-in and fade stay on the body)
  const parts = [];
  const mk = (name, pivot, content, fn) => {
    const outer = new THREE.Group(), inner = new THREE.Group();
    outer.position.set(...pivot); inner.position.set(-pivot[0], -pivot[1], -pivot[2]);
    inner.add(content); outer.add(inner); outer.visible = false;
    seal.attach(outer, 1); parts.push({ name, outer, fn });
  };

  // ================================================================ SINBAD
  const pony = kit.hairMesh(engine, kit.defineHair("ponytail", { count: 18, tail: { n: 8, length: 0.7, width: 0.07, at: [0, 0.74, -0.2] }, color: { base: "#7a3fb8", shade: "#3d1a70", hi: "#b98af0" }, cut: { at: [0.3, 0.6], slant: 0.12, rate: 0.85 }, seed: 11 }), HEAD, { ink: "#1a0f3a" });
  mk("pony", HEAD.pos, pony, (t) => pop(0.9, 0.35, t) * (1 - sm(2.2, 2.5, t)));
  const blue = kit.hairMesh(engine, kit.defineHair("ponytail", { count: 20, length: [0.14, 0.24], spike: 0.6, tail: { n: 7, length: 0.62, width: 0.075, at: [0, 0.74, -0.2] }, color: { base: "#4aa8e0", shade: "#123c78", hi: "#bff0ff" }, cut: { at: [0.25, 0.6], slant: 0.15, rate: 0.9 }, seed: 23 }), HEAD, { ink: "#0a1f4a" });
  mk("blue", HEAD.pos, blue, (t) => pop(2.5, 0.4, t));

  const circ = new THREE.Group();
  circ.add(fig(new THREE.TorusGeometry(0.262, 0.016, 8, 36).rotateX(Math.PI / 2), "#f2c14a", "#a8741a", [0, 0.665, 0.03], [0.12, 0, 0]));
  circ.add(fig(new THREE.SphereGeometry(0.03, 12, 10), "#2ad0c8", "#0e8a94", [0, 0.665, 0.285], null, 0.6));
  for (const s of [1, -1]) circ.add(fig(new THREE.TorusGeometry(0.035, 0.006, 6, 18).rotateY(Math.PI / 2), "#f2c14a", "#a8741a", [s * 0.268, 0.5, 0.05], null, 0.4)); // hoop earrings
  mk("circlet", HEAD.pos, circ, (t) => pop(0.9, 0.3, t));

  const vessels = new THREE.Group(), halos = [];
  for (const s of [1, -1]) {
    vessels.add(fig(new THREE.TorusGeometry(0.062, 0.015, 8, 22).rotateX(Math.PI / 2), "#f2c14a", "#a8741a", [s * 0.275, 0.3, 0.19], [0.3, 0, -s * 0.15]));
    const hl = flat(new THREE.TorusGeometry(0.095, 0.006, 6, 28).rotateX(Math.PI / 2), "#7fd8ff", 0.7, [s * 0.275, 0.3, 0.19], [0.3, 0, -s * 0.15], true);
    vessels.add(hl); halos.push(hl);
  }
  mk("vessels", [0, 0.3, 0.19], vessels, (t) => pop(1.1, 0.3, t));

  const sword = kit.WEAPONS.sword(engine, { col: "#eaf6ff", trim: "#f2c14a", hilt: "#2b1a52" });
  sword.add(fig(new THREE.SphereGeometry(0.02, 8, 6), "#7ff3e6", "#2ad0c8", [0, 0.1, 0.012], null, 0.3)); // hilt gem
  sword.position.set(0.27, 0.28, 0.25); sword.rotation.set(0.35, 0, -0.25);
  mk("sword", [0.27, 0.28, 0.25], sword, (t) => pop(1.2, 0.3, t));

  // ================================================================ BAAL
  const L = V(-0.5, 0.8, 0.4).normalize(), ball = new THREE.SphereGeometry(1, 8, 6);
  const toneOf = (n) => { const d = n.dot(L); return d > 0.75 ? 0 : d > 0.3 ? 1 : d > -0.2 ? 2 : 3; };
  const mkScale = (c, nrm, tan, sx, sy) => {
    const z = nrm.clone().normalize(), x = tan.clone().normalize(), y = new THREE.Vector3().crossVectors(z, x).normalize();
    const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(c).scale(V(sx, sy, 0.011));
    return { m, tone: toneOf(z) };
  };
  const stage = [[], [], []];
  for (const s of [1, -1]) {
    // pauldron: 3 rows of lens scales over the shoulder cap, c = (s 0.29, 0.45, 0.02), R = 0.11
    for (let r = 0; r < 3; r++) {
      const phi = 0.3 + 0.38 * r, n = 9 - r;
      for (let i = 0; i < n; i++) {
        const th = ((i + 0.5 * (r % 2)) / n) * Math.PI * 2, nr = V(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
        if (s * nr.x < -0.3) continue;
        const tan = new THREE.Vector3().crossVectors(V(0, 1, 0), nr); if (tan.lengthSq() < 1e-4) tan.set(1, 0, 0);
        stage[0].push(mkScale(V(s * 0.29, 0.45, 0.02).addScaledVector(nr, 0.11), nr, tan, 0.034, 0.022));
      }
    }
    // sleeve: 3 rings of 7 along the flipper axis a0 -> a1
    const a0 = V(s * 0.25, 0.4, 0.13), a1 = V(s * 0.285, 0.18, 0.2), d = a1.clone().sub(a0).normalize();
    const e1 = new THREE.Vector3().crossVectors(d, V(0, 0, 1)).normalize(), e2 = new THREE.Vector3().crossVectors(d, e1).normalize();
    for (let k = 0; k < 3; k++) {
      const c = a0.clone().lerp(a1, 0.35 + 0.265 * k);
      for (let i = 0; i < 7; i++) {
        const th = ((i + 0.5 * (k % 2)) / 7) * Math.PI * 2, nr = e1.clone().multiplyScalar(Math.cos(th)).addScaledVector(e2, Math.sin(th));
        if (nr.x * s < -0.5) continue;
        stage[k < 2 ? 1 : 2].push(mkScale(c.clone().addScaledVector(nr, 0.072), nr, new THREE.Vector3().crossVectors(d, nr), 0.03, 0.024));
      }
    }
  }
  const stageGroups = stage.map((list) => {
    const g = new THREE.Group(), by = [[], [], [], []];
    for (const s of list) by[s.tone].push({ geo: ball, m: s.m });
    by.forEach((items, ti) => { if (items.length) g.add(fig(mergeInstances(THREE, items), TONES[ti][0], TONES[ti][1], null, null, 0.6)); });
    return g;
  });
  const pivot = [0, 0.35, 0.1];
  mk("scales1", pivot, stageGroups[0], (t) => pop(1.9, 0.3, t));
  mk("scales2", pivot, stageGroups[1], (t) => pop(2.3, 0.3, t));

  const s3 = stageGroups[2];
  s3.add(fig(new THREE.TorusGeometry(0.27, 0.018, 8, 36).rotateX(Math.PI / 2), "#f2c14a", "#a8741a", [0, 0.43, 0.02])); // gold necklace
  s3.add(fig(new THREE.ConeGeometry(0.03, 0.12, 8).rotateX(Math.PI), "#c0262e", "#6a0e16", [0, 0.35, 0.285], null, 0.5)); // red tassel
  s3.add(fig(new THREE.TorusGeometry(0.355, 0.034, 8, 36).rotateX(Math.PI / 2).scale(1, 1, 0.92), "#ffffff", "#b4aacb", [0, 0.18, 0], null, 0.7)); // white sash band
  s3.add(fig(new THREE.TorusGeometry(0.36, 0.016, 6, 36).rotateX(Math.PI / 2).scale(1, 1, 0.92), "#14122a", "#05040c", [0, 0.2, 0], null, 0.5)); // belt
  for (const s of [1, -1]) for (let k = 0; k < 2; k++) s3.add(flat(new THREE.TorusGeometry(0.078, 0.004, 4, 16, Math.PI * 1.2), "#7fd8ff", 0.9, [s * (0.27 + 0.01 * k), 0.34 - 0.07 * k, 0.17], [Math.PI / 2, 0, s * 0.4 + k], false)); // cyan tattoo arcs
  mk("scales3", pivot, s3, (t) => pop(2.7, 0.3, t));

  // serpent tail: 12 teal segments from the rump, 1.0 m, blade fin tip; wags on the stepped clock
  const tail = new THREE.Group(), segs = [];
  for (let i = 0; i < 12; i++) {
    const r = 0.075 * (1 - 0.8 * (i / 11)), tn = TONES[1 + (i % 2)];
    const sg = fig(new THREE.SphereGeometry(r, 10, 8), tn[0], tn[1], null, null, 0.7); tail.add(sg); segs.push(sg);
  }
  const fin = fig(new THREE.ConeGeometry(0.05, 0.26, 4), "#d8fbff", "#3aa8c8", null, null, 0.6); tail.add(fin);
  const tailAt = (u, t) => V(Math.sin(u * 3.2 + t * 4) * 0.13 * u, 0.12 - 0.09 * Math.sin(u * Math.PI) + 0.22 * u * u, -0.3 - 1.0 * u);
  mk("tail", [0, 0.14, -0.3], tail, (t) => pop(2.3, 0.35, t));
  const tailUpdate = (t) => {
    segs.forEach((s, i) => s.position.copy(tailAt(i / 11, t)));
    const p0 = tailAt(1, t), d = p0.clone().sub(tailAt(0.94, t)).normalize();
    fin.position.copy(p0).addScaledVector(d, 0.1); fin.quaternion.setFromUnitVectors(V(0, 1, 0), d);
  };

  // ================================================================ per frame
  function update(t) {
    const fade = 1 - sm(10.5, 11.8, t); // the island locks at F + 2.1 = 10.5; the costume fades over 1.3 s
    for (const p of parts) {
      const k = p.fn(t) * fade;
      p.outer.visible = k > 0.001;
      if (p.outer.visible) p.outer.scale.setScalar(k);
    }
    tailUpdate(t);
    // ring-vessel halos gather gold-white 4.9-6.3 and flare at the strike
    const g = sm(4.9, 6.3, t), hit = Math.max(0, 1 - Math.abs(t - 6.4) / 0.2);
    for (const h of halos) { h.material.opacity = (0.25 + 0.55 * g + 0.2 * hit) * (Math.floor(t * 12) % 2 ? 1 : 0.8); h.material.color.set(g > 0.6 ? "#fff2c0" : "#7fd8ff"); h.scale.setScalar(1 + 0.25 * g); }
  }
  return { update, dispose() { for (const p of parts) p.outer.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); } };
}
