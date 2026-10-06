// FX COMMON for p-resolvent: palette, time windows (bible frames / 24), anchors, the scale's motion, the seal-clear shader chunk.
// Every time below is the bible's own (frame = round(s x 24)); a direction beat of the same name only MOVES the start (see startOf).

export const PAL = {
  silver: "#e6f3f8", silverGlow: "#a8b4d9",
  soulEdge: "#9ff0e0", soulCore: "#f5fbf2", soulYellow: "#fff6c0", soulPink: "#f4b8c8", soulHalo: "#7ff0e4", soulFlick: "#2a5560",
  mass: "#0e0513", hatch: "#2a1535", rose: "#4b2d5a",
  colCore: "#fff1b8", colMid: "#ffe9b8", colOuter: "#ffc83a", colInk: "#e0993a",
  ringA: "#ffe9b8", ringB: "#dfeaff", ringC: "#ffd27a",
  dusk: "#5a3c8a", flash: "#fff6d8",
  shard: "#f3c04e", shardStar: "#fff6d8",
  dust: ["#e6c796", "#d8b07c", "#eed3a6"],
  leaves: ["#b84a22", "#e08a2e", "#f0b840", "#9e2f26", "#d8702a", "#c89a30", "#e9a23b"],
  stones: ["#d0b48a", "#c2a67c", "#b89a74", "#d8c09a"],
  mote: "#ffe3a0", ray: "#ffd488",
  crackCore: "#ffd488", crackEdge: "#d9a93a", unmake: "#ffc760",
  butterfly: "#4a8fe0", butterflyInk: "#1d3a7a",
};

// the bible's clock, seconds
export const T = {
  moteIn: [2.0, 2.6], leafIn: 1.6, weigh: [5.0, 6.4], ring4: 6.4, wind: [6.4, 7.0], swell: [7.0, 7.7],
  release: 7.7, colGrow: 7.7 + 13 / 24, colFade: [9.3, 10.3], swing: [7.85, 8.45], brk: 8.5, slowEnd: 9.3,
  flex: 10.9, crack: [11.4, 13.2], unmake: [13.0, 15.4], ranks: 10.3, butterfly: [5.2, 7.0],
};

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, k) => a + (b - a) * k;

// start time of a named beat if direction wrote one, else the bible default
export function startOf(cue, name, dflt) { const s = cue.since(name); return Number.isFinite(s) ? cue.t - s : dflt; }

// anchors: scene.fx may override ({ scale:[x,y,z], aura:[x,y,z], ranks:[x,y,z] }); defaults are in seal-local-at-origin metres (profile toward +x).
export function anchors(ctx) {
  const o = ctx.scene.fx ?? {};
  const s = ctx.seal.at;
  return {
    scale: o.scale ?? [s[0] + 4.8, s[1] + 2.1, s[2]], // fulcrum, under Aura's raised hand
    aura: o.aura ?? [s[0] + 6.4, s[1], s[2]],
    ranks: o.ranks ?? [s[0] + 15, s[1], s[2]],
    ground: s[1],
  };
}

// The scale's beam angle (rad, + lowers Aura's pan, the +z end): bible 3.11 timeline.
// held level -> 3.0 s tips toward Aura, damped oscillation (e^-4d cos 9d) -> trembles from 6.2 -> swings to the pup 7.85-8.45 (-0.95).
export function scaleTilt(t) {
  if (t < 3.0) return 0;
  let a = 0.34 * (1 - Math.exp(-4 * (t - 3.0)) * Math.cos(9 * (t - 3.0)));
  a += 0.02 * Math.sin(t * 40) * sstep(6.2, 6.6, t) * (1 - sstep(7.4, 7.85, t));
  const sw = sstep(T.swing[0], T.swing[1], t);
  return lerp(a, -0.95, sw);
}
export const BEAM = 0.9 * 1.75, CHAIN = 0.78 * 1.75, PAN = 0.92;
// pan centres (world) for tilt a about fulcrum S: the +z end is Aura's pan, the -z end the pup's
export function pans(S, a, out = { aura: [0, 0, 0], pup: [0, 0, 0] }) {
  const c = Math.cos(a), s = Math.sin(a);
  out.aura[0] = S[0]; out.aura[1] = S[1] - s * BEAM - CHAIN; out.aura[2] = S[2] + c * BEAM;
  out.pup[0] = S[0]; out.pup[1] = S[1] + s * BEAM - CHAIN; out.pup[2] = S[2] - c * BEAM;
  return out;
}

