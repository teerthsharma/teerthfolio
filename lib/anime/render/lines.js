// S3 LINE ART: a G-buffer from depth (view normal xy, linear depth, id; +2 on the id where the normal's z is negative), then one
// edge pass that inks silhouette / occlusion and id boundaries 2r wide on their nearer side and creases r either side (r the
// per-pixel half-width), writing coverage (r), kind (g: 0 silhouette, 0.5 id, 1 crease) and the character flag (b) into RGBA8.
// A character also takes a line where its flat paint (tPaint, alpha 0.5 where valid) changes sharply: belly, collar, trim.
import { FloatType, HalfFloatType, LinearFilter, Matrix4, NearestFilter, UnsignedByteType, Vector2, Vector3, Vector4, WebGLRenderTarget } from "three";
import { Quad } from "./pass.js";
import { RX } from "./common.glsl.js";

// set, setW, setDepth are the style's set-line strength, width and depth gain (base.lines values), for non-character pixels
export const LINE_DEFAULTS = { w: 1.9, wCrease: 0.55, taper: 0.6, lightThin: 0.66, distThin: 0.5, creaseDeg: 32, depthK: 1, on: 1, set: 0.85, setW: 1, setDepth: 1, paint: 0.06 };

const GBUF = /* glsl */ `
  uniform sampler2D tCol; uniform sampler2D tDepth; uniform mat4 uInvProj; uniform vec2 uPx; varying vec2 vUv;
  ${RX}
  void main() {
    float d = texture2D(tDepth, vUv).r, id = texture2D(tCol, vUv).a;
    if (d >= 1.0 || id < 0.0005) { gl_FragColor = vec4(0.0, 0.0, -1.0, -1.0); return; }
    vec3 N = rxNormal(tDepth, clamp(vUv, 1.5 * uPx, 1.0 - 1.5 * uPx), uPx, uInvProj);
    gl_FragColor = vec4(N.xy, -rxViewPos(vUv, d, uInvProj).z, id + 2.0 * step(N.z, 0.0));
  }`;

