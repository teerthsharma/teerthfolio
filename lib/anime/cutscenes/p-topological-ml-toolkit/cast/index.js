// CAST layer for p-topological-ml-toolkit (Index / Accelerator vs Kakine Teitoku). Layer 1, redrawn every step.
// Bible: scripts/p-topological-ml-toolkit.md  sections 3.15 (hero costume), 3.17 + 4 (rival), 7 (eggs 1, 2, 7).
//
//  HERO      the locked seal (ctx.seal), never restyled. Only Accelerator costume parts are ATTACHED to its body:
//            white tuft (hair clumps, 5 tiers + 2 wisps), red slit-pupil eye decals, white chevron striped top,
//            black choker + earphone wire, dark coat tails that flutter. Expression is driven per beat (section 4 table).
//  RIVAL     Kakine Teitoku as a SMALL COSTUMED SEAL (law L6b), scale 0.95 at [3.3, 0, -5.2], yawed to the pup:
//            swept light-brown hair + one brow lock, grey-blue suit, white collar, pale hard-stare eyes, raygun with
//            "ACCEL" decal, Dark Matter wings (2 vanes x 3 feather blades, glow edge) that crumple at the hit.
//
// Timeline (f = round(t * 24); the bible's frames, overridable by cues so direction and cast agree):
//   pop in f103-112 (twos, 1.15 overshoot) | arm up f114-119 | charge f115-120 | fire f120 (5.0 s)
//   hit at cue "rivalHit" (default 5.40 s) -> knock-back 0.9 m over 7 f, tilt -0.3 rad, 0.03 m shake on twos 0.7 s
//   wings crumple f129-136 (x0.6 across, 20 degree fold)
// Cue names read (all optional, fall back to the bible's absolute times):
//   "rivalPop" "rivalFire" "rivalHit"      (beat start times)
//   "reverse" (the arrow flip, hero grin), "windSeized", "release", "bubble" (grid), "fist"  (hero expressions)
// Nothing here is emissive except the rival's own FX props (charge ball, wing glow); the hero seal never glows.
import { PUP_HEAD2 } from "../../../pup.js";

const F = (f) => f / 24;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
// smoothstep s(x) = x^2 (3 - 2x) on [0, 1]
const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
// window w(t; a, b, ra, rb): 0 outside [a, b], eased in over ra and out over rb
const win = (t, a, b, ra = 0.2, rb = 0.2) => sm((t - a) / ra) * (1 - sm((t - (b - rb)) / rb));
// a cue start time, or the bible default when the direction layer does not name it
const at = (cue, name, def) => { const s = cue?.since?.(name); return Number.isFinite(s) ? cue.t - s : def; };

