// THE GRAVEYARD OF EFFORTS (p-epsilon-hollow's domain): the parts, all built once at mount.
//   skyMaterial()    a fullscreen fragment read as world directions (the inverse view-projection): a dead grey-violet
//                    sky, low mist, a red moon, and EPSILON-HOLLOW as a black hole that dominates it: a black event
//                    horizon, a photon ring, a tilted accretion disc (brighter on its approaching side), its far side
//                    lensed over the top, the sky warped round it, and three strands spiralling in (memory cyan,
//                    files gold, scheduler pink, the old sphere's colours)
//   groundMaterial() the dead ground to the horizon, fading into the mist
//   stoneMaterial()  the gravestones, instanced: a painted ramp, distance and height mist; `named` reads a canvas atlas
//                    of the owner's closed-unmerged PRs (lib/world/cutscene/graves.js) on each near stone's face
// Every one of them opens along the slash (uCut): the domain splits and what is behind it (the island) shows.
// Colours: sky #2a2433 / #6b6378, mist #8a8296, moon #b3122a. No NaN: every normalize and divide is guarded.

import { BoxGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, InstancedBufferAttribute, Matrix4, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DEAD_PRS } from "../../../../../lib/world/cutscene/graves";

export const MIST = "#8a8296";
const v3 = (h) => ({ value: new Color(h) });

