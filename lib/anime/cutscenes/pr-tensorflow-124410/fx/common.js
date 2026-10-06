// FX helpers for pr-tensorflow-124410 (JoJo Part 3, DIO: MUDA). Layer-local; Consolidate may promote them.
// Everything here is a pure function of the clock, so scrubbing == playing (no Math.random, no state).
//
// Maths used throughout:
//   hash(n)        fract(sin(n*127.1+311.7)*43758.5453): a cheap deterministic [0,1) per integer n.
//   sstep(a,b,x)   Hermite smoothstep on clamp((x-a)/(b-a)).
//   frame L        seal-local metres -> world: world = at + right*x + up*y + fwd*z, fwd=(sin yaw,0,cos yaw),
//                  right=(cos yaw,0,-sin yaw). Same convention as the camera rig (z forward, x right, y up).
//   screen plane   a quad glued to the camera at view depth D: clip = P * (x*D/P00, y*D/P11, -D, 1).
//                  Its depth is exactly D, so depth-tested against the seal (D = seal view depth + margin) it can
//                  tint/invert/draw over the WORLD but never over the seal (L: seal never covered).
//   billboard      centre + camRight*x*w + camUp*y*h, axes read from viewMatrix rows.
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---- bible time table (used when scene.js has no beat of that name) -------------------------------------
// Beat aliases: the direction agent may name beats any of these; the first one found wins.
export const ALIAS = {
  muda: ["muda", "barrage", "mudafan", "muda-fan"],
  timestop: ["timestop", "time-stop", "zawarudo", "stop", "invert"],
  tear: ["tear", "postertear", "poster-tear"],
  drown: ["drown", "drowning", "edgefall", "fall"],
  gogogo: ["gogogo", "glyphs"],
  clock: ["clock"],
  banana: ["banana"],
  roller: ["roller", "roadroller"],
};
export const FALLBACK = {
  muda: [5.0, 1.21], timestop: [6.21, 1.25], tear: [9.54, 0.83], drown: [7.46, 2.0],
  gogogo: [1.5, 11.5], clock: [5.0, 4.0], banana: [6.9, 2.6], roller: [3.0, 10.0],
};

// the beat for `key`: { t, dur, args } from scene.beats, else the bible fallback. Last beat of that name wins.
export function beatOf(ctx, key) {
  const names = ALIAS[key] || [key];
  let hit = null;
  for (const b of ctx.scene.beats || []) if (names.includes(b.name)) hit = b;
  if (hit) return { t: hit.t, dur: hit.dur ?? FALLBACK[key]?.[1] ?? 1, args: hit, authored: true };
  const f = FALLBACK[key] || [0, 1];
  return { t: f[0], dur: f[1], args: {}, authored: false };
}

// seal-local frame at the current instant (the seal handle is live: at, yaw, scale)
export function makeFrame(ctx) {
  const { THREE, seal } = ctx;
  const V = THREE.Vector3;
  const f = new V(), r = new V();
  const api = {
    update() { const y = seal.yaw || 0; f.set(Math.sin(y), 0, Math.cos(y)); r.set(Math.cos(y), 0, -Math.sin(y)); },
    L(x, y, z, out = new V()) {
      const s = seal.scale || 1;
      return out.set(seal.at[0] + (r.x * x + f.x * z) * s, seal.at[1] + y * s, seal.at[2] + (r.z * x + f.z * z) * s);
    },
    fwd: f, right: r,
  };
  api.update();
  return api;
}

// ---- screen-glued quad with depth D just behind the seal ---------------------------------------------------
const SP_VERT = /* glsl */ `
  varying vec2 vUv; uniform float uD;
  void main(){ vUv = uv;
    vec4 v = vec4(position.x * uD / projectionMatrix[0][0], position.y * uD / projectionMatrix[1][1], -uD, 1.0);
    gl_Position = projectionMatrix * v; }`;

export function screenPlane(ctx, { frag, uniforms = {}, blend = "normal", order = 100, margin = 0.55 }) {
  const { THREE, seal } = ctx;
  const u = { uD: { value: 40 }, uAspect: { value: 1.78 }, uT: { value: 0 }, ...uniforms };
  const mat = new THREE.ShaderMaterial({ vertexShader: SP_VERT, fragmentShader: frag, uniforms: u, transparent: true, depthWrite: false, depthTest: true, toneMapped: false, side: THREE.DoubleSide });
  if (blend === "multiply") { mat.blending = THREE.CustomBlending; mat.blendSrc = THREE.DstColorFactor; mat.blendDst = THREE.ZeroFactor; mat.blendSrcAlpha = THREE.ZeroFactor; mat.blendDstAlpha = THREE.OneFactor; }
  // invert: out = src * (1 - dst) with src = 1  ->  1 - dst  (a hard complement of the colour already drawn)
  else if (blend === "invert") { mat.blending = THREE.CustomBlending; mat.blendSrc = THREE.OneMinusDstColorFactor; mat.blendDst = THREE.ZeroFactor; mat.blendSrcAlpha = THREE.ZeroFactor; mat.blendDstAlpha = THREE.OneFactor; }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = order; mesh.visible = false;
  const tmp = new THREE.Vector3();
  mesh.onBeforeRender = (r, s, cam) => {
    seal.chest(tmp); tmp.applyMatrix4(cam.matrixWorldInverse);
    u.uD.value = Math.max(0.5, -tmp.z + margin * (seal.scale || 1));
    u.uAspect.value = ctx.aspect();
  };
  return mesh;
}

