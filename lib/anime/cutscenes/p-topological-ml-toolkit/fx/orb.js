// PLASMA ORB -> SOAP BUBBLE (bible 3.10, 3.11, 6; shots 5-7): the wind seized into a posterised plasma, resolved into a thin-film bubble round
// the gold grid, then released upward with trailing arcs. The lattice, the grid cells and the pop live in impacts.js / arrows.js.
//
// ORB shader (posterised, 3 tones + violet shell + ink arcs). Fragment, with N the view-space normal and V the view direction:
//   f   = clamp(N . V, 0, 1)                       facing: 1 at the centre of the disc, 0 on the limb
//   rad = sqrt(1 - f^2)                            radial coordinate 0 .. 1
//   lv  = 0.85 f + 0.35 (vn3(obj * 3 + seed) - 0.5)   posterise input, re-randomised on twos by `seed`
//   tone = lv > 0.62 ? core #f8fdff : lv > 0.30 ? mid #80dcff : edge #2a6bff        (three hard bands, no gradient)
//   violet shell: where rad > 0.8 and vn3(obj * 3.2 + 1.31 seed) > 0.58 (about 25% of the limb) the tone becomes #b04dff
//   veins: |vn3(obj * 6 + 0.7 seed) - 0.5| < 0.03 inside lv > 0.3 gives #e6f4ff
// The orb is ink-hulled (back-face shell 1.07x in #1d3f9a) and pulses +-3.5% every 0.08 s; four jagged #e6f4ff arcs are redrawn every two frames.
// Radius: grows 0 -> 1.55 m over 5.8 - 7.7 s (compress), shrinks to a nucleus over 7.95 - 8.7 s while the bubble takes over.
//
// BUBBLE shader (fresnel thin film). fres = (1 - |N . V|)^2.5
//   th   = 1.6 fres + 0.5 vn3(obj * 2 + 0.05 t)          film thickness phase
//   film = 0.62 + 0.38 cos(2 pi (vec3(0, 0.33, 0.67) + th)), posterised to 6 steps, mixed 25% toward #e0f2ff at the rim only
//   alpha = mix(0.22, 1, fres); one hard highlight crescent in view space at L = (-0.45, 0.65, 0.62) and a small second glint.
// Radius 1.55 m x (1 + 0.12 resolve + 0.20 release).
import { HEX, rgb, hash, smooth, easeOut, makeStrips } from "./util.js";

const NOISE = /* glsl */ `
float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn3(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;
const VS = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying vec3 vObj;
void main(){
  vObj = normal;
  vN = normalize(normalMatrix * normal);                    // view-space normal
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);                                  // view-space direction to the eye
  gl_Position = projectionMatrix * mv;
}`;

