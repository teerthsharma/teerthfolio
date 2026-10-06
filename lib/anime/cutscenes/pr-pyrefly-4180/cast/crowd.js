// THE WITNESSES, every one a costumed seal (L6b): five masked shinobi crouched on a branch, Kushina, and the tiny Tobi mask (easter egg).
//
// Shinobi (x5, scale 0.42): dark blue flak jacket #2a3048, orange spiral mask #e87a2a (the fifth wears the white ANBU mask #f4f0e6 with red marks),
// Leaf headband, short sword. (The pup has no legs, so the grey leggings are dropped: the locked body stays whole.)
//   reaction clock el_i = ts - T.roar - 2 i frames:
//     0-4 frames  flinch   react("recoil", bump(el, 0.08, 0.08, 0.08))                     (frames 0-4 at the roar)
//     4-12 frames shield   react("cower", sm((el - 4/24)/0.15)) until T.cheer              (heads shielded)
//     12-24 frames cheer   salute pose + awe eyes + hop y = h |sin(pi (2.2 ts + 0.37 i))|, h = 0.1 after the chain, 0.16 after the pin
// Kushina (scale 1.2): long red hair #c82020, green dress #3a8a5a, gold chains from her back; recoils at the roar, braces while the
//   chain runs, relief at the pin, and at T.dattebane hops with her arms up (salute, awe) until the stage is lowered.
import { bump, sm } from "./layout.js";

