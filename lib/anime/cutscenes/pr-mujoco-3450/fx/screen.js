// SCREEN-SPACE FX for pr-mujoco-3450: speed-lines (E09), the red-black impact card (E11 frame 3), sfx-lettering (E16, E19) and the wipe home.
// Every quad writes clip coordinates directly (no camera), so it is an overlay in the final frame; every fragment discards inside the
// SEAL'S SCREEN BOX (player.box, padded): owner law, nothing covers the seal. Clock rules: the f94-97 drawings run on ONES from the
// display clock (cue.t floored to 1/24), everything else on the stepped clock; all are pure functions of the clock (scrub == play).
// MATHS
//   screen space s = (ndc.x * aspect, ndc.y): one unit = half the frame height, so angles are true on any aspect
//   radial line i    theta_i = 2 pi (i + .7 h(i,seed)) / 24 + .3 h(seed);   r(a) = r0 + len a,  r0 in [.12,.40], len in [.6,1.6];  a in {0,.85,1}
//   width profile    half(a) = wmax {0, 1, .35}: a point at the head (the fist), full at 85 percent, a blunt tail  ("tapered both ends")
//                    wmax = .003 + .008 h  ndc units (1-4 px at 720p); ink edge +1.5 px; alternate: white on black edge / black on white edge
//   parallel line j  angle 33 deg, offset (h - .5) 2.6 across, centre (h - .5) 2.4 asp along, len .5 + .9 h; white on dark (pressure lines f75-93)
//   mint lines       4 of the radial set, #7ff0cf, only on the impact drawings (f94-97)
//   seed             radial: floor(24 t) in f93-97 (every drawing different), else floor(12 ts / 2) (re-thrown every 2 drawings); parallel likewise
//   impact card      40 radial wedges: cell = floor(40 a/2pi), black wedge width .25 + .4 h(cell) of the cell; tapered into the focus; core #fff1d8;
//                    6 px halftone dots in the corners (cell 6 px, radius .45 * cornerK); field #c0121f, ink #12070a
//   lettering        a canvas brush face (rough dabs + 5 px ink + 2 px white outer + 6 px drop), placed in s-space with scale/rot/shake
import { CanvasTexture, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, BufferGeometry, BufferAttribute, SRGBColorSpace, LinearFilter, Vector2 } from "three";
import { C, PAL, fr, clamp, lerp, easeOut3, sstep, hash, GLSL_HASH, SCREEN_V, GLSL_BOX } from "./util.js";

