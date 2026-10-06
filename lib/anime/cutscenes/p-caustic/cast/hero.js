// p-caustic CAST: the hero seal AS MADARA. The locked pup (pup.js) is never restyled; everything here is COSTUME that rides ctx.seal.body
// through ctx.seal.attach (bible 3.6 and 4): the blue-black mane (28 cone spikes in 5 layers 4,6,7,6,5 + a cap and two bangs), red lamellar
// plates #b3202e in 6 rows with 2 x 3 shoulder guards, the cream rope belt #e8dcc2, the gunbai on the back (Uchiha fan on its face at the cast),
// red slit-iris eye caps (#f2191f to #8c0514; the decal draws the two highlights at (-.30,.34) and (.34,-.36) of the iris), the Susanoo's blue rim.
// Motion: the costume grows in 0.55 to 1.15 s with 18 percent overshoot on the floppy parts (mane, gunbai), the plates ease in with no overshoot,
// the mane sways 0.05 / 0.06 / 0.03 rad on twos, everything drops 0.2 s after the break (release 6.8). The pose track (sign, fist, raise, crouch,
// fist on the flex) is scene.seal.track's job; this file never poses the pup.
// Luma law: nothing here is emissive; the shared lit-luma cap 0.92 (uS0.w) clamps every fill, so the hero stays out of bloom.
import { events, ramp, back, clamp01 } from "./timing.js";
import { PUP_HEAD2 } from "../../../pup.js";

// [count, length range, root band (rad from the crown), seed]; 4+6+7+6+5 = 28 spikes, all pointing back or down
const MANE_LAYERS = [
  [4, [0.62, 0.98], [0.9, 1.25], 281], [6, [0.52, 0.86], [0.7, 1.15], 282], [7, [0.44, 0.74], [0.5, 1.0], 283], [6, [0.34, 0.6], [0.35, 0.85], 284], [5, [0.22, 0.4], [0.2, 0.65], 285],
];
const HAIR_COL = { base: "#33293d", shade: "#17120f", hi: "#6a5f86" }; // bible 2: lit, shadow, comb streaks
const HEAD = { c: PUP_HEAD2.pos, r: [0.27, 0.245, 0.255] };
const HEAD_RING = { pos: PUP_HEAD2.pos, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 };

