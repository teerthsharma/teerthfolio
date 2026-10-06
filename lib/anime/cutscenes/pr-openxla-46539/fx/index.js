// FX layer for pr-openxla-46539 (My Hero Academia, "United States of Smash", in a golden-age comic). Layer 1.
// Bible section 6 + shots 1-7 + easter eggs, built whole:
//   fire sheets (cel flames from below, 4-drawing cycle on twos) + orange ground light + rising embers
//   rain (stepped ribbons; reverses to an updraft when the sky opens) + halftone fade-in (shot 1)
//   answer-card glow (cyan A, magenta B, spark trails), the merge into one gold card (star, ring, check, "2" then "1")
//   Detroit Smash: dash streaks, b/w starburst (3 frames, on ones), red-black flash, 24 tapered speed lines converging on the fist,
//                  shock dome (14 frames to 40 m) + ground ring, debris and wrecked slabs, One-For-All cyan arcs on the fist
//   sky opens: sun column, daylight wash, storm clouds blasted into a spiral then turning to cumulus, confetti flags, engine sun
//   page tear: panel border, cracks, paper shards (two falls), issue box "XLA", gold motes
//   easter eggs: PLUS ULTRA slab, U.A. crest sign, OFA arcs, cards read 2 then 1, "DETROIT SMASH" print type, XLA issue box
// Reserved beats (impact, speedlines, shock, trauma, pose) belong to scene.js. The b/w starburst and red-black flash below
// are the bible's own replace-blend card; the engine's inverted two-tone frames stay with the beat.
// Seal safety: no emission; backdrops sit at NDC depth .99995 (behind every layer-1 object); halos are pushed behind the seal;
// every world card is hidden when it lies on the lens-to-seal segment (blocked()). Every effect is a pure function of the stepped clock.
//
// CUES read (all optional; the bible times are the defaults, a beat of the same name overrides them):
//   rain rise cards ofa smash skyopen cardsmash tear shardfall credit
import {
  BB_VERT, FLAT_VERT, SCREEN_VERT, FLAME_FRAG, GLOW_FRAG, STAR_FRAG, TEX_FRAG, CLOUD_FRAG, COLUMN_FRAG, FLASH_FRAG, BURST_FRAG,
  LINES_FRAG, WASH_FRAG, DOME_VERT, DOME_FRAG, RING_FRAG, CHUNK_VERT, CHUNK_FRAG, RISE_VERT, RISE_FRAG, RIB_VERT, RIB_FRAG,
  RAIN_VERT, RAIN_FRAG, BORDER_FRAG, SHARD_VERT, SHARD_FRAG, DOTS_FRAG,
} from "./shaders.js";
import { create as buildSmear } from "./smash-smear.js";
import { create as buildBenday } from "./benday-dots.js";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (u) => 1 - (1 - clamp01(u)) * (1 - clamp01(u));
const fract = (x) => x - Math.floor(x);
const h11 = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const FPS = 24;

// the bible clock (s). Beats of the same name override (resolved lazily on the first update).
const DEFAULT_T = { rain: 0.4, rise: 1.0, cards: 2.58, smash: 8.58, ofa: 8.6, skyopen: 9.42, cardsmash: 14.42, tear: 14.42, shardfall: 18.42, credit: 19.42 };