// ---- billboard (world-anchored, camera-facing) ----------------------------------------------------------------
export const BB_VERT = /* glsl */ `
  varying vec2 vUv; uniform vec3 uOrigin; uniform vec2 uSize; uniform float uRot;
  void main(){ vUv = uv;
    vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 U = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec2 q = position.xy; float c = cos(uRot), s = sin(uRot); q = vec2(c*q.x - s*q.y, s*q.x + c*q.y);
    vec3 w = uOrigin + R * q.x * uSize.x + U * q.y * uSize.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`;

export function billboard(ctx, { frag, uniforms = {}, blending, order = 140, depthTest = true }) {
  const { THREE } = ctx;
  const u = { uOrigin: { value: new THREE.Vector3() }, uSize: { value: new THREE.Vector2(1, 1) }, uRot: { value: 0 }, ...uniforms };
  const mat = new THREE.ShaderMaterial({ vertexShader: BB_VERT, fragmentShader: frag, uniforms: u, transparent: true, depthWrite: false, depthTest, blending: blending ?? THREE.NormalBlending, side: THREE.DoubleSide, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false; mesh.renderOrder = order; mesh.visible = false;
  return { mesh, u, mat };
}

// ---- 3-step cel + diagonal hatch, with a constant-width ink hull (instanced or not) ----------------------------
// shade d = dot(N, Ldir) + 0.18*(diagonal of world pos); steps lit > .35 | mid > -.15 | shadow; shadow band gets
// a 45 degree ink hatch  step(.5, fract((fx + fy) * .11)). Colours per instance via aGhost (afterimage tint).
export const CEL_VERT = /* glsl */ `
  uniform float uHull, uPx; varying vec3 vN; varying vec3 vW; varying float vG;
  attribute float aGhost;
  void main(){
    vec4 p = vec4(position, 1.0); vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vec4 w = modelMatrix * p; vN = normalize(mat3(modelMatrix) * n); vW = w.xyz; vG = aGhost;
    vec4 pv = viewMatrix * w;
    if (uHull > 0.5) { vec3 nv = normalize(mat3(viewMatrix) * vN); pv.xyz += nv * (-pv.z) * uPx / projectionMatrix[1][1]; }
    gl_Position = projectionMatrix * pv; }`;
export const CEL_FRAG = /* glsl */ `
  uniform float uHull; uniform vec3 uLit, uMid, uShade, uInk, uGhost; uniform vec3 uL;
  varying vec3 vN; varying vec3 vW; varying float vG;
  void main(){
    if (uHull > 0.5) { gl_FragColor = vec4(uInk, 1.0); return; }
    float d = dot(normalize(vN), normalize(uL)) + 0.18 * (vW.x * 0.35 - vW.y * 0.25);
    vec3 c = d > 0.35 ? uLit : (d > -0.15 ? uMid : uShade);
    float hatch = step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) * 0.11));
    if (d <= -0.15) c = mix(c, uShade * 0.62, hatch * 0.55);
    c = mix(c, uGhost, vG * 0.55);   // afterimage drawings lean to the panel violet
    gl_FragColor = vec4(c, 1.0); }`;

export function celPair(ctx, geo, { lit, mid, shade, ink = "#05020a", ghost = "#5a2a8a", px = 0.0042, instances = 0, order = 130, light = [0.5, 0.8, 0.3] }) {
  const { THREE } = ctx;
  const C = (h) => new THREE.Color(h);
  const mk = (hull, side) => new THREE.ShaderMaterial({ vertexShader: CEL_VERT, fragmentShader: CEL_FRAG, side, toneMapped: false,
    uniforms: { uHull: { value: hull }, uPx: { value: px }, uLit: { value: C(lit) }, uMid: { value: C(mid) }, uShade: { value: C(shade) }, uInk: { value: C(ink) }, uGhost: { value: C(ghost) }, uL: { value: new THREE.Vector3(...light) } } });
  let g = geo;
  if (instances) { g = geo.clone(); g.setAttribute("aGhost", new THREE.InstancedBufferAttribute(new Float32Array(instances), 1)); }
  else if (!g.getAttribute("aGhost")) g.setAttribute("aGhost", new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count), 1));
  const body = instances ? new THREE.InstancedMesh(g, mk(0, THREE.FrontSide), instances) : new THREE.Mesh(g, mk(0, THREE.FrontSide));
  const hull = instances ? new THREE.InstancedMesh(g, mk(1, THREE.BackSide), instances) : new THREE.Mesh(g, mk(1, THREE.BackSide));
  if (instances) { hull.instanceMatrix = body.instanceMatrix; body.instanceMatrix.setUsage(THREE.DynamicDrawUsage); body.count = hull.count = 0; }
  for (const m of [body, hull]) { m.frustumCulled = false; m.renderOrder = order; }
  hull.renderOrder = order - 1;
  return { body, hull, geo: g };
}

