// FX helpers for p-topological-ml-toolkit (reusable: promote makeSprites / makeStrips / makeFrame / win to a shared module).
// Every effect is a PURE FUNCTION of the stepped clock t (and of the cue windows), never of accumulated state, so a
// scrubbed frame equals a played one. All materials are built in build(ctx); nothing links a program during playback:
// meshes stay visible and are emptied by drawRange / instanceCount instead of visible=false.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const lerp = (a, b, u) => a + (b - a) * u;
export const easeOut = (u) => 1 - (1 - clamp(u)) * (1 - clamp(u));
export const easeIn = (u) => clamp(u) * clamp(u);
/** deterministic hash in [0,1): a pure function of n, so no Math.random anywhere. */
export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export const hash2 = (a, b) => hash(a * 57.13 + b * 13.37 + 1.7);

/** PALETTE of the bible (section 6), hex to 0..1 rgb triples at build time. */
export const HEX = {
  red: "#ff2a4d", white: "#f4fbff", core: "#3de0ff", gold: "#ffc83d", outlier: "#fff1c2", ink: "#1d3f9a",
  ribbon: "#7fe8ff", hatch: "#e8f8ff", plasmaCore: "#f8fdff", plasmaMid: "#80dcff", plasmaEdge: "#2a6bff", violet: "#b04dff", vein: "#e6f4ff",
  lattice: "#d7ecff", film: "#e0f2ff", shell: "#9fd0ff", flash: "#e4f1ff", crease: "#1d3f9a", paper: "#eef3f8", paperGrid: "#9fb8dc", paperShade: "#e3eaf3",
  rayCore: "#d6f3ff", raySheath: "#7cc2ff", rayBall: "#f6fcff", muzzle: "#7fe0ff", dust: "#e8f0fa", debrisA: "#cfdcec", debrisB: "#9eb2cb",
  spark: ["#ffffff", "#8fd8ff", "#ffd24d"], shard: ["#a8f0ff", "#ffb3f0", "#fff2a8", "#b9c8ff"], impactDark: "#10162a",
};
export function rgb(THREE, hex) { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; }

/**
 * Bible space -> world. The bible places things in the old pocket frame: the pup at the origin facing -z, the rival at
 * (3.3, 0, -5.2), the orb at (0.2, 3.7, -1.0). The engine's seal faces +z of its own frame, so bible (x,y,z) maps to the
 * seal-local (-x, y, -z) (a proper half turn about y), then through the seal's yaw, scale and position, read LIVE each call.
 */
export function makeFrame(ctx) {
  const { THREE } = ctx;
  const seal = ctx.seal;
  const api = {
    sc: () => seal.scale || 1,
    at: () => seal.at,
    toWorld(bx, by, bz, out = new THREE.Vector3()) {
      const s = api.sc(), yaw = seal.yaw || 0, c = Math.cos(yaw), si = Math.sin(yaw);
      const lx = -bx * s, ly = by * s, lz = -bz * s, a = seal.at;
      return out.set(a[0] + lx * c + lz * si, a[1] + ly, a[2] - lx * si + lz * c);
    },
    chest(out = new THREE.Vector3()) { const a = seal.at; return out.set(a[0], a[1] + 0.4 * api.sc(), a[2]); },
  };
  return api;
}