// --- speed lines ------------------------------------------------------------------------------------------------------------------------
const SL_V = `${GLSL_HASH}
attribute vec3 aS; attribute vec2 aI;
uniform float uSeed, uAsp, uEdge, uRad, uPar, uMintOn, uPx; uniform vec2 uF;
varying vec2 vUv; varying float vParity, vKind;
void main(){
  float id = aI.x, kind = aI.y, a = aS.x, prof = aS.z, sd = uSeed;
  vec2 q, dir; float wmax, on = 0.0;
  if (kind < 1.5) {                                              // radial (0) and mint (1)
    float th = ((id + 0.7 * h11(id + sd * 3.1)) / 24.0) * 6.28318 + 0.3 * h11(sd);
    dir = vec2(cos(th), sin(th));
    float r0 = 0.12 + 0.28 * h11(id * 1.7 + sd), len = 0.6 + 1.0 * h11(id * 2.3 + sd * 0.7);
    q = vec2(uF.x * uAsp, uF.y) + dir * (r0 + len * a);
    wmax = 0.003 + 0.008 * h11(id * 4.1 + sd);
    on = (kind < 0.5) ? step(h11(id * 5.1 + sd), uRad) : uMintOn;
    vParity = (kind < 0.5) ? mod(id, 2.0) : 2.0;
  } else {                                                       // parallel pressure lines
    float j = id - 28.0, ang = 0.576;
    dir = vec2(cos(ang), -sin(ang)); vec2 nr = vec2(sin(ang), cos(ang));
    float off = (h11(j * 3.3 + sd) - 0.5) * 2.6, al = (h11(j * 7.1 + sd * 1.3) - 0.5) * 2.4 * uAsp, len = 0.5 + 0.9 * h11(j * 2.9 + sd);
    q = nr * off + dir * (al + (a - 0.5) * len);
    wmax = 0.004 + 0.006 * h11(j * 6.3 + sd);
    on = uPar; vParity = 0.0;
  }
  float hw = wmax * prof + uEdge * uPx * 1.5 * step(0.01, prof + 0.5);
  q += vec2(-dir.y, dir.x) * aS.y * hw;
  vec2 ndc = vec2(q.x / uAsp, q.y);
  vUv = ndc * 0.5 + 0.5; vKind = kind;
  gl_Position = on > 0.5 ? vec4(ndc, 0.0, 1.0) : vec4(3.0, 3.0, 0.0, 1.0);
}`;
const SL_F = `${GLSL_BOX}
uniform float uEdge; uniform vec3 uWhite, uInk, uMint; varying vec2 vUv; varying float vParity, vKind;
void main(){
  if (inSeal(vUv)) discard;
  vec3 c;
  if (vKind > 0.5 && vKind < 1.5) c = uEdge > 0.5 ? uInk : uMint;
  else if (vParity < 0.5 || vParity > 1.5) c = uEdge > 0.5 ? uInk : uWhite;   // white on dark, ink edge
  else c = uEdge > 0.5 ? uWhite : uInk;                                       // black on light, white edge
  gl_FragColor = vec4(c, 1.0);
}`;

function speedLineGeo() {
  const rows = [[0, 0], [0.85, 1], [1, 0.35]], n = 46, pos = [], aS = [], aI = [], idx = [];
  for (let i = 0; i < n; i++) {
    const kind = i < 24 ? 0 : i < 28 ? 1 : 2, b = pos.length / 3;
    for (const [a, prof] of rows) for (const side of [-1, 1]) { pos.push(0, 0, 0); aS.push(a, side, prof); aI.push(i, kind); }
    for (let r = 0; r < 2; r++) { const k = b + r * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3)); g.setAttribute("aS", new BufferAttribute(new Float32Array(aS), 3)); g.setAttribute("aI", new BufferAttribute(new Float32Array(aI), 2));
  g.setIndex(idx); return g;
}

// --- impact card -----------------------------------------------------------------------------------------------------------------------
const CARD_F = `${GLSL_HASH}${GLSL_BOX}
uniform vec2 uF; uniform float uAsp; uniform vec3 uRed, uBlack, uHi; varying vec2 vUv;
void main(){
  if (inSeal(vUv)) discard;
  vec2 d = (vUv - uF) * vec2(uAsp, 1.0); float r = length(d), ang = atan(d.y, d.x);
  float cellf = ang / 6.28318 * 40.0, cell = floor(cellf), f = fract(cellf);
  float w = 0.25 + 0.4 * h11(cell), blk = step(0.5 - 0.5 * w, f) * step(f, 0.5 + 0.5 * w) * smoothstep(0.04, 0.22, r);
  vec3 c = mix(uRed, uBlack, blk);
  c = mix(uHi, c, smoothstep(0.03, 0.06, r));                                    // hot core
  vec2 g = fract(gl_FragCoord.xy / 6.0) - 0.5;                                   // halftone corners, cell 6 px
  float corner = smoothstep(0.62, 0.95, length(vUv - 0.5) * 1.55);
  if (length(g) < 0.45 * corner) c = uBlack;
  gl_FragColor = vec4(c, 1.0);
}`;