// the slash, shared: a line through the screen centre (normal uCutN), open by uCut (0..1); its edge burns
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
const cutUniforms = () => ({ uCut: { value: 0 }, uCutN: { value: new Vector2(0.62, 0.78) }, uRes: { value: new Vector2(1280, 800) } });

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
    return s;
  }`;

export function skyMaterial() {
  return new ShaderMaterial({
    depthWrite: false,
    uniforms: {
      uInvVP: { value: new Matrix4() },
      uCam: { value: new Vector3() },
      uHole: { value: new Vector3(0, 0.42, -1).normalize() },
      uMoon: { value: new Vector3(-0.85, 0.18, -0.5).normalize() },
      uTime: { value: 0 },
      uShow: { value: 0 },
      uSky: v3("#2a2433"),
      uHorizon: v3("#6b6378"),
      uMist: v3(MIST),
      uRed: v3("#b3122a"),
      ...cutUniforms(),
    },
    vertexShader: /* glsl */ `
      varying vec2 vNdc;
      void main() {
        vNdc = position.xy * 2.0;
        gl_Position = vec4(vNdc, 0.99999, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform mat4 uInvVP;
      uniform vec3 uCam, uHole, uMoon, uSky, uHorizon, uMist, uRed;
      uniform float uTime, uShow;
      varying vec2 vNdc;
      ${CUT}
      ${NOISE}
      void main() {
        float edge;
        if (slash(edge) > 0.5 || uShow <= 0.0) discard;
        vec4 w = uInvVP * vec4(vNdc, 1.0, 1.0);
        vec3 dir = w.xyz / max(abs(w.w), 1e-5) * sign(w.w) - uCam;
        dir = dir / max(length(dir), 1e-5);
        // the hole's own frame: p is the angular offset from its centre
        vec3 e1 = normalize(cross(uHole, vec3(0.0, 1.0, 0.0)));
        vec3 e2 = cross(e1, uHole);
        float front = dot(dir, uHole);
        vec2 p = vec2(dot(dir, e1), dot(dir, e2)) * 2.2;
        if (front < 0.0) p = vec2(9.0);
        float r = length(p);
        // the sky, warped round the hole (lensing pushes the background outward)
        vec2 lp = p * (1.0 + 0.09 / (r * r + 0.02));
        float elev = dir.y;
        vec3 col = mix(uHorizon, uSky, smoothstep(-0.02, 0.45, elev));
        float cloud = fbm(lp * 2.0 + vec2(uTime * 0.02, 0.0)) * smoothstep(-0.05, 0.3, elev);
        col = mix(col, uSky * 0.6, smoothstep(0.5, 0.75, cloud) * 0.7);
        col *= 0.9 + 0.2 * fbm(vec2(atan(dir.z, dir.x) * 6.0, elev * 20.0));
        // the red moon, low in the west
        float m = acos(clamp(dot(dir, uMoon), -1.0, 1.0));
        col = mix(col, uRed * (0.8 + 0.4 * fbm(p * 30.0)), smoothstep(0.052, 0.046, m));
        col += uRed * 0.25 * exp(-max(m - 0.05, 0.0) * 18.0);
        // the strands: memory, files, scheduler, spiralling in
        float th = atan(p.y, p.x);
        float lr = log(max(r, 1e-3));
        vec3 sc[3];
        sc[0] = vec3(0.02, 0.71, 0.83); sc[1] = vec3(0.96, 0.71, 0.24); sc[2] = vec3(0.88, 0.33, 0.61);
        for (int i = 0; i < 3; i++) {
          float s = fract((th + 2.6 * lr - uTime * 0.5) / 6.2831853 + float(i) / 3.0);
          float k = smoothstep(0.035, 0.0, abs(s - 0.5) - 0.01) * smoothstep(1.4, 0.4, r) * smoothstep(0.17, 0.3, r);
          col = mix(col, sc[i] * 1.3, k * 0.85);
        }
        // the accretion disc, tilted: its far side lensed up over the hole, its near side across it
        vec2 dq = vec2(p.x, p.y / 0.24);
        float dr = length(dq);
        float disc = smoothstep(0.22, 0.27, dr) * smoothstep(0.62, 0.42, dr);
        float doppler = 0.6 + 0.8 * smoothstep(0.4, -0.4, p.x);
        vec3 hot = mix(vec3(1.0, 0.86, 0.62), vec3(1.0, 0.45, 0.32), smoothstep(0.25, 0.6, dr)) * doppler * (0.75 + 0.5 * fbm(vec2(atan(dq.y, dq.x) * 5.0 - uTime * 1.5, dr * 9.0)));
        float arc = smoothstep(0.03, 0.0, abs(r - 0.205)) * step(0.0, p.y) + smoothstep(0.012, 0.0, abs(r - 0.17));
        col = mix(col, vec3(1.0, 0.9, 0.75), clamp(arc, 0.0, 1.0));
        float horizon = smoothstep(0.165, 0.155, r);
        col = mix(col, vec3(0.0), horizon);
        float nearSide = disc * step(p.y, 0.0);
        col = mix(col, hot, max(nearSide, disc * (1.0 - horizon) * step(0.0, p.y) * 0.85));
        // the low mist on the horizon
        col = mix(col, uMist, smoothstep(0.12, -0.02, elev) * 0.8);
        col = mix(col, vec3(1.0, 0.85, 0.85), edge);
        gl_FragColor = vec4(col, uShow);
        #include <colorspace_fragment>
      }`,
    transparent: true,
  });
}

export function groundMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: { uShow: { value: 0 }, uGround: v3("#1b1720"), uMist: v3(MIST), uTime: { value: 0 }, ...cutUniforms() },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uGround, uMist;
      uniform float uShow, uTime;
      varying vec3 vWorld;
      ${CUT}
      ${NOISE}
      void main() {
        float edge;
        if (slash(edge) > 0.5 || uShow <= 0.0) discard;
        float d = length(vWorld - cameraPosition);
        vec3 col = uGround * (0.8 + 0.4 * fbm(vWorld.xz * 0.6));
        float drift = fbm(vWorld.xz * 0.08 + vec2(uTime * 0.05, 0.0));
        col = mix(col, uMist, clamp(smoothstep(8.0, 90.0, d) + 0.25 * drift, 0.0, 1.0));
        col = mix(col, vec3(1.0, 0.85, 0.85), edge);
        gl_FragColor = vec4(col, uShow);
        #include <colorspace_fragment>
      }`,
  });
}

// The gravestone: a slab with a rounded head, its face toward +z.
export function stoneGeometry() {
  const slab = new BoxGeometry(0.7, 0.8, 0.16).translate(0, 0.4, 0);
  const head = new CylinderGeometry(0.35, 0.35, 0.16, 16).rotateX(Math.PI / 2).translate(0, 0.8, 0); // the slab hides its lower half
  return mergeGeometries([slab.toNonIndexed(), head.toNonIndexed()]);
}

