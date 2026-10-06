// WORLD layer for p-nerve (Death Note, Madhouse): the rooftop, the bell tower, the night city, the realm gap. Layer 0 is static art
// baked per shot; everything that moves (bell, beads, puddles, screens, pigeons, realm gap, crack web, expressway) is layer 1.
//
// World frame: the seal stands at the origin facing +z, deck top y = 0 (layout.js). The set is built for the camera law: the
// lens pulls back and up in FRONT of the seal, so the rooftop, parapet, tower, city and sky all sit BEHIND it (-z).
//
// Static (layer 0): cloud-ceiling dome (posterised, baked), two skyline rings (painted flat faces, hard window rectangles),
//   near towers + their screen bodies, the building under the deck, deck / curb / hut / mast / helipad / AC units, the bell
//   tower (stone, belfry, spire, clock), the floodlight fixture, expressway deck, street, gauge plinths.
// Animated (layer 1): bell yoke swing + amber rim pulse, pigeons, anemometer, four gauges + beads + red pops, puddles with the
//   flipped reflection, three broadcast screens (news -> Misa -> torn page), expressway lights, realm sky gap, crack web.
// World shatter: every prop is a non-indexed mesh with a per-triangle centre (aShard); uShat (seconds since the break) tumbles and
//   drops the triangles in the vertex shader (glsl.js SHATTER_DECL). Cards and domes disappear 0.45 s after the break.
//
// Cues read (layout.js timeline(); a beat with the same name in scene.beats overrides the bible default):
//   toll x3 (7.0, 8.1, 9.2) | bead x4 (4.05, 4.45, 4.85, 5.25) | flare (9.95) | realm (3.0, dur 1.6) | screens (12.5)
//   crack (12.9, dur .7) | shatter (13.6)
// Skipped (other layers own them): rain, splash rings, shaft cone and streak bands, grains and heaps, DONG ring / SFX, chain,
//   Ryuk, L, colony, apples, notebook, banner, impact frames, bead flare star.
// Camera far: the outer skyline ring is at R 200, the crack dome at 140; scene.far should be >= 320.
import { BackSide, BoxGeometry, BufferAttribute, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, InstancedMesh, LatheGeometry, Mesh, Object3D, PlaneGeometry, RingGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { paint, painted } from "../../../sdf.js";
import { merge } from "../../../kit3d.js";
import { hullMaterial } from "../../../material.js";
import * as L from "./layout.js";
import * as G from "./glsl.js";

const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const OVER = { blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201 }; // over, keeping the target alpha (the set id)

// triangles keep their own centre so the vertex shader can tumble them (aShard); non-indexed
function shardify(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, a = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    for (let k = 0; k < 3; k++) { a[(i + k) * 3] = cx; a[(i + k) * 3 + 1] = cy; a[(i + k) * 3 + 2] = cz; }
  }
  g.setAttribute("aShard", new BufferAttribute(a, 3));
  return g;
}