/** The timeline. Defaults are the bible's seconds; a fired beat of the same name (cue.since finite) overrides its start. */
export const T0 = {
  shell: 0, storm: 1.2, reverse: 3.4, hit: 4.55, fire: 5.0, ribbons: 5.7, orb: 5.8, bubble: 7.95, grid: 8.0,
  release: 9.46, pop: 10.35, fold: 10.4, wipe: 15.0,
};
export function resolveTimeline(cue, out) {
  for (const k in T0) {
    let s = Infinity;
    try { s = cue && cue.since ? cue.since(k) : Infinity; } catch { s = Infinity; }
    out[k] = Number.isFinite(s) && cue.t !== undefined ? cue.t - s : T0[k];
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// SPRITES: camera-facing instanced quads drawn entirely by a fragment shader (stars, rings, sparks, debris, dust, shards,
// charge ball, lattice). Per instance: aC centre, aA = (size m, age 0..1, kind, rotation), aCol = (rgb, alpha).
//   kind 0 8-spike star   r(phi) = mix(0.16, 1, |cos 4phi|^5), ink outline 0.07 beyond
//   kind 1 ring fill      |r - 0.86| < 0.06          kind 2 ring ink twin  |r - 0.86| < 0.12
//   kind 3 spark diamond  |x| + |y| < 1              kind 4 debris square with ink edge
//   kind 5 dust puff      lumpy disc, hard crescent shade      kind 6 shard triangle with ink edge
//   kind 7 charge ball    disc + ink hull + hard highlight     kind 9 lattice (metres), bars every 0.3 m clipped at GRID_R
// ---------------------------------------------------------------------------------------------------------------------
export function makeSprites(THREE, max, { depthTest = true, order = 5 } = {}) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const mk = (n) => new THREE.InstancedBufferAttribute(new Float32Array(max * n), n).setUsage(THREE.DynamicDrawUsage);
  const aC = mk(3), aA = mk(4), aCol = mk(4);
  g.setAttribute("aC", aC); g.setAttribute("aA", aA); g.setAttribute("aCol", aCol);
  g.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest, side: THREE.DoubleSide,
    uniforms: { uInk: { value: new THREE.Color(HEX.ink) }, uGridR: { value: 1.38 }, uSc: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 aC; attribute vec4 aA; attribute vec4 aCol;
      varying vec2 vP; varying vec4 vA; varying vec4 vCol;
      void main(){
        vP = position.xy; vA = aA; vCol = aCol;
        vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);   // camera right in world
        vec3 U = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);   // camera up in world
        float c = cos(aA.w), s = sin(aA.w);
        vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y); // spin about the view axis
        gl_Position = projectionMatrix * viewMatrix * vec4(aC + (R * q.x + U * q.y) * aA.x, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk; uniform float uGridR; uniform float uSc;
      varying vec2 vP; varying vec4 vA; varying vec4 vCol;
      float tri(vec2 p){ return max(abs(p.x) * 0.866025 + p.y * 0.5, -p.y); }   // inside when < 0.5 (tip y = 1, base y = -0.5)
      void main(){
        float kind = vA.z, age = vA.y; vec2 p = vP; float r = length(p);
        vec3 col = vCol.rgb; float a = 0.0; vec3 o = col;
        if (kind < 0.5) {                                   // STAR
          float ph = atan(p.y, p.x);
          float spike = pow(abs(cos(ph * 4.0)), 5.0);
          float R = mix(0.16, 1.0, spike);                  // 8 hard spikes: |cos 4phi| peaks 8 times
          float fill = 1.0 - smoothstep(R - 0.03, R, r);
          float edge = 1.0 - smoothstep(R + 0.07, R + 0.10, r);
          o = mix(uInk, col, fill); a = edge;
        } else if (kind < 1.5) {                            // RING fill
          a = 1.0 - smoothstep(0.055, 0.065, abs(r - 0.86));
        } else if (kind < 2.5) {                            // RING ink twin, a hair wider so it frames the white
          o = uInk; a = 1.0 - smoothstep(0.115, 0.125, abs(r - 0.86));
        } else if (kind < 3.5) {                            // SPARK diamond
          a = 1.0 - smoothstep(0.88, 1.0, abs(p.x) + abs(p.y));
        } else if (kind < 4.5) {                            // DEBRIS square, ink edge
          float m = max(abs(p.x), abs(p.y));
          o = mix(col, uInk, step(0.62, m)); a = 1.0 - step(0.98, m);
        } else if (kind < 5.5) {                            // DUST puff: lumpy disc, 2 tone with a hard crescent shade
          float ph = atan(p.y, p.x);
          float R = 0.78 + 0.16 * sin(ph * 3.0 + vA.w * 5.0) + 0.06 * sin(ph * 7.0 + vA.w);
          a = (1.0 - smoothstep(R - 0.04, R, r)) * (1.0 - smoothstep(0.55, 1.0, age));
          o = col * mix(1.0, 0.80, step(0.30, dot(p, vec2(0.55, -0.75))));
        } else if (kind < 6.5) {                            // SHARD triangle, ink edge
          float d = tri(p * 0.85);
          o = mix(col, uInk, step(0.36, d)); a = 1.0 - step(0.5, d);
        } else if (kind < 7.5) {                            // CHARGE BALL: ink hull, body, hard highlight
          o = mix(col, uInk, step(0.82, r));
          o = mix(o, vec3(1.0), 1.0 - smoothstep(0.12, 0.16, length(p - vec2(-0.30, 0.34))));
          a = 1.0 - smoothstep(0.96, 1.0, r);
        } else {                                            // LATTICE: size = metres, so p * size is metres
          vec2 m = p * vA.x / uSc;          // back to unscaled metres
          vec2 q = mod(m + 0.15, 0.3) - 0.15;               // cell centres at multiples of 0.3, bars at the half steps
          float bar = 1.0 - smoothstep(0.0, 0.006, min(0.15 - abs(q.x), 0.15 - abs(q.y)));   // distance to the nearest bar
          float rim = 1.0 - smoothstep(0.0, 0.010, abs(length(m) - uGridR));
          a = max(bar * 0.62, rim * 0.9) * step(length(m), uGridR + 0.01);
        }
        a *= vCol.a;
        if (a < 0.01) discard;
        gl_FragColor = vec4(o, a);
      }`,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false; mesh.renderOrder = order;
  let n = 0;
  return {
    mesh, mat, max,
    begin() { n = 0; },
    add(kind, x, y, z, size, age, rot, r, gg, b, alpha = 1) {
      if (n >= max || size <= 0 || alpha <= 0) return;
      aC.setXYZ(n, x, y, z); aA.setXYZW(n, size, age, kind, rot); aCol.setXYZW(n, r, gg, b, alpha); n++;
    },
    addHex(kind, x, y, z, size, age, rot, c, alpha) { this.add(kind, x, y, z, size, age, rot, c[0], c[1], c[2], alpha); },
    end() { g.instanceCount = n; aC.needsUpdate = aA.needsUpdate = aCol.needsUpdate = true; return n; },
    dispose() { g.dispose(); mat.dispose(); },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// STRIPS: camera-facing ribbons from straight segments. A segment is a quad between a and b; the side axis is
//   side = normalize(cross(b - a, p - cameraPosition)),  p' = p + side * s * w / 2
// with s = +-1 across and w the width at that end (so a polyline tapers by giving each segment its end widths).
// Per vertex: u along the ribbon (for dashes), alpha, a per-segment colour. Fragment modes:
//   "ribbon" ink edge |v| > 0.72, hatch step(0.5, fract(u * 9 - t * 8)) on the body    (wind ribbons, bible 3.9)
//   "beam"   additive: hot core |v| < 0.3, sheath fading to the edge                  (ray, arcs, lightning, trails)
//   "solid"  flat colour, hard edge                                                    (crease lines)
// ---------------------------------------------------------------------------------------------------------------------
export function makeStrips(THREE, maxSeg, { mode = "ribbon", depthTest = true, order = 6, uniforms = {} } = {}) {
  const V = maxSeg * 4;
  const g = new THREE.BufferGeometry();
  const mk = (n) => new THREE.BufferAttribute(new Float32Array(V * n), n).setUsage(THREE.DynamicDrawUsage);
  const aA = mk(3), aB = mk(3), aW = mk(2), aU = mk(3), aCol = mk(3);
  const aS = new THREE.BufferAttribute(new Float32Array(V * 2), 2);
  const idx = new Uint32Array(maxSeg * 6);
  for (let s = 0; s < maxSeg; s++) {
    const b = s * 4;
    aS.setXY(b, -1, 0); aS.setXY(b + 1, 1, 0); aS.setXY(b + 2, 1, 1); aS.setXY(b + 3, -1, 1);
    idx.set([b, b + 1, b + 2, b, b + 2, b + 3], s * 6);
  }
  g.setAttribute("position", aA); // required by three for bounds; real positions come from aA / aB
  g.setAttribute("aA", aA); g.setAttribute("aB", aB); g.setAttribute("aS", aS); g.setAttribute("aW", aW); g.setAttribute("aU", aU); g.setAttribute("aCol", aCol);
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.setDrawRange(0, 0);
  const additive = mode === "beam";
  const U = { uT: { value: 0 }, uInk: { value: new THREE.Color(HEX.ink) }, uHatch: { value: new THREE.Color(HEX.hatch) }, uCore: { value: new THREE.Color("#ffffff") }, ...uniforms };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest, side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aA; attribute vec3 aB; attribute vec2 aS; attribute vec2 aW; attribute vec3 aU; attribute vec3 aCol;
      varying float vY; varying float vU; varying float vAl; varying vec3 vCol;
      void main(){
        float e = aS.y;
        vec3 p = mix(aA, aB, e);
        vec3 d = normalize(aB - aA + vec3(1e-5));
        vec3 side = normalize(cross(d, p - cameraPosition) + vec3(1e-6));
        float w = mix(aW.x, aW.y, e);
        p += side * aS.x * w * 0.5;
        vY = aS.x; vU = mix(aU.x, aU.y, e); vAl = aU.z; vCol = aCol;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uT; uniform vec3 uInk; uniform vec3 uHatch; uniform vec3 uCore;
      varying float vY; varying float vU; varying float vAl; varying vec3 vCol;
      void main(){
        float ay = abs(vY);
        ${mode === "ribbon" ? `
        vec3 col = vCol;
        float h = step(0.5, fract(vU * 9.0 - uT * 8.0));            // UV-scrolled dash, uT is stepped on threes
        col = mix(col, uHatch, h);
        col = mix(col, uInk, step(0.72, ay));                       // ink edge
        gl_FragColor = vec4(col, vAl);` : mode === "beam" ? `
        float core = 1.0 - smoothstep(0.18, 0.42, ay);
        float sheath = 1.0 - smoothstep(0.50, 1.0, ay);
        vec3 col = vCol * sheath * 0.85 + uCore * core;
        gl_FragColor = vec4(col * vAl, 1.0);` : `
        gl_FragColor = vec4(vCol, vAl * (1.0 - smoothstep(0.86, 1.0, ay)));`}
        if (gl_FragColor.a < 0.01 && ${additive ? "dot(gl_FragColor.rgb, vec3(1.0)) < 0.01" : "true"}) discard;
      }`,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false; mesh.renderOrder = order;
  let n = 0;
  return {
    mesh, mat, uniforms: U, max: maxSeg,
    begin() { n = 0; },
    seg(ax, ay, az, bx, by, bz, wa, wb, ua, ub, al, r, gg, b) {
      if (n >= maxSeg || al <= 0) return;
      const o = n * 4;
      for (let k = 0; k < 4; k++) {
        aA.setXYZ(o + k, ax, ay, az); aB.setXYZ(o + k, bx, by, bz); aW.setXY(o + k, wa, wb); aU.setXYZ(o + k, ua, ub, al); aCol.setXYZ(o + k, r, gg, b);
      }
      n++;
    },
    end() {
      g.setDrawRange(0, n * 6);
      aA.needsUpdate = aB.needsUpdate = aW.needsUpdate = aU.needsUpdate = aCol.needsUpdate = true; return n;
    },
    dispose() { g.dispose(); mat.dispose(); },
  };
}