const EDGE = /* glsl */ `
  uniform sampler2D tG; uniform vec2 uPx; uniform vec2 uAsp; uniform vec4 uRay; uniform vec3 uLightV; uniform float uSeed;
  uniform vec4 uW; uniform vec4 uK; uniform vec2 uN; uniform float uZq; uniform vec3 uSet; uniform sampler2D tPaint; uniform float uPaint; varying vec2 vUv;
  ${RX}
  vec3 viewAt(vec2 uv, float z) { return vec3((uv * 2.0 - 1.0 + uRay.zw) * uRay.xy * z, -z); }
  vec4 gAt(vec2 uv, out vec3 N) {
    vec4 g = texture2D(tG, uv);
    float b = step(1.5, g.w);
    N = vec3(g.xy, (1.0 - 2.0 * b) * sqrt(max(1.0 - dot(g.xy, g.xy), 0.0)));
    g.w -= 2.0 * b;
    return g;
  }
  float radius(float base, float ds) { return max(base * ds, min(base, 0.6)); }
  vec2 spanOf(float R) { float lo = max(R - 0.5, 0.5); return vec2(lo, max(R + 0.5 - lo, 0.0)); }
  float quiet(float id) { return step(0.98, id) * step(id, 0.999); }
  float gHull = 0.0; // a character's own ink hull lies within reach: the hull is the line there
  float graze(vec3 P, vec3 N, float id) { return id < 0.98 ? smoothstep(0.015, 0.08, dot(N, -normalize(P))) : 1.0; }
  // the line sits on the nearer surface, 2r wide: x a farther surface (faded where the centre is seen edge-on), an ink hull
  // behind, or empty; y an id edge (coplanar: the higher id); z a crease, both sides
  vec3 tapAt(vec2 uv, vec3 P0, vec3 N0, float z0, float id0, float dk, float gz0) {
    vec3 N;
    vec4 g = gAt(uv, N);
    // against the sky a far set seen edge-on (the horizon) draws nothing; a character's own hull is its line already
    if (g.z <= 0.0) return vec3(id0 < 0.98 ? mix(1.0, gz0, smoothstep(25.0, 45.0, z0)) : 1.0, 0.0, 0.0);
    if (quiet(g.w) > 0.5) { if (id0 >= 0.98) gHull = 1.0; return vec3(id0 < 0.98 ? step(z0, g.z * 1.002 + 0.002) : 0.0, 0.0, 0.0); }
    vec3 D = viewAt(uv, g.z) - P0;
    float s = smoothstep(0.0015, 0.0045, max(abs(dot(N0, D)), abs(dot(N, D))) / z0 * dk);
    float c = (1.0 - smoothstep(uK.y - 0.02, uK.y + 0.02, dot(N0, N))) * (1.0 - s);
    float own = mix(step(z0, g.z), step(g.w, id0), step(abs(g.z - z0), 0.002 * z0 + 0.002));
    return vec3(s * step(z0, g.z) * gz0, step(0.004, abs(g.w - id0)) * own * gz0, c);
  }
  void main() {
    vec3 N0 = vec3(0.0);
    vec4 g0 = vec4(-1.0);
    if (uK.w > 0.5) g0 = gAt(vUv, N0);
    if (g0.z <= 0.0 || quiet(g0.w) > 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    float z0 = g0.z, id0 = g0.w, st = 1.0 - step(0.98, id0);
    vec3 P0 = viewAt(vUv, z0);
    float gz0 = graze(P0, N0, id0), dk = uK.z * mix(1.0, 2.5 * uSet.z, st), w0 = uW.x * mix(1.0, uSet.y, st);
    vec2 q = vUv * uAsp * 16.0;
    float n = mix(rxNoise(q + uSeed * vec2(0.13, 0.07)), rxNoise(q * 2.3 + vec2(rxHash(vec2(uSeed, 1.7)), rxHash(vec2(uSeed, 9.2))) * 97.0), 0.4);
    float kl = dot(N0, uLightV);
    float base = w0 * (1.0 + uW.z * clamp((n - 0.5) * 4.0, -1.0, 1.0)) * (1.0 - uW.w * kl * (kl > 0.0 ? 1.0 : 1.6));
    float ds = mix(1.0, clamp(6.0 / z0, 0.0, 1.0), uK.x);
    float r = min(radius(base, ds), 1.8 * w0), rc = radius(base * uW.y, ds);
    vec2 s2 = spanOf(2.0 * r), s3 = spanOf(rc);
    vec3 mn = vec3(0.0), m0 = vec3(0.0), m1 = vec3(0.0);
    float thin = 0.0, f0 = 0.5 / uN.y, f1 = 1.5 / uN.y, cP = 0.0, rp = max(rc, 0.75);
    vec4 p0 = uPaint > 0.0 && st < 0.5 ? texture2D(tPaint, vUv) : vec4(0.0);
    for (int i = 0; i < 8; i++) {
      if (float(i) >= uN.x) break;
      float a = float(i) * 6.2831853 / uN.x;
      vec2 dir = vec2(cos(a), sin(a)) * uPx;
      if (abs(p0.a - 0.5) < 0.02) { // on the darker fill, and only a sharp step: most of the change over 3 rp happens within rp
        vec4 p1 = texture2D(tPaint, vUv + dir * rp);
        float d1 = distance(p0.rgb, p1.rgb), d2 = distance(p0.rgb, texture2D(tPaint, vUv + dir * rp * 3.0).rgb);
        if (abs(p1.a - 0.5) < 0.02 && d1 > 0.55 * d2 && rxLuma(p0.rgb) <= rxLuma(p1.rgb)) cP = max(cP, smoothstep(uPaint, 3.0 * uPaint, d1));
      }
      vec3 t = tapAt(vUv + dir, P0, N0, z0, id0, dk, gz0);
      // a character sliver at most 2 px across is a drawn ribbon (whiskers) the MSAA depth resolve keeps only every few px
      if (st < 0.5 && t.x > 0.0) thin = max(thin, t.x * tapAt(vUv - dir * 2.3, P0, N0, z0, id0, dk, 1.0).x);
      mn = max(mn, t);
      m0 = max(m0, vec3(tapAt(vUv + dir * (s2.x + s2.y * f0), P0, N0, z0, id0, dk, gz0).xy, tapAt(vUv + dir * (s3.x + s3.y * f0), P0, N0, z0, id0, dk, gz0).z));
      if (uN.y > 1.5) m1 = max(m1, vec3(tapAt(vUv + dir * (s2.x + s2.y * f1), P0, N0, z0, id0, dk, gz0).xy, tapAt(vUv + dir * (s3.x + s3.y * f1), P0, N0, z0, id0, dk, gz0).z));
    }
    float r2 = min(2.0 * r, 1.0);
    vec3 cov = max(mn * vec3(r2, r2, min(rc, 1.0)), (uN.y > 1.5 ? 0.5 * (m0 + m1) : m0) * vec3(s2.y, s2.y, s3.y)) * (1.0 - thin);
    cov *= 1.0 - gHull;
    float cS = cov.x, cI = cov.y, cC = cov.z * (1.0 - smoothstep(0.1, 0.25, z0 * uZq));
    cC = max(cC, cP);
    float cv = max(cS, max(cI, cC));
    // a far set's lines lighten with distance, so a wall of small facets does not close into a hatch
    gl_FragColor = vec4(cv * mix(1.0, uSet.x * clamp(10.0 / z0, 0.3, 1.0), st), cS >= cv ? 0.0 : (cI >= cC ? 0.5 : 1.0), 1.0 - st, 1.0);
  }`;