export default function buildHero(ctx) {
  const { THREE, engine, seal, kit, sdf } = ctx;
  const { Group, Vector3, CylinderGeometry, TorusGeometry, BoxGeometry } = THREE;
  const { paint, painted, polygonize, ell, cone } = sdf;
  const H = PUP_HEAD2.pos;
  // a group at point p whose child keeps its place: scaling or rotating the group acts about p
  const pivot = (obj, p) => { const g = new Group(); g.position.set(...p); obj.position.sub(new Vector3(...p)); g.add(obj); return g; };
  const fig = (geo, col, shade, o = {}) => {
    const f = engine.figure(painted(geo, paint(col, shade, { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 1, ink: "#17120f", constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    return f;
  };
  const cos = new Group(); cos.name = "madara-costume";
  const popParts = [], softParts = []; // overshoot parts, and parts that ease in without overshoot

  // ---- the mane: five layers of hard tapered clumps with the stepped highlight cut, sweeping back and down
  const maneRoot = new Group();
  for (const [n, len, band, seed] of MANE_LAYERS) {
    maneRoot.add(kit.hairMesh(engine, kit.defineHair("spiky", {
      band, sector: [0.75, Math.PI * 2 - 0.75], count: n, layers: 1, length: len, width: 0.115, lift: 0.55, sweep: [0, -0.5, -1.25], droop: 0.4, spike: 0.92, curl: 0.05,
      seed, color: HAIR_COL, cut: { at: [0.38, 0.7], slant: 0.1, rate: 0.85 },
    }), HEAD_RING, { ink: "#0e0a08" }));
  }
  // the crown cap and the two bangs that frame the face
  maneRoot.add(kit.hairMesh(engine, kit.defineHair("spiky", {
    band: [0.02, 0.5], sector: [-Math.PI, Math.PI], count: 6, layers: 1, length: [0.12, 0.2], width: 0.08, lift: 0.9, sweep: [0, 0.2, -0.4], spike: 0.9, seed: 29, color: HAIR_COL,
    fringe: { n: 2, length: 0.24, at: [0.1, 0.78, 0.17], sweep: [0.35, -0.95, 0.35] },
  }), HEAD_RING, { ink: "#0e0a08" }));
  const maneSway = pivot(maneRoot, H); // sways about the head
  const maneGrow = pivot(maneSway, H); // grows about the head (net placement unchanged)
  popParts.push(maneGrow); cos.add(maneGrow);

  // ---- red lamellar plates (6 rows), 2 x 3 shoulder guards, the cream rope belt: one painted SDF shell
  //   row r sits at y = 0.145 + 0.05 r on the body ellipsoid (centre y .24, half-height .28): half-width w(y) = sqrt(1 - ((y - .24)/.28)^2),
  //   the row ellipse is 0.355 w + 0.03 wide and 0.31 w + 0.03 deep, so it stands proud of the pup by 3 cm and reads as a lamella band
  const RED = paint("#b3202e", "#6a0f1a", { line: 1.2 }), RED2 = paint("#9a1a28", "#2a0508", { line: 1.2 }), CREAM = paint("#e8dcc2", "#b9a98a", { line: 1.1 });
  const prims = [];
  for (let r = 0; r < 6; r++) {
    const y = 0.145 + r * 0.05, u = (y - 0.24) / 0.28, w = Math.sqrt(Math.max(0.05, 1 - u * u));
    prims.push(ell([0, y, 0], [0.355 * w + 0.03, 0.03, 0.31 * w + 0.03], r % 2 ? RED2 : RED, 0.012));
  }
  for (const s of [1, -1]) for (let j = 0; j < 3; j++) prims.push(ell([s * (0.3 + j * 0.012), 0.485 - j * 0.045, 0], [0.125 - j * 0.012, 0.03, 0.12 - j * 0.008], j % 2 ? RED2 : RED, 0.012));
  prims.push(ell([0, 0.16, 0], [0.385, 0.026, 0.345], CREAM, 0.01), ell([0.1, 0.16, 0.335], [0.048, 0.048, 0.022], CREAM, 0.01),
    cone([0.09, 0.15, 0.34], [0.12, 0.0, 0.345], 0.03, 0.04, CREAM, 0.01), cone([0.12, 0.15, 0.34], [0.2, 0.01, 0.33], 0.03, 0.04, CREAM, 0.01));
  const shell = engine.figure(polygonize(prims, 0.014), { head: PUP_HEAD2, ink: "#17120f", lineMul: 1.2, constant: true });
  const armour = pivot(shell, [0, 0.3, 0]); softParts.push(armour); cos.add(armour);

  // ---- the gunbai on the back: face #2a231c, ring #e8dcc2, rim #17120f (r 0.72 m on a 1 m pup is 0.2 in pup units)
  const gun = new Group();
  const disc = (r, h, col, shade, z) => fig(new CylinderGeometry(r, r, h, 36).rotateX(Math.PI / 2), col, shade, { pos: [0, 0, z], line: 0.8 });
  gun.add(disc(0.215, 0.016, "#17120f", "#17120f", -0.003), disc(0.2, 0.02, "#2a231c", "#17120f", 0));
  gun.add(fig(new TorusGeometry(0.19, 0.014, 8, 40), "#e8dcc2", "#b9a98a", { pos: [0, 0, -0.012], line: 0.7 }));
  gun.add(fig(new CylinderGeometry(0.018, 0.022, 0.34, 8), "#3a2218", "#1a0e08", { pos: [0, -0.28, 0] }));
  // the Uchiha fan on the face, revealed at the cast (3.3 s): a red half-disc over a white one, with its handle
  const fan = new Group();
  fan.add(fig(new CylinderGeometry(0.075, 0.075, 0.006, 24, 1, false, 0, Math.PI), "#b3202e", "#6a0f1a", { pos: [0, 0.012, 0.0], line: 0.5 }));
  fan.add(fig(new CylinderGeometry(0.075, 0.075, 0.006, 24, 1, false, Math.PI, Math.PI), "#e8dcc2", "#b9a98a", { pos: [0, 0.012, 0.0], line: 0.5 }));
  fan.add(fig(new BoxGeometry(0.02, 0.07, 0.006), "#e8dcc2", "#b9a98a", { pos: [0, -0.06, 0.0], line: 0.5 }));
  fan.rotation.x = Math.PI / 2; fan.position.z = 0.014; // lie the discs flat against the gunbai face (+z side is the face)
  gun.add(fan);
  gun.rotation.set(0, Math.PI, 0.32); // the face looks away from the pup, tilted like the anime
  gun.position.set(0.04, 0.4, -0.37);
  const gunP = pivot(gun, [0.04, 0.4, -0.37]); popParts.push(gunP); cos.add(gunP);

  // ---- red slit-iris eye caps over the locked eyes: the decal covers the painted eye while the costume stands (flag only, no restyle)
  const U = seal.fig.userData.mat.uniforms;
  const face0 = U.uFace.value.x, rim0 = U.uRimDir.value.clone(), rimC0 = U.uRimCol.value.clone();
  const eyes = kit.eyePair(HEAD, { style: "slit", iris: "#f2191f", irisLo: "#8c0514" });
  eyes.visible = false;
  seal.attach(eyes);
  seal.attach(cos);
  cos.visible = false;

  // the Susanoo's blue rim on the painted twin (#4aa8ff): the rim direction faces the Susanoo (up and behind the pup), the one coloured bounce
  const rimDir = new Vector3(), rimCol = new THREE.Color("#4aa8ff");

  return {
    group: cos,
    update(t, dt, cue) {
      const ts = cue.ts ?? t, E = events(cue, ts), release = E.release;
      const inK = clamp01((ts - E.costume) / 0.6);
      cos.visible = ts >= E.costume && ts < release + 0.2;
      const out = 1 - ramp(ts, release, 0.2); // gone 0.2 s after the break (the pup whole, L1)
      for (const p of popParts) p.scale.setScalar(Math.max(0.001, back(inK) * out));
      for (const p of softParts) p.scale.setScalar(Math.max(0.001, ramp(ts, E.costume, 0.55) * out));
      // mane sway on twos (ts is stepped): 0.05 / 0.06 / 0.03 rad about x / z / y
      maneSway.rotation.set(0.05 * Math.sin(ts * 2.1), 0.03 * Math.sin(ts * 1.3 + 1), 0.06 * Math.sin(ts * 1.7 + 0.4));
      // the Uchiha fan appears on the gunbai at the cast
      fan.visible = ts >= E.cast;
      fan.scale.setScalar(Math.max(0.001, back((ts - E.cast) / 0.3, 2.0)));
      // eye caps 0.55 to 6.8 s: calm, set at the cast, rage at the flex
      const on = ts >= E.costume + 0.2 && ts < release;
      if (on !== eyes.visible) { eyes.visible = on; U.uFace.value.x = on ? 1 : face0; engine.syncFaces(seal.group); }
      if (on) eyes.userData.set(ts >= E.hit2 ? "rage" : ts >= E.cast ? "calm" : "neutral", ts >= E.hit2 ? 0.7 : 0.45);
      // the blue rim while the costume stands
      if (ts >= E.costume && ts < release) {
        const y = seal.yaw ?? 0; rimDir.set(-Math.sin(y), 0.55, -Math.cos(y)).normalize();
        U.uRimDir.value.copy(rimDir); U.uRimCol.value.copy(rimCol);
      } else { U.uRimDir.value.copy(rim0); U.uRimCol.value.copy(rimC0); }
    },
    dispose() {
      cos.traverse((o) => { if (o.geometry && !o.userData.shared) o.geometry.dispose?.(); });
      eyes.userData.dispose?.();
      U.uFace.value.x = face0; U.uRimDir.value.copy(rim0); U.uRimCol.value.copy(rimC0);
    },
  };
}