// --- lettering -------------------------------------------------------------------------------------------------------------------------
const LT_V = `uniform vec2 uC, uHalf; uniform float uScale, uRot, uAsp; varying vec2 vUv, vScr;
void main(){ vUv = position.xy * 0.5 + 0.5;
  vec2 p = position.xy * uHalf * uScale; float c = cos(uRot), s = sin(uRot); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  p += vec2(uC.x * uAsp, uC.y); vec2 ndc = vec2(p.x / uAsp, p.y); vScr = ndc * 0.5 + 0.5; gl_Position = vec4(ndc, 0.0, 1.0); }`;
const LT_F = `${GLSL_BOX}
uniform sampler2D uTex; uniform float uA, uCut; varying vec2 vUv, vScr;
void main(){ if (uCut > 0.5 && inSeal(vScr)) discard; vec4 t = texture2D(uTex, vUv); if (t.a * uA < 0.02) discard; gl_FragColor = vec4(t.rgb, t.a * uA); }`;
const WIPE_F = `${GLSL_BOX}
uniform float uK; uniform vec3 uInk, uCream; varying vec2 vUv;
void main(){ if (inSeal(vUv)) discard; float e = vUv.x + 0.3 * vUv.y - uK * 1.6 + 0.1; if (e > 0.0) discard; gl_FragColor = vec4(e > -0.012 ? uCream : uInk, 1.0); }`;

// brush face: rough dabs (seeded), ink 5 px, white outer 2 px, flat drop
function brushTexture(rows, w, h, rngv) {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d"); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  for (const r of rows) {
    g.font = `900 italic ${r.size}px Impact, "Arial Black", sans-serif`;
    const x = w / 2, y = r.y, d = r.drop ?? 6;
    if (r.dropCol) { g.fillStyle = r.dropCol; g.fillText(r.text, x + d, y + d); g.lineWidth = r.ink + 4; g.strokeStyle = r.dropCol; g.strokeText(r.text, x + d, y + d); }
    g.lineWidth = r.ink + 4 + (r.outer ?? 4); g.strokeStyle = "#ffffff"; g.strokeText(r.text, x, y);      // 2 px white outer
    g.lineWidth = r.ink; g.strokeStyle = PAL.ink; g.strokeText(r.text, x, y);                              // 5 px ink
    g.fillStyle = r.fill; g.fillText(r.text, x, y);
    for (let k = 0; k < 34; k++) {                                                                          // brush edge noise: ragged dabs on the fill edge
      const ox = (rngv() - 0.5) * r.size * r.text.length * 0.62, oy = (rngv() - 0.5) * r.size * 0.8;
      g.fillStyle = rngv() < 0.5 ? r.fill : PAL.ink; g.beginPath(); g.arc(x + ox, y + oy, 1.5 + rngv() * 3, 0, 6.2832); g.fill();
    }
  }
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.minFilter = LinearFilter; t.generateMipmaps = false; return t;
}

