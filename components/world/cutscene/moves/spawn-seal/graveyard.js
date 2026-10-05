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
// Cosmic dread, after the owner's references: a black void with a violet-teal nebula, colossal leaning black-and-bone
// obelisks inked and hatched, eldritch teal glyphs, a black still sea; the maw's gold-violet the one warm thing. No NaN: every normalize and divide is guarded.

import { BackSide, BoxGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, InstancedBufferAttribute, Matrix4, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Vector2, Vector3 } from "three";
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
      uHole: { value: new Vector3(0, 0.5, -1).normalize() }, // set every frame: above the lens's centre, so it owns the top of the frame: the camera comes onto the seal from the south-west
      uMoon: { value: new Vector3(0, -1, 0) }, // under the sea: the void keeps no moon
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
        vec2 p = vec2(dot(dir, e1), dot(dir, e2)) * 0.5; // the horizon spans ~19 degrees: it owns the sky
        if (front < 0.0) p = vec2(9.0);
        float r = length(p);
        // the void: black, a violet-teal nebula, cold stars, all warped round the maw (lensing pushes them outward)
        vec2 lp = p * (1.0 + 0.09 / (r * r + 0.02));
        float elev = dir.y;
        vec3 col = vec3(0.006, 0.005, 0.01);
        vec2 sp = vec2(atan(dir.z, dir.x) * 1.6, elev * 3.0) + lp * 0.35;
        float neb = fbm(sp * 1.4 + vec2(uTime * 0.01, 0.0));
        float neb2 = fbm(sp * 3.1 - 4.0);
        col += vec3(0.16, 0.06, 0.24) * smoothstep(0.45, 0.85, neb) * smoothstep(-0.05, 0.3, elev);
        col += vec3(0.02, 0.16, 0.14) * smoothstep(0.55, 0.9, neb2) * smoothstep(-0.05, 0.3, elev);
        float star = step(0.992, hash(floor(lp * 90.0 + sp * 30.0)));
        col += vec3(0.8, 0.85, 0.9) * star * smoothstep(-0.02, 0.15, elev);
        // the tendrils: dark matter reaching out of the maw, eating the nebula
        float th = atan(p.y, p.x);
        float lr = log(max(r, 1e-3));
        float tend = fbm(vec2(th * 2.5 + lr * 1.8 - uTime * 0.05, lr * 3.0));
        col *= 1.0 - 0.95 * smoothstep(0.52, 0.7, tend) * smoothstep(2.2, 0.3, r) * smoothstep(0.15, 0.3, r);
        // the strands: memory, files, scheduler, thin, spiralling in
        vec3 sc[3];
        sc[0] = vec3(0.02, 0.71, 0.83); sc[1] = vec3(0.96, 0.71, 0.24); sc[2] = vec3(0.88, 0.33, 0.61);
        for (int i = 0; i < 3; i++) {
          float s = fract((th + 2.6 * lr - uTime * 0.5) / 6.2831853 + float(i) / 3.0);
          float k = smoothstep(0.012, 0.0, abs(s - 0.5) - 0.004) * smoothstep(1.6, 0.5, r) * smoothstep(0.17, 0.3, r);
          col = mix(col, sc[i], k * 0.8);
        }
        // the accretion disc, gold, inked: hatched in its dark bands, white-hot inside, its far side lensed over the top
        vec2 dq = vec2(p.x, p.y / 0.3);
        float dr = length(dq);
        float disc = smoothstep(0.19, 0.215, dr) * smoothstep(0.62, 0.4, dr);
        float ang = atan(dq.y, dq.x);
        float band = fbm(vec2(ang * 7.0 - uTime * 1.2, dr * 14.0));
        float doppler = 0.55 + 0.75 * smoothstep(0.5, -0.5, p.x);
        vec3 gold = mix(mix(vec3(1.0, 0.95, 0.82), vec3(0.95, 0.68, 0.22), smoothstep(0.21, 0.3, dr)), vec3(0.5, 0.2, 0.75), smoothstep(0.3, 0.5, dr)) * doppler;
        float hatchLine = step(0.5, fract((gl_FragCoord.x - gl_FragCoord.y) / 5.0));
        gold *= mix(1.0, 0.15, step(band, 0.45) * hatchLine);
        float ring = smoothstep(0.035, 0.0, abs(r - 0.205)) * smoothstep(-0.02, 0.06, p.y);
        float photon = smoothstep(0.012, 0.0, abs(r - 0.172));
        col = mix(col, vec3(1.0, 0.86, 0.5) * (0.8 + 0.4 * band), clamp(ring, 0.0, 1.0));
        float horizon = smoothstep(0.168, 0.16, r);
        col = mix(col, vec3(0.0), horizon);
        col = mix(col, vec3(1.0, 0.95, 0.85), photon);
        // the EYE in the maw: a violet-gold iris inside the horizon, a vertical slit of pure void, watching
        float ir = r / 0.15;
        float iris = smoothstep(1.0, 0.92, ir) * smoothstep(0.25, 0.35, ir);
        vec3 irisCol = mix(vec3(0.95, 0.7, 0.25), vec3(0.45, 0.15, 0.7), smoothstep(0.3, 0.95, ir)) * (0.6 + 0.5 * fbm(vec2(th * 8.0, ir * 6.0 - uTime * 0.3)));
        col = mix(col, irisCol, iris * horizon);
        float slit = smoothstep(0.018, 0.012, abs(p.x) - 0.06 * (1.0 - smoothstep(0.0, 0.13, abs(p.y)))) * smoothstep(0.15, 0.13, r);
        col = mix(col, vec3(0.0), slit);
        float nearSide = disc * step(p.y, 0.0);
        col = mix(col, gold, max(nearSide, disc * (1.0 - horizon) * step(0.0, p.y)));
        // the horizon: a cold teal line and mist where the black sea meets the void
        col = mix(col, vec3(0.1, 0.55, 0.5), smoothstep(0.006, 0.0, abs(elev - 0.004)) * 0.6);
        col = mix(col, vec3(0.03, 0.08, 0.09), smoothstep(0.06, 0.0, abs(elev)) * 0.6);
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
        vec3 col = vec3(0.004, 0.006, 0.01);
        // a black still sea: the runes' teal and the maw's gold shimmer in long vertical reflections
        float wob = fbm(vec2(vWorld.x * 0.9, vWorld.z * 0.12 + uTime * 0.15));
        float glint = smoothstep(0.62, 0.78, fbm(vec2(vWorld.x * 0.55, vWorld.z * 0.05) + wob * 0.6));
        col += vec3(0.04, 0.2, 0.19) * glint * 0.18 * (1.0 - smoothstep(15.0, 90.0, d));
        col = mix(col, vec3(0.03, 0.08, 0.09), smoothstep(30.0, 110.0, d) * 0.7); // the mist on the far water
        col = mix(col, vec3(1.0, 0.85, 0.85), edge);
        gl_FragColor = vec4(col, uShow);
        #include <colorspace_fragment>
      }`,
  });
}

// The gravestone: a traditional Japanese marker, angular and tall: a two-step base, the pillar, a pyramid cap. Its face is +z.
export function stoneGeometry() {
  return mergeGeometries([
    new BoxGeometry(0.95, 0.22, 0.95).translate(0, 0.11, 0),
    new BoxGeometry(0.7, 0.24, 0.7).translate(0, 0.34, 0),
    new BoxGeometry(0.42, 1.6, 0.42).translate(0, 1.26, 0),
    new CylinderGeometry(0, 0.34, 0.26, 4).rotateY(Math.PI / 4).translate(0, 2.19, 0),
  ].map((g) => g.toNonIndexed()));
}
// the ink outline: the same marker pushed out along its normals, back faces only, black (an inverted hull)
export function outlineMaterial() {
  return new ShaderMaterial({
    side: BackSide,
    transparent: true,
    uniforms: { uShow: { value: 0 }, ...cutUniforms() },
    vertexShader: /* glsl */ `
      void main() {
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = modelMatrix * instanceMatrix;
        #endif
        vec4 w = m * vec4(position + normal * 0.035, 1.0);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uShow;
      ${CUT}
      void main() {
        float edge;
        if (slash(edge) > 0.5 || uShow <= 0.0) discard;
        gl_FragColor = vec4(0.0, 0.0, 0.0, uShow);
      }`,
  });
}

// The near stones' epitaphs, one atlas row each: "repo #n" and the title.
export function epitaphs() {
  if (typeof document === "undefined") return null;
  const W = 512;
  const H = 128;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H * DEAD_PRS.length;
  const g = c.getContext("2d");
  DEAD_PRS.forEach(([repo, n, title], i) => {
    const y = i * H;
    g.fillStyle = "#ffffff";
    g.fillRect(0, y, W, H);
    g.fillStyle = "#000000";
    g.textAlign = "center";
    g.font = "bold 44px Georgia, serif";
    g.fillText(`${repo} #${n}`, W / 2, y + 54, W - 24);
    g.font = "26px Georgia, serif";
    g.fillText(title, W / 2, y + 100, W - 24);
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
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = modelMatrix * instanceMatrix;
        #endif
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
        float l = dot(n, normalize(vec3(-0.5, 0.75, 0.45)));
        // manga ink: bone white lit, hatched in the half-tone, cross-hatched in shadow
        vec2 fc = gl_FragCoord.xy;
        float h1 = step(0.55, fract((fc.x + fc.y) / 5.0));
        float h2 = step(0.55, fract((fc.x - fc.y) / 5.0));
        vec3 bone = vec3(0.78, 0.74, 0.64);
        vec3 col = bone;
        if (l < 0.25) col = mix(bone, vec3(0.015), h1);
        if (l < -0.15) col = mix(col, vec3(0.015), max(h1, h2) * 0.97);
        // eldritch glyphs: cells of strokes on every face, lit teal, pulsing out of step
        vec2 gc = vec2(vObj.x + vObj.z, vObj.y) * vec2(9.0, 6.0);
        vec2 gi = floor(gc);
        vec2 gf = fract(gc) - 0.5;
        float gh = fract(sin(dot(gi + vRow * 7.0, vec2(41.3, 289.1))) * 43758.5);
        float stroke = gh > 0.5 ? abs(gf.x + gf.y * (gh - 0.75) * 4.0) : abs(gf.y - (gh - 0.25) * 1.2);
        float glyph = smoothstep(0.09, 0.03, stroke) * step(0.45, fract(gh * 13.0)) * step(abs(gf.x), 0.4) * step(abs(gf.y), 0.4);
        vec3 teal = vec3(0.18, 0.95, 0.78);
        col = mix(col, teal * 1.3, glyph * (0.5 + 0.5 * sin(gh * 30.0 + vWorld.y)) * step(0.4, vObj.y));
        #ifdef NAMED
          if (vObj.z > 0.2 && vObj.y > 0.55 && vObj.y < 2.0) {
            // the PR, carved down the face and lit from inside like a rune
            vec2 uv = vec2(1.0 - (vObj.y - 0.55) / 1.45, vObj.x / 0.42 + 0.5);
            uv.y = 1.0 - (vRow + 1.0 - uv.y) / uRows;
            float ink = 1.0 - texture2D(uMap, uv).r;
            col = mix(col * 0.25, teal * 1.6, ink);
          }
        #endif
        float d = length(vWorld - cameraPosition);
        col = mix(col, vec3(0.03, 0.08, 0.09), smoothstep(30.0, 110.0, d)); // the far ones sink into the mist
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