export default function build(ctx, env) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 48, 32);
  const col = (h) => new THREE.Color(h);

  const orbMat = new THREE.ShaderMaterial({
    transparent: true, uniforms: { uSeed: { value: 0 }, uAlpha: { value: 1 }, uPulse: { value: 0 }, cCore: { value: col(HEX.plasmaCore) }, cMid: { value: col(HEX.plasmaMid) }, cEdge: { value: col(HEX.plasmaEdge) }, cVio: { value: col(HEX.violet) }, cVein: { value: col(HEX.vein) } },
    vertexShader: VS,
    fragmentShader: /* glsl */ `${NOISE}
      uniform float uSeed, uAlpha, uPulse; uniform vec3 cCore, cMid, cEdge, cVio, cVein;
      varying vec3 vN; varying vec3 vV; varying vec3 vObj;
      void main(){
        float f = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        float rad = sqrt(1.0 - f * f);
        float lv = 0.85 * f + 0.35 * (vn3(vObj * 3.0 + uSeed) - 0.5) + 0.05 * uPulse;
        vec3 c = lv > 0.62 ? cCore : (lv > 0.30 ? cMid : cEdge);
        float vio = step(0.8, rad) * step(0.58, vn3(vObj * 3.2 + 1.31 * uSeed));
        c = mix(c, cVio, vio);
        float vein = 1.0 - smoothstep(0.0, 0.03, abs(vn3(vObj * 6.0 + 0.7 * uSeed) - 0.5));
        c = mix(c, cVein, vein * step(0.30, lv));
        gl_FragColor = vec4(min(c, vec3(0.98)), uAlpha);
      }`,
  });
  const hullMat = new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, uniforms: { uAlpha: { value: 1 }, cInk: { value: col(HEX.ink) } }, vertexShader: /* glsl */ `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: /* glsl */ `uniform float uAlpha; uniform vec3 cInk; void main(){ gl_FragColor = vec4(cInk, uAlpha); }` });
  const orb = new THREE.Mesh(geo, orbMat), hull = new THREE.Mesh(geo, hullMat);
  orb.frustumCulled = hull.frustumCulled = false; hull.renderOrder = 7; orb.renderOrder = 8;

  const bubMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uAlpha: { value: 1 }, cRim: { value: col(HEX.film) } },
    vertexShader: VS,
    fragmentShader: /* glsl */ `${NOISE}
      uniform float uT, uAlpha; uniform vec3 cRim;
      varying vec3 vN; varying vec3 vV; varying vec3 vObj;
      void main(){
        vec3 N = normalize(vN); float f = abs(dot(N, normalize(vV)));
        float fres = pow(1.0 - f, 2.5);
        float th = 1.6 * fres + 0.5 * vn3(vObj * 2.0 + uT * 0.05);
        vec3 film = 0.62 + 0.38 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + th));
        film = floor(film * 6.0 + 0.5) / 6.0;                                   // posterised, cel
        film = mix(film, cRim, 0.25 * smoothstep(0.7, 1.0, 1.0 - f));          // 25% toward the rim tint, rim only
        vec3 L = normalize(vec3(-0.45, 0.65, 0.62));
        float hl = step(0.955, dot(N, L));                                      // the one hard highlight
        float g2 = step(0.985, dot(N, normalize(vec3(0.5, -0.6, 0.6))));        // a small second glint
        vec3 o = mix(film, vec3(1.0), max(hl, g2 * 0.8));
        float a = mix(0.22, 1.0, fres) * uAlpha;
        a = max(a, max(hl, g2 * 0.8) * uAlpha);
        gl_FragColor = vec4(min(o, vec3(0.98)), a);
      }`,
  });
  const bub = new THREE.Mesh(geo, bubMat); bub.frustumCulled = false; bub.renderOrder = 9;
  group.add(hull, orb, bub);

  const arcs = makeStrips(THREE, 220, { mode: "beam", order: 10, uniforms: { uCore: { value: col("#ffffff") } } });
  const trail = makeStrips(THREE, 220, { mode: "beam", order: 10, uniforms: { uCore: { value: col("#ffffff") } } });
  group.add(arcs.mesh, trail.mesh);
  const VEIN = rgb(THREE, HEX.vein), CY = rgb(THREE, HEX.ribbon), VIO = rgb(THREE, HEX.violet);
  const P = new THREE.Vector3(), Pn = new THREE.Vector3(), Cn = new THREE.Vector3();

  function update(t) {
    const T = env.T, sc = env.F.sc(), B = env.B;
    // ---- orb ----
    const grow = easeOut(smooth(T.orb, T.orb + 1.9, t));
    const nuc = 1 - 0.78 * smooth(T.bubble, T.bubble + 0.75, t);
    const pulse = (Math.floor(t / 0.08) % 2 ? 1 : -1);                 // pulse every 0.08 s
    const Ro = 1.55 * sc * grow * nuc * (1 + 0.035 * pulse);
    const orbOn = t >= T.orb && t < T.bubble + 0.75 && Ro > 0.01;
    const seed = Math.floor(t * 12);                                   // re-randomised on twos
    orb.position.copy(B); hull.position.copy(B);
    orb.scale.setScalar(orbOn ? Ro : 1e-4); hull.scale.setScalar(orbOn ? Ro * 1.07 : 1e-4);
    orbMat.uniforms.uSeed.value = seed * 0.73; orbMat.uniforms.uPulse.value = pulse;
    orbMat.uniforms.uAlpha.value = hullMat.uniforms.uAlpha.value = 1 - 0.0 * smooth(T.bubble + 0.4, T.bubble + 0.75, t);
    // ---- jagged arcs: 4 a frame, from the limb outward, each re-randomised on twos ----
    arcs.begin();
    if (orbOn && Ro > 0.12) {
      for (let m = 0; m < 4; m++) {
        const sd = seed * 13.7 + m * 5.1;
        const d = new THREE.Vector3(hash(sd) * 2 - 1, hash(sd + 1) * 2 - 1, hash(sd + 2) * 2 - 1).normalize();
        const side = new THREE.Vector3(hash(sd + 3) - 0.5, hash(sd + 4) - 0.5, hash(sd + 5) - 0.5).cross(d).normalize();
        const out = Ro * (1.25 + 0.55 * hash(sd + 6)), K = 7;
        let px = B.x + d.x * Ro, py = B.y + d.y * Ro, pz = B.z + d.z * Ro;
        for (let k = 1; k <= K; k++) {
          const r = Ro + (out - Ro) * (k / K), j = (k < K ? 1 : 0) * 0.16 * Ro * (hash(sd + 10 + k) * 2 - 1);
          const nx = B.x + d.x * r + side.x * j, ny = B.y + d.y * r + side.y * j, nz = B.z + d.z * r + side.z * j;
          arcs.seg(px, py, pz, nx, ny, nz, 0.05 * sc * (1 - 0.6 * k / K), 0.05 * sc * (1 - 0.6 * (k + 1) / K), 0, 1, 1, VEIN[0], VEIN[1], VEIN[2]);
          px = nx; py = ny; pz = nz;
        }
      }
    }
    arcs.end();
    // ---- bubble ----
    const k0 = easeOut(smooth(T.bubble, T.bubble + 0.25, t));
    const Rb = 1.55 * sc * (1 + 0.12 * smooth(T.bubble, T.bubble + 0.75, t) + 0.20 * smooth(T.release, T.pop, t)) * k0;
    bub.position.copy(B); bub.scale.setScalar(env.bubbleOn && Rb > 0.01 ? Rb : 1e-4);
    bubMat.uniforms.uT.value = t;
    // ---- trailing arcs behind the rising bubble (shot 7): 5 spirals sampled from the bubble's own past ----
    trail.begin();
    if (t > T.release + 0.02 && t < T.pop) {
      for (let m = 0; m < 5; m++) {
        const c = m % 2 ? VIO : CY;
        let have = false;
        for (let j = 0; j <= 14; j++) {
          const tt = t - j * 0.03;
          if (tt < T.release) break;
          env.bubbleAt(tt, Pn);
          const ph = m * Math.PI * 2 / 5 + tt * 14, rad = (0.55 + 0.04 * j) * sc;
          Cn.set(Pn.x + Math.cos(ph) * rad, Pn.y - 0.5 * sc, Pn.z + Math.sin(ph) * rad);
          if (have) { const f = 1 - j / 15; trail.seg(P.x, P.y, P.z, Cn.x, Cn.y, Cn.z, 0.07 * sc * f, 0.07 * sc * (1 - (j + 1) / 15), j, j + 1, 0.8 * f, c[0], c[1], c[2]); }
          P.copy(Cn); have = true;
        }
      }
    }
    trail.end();
  }
  return { group, update, dispose() { geo.dispose(); orbMat.dispose(); hullMat.dispose(); bubMat.dispose(); arcs.dispose(); trail.dispose(); } };
}