// Seal-clear chunk (L1, L2): an additive fx fragment that lies between lens and seal is faded out within a disc around the seal.
//   rd = unit(wp - cam), sc = seal - cam, along = rd . sc, dist = |sc - rd along|
//   behind = smoothstep(along - .2R, along + .8R, |wp - cam|)   (1 behind the seal, 0 in front)
//   clear  = max(smoothstep(.9R, 1.5R, dist), behind)           (0 = fully hidden: it would cover the seal)
export const GLSL_CLEAR = /* glsl */ `
uniform vec3 uSeal; uniform float uSealR;
float sealClear(vec3 wp){
  vec3 d = wp - cameraPosition; float L = length(d); vec3 rd = d / max(L, 1e-4);
  vec3 sc = uSeal - cameraPosition; float along = dot(sc, rd); float dist = length(sc - rd * along);
  float behind = smoothstep(along - 0.2 * uSealR, along + 0.8 * uSealR, L);
  return max(smoothstep(0.9 * uSealR, 1.5 * uSealR, dist), behind);
}`;
// screen-space variant for full-frame quads: clip-space disc around the projected seal (aspect-corrected)
export const GLSL_SCREEN_CLEAR = /* glsl */ `
uniform vec3 uSeal; uniform float uSealR;
varying vec2 vNdc; varying vec3 vSealNdc;
`;

export const GLSL_NOISE = /* glsl */ `
float h11(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
`;

// one shared uniform block: every material points at THESE objects so one write updates all
export function makeShared(THREE) {
  return { uSeal: { value: new THREE.Vector3() }, uSealR: { value: 0.45 }, uT: { value: 0 } };
}

export function shader(THREE, { vert, frag, uniforms = {}, add = false, depthTest = true, depthWrite = false, side = THREE.DoubleSide, transparent = true }) {
  const m = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent, depthTest, depthWrite, side });
  if (add) { m.blending = THREE.AdditiveBlending; }
  m.toneMapped = false; m.fog = false;
  return m;
}

// stretch a unit cylinder (height 1 along y) between two points
export function bar(mesh, a, b, r, THREE) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1e-4;
  mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L));
  mesh.scale.set(r, L, r);
}

// flat fan triangle pushed into position/color arrays (used by the 2-tone puff, the flat shards)
export function pushFan(pos, col, pts, c0, color) {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    pos.push(c0[0], c0[1], c0[2], a[0], a[1], a[2], b[0], b[1], b[2]);
    for (let k = 0; k < 3; k++) col.push(color[0], color[1], color[2]);
  }
}

// flat colour, optional additive, seal-cleared: for bars, glints, motes (instance matrices and instance colours supported)
export function flatMat(THREE, S, { color = "#fff", alpha = 1, add = false, vertexColors = false, depthTest = true, side = THREE.DoubleSide }) {
  const vert = /* glsl */ `
    varying vec3 vW; varying vec3 vC;
    void main(){
      vec4 lp = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        lp = instanceMatrix * lp;
      #endif
      vec4 wp = modelMatrix * lp; vW = wp.xyz;
      vC = vec3(1.0);
      #ifdef VC
        vC = color;
      #endif
      #ifdef USE_INSTANCING_COLOR
        vC *= instanceColor;
      #endif
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`;
  const frag = /* glsl */ `
    uniform vec3 uCol; uniform float uA; varying vec3 vW; varying vec3 vC;
    ${GLSL_CLEAR}
    void main(){ gl_FragColor = vec4(uCol * vC, uA * sealClear(vW)); }`;
  const m = shader(THREE, { vert, frag, uniforms: { uCol: { value: new THREE.Color(color) }, uA: { value: alpha }, uSeal: S.uSeal, uSealR: S.uSealR }, add, depthTest, side });
  m.defines = {}; if (vertexColors) m.defines.VC = 1; m.vertexColors = vertexColors;
  return m;
}