// ------------------------------------------------------------------ small painted-prop helper (same recipe as the kit's `fig`)
function makeFig(ctx, geo, col, shade, o = {}) {
  const { engine, sdf } = ctx;
  const f = engine.figure(sdf.painted(geo, sdf.paint(col, shade ?? col, { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.7, ink: o.ink, constant: true });
  if (o.pos) f.position.set(...o.pos);
  if (o.rot) f.rotation.set(...o.rot);
  if (o.scale) f.scale.set(...o.scale);
  return f;
}

// ------------------------------------------------------------------ HERO: Accelerator costume parts on the locked seal
const HEAD_FRAME = { pos: PUP_HEAD2.pos, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 };
const TUFT = {
  // hair-clump-kit: root on the head ellipsoid, d0 = normalize((1-lift) tangent + lift normal + sweep), then
  // P(s) = p0 + d0 L s + g L^2 s^2 (0,-droop,0) + c L s^3 side. Sweep (0, 0.38, -0.55) streams the spikes UP AND BACK.
  band: [0.04, 0.95], sector: [-Math.PI, Math.PI], count: 7, layers: 5, // 5 tiers (7,5,6,5,4 in the bible) of clumps
  length: [0.22, 0.46], width: 0.072, thick: 0.4, lift: 0.85, sweep: [0, 0.38, -0.55], droop: 0, spike: 0.92, curl: 0.015, seed: 7,
  color: { base: "#f2f4f8", shade: "#8e97ae", hi: "#ffffff" }, // lit / shadow / clump cut
  cut: { at: [0.34, 0.74], slant: 0.28, rate: 0.9 },
};
const WISPS = { ...TUFT, band: [0.05, 0.4], count: 1, layers: 2, length: [0.5, 0.62], width: 0.04, seed: 19, sweep: [0.05, 0.5, -0.8], spike: 1, curl: 0.05, cut: { at: [0.4, 0.8], slant: 0.2, rate: 1 } };

function heroOutfit(ctx) {
  const { THREE, kit, engine, seal } = ctx;
  const g = new THREE.Group(); g.name = "accelerator-costume";
  const steal = (spec) => { // build a costumed seal and take ONLY its cloth shell: the hero's locked body is never replaced
    const d = kit.costumedSeal(engine, { scale: 1, shadow: false, ...spec });
    const part = d.shell; if (part?.parent) part.parent.remove(part);
    return part;
  };
  // striped top: white `#f1f2f4`, shadow `#7b7f90` (the grey stripe mid `#b4b7bf` comes from the chevron bars below)
  const top = steal({ layers: [{ type: "uniform", col: "#f1f2f4", shade: "#7b7f90", collar: "#f1f2f4" }] });
  if (top) g.add(top);
  // coat tails `#262c3a`: a separate shell so they can flutter alone (pivot at the shoulder line)
  const tails = new THREE.Group(); tails.position.set(0, 0.5, -0.12);
  const ts = steal({ layers: [{ type: "cloak", col: "#262c3a", shade: "#12151e", len: 0.62, spread: 0.85 }] });
  if (ts) { ts.position.set(0, -0.5, 0.12); tails.add(ts); }
  g.add(tails);
  // chevron bars: three rows of V's across the chest. Surface z of the top at x: 0.31 sqrt(1 - (x/0.355)^2) at y = 0.24
  const chev = new THREE.Group();
  for (let r = 0; r < 3; r++) {
    const y = 0.36 - r * 0.075;
    for (const s of [1, -1]) {
      const x = s * 0.085, z = 0.305 * Math.sqrt(Math.max(0.1, 1 - (x / 0.355) ** 2)) + 0.012;
      chev.add(makeFig(ctx, new THREE.BoxGeometry(0.15, 0.024, 0.012), "#b4b7bf", "#8e92a2", { pos: [x, y - Math.abs(x) * 0.18, z], rot: [0, -s * 0.28, s * 0.38], lineMul: 0.5 }));
    }
  }
  g.add(chev);
  // black choker `#14141a`, a flat torus round the neck, and the earphone wire (Catmull-Rom tube ear -> chest)
  g.add(makeFig(ctx, new THREE.TorusGeometry(0.215, 0.013, 8, 36).rotateX(Math.PI / 2), "#14141a", "#14141a", { pos: [0, 0.43, 0.025], scale: [1, 1, 0.96], lineMul: 0.5 }));
  const wire = new THREE.CatmullRomCurve3([new THREE.Vector3(0.262, 0.515, 0.06), new THREE.Vector3(0.28, 0.43, 0.1), new THREE.Vector3(0.2, 0.37, 0.27), new THREE.Vector3(0.09, 0.3, 0.3), new THREE.Vector3(0.06, 0.22, 0.31)]);
  g.add(makeFig(ctx, new THREE.TubeGeometry(wire, 20, 0.0065, 6), "#14141a", "#14141a", { lineMul: 0.35 }));
  // red eye decals (cap `#ff4d42` -> ring `#9e0514`, black slit pupil, 2 glints, lid) over the painted eyes
  const eyes = kit.eyePair({ c: PUP_HEAD2.pos, r: [0.27, 0.245, 0.255] }, { style: "slit", iris: "#ff4d42", irisLo: "#9e0514", pupilCol: "#0a0509", sclera: "#f2efe6", size: [0.09, 0.105] });
  g.add(eyes);
  // the tuft: pivot at the head so the 1.18x overshoot and the gust rock about the scalp, not the origin
  const pivot = new THREE.Group(); pivot.position.set(...PUP_HEAD2.pos);
  const hair = new THREE.Group(); hair.position.set(-PUP_HEAD2.pos[0], -PUP_HEAD2.pos[1], -PUP_HEAD2.pos[2]);
  hair.add(kit.hairMesh(engine, TUFT, HEAD_FRAME), kit.hairMesh(engine, WISPS, HEAD_FRAME));
  pivot.add(hair); g.add(pivot);
  seal.attach(g, 1);
  return { g, eyes, pivot, tails };
}

// hero expression per beat (bible section 4). returns [expression, k, openOverride|null]
function heroExpr(t, cue) {
  const reverse = at(cue, "reverse", F(86)), seized = at(cue, "windSeized", F(139)), grid = at(cue, "bubble", F(192)), rel = at(cue, "release", F(227)), fist = at(cue, "fist", F(274));
  if (t >= fist) return ["calm", 0.7, null]; // proud, small smile
  if (t >= rel) return t < rel + 0.4 ? ["shut", 0.55 * (1 - sm((t - rel) / 0.4)), null] : ["calm", 0.5, null]; // exhale
  if (t >= grid) return ["calm", 0.6, null]; // quiet, flippers hold the bubble
  if (t >= seized) return ["rage", 0.62, 1.16 + 0.06 * Math.sin(t * 9)]; // wide-eyed fierce
  if (t >= reverse) return ["smug", 1, null]; // grin: the lid and brow carry it, the painted mouth stays
  if (t >= F(48)) return ["rage", 0.42, null]; // storm: steady, brow set
  if (t >= F(13)) return ["calm", sm((t - F(13)) / (F(28) - F(13))), null]; // red eyes narrowing
  return ["neutral", 0, null];
}

// ------------------------------------------------------------------ RIVAL: Kakine Teitoku seal
const KAKINE = {
  scale: 0.95, name: "kakine-seal", shadowTint: "#2a3a8a",
  layers: [{ type: "coat", col: "#6c7ea3", shade: "#46567a", open: 0.06, collar: "#f1f3f7" }], // grey-blue suit, lapel planes, white collar
  hair: {
    preset: "swept", count: 24, layers: 2, length: [0.16, 0.27], width: 0.062, sweep: [0.05, 0.06, 0.5], // forward-swept
    color: { base: "#c79a6a", shade: "#8a6440", hi: "#e9c99a" },
    cut: { at: [0.4, 0.8], slant: 0.3, rate: 0.85 },
    fringe: { n: 2, length: 0.21, at: [0.04, 0.78, 0.2], sweep: [0.2, -0.9, 0.5] }, // the lock over the brow
  },
  eyes: { style: "tsurime", iris: "#e9e3d2", irisLo: "#b2a98f", pupilCol: "#14110e", sclera: "#cdd1de", size: [0.09, 0.1] },
};

function makeWings(ctx) {
  const { THREE } = ctx;
  const root = new THREE.Group(); root.name = "dark-matter-wings";
  const vanes = [];
  for (const s of [1, -1]) {
    const vane = new THREE.Group(); vane.position.set(s * 0.11, 0.42, -0.2); vane.userData.s = s;
    // 3 feather blades per vane, fanned at elevation 10, 38, 66 degrees: flattened tapering cones, 0.8 / 0.68 / 0.56 long
    for (let i = 0; i < 3; i++) {
      const len = 0.8 - i * 0.12, el = (10 + i * 28) * Math.PI / 180;
      const geo = new THREE.ConeGeometry(0.06, len, 4).translate(0, len / 2, 0);
      const blade = makeFig(ctx, geo, "#fff1c2", "#ffd96b", { scale: [1, 1, 0.22], lineMul: 0.6, ink: "#8a6a20" });
      blade.rotation.set(-0.5 - i * 0.05, 0, -s * (0.35 + el)); // folded back, splayed out by el
      const glow = new THREE.Mesh(geo.clone().scale(1.5, 1.04, 0.5), new THREE.MeshBasicMaterial({ color: "#ffd96b", transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.rotation.copy(blade.rotation);
      const core = new THREE.Mesh(geo.clone().scale(0.35, 0.9, 0.3), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.8 }));
      core.rotation.copy(blade.rotation);
      vane.add(blade, glow, core);
    }
    root.add(vane); vanes.push(vane);
  }
  return { root, vanes };
}

function makeRaygun(ctx) {
  const { THREE } = ctx;
  const g = new THREE.Group(); g.name = "raygun";
  g.add(makeFig(ctx, new THREE.BoxGeometry(0.05, 0.075, 0.22), "#f1f5fa", "#aab8d0", { pos: [0, 0.02, 0.06], lineMul: 0.6 }));                            // body
  g.add(makeFig(ctx, new THREE.BoxGeometry(0.052, 0.018, 0.2), "#3b74d9", "#2a52a0", { pos: [0, 0.045, 0.06], lineMul: 0.4 }));                           // stripe
  g.add(makeFig(ctx, new THREE.CylinderGeometry(0.014, 0.016, 0.12, 8).rotateX(Math.PI / 2), "#8fa3bd", "#5a6b86", { pos: [0, 0.03, 0.2], lineMul: 0.5 })); // barrel
  g.add(makeFig(ctx, new THREE.BoxGeometry(0.036, 0.1, 0.045), "#46526a", "#2a3246", { pos: [0, -0.05, 0.0], rot: [0.25, 0, 0], lineMul: 0.5 }));          // grip
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 6, 16), new THREE.MeshBasicMaterial({ color: "#7fe0ff" })); // muzzle ring
  ring.position.set(0, 0.03, 0.265); g.add(ring);
  if (typeof document !== "undefined") { // tiny "ACCEL" decal (egg 7), a nod without copying show text
    const c = document.createElement("canvas"); c.width = 128; c.height = 32;
    const x = c.getContext("2d"); x.fillStyle = "#1d3f9a"; x.fillRect(0, 0, 128, 32); x.fillStyle = "#f4fbff"; x.font = "bold 22px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("ACCEL", 64, 17);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.019), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
    d.position.set(0.0262, 0.022, 0.07); d.rotation.y = Math.PI / 2; g.add(d);
  }
  return g;
}

export default function build(ctx) {
  const { THREE, kit, engine, seal } = ctx;
  const group = new THREE.Group(); group.name = "cast-p-topological-ml-toolkit";

  // ---- hero
  const hero = heroOutfit(ctx);
  const heroEye = hero.eyes.userData;

  // ---- rival
  const RP = [3.3, 0, -5.2], SA = seal.at ?? [0, 0, 0];
  const kk = kit.costumedSeal(engine, KAKINE);
  kk.place(RP[0], RP[1], RP[2], 0).lookAtPoint(SA[0], SA[2]);
  const baseYaw = kk.group.rotation.y;
  const dx = RP[0] - SA[0], dz = RP[2] - SA[2], dl = Math.hypot(dx, dz) || 1, away = [dx / dl, dz / dl]; // unit vector pup -> rival
  const wings = makeWings(ctx); kk.body.add(wings.root);
  const gun = makeRaygun(ctx);
  const GRIP_DOWN = [0.27, 0.2, 0.2], GRIP_UP = [0.3, 0.52, 0.3];
  gun.position.set(...GRIP_DOWN); gun.rotation.x = 0.1; kk.body.add(gun);
  // charge ball `#f6fcff` with an ink hull `#1d3f9a`, at the muzzle
  const ball = new THREE.Group(); ball.position.set(0, 0.03, 0.3);
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: "#f6fcff" })),
    new THREE.Mesh(new THREE.SphereGeometry(1.34, 16, 12), new THREE.MeshBasicMaterial({ color: "#1d3f9a", side: THREE.BackSide })));
  gun.add(ball);
  ctx.setLayer(wings.root, 1); ctx.setLayer(gun, 1);
  group.add(kk.group);
  // courtesy handle for the FX layer (ray origin / hit point); layers never import each other, they only share ctx
  ctx.rival = {
    group: kk.group, handle: kk,
    muzzle(out = new THREE.Vector3()) { gun.updateWorldMatrix(true, false); return out.set(0, 0.03, 0.3).applyMatrix4(gun.matrixWorld); },
    chest(out = new THREE.Vector3()) { kk.group.updateWorldMatrix(true, false); return out.set(0, 0.4, 0).applyMatrix4(kk.group.matrixWorld); },
  };

  function update(t, dt, cue) {
    // ---------------- hero
    const [en, ek, open] = heroExpr(t, cue);
    // a blink every 3.7 s: closes over 0.17 s and reopens, skipped while the lids are already low
    const bp = t % 3.7, blink = bp < 0.17 && ek < 0.5 ? Math.sin(Math.PI * bp / 0.17) : 0, blinking = blink > 0.3;
    heroEye.set(blinking ? "shut" : en, blinking ? blink : ek);
    if (open != null && !blinking) for (const e of heroEye.eyes) e.material.uniforms.uOpen.value = open;
    // tuft: 1.18x overshoot f13-28 (bump = sin(pi p)), gust 0.14 rad f139-230 streaming back, a constant 0.03 sway
    const over = 1 + 0.18 * Math.sin(Math.PI * clamp01((t - F(13)) / (F(28) - F(13))));
    const gust = win(t, F(139), F(230), 0.4, 0.5);
    hero.pivot.scale.set(1, over * (1 + 0.04 * gust), 1);
    hero.pivot.rotation.set(-0.18 * gust + 0.03 * Math.sin(t * 3.1), 0, 0.14 * gust * Math.sin(t * 11) + 0.03 * Math.sin(t * 2.3));
    // coat tails flutter about the shoulder line, stronger in the storm and the wind
    const wind = 0.5 + 0.5 * win(t, F(48), F(250), 0.5, 0.8);
    hero.tails.rotation.set(0.10 * wind * Math.sin(t * 7.5) + 0.05 * wind, 0.06 * wind * Math.sin(t * 5.1), 0.05 * wind * Math.sin(t * 6.3));
    engine.syncFaces(hero.g);

    // ---------------- rival
    const popT = at(cue, "rivalPop", F(103)), fireT = at(cue, "rivalFire", F(120)), hitT = at(cue, "rivalHit", 5.4);
    const pop = clamp01((t - popT) / (F(112) - F(103)));
    kk.group.visible = t >= popT;
    // pop scale: 1.15 sm(p / 0.7) for p < 0.7, then 1.15 - 0.15 sm((p - 0.7) / 0.3): overshoot and settle
    const sc = pop < 0.7 ? 1.15 * sm(pop / 0.7) : 1.15 - 0.15 * sm((pop - 0.7) / 0.3);
    kk.group.scale.setScalar(KAKINE.scale * Math.max(0.0001, sc));
    // arm up f114-119 (gun rises to the shoulder), charge f115-120, fire f120
    const arm = sm((t - F(114)) / (F(119) - F(114)));
    gun.position.set(GRIP_DOWN[0] + (GRIP_UP[0] - GRIP_DOWN[0]) * arm, GRIP_DOWN[1] + (GRIP_UP[1] - GRIP_DOWN[1]) * arm, GRIP_DOWN[2] + (GRIP_UP[2] - GRIP_DOWN[2]) * arm);
    gun.rotation.x = 0.1 - 1.05 * arm;
    const ch = clamp01((t - F(115)) / (fireT - F(115))), post = clamp01((t - fireT) / 0.12);
    ball.visible = t >= F(115) && post < 1;
    ball.scale.setScalar((0.012 + 0.05 * ch * ch) * (1 + 0.15 * Math.sin(t * 60)) * (1 - post)); // grows as k^2, flickers, hands over to the ray
    // knock-back 0.9 m along (pup -> rival) over 7 frames, recoil tilt -0.3 rad, 0.03 m shake on twos for 0.7 s
    const hu = t - hitT, kb = sm(hu / F(7)), sh = hu >= 0 && hu < 0.7 ? 0.03 * (1 - hu / 0.7) * (Math.round(t * 12) % 2 ? 1 : -1) : 0;
    kk.group.position.set(RP[0] + away[0] * 0.9 * kb - away[1] * sh, RP[1], RP[2] + away[1] * 0.9 * kb + away[0] * sh);
    kk.group.rotation.y = baseYaw;
    kk.setPose("recoil", 0.46 * kb); // rx = -22 deg * 1.7 * 0.46 = -0.30 rad
    kk.setPose("terror", hu >= 0 && hu < 0.5 ? 0.6 : 0);
    // expression: smirk before the hit, wide-eyed shock on it, slack after
    if (hu < 0) kk.expression("smug", 1); else if (hu < 0.3) kk.expression("terror", 1); else kk.expression("sad", 0.75);
    // wings crumple f129-136: x0.6 across and a 20 degree fold, per vane
    const cw = sm((t - F(129)) / (F(136) - F(129)));
    for (const v of wings.vanes) { v.scale.set(1 - 0.4 * cw, 1 - 0.12 * cw, 1); v.rotation.z = -v.userData.s * 20 * Math.PI / 180 * cw; v.rotation.x = 0.04 * Math.sin(t * 5) * (1 - cw); }
    kk.update(t, dt);
    engine.syncFaces(kk.group);
  }

  function dispose() {
    kk.dispose();
    group.traverse((o) => { if (o.isMesh) { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.(); } });
    heroEye.dispose?.();
    delete ctx.rival;
  }
  return { group, update, dispose };
}
