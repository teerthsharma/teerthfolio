// THE MOAT'S ANOMALY, as geometry: the moat's water runs uphill. Five
// streams leave the ring lake, climb the keep's cliffs, spill UP over the
// rim and fill a lake perched on the mesa's top, and that lake rains
// upward (the drops are animated by components/world/land/Moat.jsx).
//
// Pure builders, run once: every stream hugs the keep's real profile
// (lib/world/terrain.js heightAt), lifted off the rock along its normal so
// the jittered terrain facets never poke through.

import { BufferGeometry, Color, Float32BufferAttribute, ShaderMaterial, UniformsLib, UniformsUtils } from "three";
import { MOAT } from "../../../../lib/world/river";
import { heightAt, KEEP_TOP, WATER_Y } from "../../../../lib/world/terrain";

const { x: KX, z: KZ } = MOAT.ring;

export const POOL_R = 3.4; // the perched lake on the keep's top
export const POOL_Y = KEEP_TOP + 0.3; // its surface, over the top's bumps
// the streams, by angle round the keep (0 east, 90 south: the camera side)
export const STREAM_ANGLES = [22, 90, 158, 238, 302].map((a) => (a * Math.PI) / 180);
export const FOOT_R = 8.1; // where each stream leaves the moat

const LIFT = 0.38; // m off the rock
const HALF = 0.72; // half-width at the foot; it narrows as it climbs
const ACROSS = [-1, -0.55, 0, 0.55, 1];

// One stream's centre line in (r, y): from the moat up to the pool.
function profile(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts = [];
  for (let r = FOOT_R; r >= POOL_R - 0.6; r -= 0.2) {
    // the rock's highest point across the stream's width, so no edge dips in
    let h = WATER_Y;
    for (const k of [-HALF, 0, HALF]) h = Math.max(h, heightAt(KX + c * r - s * k, KZ + s * r + c * k));
    pts.push([r, h]);
  }
  // smooth the noise out of the top (a stream is one clean ribbon)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < pts.length - 1; i++) pts[i][1] = Math.max(pts[i][1], (pts[i - 1][1] + pts[i + 1][1]) / 2);
  }
  return pts;
}

// All five streams as one geometry: position, plus aLen (metres climbed
// along the stream), aAcross (-1..1) and aAlong (0 foot .. 1 pool) for the
// shader.
export function buildStreams() {
  const P = [];
  const L = [];
  const A = [];
  const G = [];
  const index = [];
  for (const a of STREAM_ANGLES) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const pts = profile(a);
    const n = pts.length;
    const base = P.length / 3;
    let len = 0;
    const lens = [0];
    for (let i = 1; i < n; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), lens.push(len);
    for (let i = 0; i < n; i++) {
      const [r0, y0] = pts[Math.max(0, i - 1)];
      const [r1, y1] = pts[Math.min(n - 1, i + 1)];
      const tl = Math.hypot(r1 - r0, y1 - y0) || 1;
      // normal away from the rock: (ty, -tr) with the path running inward
      const nr = (y1 - y0) / tl;
      const ny = -(r1 - r0) / tl;
      const [r, h] = pts[i];
      const along = lens[i] / len;
      const inPool = r < POOL_R - 0.15;
      const half = HALF * (1 - 0.35 * along);
      for (const k of ACROSS) {
        const bulge = LIFT + 0.22 * (1 - k * k);
        const rr = r + nr * bulge;
        const y = inPool ? POOL_Y + 0.02 + 0.06 * (1 - k * k) : h + ny * bulge;
        P.push(KX + c * rr - s * k * half, y, KZ + s * rr + c * k * half);
        L.push(lens[i]);
        A.push(k);
        G.push(along);
      }
      if (i < n - 1) {
        const row = base + i * ACROSS.length;
        for (let j = 0; j < ACROSS.length - 1; j++) {
          const p = row + j;
          const q = p + ACROSS.length;
          index.push(p, q, p + 1, p + 1, q, q + 1);
        }
      }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(P, 3));
  geo.setAttribute("aLen", new Float32BufferAttribute(L, 1));
  geo.setAttribute("aAcross", new Float32BufferAttribute(A, 1));
  geo.setAttribute("aAlong", new Float32BufferAttribute(G, 1));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

// The streams' look: moat teal at the foot turning uranium-glass green as
// it climbs, with bright dashes racing UP (the one cue a still frame can't
// give, the drops over the keep give instead) and white-green foam edges.
export function streamMaterial(radiation) {
  return new ShaderMaterial({
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uLow: { value: new Color("#1f9fb0") },
        uHigh: { value: new Color(radiation) },
        uFoam: { value: new Color("#f4ffd6") },
      },
    ]),
    vertexShader: /* glsl */ `
      attribute float aLen;
      attribute float aAcross;
      attribute float aAlong;
      varying float vLen;
      varying float vAcross;
      varying float vAlong;
      #include <fog_pars_vertex>
      void main() {
        vLen = aLen;
        vAcross = aAcross;
        vAlong = aAlong;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uLow;
      uniform vec3 uHigh;
      uniform vec3 uFoam;
      varying float vLen;
      varying float vAcross;
      varying float vAlong;
      #include <fog_pars_fragment>
      void main() {
        float lane = floor((vAcross + 1.0) * 2.0);
        float k = fract(vLen * 0.42 - uTime * 1.3 + lane * 0.37);
        float dash = step(0.72, k) * (1.0 - step(0.9, k));
        float edge = step(0.82, abs(vAcross));
        vec3 col = mix(uLow, uHigh, smoothstep(0.05, 0.55, vAlong));
        col = mix(col, uFoam, max(dash * 0.75, edge * 0.85));
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
