// WORLD layer for p-faraday (A Certain Scientific Railgun, J.C.Staff look): night Academy City over a river.
// Frame: the bible's bridge frame as the world frame (see layout.js). Deck top y = 0, beam along +x at y 0.75, z -0.95.
//
// Static art (layer 0, baked per shot): the violet-magenta night dome with stars, moon and cyan halo; three skyline rings of
// value-card towers with lit-window grids; the steel truss bridge and deck; tank and ceramic bushings; lamp posts; banks, far ground.
// Animated (layer 1): the flat-band river (ripple scroll on threes, gold beam reflection), river mist cards, lamp flicker on twos,
// bushing caps and the glass underglow (cyan, then amber), monorail car, turbine rotors (threes).
//
// Cues read (scene.beats by name, with the bible's time as the default):
//   "amber"      the amber climb start       (default 4.85 s, f116)  -> bushing caps + glass underglow go cyan -> amber
//   "shot"       the Railgun fires            (default 6.8 s, f163)   -> gold river streak, gold after-light
//   "afterglow"  the gold reflection settles  (default 9.2 s, f221)
// Skipped here (other layers own them): field arcs/rings/ticks, coin, beam, sonic ring, heat shimmer, scorch wipe, all seals.
import { BoxGeometry, CircleGeometry, Color, CylinderGeometry, DoubleSide, LatheGeometry, Mesh, PlaneGeometry, Quaternion, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from "three";
import { paint, painted } from "../../../sdf.js";
import { mistCard } from "../../../tools/mist.js";
import { merge } from "../../../kit3d.js";
import { BRIDGE as B, PLATFORM as P, RIVER, BEAM, MOON, LAMPS } from "./layout.js";
import { SKY, skylineCard, RIVER_FRAG, GLASS_FRAG, FLAT_VERT } from "./glsl.js";

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const X = new Vector3(1, 0, 0);

// an oriented box member from a to b with square section w (a truss chord, brace or lamp arm)
function member(a, b, w) {
  const A = new Vector3(...a), Bv = new Vector3(...b), d = Bv.clone().sub(A);
  const g = new BoxGeometry(d.length(), w, w);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(X, d.clone().normalize()));
  const mid = A.add(Bv).multiplyScalar(0.5);
  return g.translate(mid.x, mid.y, mid.z);
}

