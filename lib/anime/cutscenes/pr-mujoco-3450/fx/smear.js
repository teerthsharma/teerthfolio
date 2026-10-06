// E07 SMEAR-FRAME: the multi-draw smear trail of the Serious Punch's flipper (the arm and mitt themselves are the cast layer's).
// A drawing-on-ones effect: f94 is ONE stretched double, f95-96 are a 2-frame multiple (three trailing copies), then gone by f97.
// MATHS
//   spine      from the shoulder SH + D 0.45 (clear of the body) to the mitt M, ghost g lags the tip by g 0.34 m along -D and sits
//              g 0.05 m off the diagonal (an arc, not a copy)
//   half-width w(a) = 0.15 sin(pi a^0.8) (a flipper, 0.3 m across), floored to half a pixel; camera-facing: side = normalize(cross(D, view))
//   tones      3 flat bands by |side|: lit #fdfbf7, mid #e1ddd8, shadow #a9a8b6; a #7ff0cf rim on the fist side only (side > .8), 3.5 px ink
//   alpha      .55 / .38 / .24 for ghost 0/1/2 (multiples fade as they trail); all on ones from the display clock
import { DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { C } from "./util.js";

const V = `uniform vec3 uA, uB; uniform float uW, uPxK, uEdge; varying float vS, vA;
void main(){
  float a = position.x * 0.5 + 0.5, sd = position.y;
  vec3 p = mix(uA, uB, a);
  vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz, wa = (modelMatrix * vec4(uA, 1.0)).xyz, wb = (modelMatrix * vec4(uB, 1.0)).xyz;
  vec3 dir = normalize(wb - wa), view = normalize(cameraPosition - wp);
  vec3 side = normalize(cross(dir, view) + vec3(1e-5));
  float pxW = uPxK * length(cameraPosition - wp);
  float w = max(uW * sin(3.14159 * pow(a, 0.8)), 0.5 * pxW) + uEdge * 3.5 * pxW;
  wp += side * sd * w;
  vS = sd; vA = a;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const FR_ = `uniform float uAlpha, uEdge; uniform vec3 uInk, uLit, uMid, uSh, uRim; varying float vS, vA;
void main(){
  if (uEdge > 0.5) { gl_FragColor = vec4(uInk, uAlpha); return; }
  float a = abs(vS);
  vec3 c = a < 0.3 ? uLit : (a < 0.7 ? uMid : uSh);
  if (vS > 0.8) c = uRim;
  gl_FragColor = vec4(c, uAlpha);
}`;

export function make(ctx, S) {
  const { T, F } = S, group = new Group(), geo = new PlaneGeometry(2, 2, 14, 1), items = [];
  const alphas = [0.55, 0.38, 0.24];
  for (let g = 0; g < 3; g++) {
    for (const edge of [1, 0]) {
      const m = new ShaderMaterial({ vertexShader: V, fragmentShader: FR_, side: DoubleSide, transparent: true, depthWrite: false, uniforms: {
        uA: { value: new Vector3() }, uB: { value: new Vector3() }, uW: { value: 0.15 }, uPxK: S.pxK, uEdge: { value: edge }, uAlpha: { value: 0 },
        uInk: { value: C("#1a1214") }, uLit: { value: C("#fdfbf7") }, uMid: { value: C("#e1ddd8") }, uSh: { value: C("#a9a8b6") }, uRim: { value: C("#7ff0cf") } } });
      const mesh = new Mesh(geo, m); mesh.renderOrder = 10 + edge * -1 + g * 0.1; mesh.frustumCulled = false; mesh.visible = false; group.add(mesh); items.push({ mesh, m, g, edge });
    }
  }
  const lag = new Vector3(), off = new Vector3(), up = new Vector3(0, 1, 0);
  return {
    group,
    update(ts, dt, cue) {
      const t = Math.floor(cue.t * 24 + 1e-6) / 24, a = t - T.TP; // ones
      const f = Math.round(a * 24); // drawing index from the punch: 0 = f94 ...
      for (const it of items) {
        // f94: one stretched double (ghost 0 only); f95-96: the multiple (ghosts 0-2)
        const show = (f === 0 && it.g === 0) || ((f === 1 || f === 2) && it.g <= (f === 1 ? 2 : 1));
        it.mesh.visible = show;
        if (!show) continue;
        const u = it.m.uniforms;
        lag.copy(F.D).multiplyScalar(-0.34 * it.g);
        off.crossVectors(F.D, up).normalize().multiplyScalar(0.05 * it.g);
        u.uA.value.copy(F.SH).addScaledVector(F.D, 0.45).add(lag).add(off);
        u.uB.value.copy(F.M).add(lag).add(off);
        u.uAlpha.value = alphas[it.g] * (f === 0 ? 1.0 : 1.0);
      }
    },
    dispose() { geo.dispose(); items.forEach((i) => i.m.dispose()); },
  };
}