export class LinePass {
  constructor(renderer, { tier = 2 } = {}) {
    this.r = renderer;
    this.tier = tier;
    this.params = { ...LINE_DEFAULTS };
    this.quad = new Quad(renderer);
    // ponytail: without a float colour buffer the pass writes an empty buffer; a packed RGBA8 G-buffer would restore lines there
    const f32 = renderer.extensions.has("EXT_color_buffer_float");
    this.ok = f32 || renderer.extensions.has("EXT_color_buffer_half_float");
    this.g = new WebGLRenderTarget(4, 4, { type: f32 ? FloatType : HalfFloatType, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false });
    this.gu = { tCol: { value: null }, tDepth: { value: null }, uInvProj: { value: new Matrix4() }, uPx: { value: new Vector2(0.25, 0.25) } };
    this.eu = {
      tG: { value: this.g.texture }, uPx: { value: new Vector2(0.25, 0.25) }, uAsp: { value: new Vector2(1, 1) }, uRay: { value: new Vector4(1, 1, 0, 0) },
      uLightV: { value: new Vector3() }, uSeed: { value: 0 }, uW: { value: new Vector4() }, uK: { value: new Vector4() }, uN: { value: new Vector2(8, 2) }, uZq: { value: 0 },
      uSet: { value: new Vector3(1, 1, 1) }, tPaint: { value: null }, uPaint: { value: 0 },
    };
    this.mG = this.quad.material(GBUF, this.gu);
    this.mE = this.quad.material(EDGE, this.eu);
    this.made = [];
    this.w = 4; this.h = 4;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.g);
    for (const m of [this.mG, this.mE]) { this.quad.mesh.material = m; renderer.compile(this.quad.scene, this.quad.cam); }
    renderer.setRenderTarget(prev);
  }
  setSize(w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.g.setSize(w, h);
    for (const t of this.made) t.setSize(w, h);
  }
  target() {
    const t = new WebGLRenderTarget(this.w, this.h, { type: UnsignedByteType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
    this.made.push(t);
    return t;
  }
  render({ tCol, tDepth, camera, target, lightDir = null, seed = 0, tPaint = null }) {
    const r = this.r, prev = r.getRenderTarget(), p = this.params, e = this.eu;
    const w = target.width, h = target.height;
    e.uK.value.set(p.distThin, Math.cos(p.creaseDeg * Math.PI / 180), p.depthK, p.on > 0 && this.ok ? 1 : 0);
    if (e.uK.value.w > 0) {
      this.g.setSize(w, h);
      const g = this.gu;
      g.tCol.value = tCol; g.tDepth.value = tDepth;
      g.uInvProj.value.copy(camera.projectionMatrixInverse); g.uPx.value.set(1 / w, 1 / h);
      this.quad.draw(this.mG, this.g);
      const P = camera.projectionMatrix.elements;
      e.uPx.value.set(1 / w, 1 / h); e.uAsp.value.set(w / h, 1);
      e.uRay.value.set(1 / P[0], 1 / P[5], P[8], P[9]);
      if (lightDir) e.uLightV.value.copy(lightDir).transformDirection(camera.matrixWorldInverse); else e.uLightV.value.set(0, 0, 0);
      e.uSeed.value = ((seed % 251) + 251) % 251;
      e.uW.value.set(p.w * h / 1080, p.wCrease, p.taper, p.lightThin);
      e.uSet.value.set(Math.min(1, Math.max(0, p.set ?? 1)), p.setW ?? 1, p.setDepth ?? 1);
      e.tPaint.value = tPaint; e.uPaint.value = tPaint ? p.paint ?? 0 : 0;
      const hi = this.tier >= 2;
      e.uN.value.set(hi ? 8 : 4, hi ? 2 : 1);
      e.uZq.value = (camera.far - camera.near) / (camera.far * camera.near) * 2 ** -24 * P[5] * h / 2;
    }
    this.quad.draw(this.mE, target);
    r.setRenderTarget(prev);
  }
  dispose() {
    this.g.dispose();
    this.mG.dispose(); this.mE.dispose();
    this.quad.mesh.geometry.dispose();
    this.made.length = 0;
  }
}