export default function build(ctx) {
  const { THREE, engine, bake } = ctx;
  const group = new THREE.Group();
  const own = []; // disposables
  const beatT = (name, def) => (ctx.scene.beats ?? []).find((b) => b.name === name)?.t ?? def;
  const T_AMBER = beatT("amber", 4.85), T_SHOT = beatT("shot", 6.8), T_AFTER = beatT("afterglow", 9.2);
  const sx = ctx.scene.seal?.at?.[0] ?? 0;
  const key = new Vector3(...MOON.dir).normalize();
  engine.sun = key.clone().multiplyScalar(300); // the moon is the shaft source

  // a set prop from geometry + the shared anime program; f: stone / gloss / emit uniform overrides
  const prop = (geo, col, shade, id, f = {}, layer = 0) => {
    const m = engine.prop(painted(geo, paint(col, shade)), id), u = m.material.uniforms;
    if (f.stone) u.uStone.value.set(...f.stone);
    if (f.gloss) u.uGloss.value.set(...f.gloss);
    if (f.emit) u.uEmit.value.set(...f.emit);
    m.userData.layer = layer;
    group.add(m); own.push(m);
    return m;
  };
  const flat = (frag, uniforms) => new ShaderMaterial({ uniforms, vertexShader: FLAT_VERT, fragmentShader: frag, side: DoubleSide, depthWrite: true });

  // ---------------------------------------------------------------- SKY (night plate, baked dome, all 360 degrees)
  const sky = bake.sky(SKY, { az: [-Math.PI, Math.PI], el: [-0.4, 1.3], pxPerRad: 640 });
  group.add(sky); own.push(sky);

  // ---------------------------------------------------------------- SKYLINE: three curved cards, far to near, around the whole set
  const RINGS = [
    { R: 190, seed: 11, hmax: 0.5, sign: false }, { R: 150, seed: 23, hmax: 0.62, sign: true }, { R: 110, seed: 37, hmax: 0.72, sign: false },
  ];
  const CH = 22, CY0 = RIVER.y - 3; // card spans y -10 .. 12
  RINGS.forEach((rg, i) => {
    const asp = 16, unitX = (2 * Math.PI * rg.R) / asp; // metres per card x unit
    const card = bake.card(skylineCard({ seed: rg.seed, W: (14 * (1 + i * 0.3)) / unitX, cx: 1.3 / unitX, cy: 1.3 / CH, hmax: rg.hmax, aspect: asp, sign: rg.sign }),
      { w: 4096, h: 256, size: [1, 1], id: 0.5, tint: i === 0 ? "#b8b0ff" : "#ffffff" });
    card.geometry.dispose();
    card.geometry = new CylinderGeometry(rg.R, rg.R, CH, 128, 1, true);
    card.position.y = CY0 + CH / 2;
    card.renderOrder = -5 + i;
    group.add(card); own.push(card);
  });

  // ---------------------------------------------------------------- GROUND beyond the banks, embankments, planters
  prop(new PlaneGeometry(420, 420).rotateX(-Math.PI / 2).translate(0, RIVER.y - 0.2, 0), "#1d2658", "#0f1640", 0.5);
  for (const s of [-1, 1]) {
    prop(new BoxGeometry(420, 1.2, 4).translate(0, RIVER.y + 0.4, s * (RIVER.half + 2)), "#3b4a8a", "#1d2658", 0.5, { stone: [3, 1.2, 0.5, 0.2] });
    prop(new BoxGeometry(420, 0.5, 0.9).translate(0, RIVER.y + 1.2, s * (RIVER.half + 0.7)), "#6c7fc0", "#3b4a8a", 0.5); // the lit coping
  }
  const rnd = ctx.rng("planters"), pl = [];
  for (let i = 0; i < 26; i++) {
    const s = rnd() > 0.5 ? 1 : -1, x = -90 + rnd() * 190, r = 0.6 + rnd() * 0.8;
    pl.push(new SphereGeometry(r, 10, 8).scale(1, 0.8, 1).translate(x, RIVER.y + 1.6, s * (RIVER.half + 3 + rnd() * 3)));
  }
  prop(merge(pl, "planters"), "#1f7a6a", "#0d3a3a", 0.5);

  // ---------------------------------------------------------------- BRIDGE: deck, side trusses, cross beams, rivets, piers
  const L = B.x1 - B.x0, mx = (B.x0 + B.x1) / 2;
  prop(new BoxGeometry(L, B.thick, B.half * 2).translate(mx, -B.thick / 2, 0), "#6c7fc0", "#1d2658", 0.5, { stone: [3, 1.6, 0.4, 0.2] });
  const truss = [], rivets = [], g = B.girder, top = B.truss, bot = -B.thick;
  for (const s of [-1, 1]) {
    const z = s * B.half;
    truss.push(member([B.x0, top, z], [B.x1, top, z], g), member([B.x0, bot, z], [B.x1, bot, z], g));
    for (let x = B.x0, k = 0; x <= B.x1 + 1e-6; x += B.panel, k++) {
      truss.push(member([x, bot, z], [x, top, z], g * 0.7));
      if (x + B.panel <= B.x1 + 1e-6) truss.push(k % 2 ? member([x, top, z], [x + B.panel, bot, z], g * 0.55) : member([x, bot, z], [x + B.panel, top, z], g * 0.55));
    }
    for (let x = B.x0; x <= B.x1; x += 1.2) rivets.push(new BoxGeometry(0.1, 0.06, 0.1).translate(x, top + g / 2, z)); // a rivet line every 1.2 m
  }
  for (let x = B.x0; x <= B.x1 + 1e-6; x += B.panel) truss.push(member([x, bot, -B.half], [x, bot, B.half], g * 0.8)); // under-deck cross beams
  for (const x of [B.x0, B.x1]) truss.push(member([x, top, -B.half], [x, top, B.half], g));                            // end portals
  prop(merge(truss, "truss"), "#8fb2e0", "#1c356b", 0.5, { gloss: [0.15, 20, 0.2, 0] });
  prop(merge(rivets, "rivets"), "#1c356b", "#0f2d5e", 0.5);
  for (const x of [-9, 17]) prop(new CylinderGeometry(1.2, 1.5, -RIVER.y - B.thick, 10).translate(x, (RIVER.y - B.thick) / 2, 0), "#3d68a8", "#0f2d5e", 0.5, { stone: [3, 1.4, 0.5, 0.2] });

  // ---------------------------------------------------------------- SUBSTATION: glass slab, tank on four legs, ceramic bushings
  const glassU = { uUnder: { value: new Color("#5fd8ff") }, uKey: { value: key } };
  const glass = new Mesh(new BoxGeometry(P.w, P.h, P.d), flat(GLASS_FRAG, glassU));
  glass.position.set(P.x, P.h / 2, P.z); glass.userData.layer = 1; group.add(glass); own.push(glass);
  const legs = [], tank = [];
  for (const dx of [-1.0, 1.0]) for (const dz of [-0.4, 0.4]) legs.push(new CylinderGeometry(0.1, 0.12, 0.6, 8).translate(P.x + dx, P.h + 0.3, -1.5 + dz));
  tank.push(new BoxGeometry(2.6, 1.1, 1.2).translate(P.x, P.h + 1.15, -1.5), new BoxGeometry(2.4, 0.1, 1.0).translate(P.x, P.h + 1.75, -1.5));
  for (const s of [-1, 1]) tank.push(new CylinderGeometry(0.09, 0.09, 1.5, 8).rotateX(Math.PI / 2).translate(P.x + s * P.bushX, P.h + 0.7, -0.75)); // pipes to the bushings
  prop(merge(legs, "legs"), "#3d68a8", "#0f2d5e", 0.5);
  prop(merge(tank, "tank"), "#8fb2e0", "#1c356b", 0.5, { gloss: [0.2, 20, 0.2, 0] });
  // ribbed bushing, a LatheGeometry profile (r, y): plinth, then body r .2 with a r .34 disc every .33 m up to 4.4 m
  const prof = [new Vector2(0.0, P.h), new Vector2(0.42, P.h), new Vector2(0.42, P.h + 0.2), new Vector2(0.24, P.h + 0.25)];
  for (let y = P.h + 0.5; y < P.bushH - 0.35; y += 0.33) prof.push(new Vector2(0.2, y - 0.1), new Vector2(0.34, y), new Vector2(0.34, y + 0.1), new Vector2(0.2, y + 0.18));
  prof.push(new Vector2(0.22, P.bushH - 0.3), new Vector2(0.0, P.bushH - 0.3));
  const caps = [];
  for (const s of [-1, 1]) {
    prop(new LatheGeometry(prof, 20).translate(P.x + s * P.bushX, 0, 0), "#f1e2c0", "#b9a0a8", 0.5, { gloss: [0.5, 40, 0.2, 0] });
    caps.push(prop(new CylinderGeometry(0.26, 0.3, 0.3, 16).translate(P.x + s * P.bushX, P.bushH - 0.15, 0), "#ffa927", "#c8342a", 0.5, { emit: [0, 0, 0] }, 1));
  }

  // ---------------------------------------------------------------- LAMP POSTS (warm bulbs, flicker on twos; the halo is a hard disc card)
  const posts = [], bulbs = [], halos = [];
  for (const [x, z, h] of LAMPS) {
    const bz = z - Math.sign(z) * 0.6;
    posts.push(new CylinderGeometry(0.07, 0.09, h, 8).translate(x, h / 2, z), member([x, h - 0.05, z], [x, h - 0.05, bz], 0.07));
    bulbs.push(prop(new SphereGeometry(0.125, 12, 10).translate(x, h - 0.12, bz), "#ffe9a8", "#ffb347", 0.5, { emit: [1, 0.9, 0.62] }, 1));
    const halo = new Mesh(new CircleGeometry(0.55, 24), new ShaderMaterial({
      transparent: true, depthWrite: false, blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201,
      uniforms: { uCol: { value: new Color("#ffb347") }, uA: { value: 0.4 } },
      vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uCol; uniform float uA; void main() { gl_FragColor = vec4(uCol, uA); }",
    }));
    halo.position.set(x, h - 0.12, bz); halo.userData.layer = 1; halo.renderOrder = 3;
    halo.onBeforeRender = (_r, _s, cam) => { halo.quaternion.copy(cam.quaternion); };
    group.add(halo); halos.push(halo); own.push(halo);
  }
  prop(merge(posts, "posts"), "#3d68a8", "#1c356b", 0.5);

  // ---------------------------------------------------------------- RIVER (flat bands, layer 1)
  const rU = { uT: { value: 0 }, uGold: { value: 0 }, uBeamZ: { value: BEAM.z }, uX: { value: new Vector2(sx, 0) } };
  const river = new Mesh(new PlaneGeometry(520, RIVER.half * 2).rotateX(-Math.PI / 2), flat(`${ctx.tools.glslFor(["noise"])} ${RIVER_FRAG}`, rU));
  river.position.y = RIVER.y; river.userData.layer = 1; river.renderOrder = -1;
  group.add(river); own.push(river);

  // ---------------------------------------------------------------- MIST: 3 posterised cards, drifting 0.3 m/s (layer 1)
  const mists = [[-8, "#6a5ad8", 0.25], [1, "#6a5ad8", 0.25], [9, "#10c9b0", 0.15]].map(([z, col, a], i) => {
    const m = mistCard(90, 2.4, col, a, 3 + i);
    m.position.set(0, RIVER.y + 0.05, z); m.userData.layer = 1; m.renderOrder = 2;
    group.add(m); own.push(m);
    return m;
  });

  // ---------------------------------------------------------------- MONORAIL (a car crossing right to left in 28 s) and TURBINES
  const pyl = [];
  for (let x = -100; x <= 100; x += 10) pyl.push(new BoxGeometry(0.8, 9, 0.8).translate(x, -2.5, -70));
  prop(merge(pyl, "pylons"), "#3b4a8a", "#1d2658", 0.5);
  prop(new BoxGeometry(220, 0.5, 1.6).translate(0, 2.2, -70), "#6c7fc0", "#2a2f6a", 0.5);
  const car = new THREE.Group(); car.userData.layer = 1; car.position.z = -70; group.add(car);
  const carPart = (geo, col, shade, emit) => { const m = engine.prop(painted(geo, paint(col, shade)), 0.5); if (emit) m.material.uniforms.uEmit.value.set(...emit); m.userData.layer = 1; car.add(m); own.push(m); return m; };
  carPart(new BoxGeometry(10, 1.7, 2.1).translate(0, 3.35, 0), "#4a2bc8", "#1a1f6a");
  carPart(new BoxGeometry(9.2, 0.55, 2.16).translate(0, 3.6, 0), "#ffe9a8", "#ffb347", [0.9, 0.82, 0.6]);
  carPart(new CircleGeometry(0.62, 20).translate(2.8, 3.1, 1.07), "#6fd36a", "#2a8f5a");              // Gekota, the frog sign (easter egg)
  carPart(merge([new CircleGeometry(0.16, 10).translate(2.55, 3.5, 1.08), new CircleGeometry(0.16, 10).translate(3.05, 3.5, 1.08)]), "#ffffff", "#cfe0ff");
  const turbines = [[-60, -105], [38, -112], [92, -98]].map(([x, z]) => {
    const t = new THREE.Group(); t.position.set(x, RIVER.y, z); group.add(t);
    const mast = engine.prop(painted(new CylinderGeometry(0.35, 0.7, 30, 8).translate(0, 15, 0), paint("#cfe0ff", "#8fb2e0")), 0.5);
    const rot = new THREE.Group(); rot.position.set(0, 30, 0.8);
    const blades = engine.prop(painted(merge([0, 1, 2].map((k) => new BoxGeometry(0.5, 9, 0.2).translate(0, 4.5, 0).rotateZ((k * 2 * Math.PI) / 3))), paint("#cfe0ff", "#8fb2e0")), 0.5);
    mast.userData.layer = 0; blades.userData.layer = 1; rot.add(blades); t.add(mast, rot); own.push(mast, blades);
    return rot;
  });

  // ---------------------------------------------------------------- per-step animation (t is stepped by the framework)
  const flicker = (i, t) => { // twos, 1.9-5.3 s: dim .15 (30 percent of states) or lit .3-1.0; steady 1.0 outside the window
    if (t < 1.9 || t > 5.3) return 1;
    const n = Math.floor(t * 12);
    return hash(i * 17 + n) < 0.3 ? 0.15 : 0.3 + 0.7 * hash(i * 31 + n + 5);
  };
  const cyan = new Color("#5fd8ff"), amber = new Color("#ffa927"), gold = new Color("#ffb347");
  function update(t) {
    const t3 = Math.floor(t * 8) / 8; // threes
    rU.uT.value = t3;
    const since = t - T_SHOT;
    // the beam's reflection: head 55 m/s from the shot (cap: reach); full strength for the beam's life, then the afterglow settles to .35
    rU.uX.value.set(sx, since < 0 ? 0 : Math.min(BEAM.reach, BEAM.speed * since));
    rU.uGold.value = since < 0 ? 0 : 1 - 0.65 * smooth(T_AFTER, T_AFTER + 4, t);
    // underglow: cyan, amber from the amber beat (ease-in to the shot), a gold after-light that fades
    const am = smooth(T_AMBER, T_SHOT, t), after = 1 - 0.7 * smooth(T_AFTER, T_AFTER + 4, t);
    glassU.uUnder.value.copy(cyan).lerp(amber, am).lerp(gold, smooth(T_SHOT, T_AFTER, t)).multiplyScalar(since < 0 ? 0.35 + 0.65 * am : after);
    for (const c of caps) c.material.uniforms.uEmit.value.set(am * after, 0.66 * am * after, 0.16 * am * after);
    bulbs.forEach((b, i) => { const k = flicker(i, t) * 1.25; b.material.uniforms.uEmit.value.set(k, 0.9 * k, 0.62 * k); halos[i].material.uniforms.uA.value = 0.4 * flicker(i, t); });
    mists.forEach((m, i) => { m.position.x = ((t3 * 0.3 + i * 12) % 30) - 15; });   // 0.3 m/s along +x, wrapping inside 30 m
    car.position.x = 80 - ((t % 28) / 28) * 160;                                      // right to left in 28 s
    turbines.forEach((r, i) => { r.rotation.z = (t3 * 0.15 + i * 0.31) * Math.PI * 2; }); // 0.15 rev/s on threes
  }

  function dispose() {
    for (const o of own) { o.userData?.dispose?.(); o.geometry?.dispose?.(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose?.()); }
    sky.userData?.target?.dispose?.();
  }
  return { group, update, dispose };
}