export function buildCrowd(ctx, parts, T, LAYOUT) {
  const { THREE: Th, engine, kit } = ctx;
  const group = new Th.Group(), seals = [];
  const place = (h, x, y, z, faceX, faceZ) => { h.place(x, y, z, Math.atan2(faceX - x, faceZ - z)); group.add(h.group); };
  const fx = LAYOUT.kurama.at[0], fz = LAYOUT.kurama.at[2];

  // ---- the branch: a card-brown log on the perch line, with two knots
  const { a, b } = LAYOUT.branch, len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const log = parts.F(new Th.CylinderGeometry(0.1, 0.13, len + 0.8, 10), "#4a3426", "#2a1c14", { lineMul: 1.2 });
  log.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.1, (a[2] + b[2]) / 2);
  log.quaternion.setFromUnitVectors(new Th.Vector3(0, 1, 0), new Th.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize());
  group.add(log);
  const twig = parts.F(new Th.ConeGeometry(0.05, 0.6, 6), "#4a3426", "#2a1c14", { pos: [a[0] + 0.5, a[1] + 0.2, a[2] - 0.2], rot: [0.6, 0, -0.9], lineMul: 0.8 });
  group.add(twig);

  // ---- five masked shinobi
  const SHINOBI = { scale: 0.42, layers: [{ type: "uniform", col: "#2a3048", shade: "#141a2c", collar: "#2a3048", stripe: "#c8c8d0" }, { type: "sash", col: "#e8e4d8", knot: "#c8c8d0" }], hat: { kind: "headband", col: "#1d2a52", trim: "#c8c8d0" }, weapon: { kind: "sword", hand: "r", col: "#cdd4e0", tilt: [0, -0.6] } };
  const shinobi = [];
  for (let i = 0; i < 5; i++) {
    const h = kit.costumedSeal(ctx.engine, { ...SHINOBI, name: `shinobi-${i}` });
    const mask = parts.faceMask(i === 4 ? "anbu" : "spiral"); ctx.setLayer(mask, 1); h.body.add(mask);
    const u = 0.1 + 0.2 * i, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u, z = a[2] + (b[2] - a[2]) * u;
    place(h, x, y, z, fx, fz);
    shinobi.push({ h, base: [x, y, z], i }); seals.push(h);
  }

  // ---- Kushina: a larger costumed seal, red hair, green dress, gold chains on her back
  const kh = kit.costumedSeal(engine, {
    scale: 1.2, name: "kushina",
    layers: [{ type: "coat", col: "#3a8a5a", shade: "#1e4a30", open: 0.02, trim: "#e8e4d8", collar: "#3a8a5a" }, { type: "sash", col: "#e8e4d8" }],
    hair: kit.defineHair("long", { count: 20, length: [0.4, 0.7], droop: 0.7, color: { base: "#c82020", shade: "#7a1010", hi: "#f06a54" }, seed: 4181, cut: { at: [0.35, 0.65], slant: 0.1, rate: 0.9 } }),
    eyes: { style: "tareme", iris: "#5a3a8a", irisLo: "#2a1a5a" },
  });
  // two short gold chains from the back, arcing out and down: link k at u = k/9 on p(u) = (+-0.5 u, 0.38 + 0.5 sin(pi u) - 0.3 u, -0.26 - 0.1 u)
  const chains = new Th.Group();
  for (const s of [1, -1]) for (let k = 0; k < 10; k++) { const u = k / 9, l = parts.F(new Th.TorusGeometry(0.036, 0.011, 6, 12), "#f0c840", "#a86a08", { lineMul: 0.5, pos: [s * 0.5 * u * 1.1, 0.38 + 0.5 * Math.sin(Math.PI * u) - 0.3 * u, -0.26 - 0.1 * u], rot: [k % 2 ? Math.PI / 2 : 0, u * s, 0] }); chains.add(l); }
  ctx.setLayer(chains, 1); kh.body.add(chains);
  place(kh, LAYOUT.kushina[0], 0, LAYOUT.kushina[2], 0, 0);
  seals.push(kh);

  // ---- the tiny Tobi mask: a 0.09 scale spiral mask resting on the log end, pops at T.mask
  const tiny = parts.faceMask("spiral", 0.32); tiny.position.set(b[0] - 0.06, b[1] + 0.2 - 0.18, b[2] - 0.02); tiny.rotation.set(-1.1, 0.5, 0.2);
  tiny.position.y += 0.1; ctx.setLayer(tiny, 1); group.add(tiny);

  function update(ts) {
    // shinobi
    for (const s of shinobi) {
      const h = s.h, el = ts - T.roar - (2 / 24) * s.i;
      const chained = ts >= T.cheer + (1 / 24) * s.i, big = ts >= T.pin;
      h.react("none", 0);
      if (ts < T.roar) h.setPose("kneel", 0.5); // crouched on the branch before the roar
      else if (!chained) { const rk = bump(el, 0.08, 0.08, 0.08); if (rk > 0 && el < 0.17) h.react("recoil", rk); else h.react("cower", sm((el - 4 / 24) / 0.15)); }
      else { h.setPose("salute", 1); h.expression("awe", 1); }
      const hop = chained ? (big ? 0.16 : 0.1) * Math.abs(Math.sin(Math.PI * (2.2 * ts + 0.37 * s.i))) : 0;
      h.group.position.set(s.base[0], s.base[1] + hop, s.base[2]);
      h.update(ts);
    }
    // Kushina: terror at the roar, brace while chained, relief at the pin, cheer at 'dattebane'
    kh.react("none", 0);
    const el = ts - T.roar;
    if (ts >= T.dattebane) { kh.setPose("salute", 1); kh.expression("awe", 1); }
    else if (ts >= T.pin) { kh.setPose("bow", 0.15); kh.expression("calm", 0.8); }
    else if (ts >= T.chain) { kh.setPose("salute", 0.8); kh.expression("rage", 0.5 + 0.5 * sm((ts - T.chain) / 0.3)); }
    else if (ts >= T.roar) { if (el < 0.2) kh.react("recoil", bump(el, 0.08, 0.06, 0.08)); else kh.react("stagger", 0.5 * (1 - sm((el - 0.5) / 1.5))); }
    const kHop = ts >= T.dattebane ? 0.25 * Math.abs(Math.sin(Math.PI * 2.0 * (ts - T.dattebane))) : ts >= T.pin ? 0.04 * Math.abs(Math.sin(ts * 5)) : 0;
    kh.group.position.set(LAYOUT.kushina[0], kHop, LAYOUT.kushina[2]);
    kh.group.rotation.y = Math.atan2(fx - LAYOUT.kushina[0], fz - LAYOUT.kushina[2]) * (ts >= T.dattebane ? 0.2 : 1); // she turns to the camera to shout
    kh.update(ts);
    chains.scale.setScalar(sm((ts - T.chain) / 1.0)); chains.visible = ts >= T.chain;
    // the tiny mask pops: scale overshoot 1 + 0.35 sin(pi u) over 0.25 s
    const u = (ts - T.mask) / 0.25; tiny.visible = ts >= T.mask; tiny.scale.setScalar(u < 1 ? sm(u) * (1 + 0.35 * Math.sin(Math.PI * Math.max(0, u))) : 1);
  }
  return { group, update, dispose() { for (const h of seals) h.dispose(); } };
}
