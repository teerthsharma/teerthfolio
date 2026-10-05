// HORRORS LAID IN STONE (the Graveyard of Efforts, the owner's direction): every dead idea is an eldritch thing petrified
// mid-motion and half buried, carved from one weathered basalt, light still leaking from its cracks and eye sockets as if
// something inside were alive. Six silhouettes, each one merged geometry, instanced: a hand clawing out of the ground, a
// skull with too many eye sockets, a tentacled god-form frozen mid-reach, a maw with rows of teeth, a faceless statue with
// too many arms, a coiled leviathan. A per-vertex `aGlow` marks the parts that burn from inside (sockets, the maw's throat).
// The names of the dead PRs are small, on low plinths before the nearest ones, lit like runes.

import { BoxGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, Float32BufferAttribute, ShaderMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DEAD_PRS } from "../../../../../lib/world/cutscene/graves";

// one part: non-indexed, uv dropped, its glow baked in
function part(g, glow = 0) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.setAttribute("aGlow", new Float32BufferAttribute(new Float32Array(n.attributes.position.count).fill(glow), 1));
  return n;
}
const merged = (parts) => mergeGeometries(parts);
const tube = (pts, r, glow = 0) => part(new TubeGeometry(new CatmullRomCurve3(pts.map(([x, y, z]) => new Vector3(x, y, z))), 24, r, 7, false), glow);

function hand() {
  const parts = [part(new BoxGeometry(1.7, 2.2, 0.7).translate(0, 1.0, 0))];
  [-0.6, -0.2, 0.2, 0.6].forEach((x, i) => parts.push(tube([[x, 2.0, 0], [x * 1.2, 3.1 + (i % 2) * 0.3, 0.2], [x * 1.3, 3.7, 0.9], [x * 1.2, 3.4, 1.5]], 0.2 - Math.abs(x) * 0.05)));
  parts.push(tube([[0.85, 1.0, 0.1], [1.5, 1.7, 0.4], [1.7, 2.4, 1.0]], 0.22));
  return merged(parts);
}
function skull() {
  const parts = [part(new SphereGeometry(1.7, 16, 12).scale(1, 0.85, 1.1).translate(0, 0.9, 0)), part(new BoxGeometry(1.8, 0.7, 1.2).translate(0, 0.2, 0.8))];
  [[-0.55, 1.15], [0.55, 1.15], [0, 1.65], [-0.95, 1.6], [0.95, 1.6], [-0.3, 0.6], [0.3, 0.6]].forEach(([x, y]) => parts.push(part(new SphereGeometry(0.22, 8, 6).translate(x, y, 1.72 - Math.abs(x) * 0.35), 1)));
  return merged(parts);
}
function godform() {
  const parts = [part(new SphereGeometry(1.4, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.6).translate(0, 0.3, 0))];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    parts.push(tube([[c * 0.9, 0.6, s * 0.9], [c * 1.8, 2.0, s * 1.8], [c * 1.4, 3.6 + (i % 3) * 0.6, s * 1.4], [c * 2.2, 4.6 + (i % 2), s * 2.2]], 0.28 - (i % 2) * 0.06));
  }
  parts.push(part(new SphereGeometry(0.25, 8, 6).translate(0, 1.55, 0.8), 1));
  return merged(parts);
}
function maw() {
  const parts = [part(new TorusGeometry(1.7, 0.6, 10, 24).translate(0, 1.6, 0)), part(new CylinderGeometry(1.25, 1.25, 0.4, 20).rotateX(Math.PI / 2).translate(0, 1.6, -0.2), 1)];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    parts.push(part(new ConeGeometry(0.13, 0.55, 5).rotateZ(a + Math.PI / 2).translate(Math.cos(a) * 1.2, 1.6 + Math.sin(a) * 1.2, 0.15)));
  }
  return merged(parts);
}
function manyArms() {
  const parts = [part(new CylinderGeometry(0.55, 0.95, 4.2, 10).translate(0, 2.1, 0)), part(new SphereGeometry(0.6, 12, 10).scale(0.9, 1.2, 0.9).translate(0, 4.7, 0))];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    const y = 2.4 + Math.floor(i / 2) * 0.5;
    parts.push(tube([[side * 0.5, y, 0], [side * 1.4, y + 0.6, 0.3 * (i % 3)], [side * 2.0, y + 1.5 - (i % 3) * 0.6, 0.6]], 0.15));
  }
  parts.push(part(new SphereGeometry(0.12, 6, 5).translate(0, 4.8, 0.52), 1));
  return merged(parts);
}
function leviathan() {
  const pts = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const a = t * Math.PI * 5;
    const r = 2.6 - t * 1.2;
    pts.push([Math.cos(a) * r, 0.2 + t * 2.8 + Math.sin(a * 2) * 0.2, Math.sin(a) * r]);
  }
  return merged([tube(pts, 0.55), part(new ConeGeometry(0.5, 1.2, 6).rotateX(-Math.PI / 2).translate(pts[26][0], pts[26][1], pts[26][2] + 0.6)), part(new SphereGeometry(0.12, 6, 5).translate(pts[26][0] + 0.25, pts[26][1] + 0.2, pts[26][2] + 0.3), 1)]);
}
export const HORRORS = [hand, skull, godform, maw, manyArms, leviathan];

