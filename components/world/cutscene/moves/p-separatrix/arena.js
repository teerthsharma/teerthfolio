// THE ARENA FLOOR'S FURNITURE, promoted from the dock pavilion (components/world/monuments/Certify.jsx):
// the coral ridge (the separatrix), a round cyan pool at each end of the unstable axis, each rimmed in gold
// leaf, the broken column top that stands in for the hopper, and the pavilion's boom gate as the arena's
// iron portcullis with its coral beacon. Arena-local (u, v) maps to the rig through world.js toRig.

import { BoxGeometry, BufferGeometry, CatmullRomCurve3, CircleGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, RingGeometry, ShaderMaterial, TubeGeometry, Vector3 } from "three";
import { hash, lerp, merge, paint, smooth } from "./geo";
import { POOL_R, floorY, poolLevel, toRig } from "./world";

const V = new Vector3();

// THE RIDGE: a raised cap along u = 0, following the floor, a flat top and two sloped sides.
export function ridge(L) {
  const SEG = 36;
  const w = 0.17;
  const h = 0.1;
  const top = [];
  const side = [];
  for (let i = 0; i < SEG; i++) {
    const v0 = lerp(-L.ridgeEnd, L.ridgeEnd, i / SEG);
    const v1 = lerp(-L.ridgeEnd, L.ridgeEnd, (i + 1) / SEG);
    const y0 = floorY(L, 0, v0) + 0.012;
    const y1 = floorY(L, 0, v1) + 0.012;
    const z0 = L.Cz + v0;
    const z1 = L.Cz + v1;
    const x = L.Cx;
    // top: the crest
    top.push(x - w * 0.7, y0 + h, z0, x + w * 0.7, y0 + h, z0, x - w * 0.7, y1 + h, z1, x + w * 0.7, y0 + h, z0, x + w * 0.7, y1 + h, z1, x - w * 0.7, y1 + h, z1);
    // sides
    for (const s of [-1, 1]) side.push(x + s * w, y0, z0, x + s * w * 0.7, y0 + h, z0, x + s * w, y1, z1, x + s * w * 0.7, y0 + h, z0, x + s * w * 0.7, y1 + h, z1, x + s * w, y1, z1);
  }
  const build = (p) => new BufferGeometry().setAttribute("position", new Float32BufferAttribute(p, 3));
  return merge([paint(build(top), "#ff7560", 4), paint(build(side), "#d4493c", 4)]);
}

// THE POOLS: a flat disc at the water's level, painted cyan with rings that run outward; a pulse of gold when it rings.
export function poolMaterial(zero) {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uRipple: { value: 1 }, uR: { value: POOL_R }, uZero: zero.uZero, uZeroDir: zero.uZeroDir },
    side: DoubleSide,
    vertexShader: "varying vec3 vP; varying vec3 vWp; void main() { vP = position; vWp = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uTime, uPulse, uRipple, uR, uZero;
      uniform vec3 uZeroDir;
      varying vec3 vP;
      varying vec3 vWp;
      void main() {
        if (uZero - acos(clamp(dot(normalize(vWp - cameraPosition), uZeroDir), -1.0, 1.0)) > 0.02) discard;
        float r = length(vP.xz) / uR;
        vec3 deep = vec3(0.10, 0.55, 0.66);
        vec3 mid = vec3(0.24, 0.78, 0.86);
        vec3 c = mix(mid, deep, smoothstep(0.0, 1.0, r) * 0.7);
        // painted ripple rings: flat bands that run out from the middle
        float ph = r * 9.0 - uTime * 1.4 * uRipple;
        float band = smoothstep(0.62, 0.7, abs(sin(ph * 1.2)));
        c = mix(c, vec3(0.62, 0.92, 0.95), band * 0.55 * (1.0 - r * 0.5));
        // the certified ring: a gold pulse running out when a parcel settles
        float ping = 1.0 - smoothstep(0.0, 0.07, abs(r - uPulse));
        c = mix(c, vec3(1.0, 0.82, 0.38), ping * step(0.001, uPulse) * (1.0 - step(1.0, uPulse)));
        c = mix(c, vec3(0.2, 0.1, 0.18), smoothstep(0.94, 1.0, r));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
export function poolGeometry() {
  return new CircleGeometry(POOL_R, 40).rotateX(-Math.PI / 2);
}
// The gold rim: a tube round the pool at the water's level.
export function rimGeometry() {
  const pts = [];
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push(new Vector3(Math.cos(a) * (POOL_R + 0.05), 0.04, Math.sin(a) * (POOL_R + 0.05)));
  }
  return smooth(new TubeGeometry(new CatmullRomCurve3(pts, true), 64, 0.13, 7, true));
}
export const poolAt = (L, s, out) => {
  toRig(L, s * L.poolX, L.poolV, out);
  out.y = poolLevel(L, s);
  return out;
};

// THE BROKEN COLUMN TOP: three drums with a jagged break, and a fallen drum beside it. Its top is where the parcels drop from.
export const HOPPER_H = 3.1;
export function column() {
  const parts = [];
  const drum = (r0, r1, h, y, hex, jag) => {
    const g = new CylinderGeometry(r1, r0, h, 10, 1);
    const p = g.attributes.position;
    if (jag) {
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) > h / 2 - 0.01) p.setY(i, p.getY(i) - jag * hash(Math.round(p.getX(i) * 10) * 7 + Math.round(p.getZ(i) * 10), 3));
      }
    }
    parts.push(paint(g.translate(0, y, 0), hex));
  };
  parts.push(paint(new CylinderGeometry(1.15, 1.25, 0.35, 10).translate(0, 0.17, 0), "#c9a96f")); // the base
  drum(0.92, 0.85, 1.05, 0.88, "#e2cb94");
  drum(0.86, 0.8, 1.05, 1.93, "#dec58b");
  drum(0.8, 0.75, 1.15, 3.05 - 0.45, "#e4ce98", 0.5);
  const fallen = new CylinderGeometry(0.7, 0.72, 1.1, 10).rotateZ(Math.PI / 2 - 0.15).translate(2.1, 0.62, 0.9);
  parts.push(paint(fallen, "#d9bf86"));
  return merge(parts);
}

// THE GATE: the stone frame is world.js archBay; here the iron portcullis (a grid of bars) and the beacon's lantern.
export function portcullis() {
  const iron = "#2e2330";
  const parts = [];
  for (let i = -3; i <= 3; i++) parts.push(paint(new BoxGeometry(0.07, 3.0, 0.07).translate(i * 0.24, 1.5, 0), iron, 4));
  for (let k = 0; k < 6; k++) parts.push(paint(new BoxGeometry(1.84, 0.07, 0.08).translate(0, 0.35 + k * 0.5, 0.0), iron, 4));
  for (let i = -3; i <= 3; i++) parts.push(paint(new IcosahedronGeometry(0.06, 0).translate(i * 0.24, -0.04, 0), iron, 4)); // the spikes' tips
  return merge(parts);
}
export function lantern() {
  return merge([paint(new BoxGeometry(0.5, 0.18, 0.5).translate(0, 0.09, 0), "#3a2c38", 4), paint(new CylinderGeometry(0.08, 0.2, 0.26, 6).translate(0, 0.3, 0), "#3a2c38", 4)]);
}
export function beaconBulb() {
  return new IcosahedronGeometry(0.3, 1).translate(0, 0.55, 0);
}
export { RingGeometry };