// The near stones' epitaphs, one atlas row each: "repo #n" and the title.
export function epitaphs() {
  if (typeof document === "undefined") return null;
  const W = 256;
  const H = 128;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H * DEAD_PRS.length;
  const g = c.getContext("2d");
  DEAD_PRS.forEach(([repo, n, title], i) => {
    const y = i * H;
    g.fillStyle = "#b9b2c2";
    g.fillRect(0, y, W, H);
    g.fillStyle = "#2a2433";
    g.textAlign = "center";
    g.font = "bold 22px Georgia, serif";
    g.fillText(`${repo} #${n}`, W / 2, y + 40, W - 16);
    g.font = "15px Georgia, serif";
    const words = title.split(" ");
    const half = Math.ceil(words.length / 2);
    g.fillText(words.slice(0, half).join(" "), W / 2, y + 72, W - 16);
    g.fillText(words.slice(half).join(" "), W / 2, y + 92, W - 16);
    g.font = "italic 13px Georgia, serif";
    g.fillText("closed, unmerged", W / 2, y + 116, W - 16);
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function stoneMaterial(map = null) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: true,
    defines: map ? { NAMED: 1 } : {},
    uniforms: { uShow: { value: 0 }, uStone: v3("#7d7588"), uMist: v3(MIST), uMap: { value: map }, uRows: { value: DEAD_PRS.length }, ...cutUniforms() },
    vertexShader: /* glsl */ `
      attribute float aRow;
      varying vec3 vWorld;
      varying vec3 vN;
      varying vec3 vObj;
      varying float vRow;
      void main() {
        mat4 m = modelMatrix * instanceMatrix;
        vec4 w = m * vec4(position, 1.0);
        vWorld = w.xyz;
        vObj = position;
        vN = normalize(mat3(m) * normal);
        #ifdef NAMED
          vRow = aRow;
        #else
          vRow = 0.0;
        #endif
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uStone, uMist;
      uniform float uShow, uRows;
      uniform sampler2D uMap;
      varying vec3 vWorld;
      varying vec3 vN;
      varying vec3 vObj;
      varying float vRow;
      ${CUT}
      void main() {
        float edge;
        if (slash(edge) > 0.5 || uShow <= 0.0) discard;
        vec3 n = normalize(vN);
        float l = dot(n, normalize(vec3(-0.4, 0.8, 0.45)));
        vec3 col = uStone * (l > 0.3 ? 1.0 : l > -0.2 ? 0.62 : 0.4);
        float grain = fract(sin(dot(floor(vObj * 30.0), vec3(12.9, 78.2, 37.7))) * 43758.5);
        col *= 0.88 + 0.16 * grain;
        #ifdef NAMED
          if (vObj.z > 0.07 && vObj.y < 0.78) {
            vec2 uv = vec2(vObj.x / 0.7 + 0.5, (vObj.y - 0.04) / 0.74);
            uv.y = 1.0 - (vRow + 1.0 - uv.y) / uRows;
            vec3 ink = texture2D(uMap, uv).rgb;
            col = mix(col, col * ink * 1.3, 0.85);
          }
        #endif
        float d = length(vWorld - cameraPosition);
        col = mix(col, uMist, clamp(smoothstep(6.0, 95.0, d) + smoothstep(0.35, 0.0, vWorld.y) * 0.45, 0.0, 1.0));
        col = mix(col, vec3(1.0, 0.85, 0.85), edge);
        gl_FragColor = vec4(col, uShow);
        #include <colorspace_fragment>
      }`,
  });
}

export const groundGeometry = () => new CircleGeometry(170, 48).rotateX(-Math.PI / 2);
export const quadGeometry = () => new PlaneGeometry(1, 1);
export const rowAttribute = (n) => new InstancedBufferAttribute(new Float32Array(Array.from({ length: n }, (_, i) => i % DEAD_PRS.length)), 1);
export { DEAD_PRS };