export function make(ctx, S) {
  const { T, F } = S, group = new Group(), disp = [];
  const rng = ctx.rng(77);
  const U0 = () => ({ uBox: S.uBox, uPad: { value: 0.012 } });
  const quad = new PlaneGeometry(2, 2); disp.push(quad);
  const add = (m, order) => { m.renderOrder = order; m.frustumCulled = false; group.add(m); return m; };

  // speed lines: ink pass then fill pass
  const sg = speedLineGeo(); disp.push(sg);
  const slU = (edge) => ({ ...U0(), uSeed: { value: 0 }, uAsp: { value: 1.78 }, uEdge: { value: edge }, uRad: { value: 0 }, uPar: { value: 0 }, uMintOn: { value: 0 }, uPx: { value: 2 / 720 }, uF: { value: new Vector2(0.2, 0.2) }, uWhite: { value: C("#ffffff") }, uInk: { value: C(PAL.ink) }, uMint: { value: C("#7ff0cf") } });
  const slMat = (edge) => { const m = new ShaderMaterial({ vertexShader: SL_V, fragmentShader: SL_F, uniforms: slU(edge), side: DoubleSide, transparent: false, depthTest: false, depthWrite: false }); disp.push(m); return m; };
  const slInk = add(new Mesh(sg, slMat(1)), 1000), slFill = add(new Mesh(sg, slMat(0)), 1001);

  // impact card (frame 3: red-black starburst); frames 1-2 (mono, inverted) belong to the engine's Impact (beat or registered below)
  const cardMat = new ShaderMaterial({ vertexShader: SCREEN_V, fragmentShader: CARD_F, uniforms: { ...U0(), uF: { value: new Vector2(0.5, 0.5) }, uAsp: { value: 1.78 }, uRed: { value: C(PAL.red) }, uBlack: { value: C(PAL.ink) }, uHi: { value: C(PAL.hot) } }, depthTest: false, depthWrite: false }); disp.push(cardMat);
  const card = add(new Mesh(quad, cardMat), 1010); card.visible = false;

  // lettering
  const mkLetter = (rows, w, h, halfH, cut) => {
    const tex = brushTexture(rows, w, h, rng); if (!tex) return null;
    const m = new ShaderMaterial({ vertexShader: LT_V, fragmentShader: LT_F, transparent: true, depthTest: false, depthWrite: false, uniforms: { ...U0(), uTex: { value: tex }, uC: { value: new Vector2() }, uHalf: { value: new Vector2(halfH * w / h, halfH) }, uScale: { value: 1 }, uRot: { value: 0 }, uA: { value: 0 }, uAsp: { value: 1.78 }, uCut: { value: cut ? 1 : 0 } } });
    const mesh = add(new Mesh(quad, m), 1020); mesh.visible = false; disp.push(m, tex); return { mesh, m };
  };
  const sfx = (re) => (ctx.scene.sfx ?? []).some((s) => re.test(s.text ?? "")) ; // the direction layer already placed it as overlay lettering: do not double up
  const doom = sfx(/doom/i) ? null : mkLetter([{ text: "DOOM", size: 250, y: 150, fill: PAL.yellow, ink: 14, outer: 6, drop: 12, dropCol: PAL.red }], 1024, 300, 0.257, false);
  const zzz = sfx(/zzz/i) ? null : mkLetter([{ text: "ZZZ", size: 150, y: 100, fill: PAL.coral, ink: 9, outer: 4, drop: 5, dropCol: PAL.ink }], 512, 200, 0.16, false);
  const num = sfx(/15,?361/) ? null : mkLetter([{ text: "15,361x", size: 215, y: 120, fill: PAL.mint, ink: 14, outer: 5, drop: 8, dropCol: PAL.ink }, { text: "fewer probes", size: 84, y: 300, fill: "#f6f1e4", ink: 8, outer: 3, drop: 4, dropCol: PAL.ink }], 1024, 380, 0.24, true);

  // wipe home
  const wipeMat = new ShaderMaterial({ vertexShader: SCREEN_V, fragmentShader: WIPE_F, uniforms: { ...U0(), uK: { value: 0 }, uInk: { value: C(PAL.ink) }, uCream: { value: C("#f6f1e4") } }, depthTest: false, depthWrite: false }); disp.push(wipeMat);
  const wipe = add(new Mesh(quad, wipeMat), 1030); wipe.visible = false;

  const px = () => 2 / S.resH.value;
  const t24 = (t) => Math.floor(t * 24 + 1e-6) / 24;
  return {
    group,
    update(ts, dt, cue) {
      const asp = ctx.aspect(), t = cue.t, pxn = px(), TP = T.TP;
      for (const m of [slInk.material, slFill.material]) {
        const u = m.uniforms; u.uAsp.value = asp; u.uPx.value = pxn;
        u.uF.value.set(S.fist.x, S.fist.y);
        // seeds: ones around the strike, else re-thrown every 2 drawings
        const ones = t >= T.rad0 && t < TP + fr(4);
        u.uSeed.value = (ones ? Math.floor(t * 24 + 1e-6) : Math.floor(ts * 12 / 2)) + 1;
        // radial: on f93-114, density falls off after f100; parallel: f75-93
        const rk = (t - T.rad0) / (T.rad1 - T.rad0), rOn = t >= T.rad0 && t < T.rad1;
        u.uRad.value = rOn ? lerp(1, 0.55, sstep(0.3, 1, rk)) : 0;
        u.uMintOn.value = (t >= TP && t < TP + fr(4)) ? 1 : 0;
        u.uPar.value = (t >= T.par0 && t < T.par1) ? 1 : 0;
      }
      slInk.visible = slFill.visible = (slFill.material.uniforms.uRad.value > 0 || slFill.material.uniforms.uPar.value > 0);
      // the red-black card: f96-97 (2 drawings), exactly on the display clock
      card.visible = t >= T.card0 - 1e-6 && t < T.card1 - 1e-6;
      cardMat.uniforms.uAsp.value = asp; cardMat.uniforms.uF.value.set(S.fist.x * 0.5 + 0.5, S.fist.y * 0.5 + 0.5);
      // DOOM: pops f94 at 140 percent -> 100 percent by f98 (ones), shake +-3 px on twos for 12 frames, out f120
      if (doom) {
        const a = t24(t) - TP, on = a >= -1e-6 && a < fr(26);
        doom.mesh.visible = on;
        if (on) {
          const u = doom.m.uniforms, sh = a < fr(12) ? 3 * pxn : 0, hs = Math.floor(ts * 12);
          u.uScale.value = lerp(1.4, 1, easeOut3(a / fr(4))) * (1 - 0.25 * sstep(fr(22), fr(26), a));
          u.uC.value.set(0.5 + (hash(hs) - 0.5) * 2 * sh / 1, 0.58 + (hash(hs + 9) - 0.5) * 2 * sh); u.uRot.value = 8 * Math.PI / 180; u.uAsp.value = asp;
          u.uA.value = 1 - sstep(fr(22), fr(26), a);
        }
      }
      // ZZZ rumble: small coral brush, shot 2 (f43-72), a tremor on twos
      if (zzz) {
        const a = ts - T.rays, on = a >= 0 && a < T.wind - T.rays - fr(3);
        zzz.mesh.visible = on;
        if (on) { const u = zzz.m.uniforms, hs = Math.floor(ts * 12); u.uC.value.set(0.55 + (hash(hs) - 0.5) * 4 * pxn, 0.62 + (hash(hs + 5) - 0.5) * 4 * pxn); u.uRot.value = -5 * Math.PI / 180; u.uAsp.value = asp; u.uScale.value = 1 + 0.04 * Math.sin(ts * 14); u.uA.value = sstep(0, 0.2, a) * (1 - sstep(0.8, 1, a / (T.wind - T.rays))); }
      }
      // number card: ones for 3 drawings (135 -> 118 -> 107 percent), settle, hold to f320, out in 6 frames
      if (num) {
        const a = t24(t) - T.num, on = a >= -1e-6 && t < T.numEnd;
        num.mesh.visible = on;
        if (on) {
          const u = num.m.uniforms, s = a < fr(1) ? 1.35 : a < fr(2) ? 1.18 : a < fr(3) ? 1.07 : 1;
          u.uScale.value = s; u.uC.value.set(-0.56, -0.38); u.uRot.value = 0; u.uAsp.value = asp; u.uA.value = 1 - sstep(T.numEnd - fr(6), T.numEnd, t);
        }
      }
      // wipe home f330-336
      const kw = (t - T.wipe) / fr(6);
      wipe.visible = kw >= 0; wipeMat.uniforms.uK.value = clamp(kw);
    },
    dispose() { for (const o of disp) o.dispose?.(); },
  };
}
