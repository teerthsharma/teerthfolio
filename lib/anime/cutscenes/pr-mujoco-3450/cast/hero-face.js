// HERO SERIOUS FACE (E06). The locked pup is never restyled: this is a decal quad laid on the head surface (the same device as
// anime-eye-decal) that is attached to the seal's body with seal.attach(), so it rides every pose. It draws, in head-local metres:
//   shadow  a hard-edged brow shadow in the pup's own fur shadow colour (#a9a8b6) that covers the painted eyes; its lower edge drops
//           with uShade (0.3 at the crouch to 0.7 at the punch: "face 70 percent shadowed")
//   eyes    two flat dark dots (0.017 x 0.011 m) with ONE white highlight upper-left (luma 0.9, under the 0.92 cap)
//   brow    a thick tapered slash, inner end low (a frown); uStep alone gives the thin "narrowed one step" brow of f41-72
//   hatch   3 diagonal cheek ticks each side, f78-f93 only
//   vein    ONE cross-vein mark on the brow (four L brackets about a centre), pops at f78
//   mouth   a flat tight line over a muzzle-cream patch
// Distance to a tapered segment:  h = clamp((p-a).(b-a)/|b-a|^2, 0, 1);  d = |p-a-(b-a)h|;  inside when d < mix(w0, w1, h).
// Hard cel edges: coverage = step(d, w) (no feather), antialiased by fwidth. Output alpha 1 (a character pixel, hull and set lines skip it),
// nothing brighter than 0.9 luma, never emissive.
import { sm, win } from "./timeline.js";