// ---- lettering atlas: brush letters with black outline + magenta drop shadow -----------------------------------
// canvas 1024x512, 4x2 cells of 256x256: GO(ゴ) MUDA TICK TOCK / DA(ダ) ZA 2 ROAD. Deterministic (pure draw).
export const ATLAS_CELLS = { GO: 0, MUDA: 1, TICK: 2, TOCK: 3, DA: 4, ZA: 5, ROLL: 6, ORA: 7 };
export function makeAtlas(THREE) {
  if (typeof document === "undefined") return { tex: null, cell: () => [0, 0] };
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 512;
  const g = cv.getContext("2d");
  const font = (px, w = 900) => `${w} ${px}px "Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP","Hiragino Sans","Impact","Arial Black",sans-serif`;
  const word = (txt, cx, cy, px, rot, wide = 1) => {
    g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(wide, 1); g.textAlign = "center"; g.textBaseline = "middle"; g.font = font(px);
    g.lineJoin = "round"; g.lineCap = "round";
    g.fillStyle = "#d02a9a"; g.fillText(txt, 8, 9);                               // magenta shadow
    g.strokeStyle = "#05020a"; g.lineWidth = px * 0.17; g.strokeText(txt, 0, 0);   // black outline
    const gr = g.createLinearGradient(0, -px / 2, 0, px / 2); gr.addColorStop(0, "#fff29a"); gr.addColorStop(0.55, "#ffe14a"); gr.addColorStop(1, "#ff9a2a");
    g.fillStyle = gr; g.fillText(txt, 0, 0);
    g.restore();
  };
  const cells = [["ゴ", 0.0, 190], ["MUDA", 0.04, 96], ["TICK", -0.05, 96], ["TOCK", 0.05, 96], ["ダ", 0, 190], ["ZA", -0.04, 140], ["ROLL", 0.03, 80], ["ORA", -0.03, 120]];
  cells.forEach(([txt, rot, px], i) => word(txt, (i % 4) * 256 + 128, ((i / 4) | 0) * 256 + 128, px, rot, txt === "MUDA" ? 0.86 : 1));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex, cell: (name) => { const i = ATLAS_CELLS[name] ?? 0; return [(i % 4) / 4, 1 - (((i / 4) | 0) + 1) / 2]; } };
}

// screen-space lettering quad. Local quad [-.5,.5]^2 scaled by h (NDC-y units) and cell aspect, rotated in pixel
// space, then x /= aspect. UV = cell origin + uv*(1/4, 1/2). Output sRGB atlas colour; alpha = atlas alpha.
const LET_VERT = /* glsl */ `
  varying vec2 vUv; uniform vec2 uC; uniform float uH, uRot, uAspect, uCellA; uniform vec2 uCell;
  void main(){ vUv = uCell + uv * vec2(0.25, 0.5);
    vec2 q = position.xy * vec2(uCellA, 1.0) * uH; float c = cos(uRot), s = sin(uRot);
    q = vec2(c*q.x - s*q.y, s*q.x + c*q.y); q.x /= uAspect;
    gl_Position = vec4(uC + q, 0.0, 1.0); }`;
const LET_FRAG = /* glsl */ `
  varying vec2 vUv; uniform sampler2D uTex; uniform float uA;
  void main(){ vec4 c = texture2D(uTex, vUv); if (c.a * uA < 0.02) discard; gl_FragColor = vec4(c.rgb, c.a * uA); }`;
export function letter(ctx, atlas, order = 160) {
  const { THREE } = ctx;
  const u = { uTex: { value: atlas.tex }, uC: { value: new THREE.Vector2() }, uH: { value: 0.4 }, uRot: { value: 0 }, uAspect: { value: 1.78 }, uCellA: { value: 1 }, uCell: { value: new THREE.Vector2() }, uA: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: LET_VERT, fragmentShader: LET_FRAG, uniforms: u, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false; mesh.renderOrder = order; mesh.visible = false;
  mesh.onBeforeRender = () => { u.uAspect.value = ctx.aspect(); };
  return { mesh, u, show(name, x, y, h, rot, a = 1, cellA = 1) { const c = atlas.cell(name); u.uCell.value.set(c[0], c[1]); u.uC.value.set(x, y); u.uH.value = h; u.uRot.value = rot; u.uA.value = a; u.uCellA.value = cellA; mesh.visible = true; }, hide() { mesh.visible = false; } };
}

// ---- shared GLSL snippets -------------------------------------------------------------------------------
// h21: hash; vnoise: value noise; sdSeg: distance to a segment
export const GLSL_UTIL = /* glsl */ `
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
  float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/dot(ba,ba), 0., 1.); return length(pa - ba*h); }
`;
export const own = (list) => (o) => { list.push(o); return o; };