export default function build(ctx) {
  const { THREE, engine, bake } = ctx;
  const group = new THREE.Group();
  const own = [];                 // disposables
  const shat = [];                // meshes that fall apart (and their ink hulls)
  const cards = [];               // things that vanish on the break
  const U = { uShat: { value: 0 } };
  const T = L.timeline(ctx.scene);
  const keyAt = new Vector3(...L.KEY_AT), keyAim = new Vector3(...L.KEY_AIM);

  // ---- the one hard key: the floodlight (tenebrism). Direction from the seal's chest toward the lamp.
  const kd = keyAt.clone().sub(new Vector3(0, 1, 0)).normalize();
  engine.shared.uLightDir?.value.copy(kd);
  engine.shared.uLightCol?.value.set("#f4efe3");
  engine.sun = keyAt.clone().multiplyScalar(3); // post light shafts originate at the lamp

  // ---------------------------------------------------------------- builders
  // a set prop on the shared anime program (2-tone cel + hard shadow), shard-ready, with an ink hull (bible: 1.4 px #0b0e10)
  const prop = (geo, col, shade, f = {}, o = {}) => {
    const g = painted(shardify(geo), paint(col, shade, { line: f.line ?? 1 }));
    const m = engine.prop(g, o.id ?? 0.5), u = m.material.uniforms;
    if (f.stone) u.uStone.value.set(...f.stone);
    if (f.gloss) u.uGloss.value.set(...f.gloss);
    if (f.emit) u.uEmit.value.set(...f.emit);
    u.uShat = U.uShat;
    m.material.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("void main() {", `${G.SHATTER_DECL}\nvoid main() {`)
        .replace("vec4 wp = modelMatrix * vec4(p, 1.0);", "vec4 wp = modelMatrix * vec4(p, 1.0); wp.xyz = shatterWP(wp.xyz, aShard);");
    };
    m.material.customProgramCacheKey = () => "nerve-shatter";
    m.userData.layer = o.layer ?? 0;
    if (o.ink !== 0) {
      const h = new Mesh(g, hullMaterial(engine.shared, { mul: o.ink ?? 0.65, ink: "#0b0e10", constant: true }));
      h.renderOrder = -1; m.add(h); shat.push(h);
    }
    group.add(m); own.push(m); shat.push(m);
    return m;
  };
  // an own flat shader (frag, uniforms) that also tumbles on the break
  const flat = (geo, frag, uniforms, vert = G.FLAT_VERT, o = {}) => {
    const m = new Mesh(shardify(geo), new ShaderMaterial({ uniforms: { uShat: U.uShat, ...uniforms }, vertexShader: vert, fragmentShader: frag, side: o.side ?? DoubleSide, depthWrite: o.depthWrite ?? true, transparent: !!o.transparent, ...(o.transparent ? OVER : {}) }));
    m.userData.layer = o.layer ?? 0;
    m.frustumCulled = false;
    group.add(m); own.push(m); if (!o.keep) shat.push(m);
    return m;
  };
  const flatCol = (geo, col, k = 1, o = {}) => flat(geo, G.FLAT_FRAG, { uCol: { value: new Color(col) }, uK: { value: k } }, G.FLAT_VERT, o);
  const towerMat = (geo, body, win = 1) => flat(geo, G.TOWER_FRAG, { uBody: { value: new Color(body) }, uWin: { value: win } }, G.TOWER_VERT);
  const box = (w, h, d, x, y, z, sx = 1, sy = 1, sz = 1) => new BoxGeometry(w, h, d, sx, sy, sz).translate(x, y, z);

  // ---------------------------------------------------------------- SKY: the posterised city-lit cloud ceiling (3.1)
  const sky = bake.sky(G.SKY, { az: [-Math.PI, Math.PI], el: [-0.4, 1.3], pxPerRad: 640, tools: ["noise", "storm", "cel"] });
  group.add(sky); own.push(sky); cards.push(sky);

  // ---------------------------------------------------------------- CITY: two painted skyline rings (3.3)
  const CH = 90, y0 = L.GROUND_Y;
  [{ R: 200, seed: 11, hmax: 0.62, haze: 1.0 }, { R: 150, seed: 23, hmax: 0.78, haze: 0.62 }].forEach((rg, i) => {
    const asp = 8, unitX = (2 * Math.PI * rg.R) / asp;
    const card = bake.card(G.skylineCard({ seed: rg.seed, W: 11 / unitX, cx: 1.25 / unitX, cy: 1.6 / CH, hmax: rg.hmax, haze: rg.haze }), { w: 4096, h: 512, size: [1, 1], id: 0.5 });
    card.geometry.dispose();
    card.geometry = new CylinderGeometry(rg.R, rg.R, CH, 160, 1, true);
    card.position.y = y0 + CH / 2; card.renderOrder = -6 + i;
    group.add(card); own.push(card); cards.push(card);
  });
  // street far below: a dark plane
  flatCol(new PlaneGeometry(500, 500).rotateX(-Math.PI / 2).translate(0, y0 - 0.5, -60), "#0b0a12", 1, { keep: true });

  // near towers: flat painted faces, hard windows, 2-tone; never in the realm's direction (the gap must show sky)
  const rnd = ctx.rng("city");
  const nearT = [];
  for (let i = 0, n = 0; i < 80 && n < 20; i++) {
    const a = rnd() * Math.PI * 2, r = 55 + rnd() * 60, w = 8 + rnd() * 9, d = 8 + rnd() * 7, h = 18 + rnd() * 52;
    const x = Math.sin(a) * r, z = -Math.cos(a) * r, top = y0 + h;
    if (z > -20) continue;                                   // only the far half (behind the seal)
    if (top > 12 && Math.abs(Math.atan2(x - L.REALM_AT[0], -(z - L.REALM_AT[2]))) < 0.5 && z > L.REALM_AT[2]) continue; // keep the gap clear
    nearT.push(box(w, top - y0, d, x, (top + y0) / 2, z, Math.max(1, Math.round(w / 4)), Math.max(2, Math.round((top - y0) / 6)), Math.max(1, Math.round(d / 4)))); n++;
  }
  // screen bodies: a tower behind each broadcast screen
  L.SCREENS.forEach((s) => {
    const [x, y, z] = s.at, top = y + s.size[1] / 2 + 2.5, w = s.size[0] + 4;
    nearT.push(box(w, top - y0, 8, x, (top + y0) / 2, z - 4, 4, 8, 2));
  });
  towerMat(merge(nearT, "city"), "#14131c");
  // the building the roof sits on: the front wall shows under the deck
  towerMat(box(18.2, 39.6, 12.4, 0, -20.2, 3.35, 4, 8, 3), "#14131c", 0.8);

  // expressway: elevated deck + pylons, lights on layer 1 (head #f2f2e8, tail #ff3b2a, 3 m/s on threes)
  const EXZ = -48, EXY = -22;
  const pyl = [];
  for (let x = -160; x <= 160; x += 25) pyl.push(box(1.4, EXY - y0, 1.4, x, (EXY + y0) / 2, EXZ));
  flatCol(merge([box(330, 1.0, 9, 0, EXY, EXZ, 8, 1, 1), ...pyl], "expressway"), "#0b0a12");
  const LN = 44, lampG = new BoxGeometry(1.1, 0.8, 0.8);
  const lampMat = (c) => new ShaderMaterial({ uniforms: { uShat: U.uShat, uCol: { value: new Color(c) }, uK: { value: 1.1 } }, vertexShader: G.FLAT_VERT, fragmentShader: G.FLAT_FRAG });
  const heads = new InstancedMesh(shardify(lampG.clone()), lampMat("#f2f2e8"), LN);
  const tails = new InstancedMesh(shardify(lampG.clone()), lampMat("#ff3b2a"), LN);
  for (const m of [heads, tails]) { m.userData.layer = 1; m.frustumCulled = false; group.add(m); own.push(m); }
  const SPAN = 320, STEP = SPAN / LN;

  // ---------------------------------------------------------------- BROADCAST SCREENS (3.3): self-lit, three of them, cut to the page
  const scrMats = L.SCREENS.map((s) => {
    const m = flat(new PlaneGeometry(s.size[0], s.size[1], 6, 4).translate(s.at[0], s.at[1], s.at[2] + 0.06), G.SCREEN_FRAG,
      { uCut: { value: 0 }, uKind: { value: s.kind }, uT: { value: 0 } }, G.SCREEN_VERT, { layer: 1, side: DoubleSide });
    m.renderOrder = -2;
    return m.material;
  });

  // ---------------------------------------------------------------- ROOFTOP (3.5): deck, trough, curbs, hut, mast, helipad, AC
  const slab = { stone: [4, 0.33, 0.2, 0.3], gloss: [0.55, 70, 0, 0] };
  const deck = [
    box(18, 0.4, 10.2, 0, -0.2, 4.35, 18, 1, 10),            // z -0.75 .. 9.45 (full width)
    box(18, 0.4, 1.05, 0, -0.2, -1.275, 18, 1, 1),           // z -1.8 .. -0.75
    box(4.4, 0.4, 0.75, -6.8, -0.2, -2.175, 4, 1, 1),        // back strip left of the trough
    box(11.5, 0.4, 0.75, 3.25, -0.2, -2.175, 10, 1, 1),      // back strip right of the trough
  ];
  prop(merge(deck, "deck"), "#8d9498", "#4c5358", slab);
  prop(box(2.1, 0.4, 0.75, -3.55, -0.44, -2.175, 2, 1, 1), "#4c5358", "#21282c", { stone: [4, 0.33, 0.2, 0.3] }); // L's drain trough floor (top -0.24)
  const curbs = [
    box(18.6, L.CURB.h, L.CURB.w, 0, L.CURB.h / 2, L.CURB.z, 12, 1, 1),   // the parapet
    box(0.4, 0.3, 12, -9.2, 0.15, 3.45, 1, 1, 8), box(0.4, 0.3, 12, 9.2, 0.15, 3.45, 1, 1, 8), box(18.8, 0.3, 0.4, 0, 0.15, 9.65, 12, 1, 1),
  ];
  prop(merge(curbs, "curbs"), "#8d9498", "#4c5358", { stone: [4, 0.4, 0.2, 0.3] });
  prop(box(18.6, 0.08, 0.8, 0, L.CURB.h + 0.04, L.CURB.z, 12, 1, 1), "#cfe6e6", "#8d9498", { gloss: [0.6, 80, 0, 0] }, { ink: 0.4 }); // the pale wet coping

  const H = L.HUT;
  prop(merge([box(H.w, H.h, H.d, H.x, H.h / 2, H.z, 3, 4, 3), box(H.w + 0.3, 0.16, H.d + 0.3, H.x, H.h + 0.08, H.z), box(2.6, 0.12, 1.0, H.x, 2.55, H.z + H.d / 2 + 0.4), box(0.7, 0.5, 0.7, H.x + 0.8, H.h + 0.41, H.z + 0.3)], "hut"), "#4c5358", "#21282c", { stone: [4, 0.4, 0.3, 0.3] });
  prop(merge([box(0.9, 2.1, 0.08, H.x - 0.7, 1.05, H.z + H.d / 2 + 0.03), box(0.12, 2.55, 0.12, H.x - 1.1, 1.275, H.z + H.d / 2 + 0.85), box(0.12, 2.55, 0.12, H.x + 1.4, 1.275, H.z + H.d / 2 + 0.85)], "hutdoor"), "#21282c", "#0b0e10", {});
  // mast on the hut roof carrying the floodlight, and the anemometer mast on the far side
  prop(new CylinderGeometry(0.06, 0.08, keyAt.y - H.h - 0.16, 8).translate(keyAt.x, (keyAt.y + H.h + 0.16) / 2, keyAt.z), "#9aa0a6", "#3a4046", { gloss: [0.5, 60, 0, 0] });
  const lampObj = new Object3D(); lampObj.position.copy(keyAt); lampObj.lookAt(keyAim); lampObj.updateMatrixWorld();
  const lamp = new Mesh(shardify(new BoxGeometry(0.5, 0.34, 0.4)), new ShaderMaterial({ uniforms: { uShat: U.uShat }, vertexShader: G.FLAT_VERT, fragmentShader: "void main() { gl_FragColor = vec4(0.04, 0.05, 0.06, 0.5); }" }));
  lamp.position.copy(keyAt); lamp.quaternion.copy(lampObj.quaternion); group.add(lamp); own.push(lamp); shat.push(lamp);
  const lensU = { uCol: { value: new Color("#fff6e0") }, uK: { value: 1.2 } };
  const lens = new Mesh(shardify(new CircleGeometry(0.15, 20)), new ShaderMaterial({ uniforms: { uShat: U.uShat, ...lensU }, vertexShader: G.FLAT_VERT, fragmentShader: G.FLAT_FRAG, side: DoubleSide }));
  lens.position.set(0, 0, 0.21).applyQuaternion(lampObj.quaternion).add(keyAt); lens.quaternion.copy(lampObj.quaternion); lens.userData.layer = 1;
  group.add(lens); own.push(lens); shat.push(lens);

  const AN = new Vector3(L.MAST_X, 4.9, 2.0);
  prop(new CylinderGeometry(0.05, 0.07, 4.9, 8).translate(AN.x, 2.45, AN.z), "#9aa0a6", "#3a4046", { gloss: [0.5, 60, 0, 0] });
  const cupsG = merge([0, 1, 2].flatMap((k) => { const a = (k / 3) * Math.PI * 2; return [box(0.5, 0.03, 0.03, Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25), new SphereGeometry(0.07, 8, 6).translate(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5)]; }), "anemo");
  const cups = prop(cupsG, "#c9cdd1", "#565c64", {}, { layer: 1, ink: 0.4 }); cups.position.copy(AN);

  const HP = L.HELI;
  prop(new RingGeometry(HP.r - 0.15, HP.r, 56).rotateX(-Math.PI / 2).translate(HP.x, 0.02, HP.z), "#cfe6e6", "#8d9498", { gloss: [0.4, 60, 0, 0] }, { ink: 0 });
  prop(merge([box(0.18, 0.01, 1.5, HP.x - 0.55, 0.025, HP.z), box(0.18, 0.01, 1.5, HP.x + 0.55, 0.025, HP.z), box(1.0, 0.01, 0.18, HP.x, 0.025, HP.z)], "H"), "#cfe6e6", "#8d9498", {}, { ink: 0 });
  // AC units, pipe runs, fans
  prop(merge([box(1.8, 1.0, 1.2, -7.4, 0.5, 8.0), box(1.5, 0.9, 1.1, 6.6, 0.45, 8.3), box(0.12, 0.12, 8, -8.6, 0.3, 4.0), box(0.12, 0.12, 6, 8.6, 0.3, 3)], "ac"), "#9aa0a6", "#3a4046", { gloss: [0.4, 40, 0, 0] });
  prop(merge([new CylinderGeometry(0.42, 0.42, 0.06, 20).translate(-7.4, 1.03, 8.0), new CylinderGeometry(0.4, 0.4, 0.06, 20).translate(6.6, 0.93, 8.3)], "fans"), "#21282c", "#0b0e10", {});

  // ---------------------------------------------------------------- BELL TOWER (3.4)
  const Tw = L.TOWER, hw = Tw.w / 2, tz = Tw.z, tx = Tw.x;
  const shaft = [box(Tw.w, Tw.belfry - y0 + 0.2, Tw.w, tx, (Tw.belfry + y0) / 2 - 0.1, tz, 3, 10, 3)];
  const pil = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => box(0.55, 4.7, 0.55, tx + sx * (hw - 0.3), Tw.belfry + 2.35, tz + sz * (hw - 0.3)));
  const arches = [box(Tw.w, 0.4, 0.5, tx, 8.9, tz + hw - 0.25), box(Tw.w, 0.4, 0.5, tx, 8.9, tz - hw + 0.25), box(0.5, 0.4, Tw.w, tx - hw + 0.25, 8.9, tz), box(0.5, 0.4, Tw.w, tx + hw - 0.25, 8.9, tz), box(Tw.w + 0.6, 0.3, Tw.w + 0.6, tx, Tw.belfry + 0.05, tz), box(Tw.w + 0.7, 0.35, Tw.w + 0.7, tx, 9.25, tz)];
  prop(merge([...shaft, ...pil, ...arches], "tower"), "#3a3836", "#1d1b1b", { stone: [1, 1.0, 0.35, 0.25] });
  prop(new ConeGeometry(Tw.w * 0.82, Tw.top - 9.4, 4, 4).rotateY(Math.PI / 4).translate(tx, 9.4 + (Tw.top - 9.4) / 2, tz), "#3a3836", "#1d1b1b", { stone: [1, 1.4, 0.3, 0.2] });
  prop(box(Tw.w - 0.6, 4.2, Tw.w - 0.6, tx, Tw.belfry + 2.1, tz - 0.05), "#0b0a12", "#0b0a12", {}, { ink: 0 }); // the dark inside the belfry
  // clock face on the shaft (+z face)
  prop(new CylinderGeometry(0.9, 0.9, 0.08, 28).rotateX(Math.PI / 2).translate(tx, 2.4, tz + hw + 0.04), "#cfe6e6", "#8d9498", {});
  prop(merge([box(0.07, 0.6, 0.04, tx, 2.65, tz + hw + 0.1), box(0.5, 0.07, 0.04, tx + 0.22, 2.4, tz + hw + 0.1)], "hands"), "#14131c", "#0b0e10", {}, { ink: 0 });
  // yoke beam, bell (lathe), swings on layer 1
  prop(box(Tw.w - 0.9, 0.3, 0.3, tx, Tw.yoke, tz), "#3a3836", "#1d1b1b", {});
  const prof = [[0, 1.8], [0.14, 1.78], [0.2, 1.65], [0.32, 1.4], [0.42, 1.05], [0.5, 0.7], [0.62, 0.35], [0.78, 0.1], [0.86, 0.0], [0.78, 0.0], [0.6, 0.28], [0.4, 0.8], [0.22, 1.4], [0, 1.55]].map(([r, y]) => new Vector2(r, y));
  const bellGeo = new LatheGeometry(prof, 28).translate(0, -(Tw.yoke - (Tw.bellY - Tw.bellH / 2)), 0);
  const bell = prop(bellGeo, "#c58a3a", "#7a4f1e", { gloss: [0.55, 30, 0, 0] }, { layer: 1, ink: 0.8 });
  bell.position.set(tx, Tw.yoke, tz);
  const clap = prop(new SphereGeometry(0.16, 10, 8).translate(0, -(Tw.yoke - Tw.bellY + 0.9), 0), "#2c1b0b", "#0b0a0a", {}, { layer: 1, ink: 0.5 });
  clap.position.set(tx, Tw.yoke, tz);
  // pigeons (cel): body+head+tail merged, two wings; perched on the sill and the parapet, they flee on the first toll
  const pig = [];
  const pr = ctx.rng("pigeons");
  for (let i = 0; i < 7; i++) {
    const onTower = i < 3, px = onTower ? tx - 1.2 + i * 1.2 : -5.4 + (i - 3) * 1.1, py = onTower ? Tw.belfry + 0.3 : L.CURB.h + 0.5, pz = onTower ? tz + hw + 0.2 : L.CURB.z + 0.1;
    const g = new Object3D(); g.position.set(px, py, pz); g.userData.home = g.position.clone(); g.userData.ph = pr() * 6;
    const bodyG = merge([new SphereGeometry(0.14, 10, 8).scale(1.5, 1, 1), new SphereGeometry(0.07, 8, 6).translate(0.2, 0.1, 0), new BoxGeometry(0.22, 0.03, 0.1).translate(-0.25, 0, 0)], "pigeon");
    const b = prop(bodyG, "#565c64", "#2c3036", {}, { layer: 1, ink: 0.35 });
    const wing = (s) => { const w = prop(new BoxGeometry(0.3, 0.02, 0.18).translate(0, 0, s * 0.12), "#c9cdd1", "#565c64", {}, { layer: 1, ink: 0.3 }); w.position.set(0, 0.04, 0); return w; };
    const w1 = wing(1), w2 = wing(-1);
    for (const m of [b, w1, w2]) { group.remove(m); g.add(m); }
    g.userData.w = [w1, w2]; group.add(g); pig.push(g);
  }

  // ---------------------------------------------------------------- FOUR GAUGES and their beads (3.9)
  const gm = [], beads = [], pops = [];
  const GA = L.GAUGE;
  prop(merge(GA.xs.map((x) => new CylinderGeometry(0.34, 0.4, 0.2, 14).translate(x, 0.1, GA.z)), "plinths"), "#565c64", "#2c3036", { gloss: [0.5, 50, 0, 0] });
  GA.xs.forEach((x, i) => {
    const tube = flat(new CylinderGeometry(GA.r, GA.r, GA.h, 16, 1, true).translate(x, 0.2 + GA.h / 2, GA.z), G.GLASS_FRAG, { uDie: { value: 0 } }, G.UV_VERT, { layer: 1, transparent: true, depthWrite: false, keep: true });
    tube.renderOrder = 4;
    const bu = { uK: { value: 1 }, uDead: { value: new Color("#2a4a66") }, uDeadAmt: { value: 0 } };
    const bd = new Mesh(new SphereGeometry(0.12, 14, 10), new ShaderMaterial({ uniforms: bu, vertexShader: G.BEAD_VERT, fragmentShader: G.BEAD_FRAG }));
    bd.userData.layer = 1; bd.visible = false; bd.position.set(x, 2.3, GA.z); group.add(bd); own.push(bd);
    const ring = new Mesh(new TorusGeometry(0.26, 0.025, 6, 24).rotateX(Math.PI / 2), new ShaderMaterial({ uniforms: { uCol: { value: new Color("#ff5a4d") }, uK: { value: 1 } }, vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: G.FLAT_FRAG }));
    ring.userData.layer = 1; ring.visible = false; ring.position.set(x, 0.3, GA.z); group.add(ring); own.push(ring);
    gm.push(tube.material); beads.push({ m: bd, u: bu }); pops.push(ring);
    void i;
  });

  // ---------------------------------------------------------------- PUDDLES (3.8)
  const scrC = L.SCREENS.map((s) => new Vector3(...s.at));
  const pu = {
    uT: { value: 0 }, uKey: { value: keyAt.clone() }, uScr: { value: scrC }, uScrHS: { value: L.SCREENS.map((s) => new Vector2(s.size[0] / 2, s.size[1] / 2)) },
    uRyuk: { value: new Vector3(1.55, 1.0, -2.1) },
  };
  const puddleMat = new ShaderMaterial({ uniforms: { uShat: U.uShat, ...pu }, vertexShader: G.PUDDLE_VERT, fragmentShader: G.PUDDLE_FRAG, side: DoubleSide, depthWrite: false });
  own.push({ material: puddleMat });
  L.PUDDLES.forEach(([x, z, rx, rz]) => {
    const m = new Mesh(shardify(new CircleGeometry(1, 40).rotateX(-Math.PI / 2)), puddleMat);
    m.scale.set(rx, 1, rz); m.position.set(x, 0.012, z); m.userData.layer = 1; m.renderOrder = -1; m.frustumCulled = false;
    group.add(m); own.push({ geometry: m.geometry }); shat.push(m);
  });

  // ---------------------------------------------------------------- REALM SKY GAP (3.2): layer-1 card, billboarded at the seal
  const realmU = { uOpen: { value: 0 }, uT: { value: 0 }, uSeed: { value: 3.7 } };
  const realm = new Mesh(new PlaneGeometry(44, 44), new ShaderMaterial({ uniforms: realmU, vertexShader: G.UV_VERT, fragmentShader: G.REALM_FRAG, side: DoubleSide, depthWrite: true }));
  realm.position.set(...L.REALM_AT); realm.lookAt(0, L.REALM_AT[1], 0); realm.userData.layer = 1; realm.renderOrder = -4; realm.visible = false;
  group.add(realm); own.push(realm); cards.push(realm);

  // ---------------------------------------------------------------- CRACK WEB (3.19): a dome of lines about the origin
  const crackU = { uCrack: { value: 0 }, uC: { value: scrC[0].clone().normalize() } };
  const crack = new Mesh(new SphereGeometry(140, 40, 20), new ShaderMaterial({ uniforms: crackU, vertexShader: "varying vec3 vWP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }", fragmentShader: G.CRACK_FRAG, side: BackSide, transparent: true, depthWrite: false, ...OVER }));
  crack.userData.layer = 1; crack.renderOrder = 12; crack.frustumCulled = false; crack.visible = false;
  group.add(crack); own.push(crack); cards.push(crack);

  // ---------------------------------------------------------------- per-step animation (all pure functions of t: scrub == play)
  const swing = (t) => T.tolls.reduce((a, tt) => (t >= tt ? a + 0.42 * Math.exp(-0.75 * (t - tt)) * Math.sin((2 * Math.PI * (t - tt)) / 1.85) : a), 0);
  const lastToll = (t) => T.tolls.reduce((a, tt) => (t >= tt ? tt : a), -1);
  const tmp = new Object3D();
  let broke = false;

  function update(t) {
    const sh = Math.max(0, t - T.shatter);
    U.uShat.value = sh;
    if (sh > 3.4) { group.visible = false; return; }
    group.visible = true;
    const gone = sh > 0.45;
    if (gone !== broke) { broke = gone; for (const c of cards) c.visible = !gone; }
    // the ink hulls cannot tumble: drop them the moment the world breaks
    for (const m of shat) if (m.material?.side === BackSide) m.visible = sh <= 0;

    // bell: swing about the yoke (z axis: seen side-on from the front), amber rim pulse e^-5d, clapper lags
    const a = swing(t), lt = lastToll(t), d = lt < 0 ? 99 : t - lt;
    bell.rotation.z = a; clap.rotation.z = a * 1.25;
    bell.material.uniforms.uEmit.value.set(1, 0.64, 0.23).multiplyScalar(0.4 * Math.exp(-5 * d));
    lensU.uK.value = 1.2 * (1 - 0.35 * Math.exp(-5 * d)); // the floodlight flickers on the toll

    // pigeons: flee on the first toll along a rising arc away from the tower
    const f = Math.max(0, t - T.tolls[0]);
    pig.forEach((g, i) => {
      const h = g.userData.home, k = f > 0 ? Math.min(1, f / 1.8) : 0, dir = i < 3 ? -1 : 1;
      g.visible = f < 2.2;
      g.position.set(h.x + dir * 14 * k * k * (1 + 0.2 * i), h.y + 5 * Math.sin(k * 1.6) + 1.5 * k, h.z - 18 * k * (1 + 0.1 * i));
      g.rotation.y = dir > 0 ? Math.PI * 0.35 : Math.PI * 0.65;
      const fl = k > 0 ? Math.sin(t * 30 + g.userData.ph) * 0.9 : 0;
      g.userData.w[0].rotation.x = fl; g.userData.w[1].rotation.x = -fl;
    });
    cups.rotation.y = t * 4 * Math.PI; // 2 rev/s

    // gauges + beads
    const rest = (i) => 0.16 + 0.0048 * L.GRAINS[i];
    beads.forEach((b, i) => {
      const bt = T.beads[i] ?? 99, s = t - bt, top = GA.h - 0.1;
      b.m.visible = s > -0.3;
      if (b.m.visible) {
        const fall = Math.min(1, Math.max(0, s / 0.4));
        b.m.position.y = s < 0 ? top + 0.02 * Math.sin(t * 30) : top - (top - rest(i)) * fall * fall;
      }
      const die = i < 3 ? sm(0, 0.3, t - (T.tolls[i] ?? 99)) : 0;
      b.u.uDeadAmt.value = die; b.u.uK.value = 1 - 0.55 * die;
      if (i === 3) { const fk = sm(0, 0.2, t - T.flare); b.u.uK.value = 1 + 0.8 * fk; b.m.scale.setScalar(1 + 0.25 * fk); }
      gm[i].uniforms.uDie.value = die;
      pops[i].visible = s >= 0 && s < 0.125; pops[i].scale.setScalar(1 + (s / 0.125) * 1.2);
    });

    // puddles, screens, expressway lights, realm, crack
    pu.uT.value = t;
    const cut = t >= T.screens ? 1 : 0;
    for (const m of scrMats) { m.uniforms.uCut.value = cut; m.uniforms.uT.value = t; }
    for (let i = 0; i < 44; i++) {
      const x = ((((i * STEP + 3 * t) % SPAN) + SPAN) % SPAN) - SPAN / 2, y = EXY + 0.9;
      tmp.position.set(x, y, EXZ - 2); tmp.updateMatrix(); heads.setMatrixAt(i, tmp.matrix);
      const x2 = ((((i * STEP - 3 * t + 5) % SPAN) + SPAN) % SPAN) - SPAN / 2;
      tmp.position.set(x2, y, EXZ + 2); tmp.updateMatrix(); tails.setMatrixAt(i, tmp.matrix);
    }
    heads.instanceMatrix.needsUpdate = true; tails.instanceMatrix.needsUpdate = true;
    const rk = (t - T.realm.t) / T.realm.dur;
    const open = rk <= 0 || rk >= 1 ? 0 : sm(0, 0.35, rk) * (1 - sm(0.7, 1, rk));
    realmU.uOpen.value = open; realmU.uT.value = t; realm.visible = open > 0 && !gone;
    const ck = Math.min(1, Math.max(0, (t - T.crack.t) / T.crack.dur));
    crackU.uCrack.value = sm(0, 1, ck); crack.visible = ck > 0 && !gone;
  }

  update(0); // the first frame is already right (scrub == play)

  return {
    group,
    update(t) { update(t); },
    dispose() {
      for (const o of own) { o.geometry?.dispose?.(); o.material?.dispose?.(); o.userData?.dispose?.(); }
      heads.dispose(); tails.dispose();
    },
  };
}