export default function build(ctx) {
  const { THREE, seal, scene } = ctx;
  const { Vector3: V3, Vector2: V2, Color } = THREE;
  const group = new THREE.Group();
  const smear = buildSmear(ctx); group.add(smear.group);
  const benday = buildBenday(ctx); group.add(benday.group);
  const disposables = [];
  const own = (o) => { disposables.push(o); return o; };
  const hex = (h) => new Color(h);
  const hasDoc = typeof document !== "undefined";

  // ---- clock ---------------------------------------------------------------------------------------------------------------------
  let T = null;
  function resolveT() {
    T = {};
    const beats = ctx.player?.beats ?? [];
    for (const k of Object.keys(DEFAULT_T)) T[k] = beats.find((b) => b.name === k)?.t ?? DEFAULT_T[k];
    T.merge = T.cardsmash; T.crack = T.cardsmash + 0.5; T.shardA = T.cardsmash + 0.9;
  }

  // ---- shared material factories -----------------------------------------------------------------------------------------------------
  const planeGeo = own(new THREE.PlaneGeometry(1, 1));
  const colU = (h) => ({ value: hex(h) });
  function bb(frag, extra, blending, order, sph, tr = true) {
    const u = { uOrigin: { value: new V3() }, uSize: { value: new V2(1, 1) }, uOff: { value: new V2() }, uBack: { value: 0 }, uSph: { value: sph ? 1 : 0 }, uRot: { value: 0 }, ...extra };
    const mat = own(new THREE.ShaderMaterial({ vertexShader: BB_VERT, fragmentShader: frag, uniforms: u, transparent: tr, depthWrite: !tr, blending, side: THREE.DoubleSide, toneMapped: false }));
    const mesh = new THREE.Mesh(planeGeo, mat); mesh.frustumCulled = false; mesh.renderOrder = order; mesh.visible = false;
    group.add(mesh); return { mesh, u };
  }
  function flat(frag, extra, blending, order, sizeM, zFight = -4) {
    const mat = own(new THREE.ShaderMaterial({ vertexShader: FLAT_VERT, fragmentShader: frag, uniforms: extra, transparent: true, depthWrite: false, blending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: zFight, polygonOffsetUnits: zFight, toneMapped: false }));
    const mesh = new THREE.Mesh(planeGeo, mat); mesh.rotation.x = -Math.PI / 2; mesh.scale.set(sizeM, sizeM, 1);
    mesh.frustumCulled = false; mesh.renderOrder = order; mesh.visible = false; group.add(mesh); return { mesh, u: extra };
  }
  // screen quad: backdrop (behind every layer-1 object) or overlay (always on top)
  function screen(frag, extra, o = {}) {
    const u = { uRect: { value: new THREE.Vector4(-1, -1, 1, 1) }, uZ: { value: o.overlay ? -1 : 0.99995 }, ...extra };
    const mat = own(new THREE.ShaderMaterial({ vertexShader: SCREEN_VERT, fragmentShader: frag, uniforms: u, transparent: true, depthTest: !o.overlay, depthWrite: false, blending: o.blending ?? THREE.NormalBlending, side: THREE.DoubleSide, toneMapped: false }));
    const mesh = new THREE.Mesh(planeGeo, mat); mesh.frustumCulled = false; mesh.renderOrder = o.order ?? -90; mesh.visible = false;
    group.add(mesh); return { mesh, u };
  }
  function canvasTex(w, h, draw) {
    if (!hasDoc) return null;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const tex = own(new THREE.CanvasTexture(c)); tex.anisotropy = 4; return tex;
  }
  const FONT = "900 %spx Impact, 'Arial Black', 'Helvetica Neue', sans-serif";
  function strokeText(g, text, x, y, px, fill, ink, lw) {
    g.font = FONT.replace("%s", px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.lineWidth = lw; g.strokeStyle = ink; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y);
  }
  function texCard(tex, wM, hM, order, blending = THREE.NormalBlending, sph = false) {
    if (!tex) return null;
    const c = bb(TEX_FRAG, { uMap: { value: tex }, uTint: { value: new Color(1, 1, 1) }, uA: { value: 1 } }, blending, order, sph);
    c.u.uSize.value.set(wM, hM); return c;
  }

  // ---- seal frame ---------------------------------------------------------------------------------------------------------------------
  const chest = new V3(), F = new V3(), R = new V3(), O = new V3(), P = new V3(), Pn = new V3(), Qv = new V3(), perp = new V3(), vel = new V3(), cam = ctx.player.camera;
  const P0 = new V3(seal.at[0], seal.at[1], seal.at[2]);
  function frame() {
    seal.chest(chest);
    F.set(Math.sin(seal.yaw), 0, Math.cos(seal.yaw)); R.set(Math.cos(seal.yaw), 0, -Math.sin(seal.yaw));
  }
  const sd = scene.seal || { at: [0, 0, 0], moves: [] };
  function sealAt(tt, out) { // the scene's seal path as a pure function of the clock (for the dash velocity)
    out.set(sd.at[0], sd.at[1], sd.at[2]);
    for (const m of sd.moves || []) {
      if (tt >= m.t[1]) out.set(m.to[0], m.to[1], m.to[2]);
      else if (tt > m.t[0]) { const k = (tt - m.t[0]) / (m.t[1] - m.t[0]), k2 = k * k * (3 - 2 * k); out.set(out.x + (m.to[0] - out.x) * k2, out.y + (m.to[1] - out.y) * k2, out.z + (m.to[2] - out.z) * k2); break; }
    }
    return out;
  }
  // true when p lies on the lens-to-seal segment within a cone that widens with distance from the lens (so nothing covers the seal)
  const seg = new V3(), rel = new V3(), cl = new V3();
  function blocked(p, r) {
    seg.copy(chest).sub(cam.position); const L2 = seg.lengthSq() + 1e-6;
    rel.copy(p).sub(cam.position);
    const u = rel.dot(seg) / L2;
    if (u <= 0 || u >= 1.02) return false;
    cl.copy(cam.position).addScaledVector(seg, u);
    return p.distanceTo(cl) < r * (0.3 + u);
  }
  const fist = new V3(), ndc = new V3(), fistUV = new V2(0.5, 0.5);
  function updateFist() {
    fist.copy(chest); fist.y += 0.55 * seal.scale; fist.addScaledVector(F, 0.25 * seal.scale);
    cam.updateMatrixWorld(true);
    ndc.copy(fist).project(cam);
    if (ndc.z < 1 && Math.abs(ndc.x) < 1.2 && Math.abs(ndc.y) < 1.2) fistUV.set(Math.min(0.85, Math.max(0.15, ndc.x * 0.5 + 0.5)), Math.min(0.85, Math.max(0.15, ndc.y * 0.5 + 0.5)));
    else fistUV.set(0.5, 0.55);
  }

  // =================================================================================================================================
  // 1. FIRE: 14 cel flame sheets + 14 orange ground-light pools + embers
  // =================================================================================================================================
  const NF = 14;
  const rf = ctx.rng(11);
  const fires = Array.from({ length: NF }, (_, i) => {
    const a = (i / NF) * 6.2832 + (rf() - 0.5) * 0.5, rad = 8 + rf() * 20, hgt = 2.4 + rf() * 3.6;
    // opaque cel sheet (alpha-tested in the shader): depth sorts it with the set
    const fl = bb(FLAME_FRAG, { uPhase: { value: 0 }, uSeed: { value: i * 0.37 + 0.3 }, uAlpha: { value: 1 }, uLean: { value: 0 } }, THREE.NormalBlending, 2 + i * 0.001, false, false);
    const pool = flat(GLOW_FRAG, { uCol: colU("#ff8a20"), uA: { value: 0.4 }, uSteps: { value: 3 } }, THREE.AdditiveBlending, 1, hgt * 3.2);
    return { fl, pool, x: P0.x + Math.cos(a) * rad, z: P0.z + Math.sin(a) * rad, h: hgt, w: hgt * 0.62, side: i % 2 ? 1 : -1 };
  });
  function embers(n, box, rise, col, core, size, star, seed) {
    const g = own(new THREE.BufferGeometry());
    const pos = new Float32Array(n * 3), sd2 = new Float32Array(n), sz = new Float32Array(n), r = ctx.rng(seed);
    for (let i = 0; i < n; i++) { pos.set([r(), r(), r()], i * 3); sd2[i] = r(); sz[i] = size * (0.6 + 0.8 * r()); }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aSeed", new THREE.BufferAttribute(sd2, 1)); g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    const u = { uH: { value: 800 }, uTime: { value: 0 }, uShow: { value: 0 }, uRise: { value: rise }, uCenter: { value: new V3() }, uBox: { value: new V3(...box) }, uCol: colU(col), uCore: colU(core), uStar: { value: star ? 1 : 0 } };
    const m = own(new THREE.ShaderMaterial({ vertexShader: RISE_VERT, fragmentShader: RISE_FRAG, uniforms: u, transparent: true, depthWrite: false, toneMapped: false }));
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 8; pts.visible = false; group.add(pts); return { pts, u };
  }
  const emberSet = embers(150, [56, 16, 56], 2.4, "#ff8a20", "#fff2a0", 0.09, false, 21);
  const moteSet = embers(96, [16, 7, 16], 0.3, "#ffc800", "#fffbe0", 0.16, true, 22);

  // =================================================================================================================================
  // 2. RAIN + halftone fade-in
  // =================================================================================================================================
  const NR = 650, RBOX = new V3(64, 40, 64), rr = ctx.rng(31);
  const rain = (() => {
    const pos = new Float32Array(NR * 4 * 3), end = new Float32Array(NR * 4), side = new Float32Array(NR * 4), seed = new Float32Array(NR * 4), idx = [];
    for (let i = 0; i < NR; i++) {
      const b = [rr(), rr(), rr()], s = rr();
      for (let v = 0; v < 4; v++) { pos.set(b, (i * 4 + v) * 3); end[i * 4 + v] = v >> 1; side[i * 4 + v] = v & 1 ? 1 : -1; seed[i * 4 + v] = s; }
      const o = i * 4; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
    }
    const g = own(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
    g.setAttribute("aSide", new THREE.BufferAttribute(side, 1)); g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1)); g.setIndex(idx);
    const u = { uCenter: { value: new V3() }, uBox: { value: RBOX }, uDir: { value: new V3(0.1, -1, 0.05).normalize() }, uDispXZ: { value: new V2() }, uDispY: { value: 0 }, uLen: { value: 1.3 }, uWidth: { value: 0.012 }, uAmt: { value: 0 }, uCol: colU("#b8c8ff") };
    const m = own(new THREE.ShaderMaterial({ vertexShader: RAIN_VERT, fragmentShader: RAIN_FRAG, uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.visible = false; group.add(mesh); return { mesh, u };
  })();
  const dots = screen(DOTS_FRAG, { uK: { value: 1 }, uA: { value: 1 } }, { order: -87 });

  // =================================================================================================================================
  // 3. ANSWER CARDS (glow only: the cast layer owns the card bodies) + gold merge
  // =================================================================================================================================
  const cardCol = [hex("#19d3ff"), hex("#ec2a8a")];
  const halos = [0, 1].map((i) => bb(GLOW_FRAG, { uCol: { value: cardCol[i].clone() }, uA: { value: 0.7 }, uSteps: { value: 4 } }, THREE.AdditiveBlending, 5, true));
  const trails = [0, 1].map((i) => Array.from({ length: 6 }, () => bb(GLOW_FRAG, { uCol: { value: cardCol[i].clone() }, uA: { value: 0.5 }, uSteps: { value: 3 } }, THREE.AdditiveBlending, 5, true)));
  const goldGlow = bb(GLOW_FRAG, { uCol: colU("#ffc800"), uA: { value: 0.9 }, uSteps: { value: 4 } }, THREE.AdditiveBlending, 5, true);
  const goldStar = bb(STAR_FRAG, { uCol: colU("#ffc800"), uCore: colU("#fffbe0"), uA: { value: 1 } }, THREE.AdditiveBlending, 6, true);
  const goldRing = flat(RING_FRAG, { uR: { value: 0.1 }, uW: { value: 0.05 }, uA: { value: 1 } }, THREE.AdditiveBlending, 3, 12);
  const digitTex = [2, 1].map((n) => canvasTex(256, 256, (g, w, h) => strokeText(g, String(n), w / 2, h / 2 + 6, 200, "#ffffff", "#12070a", 18)));
  const digits = digitTex.map((t) => texCard(t, 0.7, 0.7, 7, THREE.NormalBlending, true));
  const checkTex = canvasTex(256, 256, (g, w, h) => {
    g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(w * 0.2, h * 0.52); g.lineTo(w * 0.42, h * 0.74); g.lineTo(w * 0.8, h * 0.26);
    g.lineWidth = 62; g.strokeStyle = "#12070a"; g.stroke(); g.lineWidth = 40; g.strokeStyle = "#1f5fe0"; g.stroke();
  });
  const check = texCard(checkTex, 0.8, 0.8, 7, THREE.NormalBlending, true);
  const hov = new V3(), mp = new V3();
  // card hover/flight position (pure of the stepped clock). i 0 = A (right of the seal), 1 = B (left); merges over the head.
  function cardPos(i, tt, out) {
    const S = seal.scale, sgn = i === 0 ? 1 : -1;
    hov.copy(chest); hov.y = seal.at[1] + 1.55 * S; hov.addScaledVector(R, sgn * 1.4 * S).addScaledVector(F, 0.5 * S);
    const sx = P0.x + F.x * 9, sy = P0.y + 3.4, sz = P0.z + F.z * 9; // the Nomu's throwing hand, 9 m ahead of the seal
    const e = easeOut((tt - T.cards) / 0.9);
    out.set(sx + (hov.x - sx) * e, sy + (hov.y - sy) * e + 1.2 * Math.sin(Math.PI * e), sz + (hov.z - sz) * e);
    const k2 = clamp01((tt - T.merge) / (8 / FPS)), m = k2 * k2;
    out.set(out.x + (chest.x + 0.3 * S * F.x - out.x) * m, out.y + (seal.at[1] + 1.55 * S - out.y) * m, out.z + (chest.z + 0.3 * S * F.z - out.z) * m);
    return out;
  }

  // =================================================================================================================================
  // 4. DETROIT SMASH
  // =================================================================================================================================
  const flash = screen(FLASH_FRAG, { uAt: { value: new V2(0.5, 0.5) }, uAsp: { value: 1.78 }, uA: { value: 1 }, uSeed: { value: 0 } }, { order: -91 });
  const burst = screen(BURST_FRAG, { uAt: { value: new V2(0.5, 0.5) }, uAsp: { value: 1.78 }, uA: { value: 1 }, uSeed: { value: 0 }, uInv: { value: 0 } }, { order: -92 });
  const lines = screen(LINES_FRAG, { uAt: { value: new V2(0.5, 0.5) }, uAsp: { value: 1.78 }, uA: { value: 1 }, uSeed: { value: 0 }, uR0: { value: 0.12 } }, { order: -89 });
  const wash = screen(WASH_FRAG, { uAsp: { value: 1.78 }, uA: { value: 0 }, uTime: { value: 0 } }, { order: -88, blending: THREE.AdditiveBlending });

  // ribbons (dash streaks, OFA arcs)
  function ribbons(count, nPts, mat) {
    const nv = count * nPts * 2, pos = new Float32Array(nv * 3), nxt = new Float32Array(nv * 3), side = new Float32Array(nv), uu = new Float32Array(nv), idx = [];
    for (let c = 0; c < count; c++) for (let j = 0; j < nPts; j++) {
      const v = (c * nPts + j) * 2; side[v] = -1; side[v + 1] = 1; uu[v] = uu[v + 1] = j / (nPts - 1);
      if (j < nPts - 1) idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
    const g = own(new THREE.BufferGeometry());
    const pa = new THREE.BufferAttribute(pos, 3), na = new THREE.BufferAttribute(nxt, 3);
    pa.setUsage(THREE.DynamicDrawUsage); na.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", pa); g.setAttribute("aNext", na); g.setAttribute("aSide", new THREE.BufferAttribute(side, 1)); g.setAttribute("aU", new THREE.BufferAttribute(uu, 1)); g.setIndex(idx);
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.visible = false; group.add(mesh);
    return {
      mesh,
      set(c, pts) { // pts: array of V3 (nPts)
        for (let j = 0; j < nPts; j++) {
          const a = pts[j], b = j < nPts - 1 ? pts[j + 1] : Pn.copy(a).add(a).sub(pts[j - 1]); // last point extrapolates the tangent
          for (let s = 0; s < 2; s++) { const v = ((c * nPts + j) * 2 + s) * 3; pos[v] = a.x; pos[v + 1] = a.y; pos[v + 2] = a.z; nxt[v] = b.x; nxt[v + 1] = b.y; nxt[v + 2] = b.z; }
        }
        pa.needsUpdate = true; na.needsUpdate = true;
      },
    };
  }
  const ribMat = (col, core, width, taper, blend) => own(new THREE.ShaderMaterial({ vertexShader: RIB_VERT, fragmentShader: RIB_FRAG, uniforms: { uWidth: { value: width }, uCol: colU(col), uCore: colU(core), uA: { value: 1 }, uTaper: { value: taper } }, transparent: true, depthWrite: false, blending: blend, side: THREE.DoubleSide, toneMapped: false }));
  const dashRib = ribbons(10, 2, ribMat("#ffffff", "#ffffff", 0.03, 1, THREE.NormalBlending)); dashRib.mesh.renderOrder = 6;
  const ofaPts = 8, ofaRib = ribbons(5, ofaPts, ribMat("#40d0ff", "#e8fbff", 0.05, 0, THREE.AdditiveBlending)); ofaRib.mesh.renderOrder = 9;
  const dashPts = Array.from({ length: 2 }, () => new V3()), ofaArr = Array.from({ length: ofaPts }, () => new V3());

  // shock dome + ground ring (40 m, 14 frames)
  const domeGeo = own(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2));
  const domeMat = own(new THREE.ShaderMaterial({ vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, uniforms: { uK: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, toneMapped: false }));
  const dome = new THREE.Mesh(domeGeo, domeMat); dome.frustumCulled = false; dome.renderOrder = 4; dome.visible = false; group.add(dome);
  const ring = flat(RING_FRAG, { uR: { value: 0.1 }, uW: { value: 0.03 }, uA: { value: 1 } }, THREE.AdditiveBlending, 3, 84);

  // debris + wrecked slabs (instanced, two-tone, ink hull)
  const ND = 40, NSLAB = 5;
  function chunkSet(geo0, n, colors, shadow) {
    const geo = own(geo0.clone()), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const c = colors[i % colors.length]; col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute("aCol", new THREE.InstancedBufferAttribute(col, 3));
    const sun = new V3(0.5, 0.7, 0.3).normalize();
    const mk = (hull, sideV) => own(new THREE.ShaderMaterial({ vertexShader: CHUNK_VERT, fragmentShader: CHUNK_FRAG, side: sideV, toneMapped: false, uniforms: { uHull: { value: hull }, uHullW: { value: 0.07 }, uSun: { value: sun }, uShadow: { value: shadow }, uHullCol: colU("#12070a") } }));
    const mesh = new THREE.InstancedMesh(geo, mk(0, THREE.FrontSide), n), hull = new THREE.InstancedMesh(geo, mk(1, THREE.BackSide), n);
    hull.instanceMatrix = mesh.instanceMatrix;
    for (const m of [mesh, hull]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.renderOrder = 5; m.visible = false; group.add(m); }
    return { mesh, hull };
  }
  const rubbleCols = [hex("#6a5a50"), hex("#a37952"), hex("#6a5a50"), hex("#4a3f46")];
  const debris = chunkSet(new THREE.IcosahedronGeometry(1, 0), ND, rubbleCols, new V3(0.5, 0.42, 0.6));
  const slabs = chunkSet(new THREE.BoxGeometry(1, 0.35, 0.7), NSLAB, [hex("#333b4f"), hex("#6a5a50")], new V3(0.5, 0.45, 0.62));
  const rd = ctx.rng(41);
  const dRows = Array.from({ length: ND }, (_, i) => ({ az: rd() * 6.2832, sp: 12 + rd() * 20, up: 6 + rd() * 8, size: 0.14 + rd() * (i < 10 ? 0.5 : 0.22), ax: new V3(rd() - 0.5, rd() - 0.5, rd() - 0.5).normalize(), spin: 3 + rd() * 8, r0: 2.5 + rd() * 2 }));
  const sRows = Array.from({ length: NSLAB }, (_, i) => ({ az: (i / NSLAB) * 6.2832 + rd(), sp: 7 + rd() * 6, up: 5 + rd() * 4, size: 1.1 + rd() * 0.9, ax: new V3(rd() - 0.5, rd() - 0.5, rd() - 0.5).normalize(), spin: 1.2 + rd() * 2, r0: 4 + rd() * 3 }));
  const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), Sc = new V3(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0), EUL = new THREE.Euler();
  function flyChunks(set, rows, d, g) {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (d < 0 || d > 2.2) { set.mesh.setMatrixAt(i, ZERO); continue; }
      const hx = Math.cos(r.az), hz = Math.sin(r.az);
      P.set(P0.x + hx * (r.r0 + r.sp * d), seal.at[1] + 0.3 + r.up * d - 0.5 * g * d * d, P0.z + hz * (r.r0 + r.sp * d));
      if (P.y < seal.at[1] + r.size * 0.4) P.y = seal.at[1] + r.size * 0.4;
      Q4.setFromAxisAngle(r.ax, r.spin * d);
      const k = r.size * (1 - sstep(1.7, 2.2, d)) * (blocked(P, 1.2) ? 0 : 1);
      Sc.set(k, k * 0.85, k * 0.9); M4.compose(P, Q4, Sc); set.mesh.setMatrixAt(i, M4);
    }
    set.mesh.instanceMatrix.needsUpdate = true;
  }

  // =================================================================================================================================
  // 5. THE SKY OPENS: sun column, storm clouds blasted into a spiral, confetti flags
  // =================================================================================================================================
  const column = bb(COLUMN_FRAG, { uA: { value: 1 }, uTime: { value: 0 } }, THREE.AdditiveBlending, 2, false);
  const pool = flat(GLOW_FRAG, { uCol: colU("#fff3b0"), uA: { value: 0.5 }, uSteps: { value: 3 } }, THREE.AdditiveBlending, 1, 16);
  const NC = 24, rc = ctx.rng(51);
  const clouds = Array.from({ length: NC }, (_, i) => {
    const c = bb(CLOUD_FRAG, { uLit: { value: new Color() }, uMid: { value: new Color() }, uSh: { value: new Color() }, uA: { value: 1 } }, THREE.NormalBlending, 1, true);
    return { c, th: (i / NC) * 6.2832 + rc() * 0.5, r0: 12 + rc() * 30, h: 28 + rc() * 40, s: 22 + rc() * 30 };
  });
  const NIGHT = [hex("#2a3a80"), hex("#1c2a61"), hex("#101831")], DAY = [hex("#f4f8ff"), hex("#d0e7fb"), hex("#667da9")];
  const NCF = 48, rcf = ctx.rng(61);
  const confMat = own(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }));
  const conf = new THREE.InstancedMesh(planeGeo, confMat, NCF); conf.frustumCulled = false; conf.renderOrder = 6; conf.visible = false; group.add(conf);
  const cfCols = ["#c82020", "#ffc800", "#19d3ff", "#ec2a8a", "#f4f4f0", "#1c2a61"].map(hex);
  const cf = Array.from({ length: NCF }, (_, i) => { conf.setColorAt(i, cfCols[i % cfCols.length]); return { az: rcf() * 6.2832, rad: 5 + rcf() * 12, vu: 7 + rcf() * 7, vh: 1 + rcf() * 2, ph: rcf() * 6.28, sp: 4 + rcf() * 5, w: 0.5 + rcf() * 0.4 }; });
  conf.instanceColor.needsUpdate = true;
  conf.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // =================================================================================================================================
  // 6. THE PAGE: border, cracks, paper shards, issue box
  // =================================================================================================================================
  const border = screen(BORDER_FRAG, { uAsp: { value: 1.78 }, uShow: { value: 0 }, uCrack: { value: 0 }, uA: { value: 1 }, uAt: { value: new V2(0.5, 0.5) } }, { overlay: true, order: 1000 });
  const NSH = 44;
  const shard = (() => {
    const pos = new Float32Array(NSH * 9), id = new Float32Array(NSH * 3), bary = new Float32Array(NSH * 9);
    const tri = [[-1, -0.6], [1, -0.3], [0.1, 1]];
    for (let s = 0; s < NSH; s++) for (let v = 0; v < 3; v++) {
      const o = s * 3 + v; pos.set([tri[v][0], tri[v][1], 0], o * 3); id[o] = s + 1; bary[o * 3 + v] = 1;
    }
    const g = own(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aId", new THREE.BufferAttribute(id, 1)); g.setAttribute("aBary", new THREE.BufferAttribute(bary, 3));
    const u = { uAsp: { value: 1.78 }, uTA: { value: -1 }, uTB: { value: -1 }, uSplit: { value: 17 }, uAt: { value: new V2(0.5, 0.5) } };
    const m = own(new THREE.ShaderMaterial({ vertexShader: SHARD_VERT, fragmentShader: SHARD_FRAG, uniforms: u, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 1001; mesh.visible = false; group.add(mesh); return { mesh, u };
  })();
  // the issue box (top-right of the frame): "XLA" + issue number, printed on the page margin
  const issueTex = canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, w, h); g.strokeStyle = "#05020a"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = "#ec2a8a"; g.fillRect(14, 14, 140, h - 28);
    strokeText(g, "XLA", 84, h / 2 + 4, 76, "#ffffff", "#05020a", 8);
    g.font = "800 34px 'Arial Black', sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#05020a";
    g.fillText("No. 46539", 172, h * 0.34); g.font = "700 24px 'Arial Black', sans-serif"; g.fillText("10¢  GOLDEN AGE", 172, h * 0.7);
  });
  let issue = null;
  if (issueTex) {
    const u = { uMap: { value: issueTex }, uTint: { value: new Color(1, 1, 1) }, uA: { value: 1 }, uRect: { value: new THREE.Vector4() }, uZ: { value: -1 } };
    const m = own(new THREE.ShaderMaterial({ vertexShader: SCREEN_VERT, fragmentShader: TEX_FRAG, uniforms: u, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    const mesh = new THREE.Mesh(planeGeo, m); mesh.frustumCulled = false; mesh.renderOrder = 1002; mesh.visible = false; group.add(mesh); issue = { mesh, u };
  }

  // =================================================================================================================================
  // 7. EASTER EGGS: PLUS ULTRA slab, U.A. crest sign, DETROIT SMASH print type
  // =================================================================================================================================
  const plusTex = canvasTex(1024, 320, (g, w, h) => {
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.06);
    strokeText(g, "PLUS ULTRA!", 0, 0, 190, "#f4f0e8", "#12070a", 12); g.restore();
  });
  let plusMesh = null;
  if (plusTex) {
    const slab = new THREE.Mesh(own(new THREE.BoxGeometry(2.8, 0.25, 1.2)), own(new THREE.MeshBasicMaterial({ color: hex("#4a3f46"), toneMapped: false })));
    slab.rotation.set(0.04, 0.5, 0.05); slab.frustumCulled = false; slab.renderOrder = 2; slab.visible = false; group.add(slab);
    const decal = flat(TEX_FRAG, { uMap: { value: plusTex }, uTint: { value: new Color(1, 1, 1) }, uA: { value: 1 } }, THREE.NormalBlending, 3, 2.4, -6);
    decal.mesh.scale.set(2.4, 0.75, 1);
    plusMesh = { slab, decal };
  }
  const crestTex = canvasTex(256, 256, (g, w, h) => {
    g.beginPath(); g.moveTo(w * 0.1, h * 0.08); g.lineTo(w * 0.9, h * 0.08); g.lineTo(w * 0.9, h * 0.55); g.quadraticCurveTo(w * 0.9, h * 0.9, w * 0.5, h * 0.96); g.quadraticCurveTo(w * 0.1, h * 0.9, w * 0.1, h * 0.55); g.closePath();
    g.fillStyle = "#1c2a61"; g.fill(); g.lineWidth = 14; g.strokeStyle = "#12070a"; g.stroke();
    g.lineWidth = 6; g.strokeStyle = "#c82020"; g.beginPath(); g.moveTo(w * 0.18, h * 0.16); g.lineTo(w * 0.82, h * 0.16); g.stroke();
    strokeText(g, "U.A.", w / 2, h * 0.48, 92, "#f4f4f0", "#12070a", 8);
    g.fillStyle = "#ffc800"; g.fillRect(w * 0.3, h * 0.68, w * 0.4, 8);
  });
  let sign = null;
  if (crestTex) {
    sign = new THREE.Group();
    const pole = new THREE.Mesh(own(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6)), own(new THREE.MeshBasicMaterial({ color: hex("#333b4f"), toneMapped: false })));
    pole.position.y = 1.3;
    const face = new THREE.Mesh(planeGeo, own(new THREE.ShaderMaterial({ vertexShader: FLAT_VERT, fragmentShader: TEX_FRAG, uniforms: { uMap: { value: crestTex }, uTint: { value: new Color(1, 1, 1) }, uA: { value: 1 } }, transparent: true, side: THREE.DoubleSide, toneMapped: false })));
    face.scale.set(1.3, 1.3, 1); face.position.set(0.1, 2.3, 0.02); face.rotation.set(0.05, 0.3, 0.45); // broken: hangs askew
    sign.add(pole, face); sign.visible = false; group.add(sign);
    pole.frustumCulled = false; face.frustumCulled = false;
  }
  const detroitTex = canvasTex(1024, 256, (g, w, h) => {
    g.save(); g.translate(w / 2, h / 2); g.transform(1, 0, -0.3, 1, 0, 0);
    strokeText(g, "DETROIT SMASH!", 0, 0, 150, "#ffc800", "#12070a", 20); g.restore();
  });
  const detroit = texCard(detroitTex, 4.2, 1.05, 7, THREE.NormalBlending, false);
  const sunHome = ctx.engine.sun && ctx.engine.sun.clone ? ctx.engine.sun.clone() : null;

  // ---- per frame ----------------------------------------------------------------------------------------------------------------
  const tmpC = new Color();
  function update(t) {
    if (!T) resolveT();
    const S = seal.scale, tw = Math.floor(t * 12), asp = ctx.aspect();
    frame(); updateFist();
    const px = ctx.engine.renderer ? ctx.engine.renderer.domElement.height : 800;
    const sm = t - T.smash, fr = sm * FPS; // seconds and frames since the smash
    const open = t - T.skyopen;
    const fu = fistUV;

    // ---- fire (on twos). Flares at the smash, dims once the sky opens.
    const fireAmt = sstep(0.3, 1.3, t) * (1 - 0.35 * sstep(0, 1.5, open));
    const flare = sm > 0 ? Math.exp(-sm * 2.4) * 0.7 : 0;
    for (let i = 0; i < NF; i++) {
      const f = fires[i], H = f.h * fireAmt * (1 + flare * 0.6), on = fireAmt > 0.02;
      f.pool.mesh.visible = on;
      if (!on) { f.fl.mesh.visible = false; continue; }
      P.set(f.x, seal.at[1] + H * 0.5, f.z);
      f.fl.mesh.visible = !blocked(P, f.w * 1.2);
      f.fl.u.uOrigin.value.set(f.x, seal.at[1], f.z); f.fl.u.uSize.value.set(f.w * (1 + flare * 0.3), H); f.fl.u.uOff.value.set(0, H * 0.5);
      f.fl.u.uPhase.value = (tw + i) % 4; f.fl.u.uLean.value = f.side * flare * 0.5;
      f.pool.mesh.position.set(f.x, seal.at[1] + 0.03, f.z); f.pool.u.uA.value = 0.34 * fireAmt * (0.85 + 0.15 * Math.sin(tw * 1.7 + i));
    }
    emberSet.pts.visible = fireAmt > 0.05; emberSet.u.uH.value = px; emberSet.u.uTime.value = t; emberSet.u.uShow.value = fireAmt * (1 + flare); emberSet.u.uCenter.value.set(P0.x, seal.at[1], P0.z);

    // ---- rain: starts at T.rain, thins at the dome, reverses to an updraft when the sky opens, gone by +3 s
    {
      const amt = sstep(T.rain, T.rain + 1.2, t) * (1 - sstep(T.skyopen + 0.8, T.skyopen + 3, t)) * (sm > 0 ? 1 - 0.7 * Math.exp(-sm * 3) : 1);
      rain.mesh.visible = amt > 0.01; rain.u.uAmt.value = amt;
      const w = 1.0, I = (u) => (u <= 0 ? 0 : u < 1 ? u * u * u - (u * u * u * u) / 2 : 0.5 + (u - 1)); // integral of smoothstep(0,1,u)
      rain.u.uDispY.value = -28 * t + 40 * w * I(open / w); // integral of vy(t) = -28 + 40 smoothstep((t - open0) / w)
      rain.u.uDispXZ.value.set(2.2 * t, 0.6 * t);
      const vy = -28 + 40 * sstep(0, w, open);
      rain.u.uDir.value.set(0.08, vy >= 0 ? 1 : -1, 0.02).normalize();
      rain.u.uLen.value = 0.35 + Math.min(1.6, Math.abs(vy) * 0.05);
      rain.u.uCenter.value.set(seal.at[0], seal.at[1] + 16, seal.at[2]);
    }
    // halftone fade-in (shot 1)
    dots.mesh.visible = t < 1.05; dots.u.uK.value = 1 - sstep(0, 1.0, t);

    // ---- answer cards glow
    {
      const live = t >= T.cards && t < T.merge + 0.45;
      for (let i = 0; i < 2; i++) {
        const hl = halos[i];
        if (!live) { hl.mesh.visible = false; trails[i].forEach((x) => (x.mesh.visible = false)); continue; }
        cardPos(i, t, O);
        const pulse = 1 + 0.08 * Math.sin(t * 6 + i * 2), sz = 1.9 * S * pulse * (1 - 0.6 * sstep(T.merge + 0.3, T.merge + 0.4, t));
        hl.u.uOrigin.value.copy(O); hl.u.uSize.value.set(sz, sz); hl.u.uBack.value = 0.25 * S; hl.u.uA.value = 0.55 + 0.15 * Math.sin(t * 9 + i);
        hl.mesh.visible = !blocked(O, 0.9 * S);
        for (let j = 0; j < 6; j++) {
          const tr = trails[i][j], tt = t - (j + 1) * 0.045;
          const fly = (tt > T.cards && t < T.cards + 1.0) || (t >= T.merge && t < T.merge + 0.4 && tt > T.merge - 0.2);
          tr.mesh.visible = false;
          if (!fly) continue;
          cardPos(i, tt, P); const s2 = (0.9 - j * 0.11) * S;
          tr.u.uOrigin.value.copy(P); tr.u.uSize.value.set(s2, s2); tr.u.uBack.value = 0.25 * S; tr.u.uA.value = 0.5 * (1 - j / 6);
          tr.mesh.visible = !blocked(P, 0.6 * S);
        }
      }
      // the merge: gold glow + star + ring + the check; "2" above A then "1" over the gold card (easter egg)
      const km = t - T.merge;
      mp.set(chest.x + 0.3 * S * F.x, seal.at[1] + 1.55 * S, chest.z + 0.3 * S * F.z);
      const landed = km >= 8 / FPS, k = km - 8 / FPS;
      goldGlow.mesh.visible = landed && k < 5; goldStar.mesh.visible = landed && k < 1.4; goldRing.mesh.visible = landed && k < 1.0;
      if (landed) {
        goldGlow.u.uOrigin.value.copy(mp); goldGlow.u.uBack.value = 0.3 * S;
        const gs = (2.6 + 3 * easeOut(k * 3)) * S * (1 - 0.55 * sstep(0.5, 4, k)); goldGlow.u.uSize.value.set(gs, gs); goldGlow.u.uA.value = 0.9 - 0.5 * sstep(0, 1.2, k);
        goldStar.u.uOrigin.value.copy(mp); goldStar.u.uBack.value = 0.35 * S;
        const ss = 7 * S * (0.4 + 0.6 * easeOut(k * 4)) * (1 - 0.5 * sstep(0.2, 1.2, k)); goldStar.u.uSize.value.set(ss, ss); goldStar.u.uA.value = 1 - sstep(0.6, 1.2, k);
        goldRing.mesh.position.set(mp.x, seal.at[1] + 0.05, mp.z); goldRing.u.uR.value = (0.3 + 5.5 * easeOut(k * 1.2)) / 6; goldRing.u.uW.value = 0.025; goldRing.u.uA.value = 1 - sstep(0.4, 1.0, k);
      }
      if (check) {
        const show = km >= 0.9 && km < 4.8;
        check.mesh.visible = show && !blocked(mp, 0.5 * S);
        if (show) { check.u.uOrigin.value.set(mp.x, mp.y + 0.95 * S, mp.z); check.u.uBack.value = 0.2 * S; const cs = (0.8 + 0.1 * Math.sin(t * 5)) * S; check.u.uSize.value.set(cs, cs); check.u.uA.value = sstep(0.9, 1.1, km) * (1 - sstep(4.4, 4.8, km)); }
      }
      if (digits[0] && digits[1]) { // "2" above card A just before the smash, "1" over the gold card after it
        const a = t >= T.merge - 0.25 && t < T.merge + 0.34;
        digits[0].mesh.visible = a;
        if (a) { cardPos(0, t, O); digits[0].u.uOrigin.value.set(O.x, O.y + 0.95 * S, O.z); digits[0].u.uBack.value = 0.2 * S; digits[0].u.uSize.value.set(0.7 * S, 0.7 * S); digits[0].mesh.visible = !blocked(O, 0.5 * S); }
        const b = landed && km < 1.8;
        digits[1].mesh.visible = b;
        if (b) { digits[1].u.uOrigin.value.set(mp.x, mp.y + 0.8 * S, mp.z); digits[1].u.uBack.value = 0.2 * S; digits[1].u.uSize.value.set(0.7 * S, 0.7 * S); digits[1].u.uA.value = 1 - sstep(1.2, 1.8, km); digits[1].mesh.visible = !blocked(mp, 0.5 * S); }
      }
    }

    // ---- Detroit Smash: dash streaks (velocity from the scene's own seal path)
    {
      vel.copy(sealAt(t, O)).sub(sealAt(t - 1 / 12, P)).multiplyScalar(12);
      const sp = vel.length(), k = sstep(2, 12, sp);
      dashRib.mesh.visible = k > 0.02;
      if (k > 0.02) {
        vel.multiplyScalar(1 / sp); perp.set(-vel.z, 0, vel.x);
        for (let i = 0; i < 10; i++) {
          const off = (i - 4.5) * 0.13 * S, hy = (0.18 + 0.85 * h11(i + 3)) * S;
          dashPts[0].set(chest.x + perp.x * off - vel.x * 0.5 * S, seal.at[1] + hy, chest.z + perp.z * off - vel.z * 0.5 * S);
          dashPts[1].copy(dashPts[0]).addScaledVector(vel, -(1.2 + 3 * h11(i + 9)) * k * S * 1.5);
          if (blocked(dashPts[0], 0.5)) dashPts[0].y += 2.5; // keep them off the lens-to-seal line
          dashRib.set(i, dashPts);
        }
        dashRib.mesh.material.uniforms.uA.value = 0.8 * k;
      }
      // DETROIT SMASH print type trails the dash
      if (detroit) {
        const on = t > T.smash - 0.6 && t < T.smash + 0.4;
        detroit.mesh.visible = on;
        if (on) {
          P.copy(chest).addScaledVector(F, -2.2 * S).addScaledVector(R, 0.9 * S); P.y = seal.at[1] + 1.5 * S;
          detroit.u.uOrigin.value.copy(P); detroit.u.uSize.value.set(4.2 * S, 1.05 * S); detroit.u.uBack.value = 0.3; detroit.u.uA.value = sstep(T.smash - 0.6, T.smash - 0.45, t) * (1 - sstep(T.smash + 0.2, T.smash + 0.4, t));
          detroit.mesh.visible = !blocked(P, 1.6);
        }
      }
    }
    // starburst (3 frames, ones), red-black flash, speed lines (ones x3 then twos): backdrop cards on the fist
    for (const s of [flash, burst, lines]) { s.u.uAt.value.copy(fu); s.u.uAsp.value = asp; }
    burst.mesh.visible = fr >= 0 && fr < 3; burst.u.uInv.value = Math.floor(fr) % 2; burst.u.uSeed.value = Math.floor(fr);
    flash.mesh.visible = fr >= 3 && fr < 15; flash.u.uSeed.value = Math.floor(fr / 2); flash.u.uA.value = fr < 8 ? 1 : 1 - (fr - 8) / 7;
    lines.mesh.visible = fr >= 0 && fr < 30;
    if (lines.mesh.visible) {
      lines.u.uSeed.value = fr < 3 ? Math.floor(fr) : 3 + Math.floor(fr / 2);
      lines.u.uA.value = fr < 14 ? 1 : 1 - (fr - 14) / 16; lines.u.uR0.value = 0.12 + 0.5 * clamp01(fr / 30);
    }
    // shock dome 14 frames to 40 m + ground ring + debris + slabs
    {
      const k = (t - (T.smash + 2 / FPS)) / (14 / FPS), kk = clamp01(k), d = t - (T.smash + 2 / FPS);
      dome.visible = k >= 0 && k < 1.4; dome.position.set(seal.at[0], seal.at[1], seal.at[2]); dome.scale.setScalar(Math.max(0.5, 40 * easeOut(kk)));
      domeMat.uniforms.uK.value = clamp01(k - 0.1);
      ring.mesh.visible = k >= 0 && k < 1.1; ring.mesh.position.set(seal.at[0], seal.at[1] + 0.05, seal.at[2]);
      ring.u.uR.value = (40 * easeOut(kk)) / 42; ring.u.uW.value = (1.1 * (1 - 0.6 * kk)) / 42; ring.u.uA.value = 1 - kk * kk;
      const live = d >= 0 && d < 2.3;
      debris.mesh.visible = debris.hull.visible = slabs.mesh.visible = slabs.hull.visible = live;
      if (live) { flyChunks(debris, dRows, d, 14); flyChunks(slabs, sRows, d, 11); }
    }
    // One For All: five cyan arcs flick across the fist for 4 frames
    {
      const fi = Math.floor((t - T.ofa) * FPS), on = fi >= 0 && fi < 4;
      ofaRib.mesh.visible = on;
      if (on) for (let b = 0; b < 5; b++) {
        const a0 = h11(fi * 11 + b) * 6.28, a1 = a0 + 1.6 + h11(fi + b * 5);
        for (let j = 0; j < ofaPts; j++) {
          const u = j / (ofaPts - 1), a = a0 + (a1 - a0) * u, r = (0.28 + 0.15 * h11(b + fi * 3)) * S, jig = (h11(j * 7 + b * 13 + fi * 29) - 0.5) * 0.18 * S * Math.sin(Math.PI * u);
          ofaArr[j].copy(fist).addScaledVector(R, Math.cos(a) * r + jig).addScaledVector(F, jig); ofaArr[j].y += Math.sin(a) * r;
        }
        ofaRib.set(b, ofaArr);
      }
    }

    // ---- sky opens
    {
      const oa = sstep(0, 0.9, open) * (1 - 0.7 * sstep(5, 7, open)); // the column stays through the page tear, dimmer
      column.mesh.visible = oa > 0.01; pool.mesh.visible = oa > 0.01;
      if (oa > 0.01) {
        O.set(chest.x - cam.position.x, 0, chest.z - cam.position.z).normalize();
        column.u.uOrigin.value.set(chest.x + O.x * 14, seal.at[1], chest.z + O.z * 14); column.u.uSize.value.set(16, 150); column.u.uOff.value.set(0, 75);
        column.u.uA.value = 0.85 * oa; column.u.uTime.value = t;
        pool.mesh.position.set(chest.x + O.x * 14, seal.at[1] + 0.04, chest.z + O.z * 14); pool.mesh.scale.set(18, 18, 1); pool.u.uA.value = 0.5 * oa;
      }
      wash.mesh.visible = oa > 0.01; wash.u.uA.value = 0.55 * oa; wash.u.uAsp.value = asp; wash.u.uTime.value = t;
      // engine sun (light shafts), restored when scrubbed back
      const sun = ctx.engine.sun;
      if (sun && sun.set && sunHome) { if (open > 0) sun.set(0.25 * oa, 0.9, -0.35 * oa); else sun.copy(sunHome); }
      // storm clouds blasted into a spiral, turning to white cumulus
      const dayK = sstep(0, 1.4, open), cOn = open >= 0 && open < 3.4;
      for (let i = 0; i < NC; i++) {
        const c = clouds[i], cl = c.c;
        cl.mesh.visible = cOn; if (!cOn) continue;
        const rad = c.r0 + 38 * open * (1 + 0.3 * h11(i)), th = c.th + 0.35 * open * (1 + c.r0 / 40);
        cl.u.uOrigin.value.set(seal.at[0] + Math.cos(th) * rad, seal.at[1] + c.h, seal.at[2] + Math.sin(th) * rad);
        cl.u.uSize.value.set(c.s, c.s * 0.6);
        cl.u.uLit.value.copy(tmpC.copy(NIGHT[0]).lerp(DAY[0], dayK)); cl.u.uMid.value.copy(tmpC.copy(NIGHT[1]).lerp(DAY[1], dayK)); cl.u.uSh.value.copy(tmpC.copy(NIGHT[2]).lerp(DAY[2], dayK));
        cl.u.uA.value = sstep(0, 0.1, open) * (1 - sstep(1.8, 3.2, open));
      }
      // confetti flags after the cheer
      const cd = t - (T.skyopen + 2.2), con = cd >= 0 && cd < 4.5;
      conf.visible = con;
      if (con) {
        for (let i = 0; i < NCF; i++) {
          const c = cf[i], d = cd - i * 0.02;
          if (d < 0) { conf.setMatrixAt(i, ZERO); continue; }
          P.set(seal.at[0] + Math.cos(c.az) * (c.rad + c.vh * d), seal.at[1] + 0.5 + c.vu * d - 2.2 * d * d, seal.at[2] + Math.sin(c.az) * (c.rad + c.vh * d));
          if (P.y < seal.at[1] + 0.05 || blocked(P, 1)) { conf.setMatrixAt(i, ZERO); continue; }
          Q4.setFromEuler(EUL.set(c.sp * d + c.ph, c.sp * 0.7 * d, c.ph));
          const k = c.w * (0.35 + 0.65 * Math.abs(Math.sin(c.sp * d + c.ph))); Sc.set(k, k * 0.6, 1);
          M4.compose(P, Q4, Sc); conf.setMatrixAt(i, M4);
        }
        conf.instanceMatrix.needsUpdate = true;
      }
    }

    // ---- the page: border back, cracks, shards (two falls), issue box, fade at the credit
    {
      const bs = sstep(T.merge, T.merge + 0.35, t), fadeEnd = 1 - sstep(T.credit + 0.4, T.credit + 0.9, t);
      border.mesh.visible = bs > 0.01 && fadeEnd > 0.01;
      border.u.uAsp.value = asp; border.u.uShow.value = bs; border.u.uA.value = fadeEnd; border.u.uAt.value.copy(fu);
      border.u.uCrack.value = easeOut((t - T.crack) / 0.7);
      shard.u.uAsp.value = asp; shard.u.uTA.value = t - T.shardA; shard.u.uTB.value = t - T.shardB; shard.u.uAt.value.copy(fu);
      shard.mesh.visible = t > T.shardA && t < T.credit + 0.9;
      if (issue) {
        const on = bs > 0.5 && fadeEnd > 0.01; issue.mesh.visible = on;
        if (on) { const w = 0.26, h = (0.26 * 160) / 512, m = 0.03; issue.u.uRect.value.set(1 - (m + w) * 2 / asp, 1 - (m + h) * 2, 1 - (m * 2) / asp, 1 - m * 2); issue.u.uA.value = fadeEnd * bs; }
      }
    }

    // ---- gold motes (a trickle from the merge, full at the credit)
    {
      const a = sstep(T.merge + 0.5, T.merge + 1.5, t) * (0.35 + 0.65 * sstep(T.credit - 0.2, T.credit + 0.6, t));
      moteSet.pts.visible = a > 0.01; moteSet.u.uH.value = px; moteSet.u.uTime.value = t; moteSet.u.uShow.value = a;
      moteSet.u.uCenter.value.set(chest.x, seal.at[1], chest.z);
    }

    // ---- easter eggs
    {
      const k = sstep(1.0, 1.3, t) * (1 - sstep(T.smash, T.smash + 0.1, t));
      if (plusMesh) {
        P.copy(P0).addScaledVector(F, 3.4).addScaledVector(R, 2.4);
        const on = k > 0.01 && !blocked(P, 1.6);
        plusMesh.slab.visible = on; plusMesh.decal.mesh.visible = on;
        plusMesh.slab.position.set(P.x, P0.y + 0.12, P.z);
        plusMesh.decal.mesh.position.set(P.x, P0.y + 0.27, P.z); plusMesh.decal.u.uA.value = k;
      }
      if (sign) {
        P.copy(P0).addScaledVector(R, -6.5).addScaledVector(F, 4);
        sign.visible = t >= 1.0 && t < T.smash + 0.1 && !blocked(P, 1.5);
        sign.position.copy(P); sign.rotation.y = Math.atan2(cam.position.x - P.x, cam.position.z - P.z) * 0.5;
        sign.scale.setScalar(Math.max(1e-3, sstep(1.0, 1.15, t)));
      }
    }
    smear.update(t); benday.update(t);
  }

  function dispose() {
    const sun = ctx.engine.sun; if (sun && sunHome) sun.copy(sunHome);
    for (const o of disposables) o.dispose && o.dispose();
    for (const m of [debris.mesh, debris.hull, slabs.mesh, slabs.hull, conf]) m.dispose && m.dispose();
    smear.dispose(); benday.dispose();
  }
  return { group, update, dispose };
}