export function buildHeroFace(ctx, T) {
  const { THREE } = ctx;
  const head = { c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] };
  const COLS = 24, ROWS = 20, X0 = -0.215, X1 = 0.215, Y0 = 0.43, Y1 = 0.73;
  const pos = [], hp = [], idx = [];
  for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= COLS; i++) {
    const x = X0 + (X1 - X0) * (i / COLS), y = Y0 + (Y1 - Y0) * (j / ROWS);
    const f = ctx.kit.faceOnHead(head, x, y, 0.0045);
    pos.push(f.p.x, f.p.y, f.p.z); hp.push(x, y);
  }
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) { const a = j * (COLS + 1) + i, b = a + 1, c = a + COLS + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aH", new THREE.Float32BufferAttribute(hp, 2));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    uniforms: {
      uStep: { value: 0 }, uK: { value: 0 }, uShade: { value: 0 }, uHatch: { value: 0 }, uVein: { value: 0 }, uMouth: { value: 0 },
      uShadeCol: { value: new THREE.Color("#a9a8b6") }, uInk: { value: new THREE.Color("#12070a") }, uHi: { value: new THREE.Color("#ececec") },
      uHatchCol: { value: new THREE.Color("#2a2230") }, uVeinCol: { value: new THREE.Color("#8a1a20") }, uCream: { value: new THREE.Color("#f4e7cc") },
    },
    vertexShader: "attribute vec2 aH; varying vec2 vH; void main() { vH = aH; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      varying vec2 vH;
      uniform float uStep, uK, uShade, uHatch, uVein, uMouth;
      uniform vec3 uShadeCol, uInk, uHi, uHatchCol, uVeinCol, uCream;
      // tapered segment coverage: half-width w0 at a, w1 at b, hard edge
      float seg(vec2 p, vec2 a, vec2 b, float w0, float w1) {
        vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        float d = length(pa - ba * h), w = mix(w0, w1, h), aa = fwidth(d) * 0.75;
        return 1.0 - smoothstep(w - aa, w + aa, d);
      }
      float ell(vec2 p, vec2 c, vec2 r) { float d = length((p - c) / r); return 1.0 - smoothstep(1.0 - fwidth(d), 1.0 + fwidth(d), d); }
      void main() {
        vec2 p = vH; float sx = abs(p.x), side = p.x < 0.0 ? -1.0 : 1.0;
        vec3 col = vec3(0.0); float a = 0.0;
        // 1. brow shadow: hard crescent between lo(x) and hi(x); uK opens it from the eye line outward; uShade drops the lower edge
        float q = pow(sx / 0.21, 2.0);
        float lo = 0.505 - 0.08 * uShade + 0.03 * q, hi = 0.662 - 0.045 * q;
        lo = mix(0.583, lo, uK); hi = mix(0.567, hi, uK);
        float band = (p.y > lo && p.y < hi && sx < 0.21 && uK > 0.001) ? 1.0 : 0.0;
        col = mix(col, uShadeCol, band); a = max(a, band);
        // 2. dot eyes (flat, narrowed) + one white highlight upper-left
        vec2 ec = vec2(side * 0.122, 0.572);
        float dotE = ell(p, ec, vec2(0.017, 0.011) * (0.4 + 0.6 * uK)) * step(0.001, uK);
        col = mix(col, uInk, dotE); a = max(a, dotE);
        float hl = ell(p, ec + vec2(-0.006, 0.005), vec2(0.0038)) * step(0.6, uK) * dotE;
        col = mix(col, uHi, hl);
        // 3. brow slash: inner (low) to outer (high); the thin step brow is half weight
        float bw = max(uStep * 0.5, uK);
        float brow = seg(p, vec2(side * 0.045, 0.606), vec2(side * 0.19, 0.650), 0.0075 * bw, 0.0035 * bw) * step(0.001, bw);
        col = mix(col, uInk, brow); a = max(a, brow);
        // 4. cheek hatch: three diagonal ticks each side
        float hat = 0.0;
        for (int i = 0; i < 3; i++) { float fi = float(i); hat = max(hat, seg(p, vec2(side * 0.115, 0.462 + fi * 0.018), vec2(side * 0.185, 0.496 + fi * 0.018), 0.0019, 0.0011)); }
        hat *= step(0.001, uHatch) * step(0.0, 0.205 - sx);
        col = mix(col, uHatchCol, hat); a = max(a, hat);
        // 5. the cross-vein: four L brackets about (0.095, 0.69), rotated 0/90/180/270
        float vn = 0.0; vec2 vc = vec2(0.095, 0.690);
        for (int k = 0; k < 4; k++) {
          float ang = 1.5707963 * float(k), cs = cos(ang), sn = sin(ang); mat2 R = mat2(cs, sn, -sn, cs);
          vec2 A = R * vec2(0.004, 0.006), B = R * vec2(0.017, 0.006), C = R * vec2(0.004, 0.019);
          vn = max(vn, max(seg(p - vc, A, B, 0.0016, 0.0009), seg(p - vc, A, C, 0.0016, 0.0009)));
        }
        vn *= step(0.5, uVein) * step(0.0, p.x);   // the right brow only
        col = mix(col, uVeinCol, vn); a = max(a, vn);
        // 6. tight flat mouth over a cream patch that hides the painted smile
        float patch = (sx < 0.046 && p.y > 0.433 && p.y < 0.469 && uMouth > 0.5) ? 1.0 : 0.0;
        col = mix(col, uCream, patch); a = max(a, patch);
        float mth = seg(p, vec2(-0.034, 0.452), vec2(0.034, 0.452), 0.0028, 0.0028) * step(0.5, uMouth);
        col = mix(col, uInk, mth); a = max(a, mth);
        if (a < 0.5) discard;
        gl_FragColor = vec4(min(col, vec3(0.92)), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  mesh.visible = false;
  mesh.frustumCulled = false;
  const u = mat.uniforms;
  return {
    mesh,
    // t: the stepped clock; the face is a pure function of it
    update(t) {
      const { TP, at, crouch, born } = T;
      const rel = 1 - sm(win(t, at(101), at(135)));                 // the release: eyes return to normal dots by f135
      const step = sm(win(t, born, born + 0.33)) * 0.55 * (t < TP ? 1 : rel);   // f41-72: the brow narrows one step
      const k = sm(win(t, crouch, crouch + 8 / T.F)) * rel;            // f70-78 the serious overlay opens, held through the punch
      u.uStep.value = step; u.uK.value = k;
      u.uShade.value = (0.3 + 0.4 * sm(win(t, at(78), TP))) * (k > 0 ? 1 : 0); // 0.3 -> 0.7 shadowed
      u.uHatch.value = sm(win(t, at(78), at(78.8))) * (1 - sm(win(t, at(93), at(95))));
      u.uVein.value = t >= at(78) ? rel : 0;                           // pops at f78, leaves with the release
      u.uMouth.value = k > 0.5 ? 1 : 0;
      mesh.visible = k > 0.001 || step > 0.001;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