// the low plinth a dead PR's name is carved on, its face +z
export const plinthGeometry = () => part(new BoxGeometry(1.4, 0.42, 0.42).translate(0, 0.21, 0));
// the shard the seal draws: a long four-sided blade of the same stone
export const shardGeometry = () => part(new ConeGeometry(0.16, 1.9, 4).translate(0, 0.95, 0));

const CUT = /* glsl */ `
  uniform float uCut;
  uniform vec2 uCutN;
  uniform vec2 uRes;
  float slash(out float edge) {
    vec2 q = (gl_FragCoord.xy / max(uRes, vec2(1.0))) * 2.0 - 1.0;
    q.x *= uRes.x / max(uRes.y, 1.0);
    float d = abs(dot(q, uCutN));
    float open = uCut * 0.55;
    edge = uCut > 0.0 ? smoothstep(0.05, 0.0, abs(d - open)) : 0.0;
    return d < open ? 1.0 : 0.0;
  }`;

// The basalt: dark weathered stone, a painted ramp, faint ink hatching in shadow, cracks and sockets leaking light (teal,
// gold on one horror in five), the far ones sunk into the mist. `named`: the plinth face carries its PR from the atlas.
export function horrorMaterial(map = null) {
  return new ShaderMaterial({
    transparent: true,
    defines: map ? { NAMED: 1 } : {},
    uniforms: { uShow: { value: 0 }, uTime: { value: 0 }, uMap: { value: map }, uRows: { value: DEAD_PRS.length }, uCut: { value: 0 }, uCutN: { value: new Vector2(0.62, 0.78) }, uRes: { value: new Vector2(1280, 800) } },
    vertexShader: /* glsl */ `
      attribute float aGlow;
      attribute float aRow;
      varying vec3 vWorld;
      varying vec3 vN;
      varying vec3 vObj;
      varying float vGlow;
      varying float vSeed;
      varying float vRow;
      void main() {
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = modelMatrix * instanceMatrix;
        #endif
        vec4 w = m * vec4(position, 1.0);
        vWorld = w.xyz;
        vObj = position;
        vN = normalize(mat3(m) * normal);
        vGlow = aGlow;
        vSeed = fract(sin(dot(m[3].xz, vec2(12.9, 78.2))) * 43758.5);
        #ifdef NAMED
          vRow = aRow;
        #else
          vRow = 0.0;
        #endif
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uShow, uTime, uRows;
      uniform sampler2D uMap;
      varying vec3 vWorld;
      varying vec3 vN;
      varying vec3 vObj;
      varying float vGlow;
      varying float vSeed;
      varying float vRow;
      ${CUT}
      float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9, 78.2, 37.7))) * 43758.5); }
      float n3(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
      }
      void main() {
        float edge;
        if (slash(edge) > 0.5 || uShow <= 0.0) discard;
        vec3 n = normalize(vN);
        float l = dot(n, normalize(vec3(-0.4, 0.8, 0.45)));
        vec3 basalt = mix(vec3(0.09, 0.09, 0.1), vec3(0.42, 0.4, 0.36), smoothstep(-0.2, 0.9, l));
        basalt *= 0.75 + 0.4 * n3(vObj * 3.0);
        float hatch = step(0.6, fract((gl_FragCoord.x + gl_FragCoord.y) / 4.0));
        if (l < -0.1) basalt *= 1.0 - 0.6 * hatch;
        vec3 light = vSeed < 0.2 ? vec3(1.0, 0.72, 0.25) : vec3(0.15, 0.95, 0.78);
        float pulse = 0.6 + 0.4 * sin(uTime * 1.3 + vSeed * 30.0);
        // the cracks: thin ridges of noise, light leaking through
        float cr = abs(n3(vObj * 1.7 + vSeed * 9.0) - 0.5);
        float crack = smoothstep(0.035, 0.0, cr) * step(0.25, vObj.y);
        vec3 col = basalt + light * crack * 1.2 * pulse + light * vGlow * 1.8 * pulse;
        #ifdef NAMED
          if (vObj.z > 0.2) {
            vec2 uv = vec2(vObj.x / 1.4 + 0.5, vObj.y / 0.42);
            uv.y = 1.0 - (vRow + 1.0 - uv.y) / uRows;
            float ink = 1.0 - texture2D(uMap, uv).r;
            col = mix(col, vec3(0.15, 0.95, 0.78) * 1.1, ink * 0.9);
          }
        #endif
        float d = length(vWorld - cameraPosition);
        col = mix(col, vec3(0.03, 0.07, 0.08), smoothstep(30.0, 130.0, d));
        col = mix(col, vec3(1.0, 0.85, 0.85), edge);
        gl_FragColor = vec4(col, uShow);
        #include <colorspace_fragment>
      }`,
  });
}
