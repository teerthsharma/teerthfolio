// FX helpers for p-epsilon-hollow (layer-local; Consolidate may promote `points` and `screenQuad`).
//
// THE COMPOSITE RULE (post.js COMP): a character-layer pixel wins only where alpha > 0.5 AND its depth is nearer than the plate's.
// So every fx here is OPAQUE (alpha 1, no blending): soft glow is a halftone stipple, never a blend. Values above 1 bloom.
//
//   points()      one THREE.Points system whose motion is a pure function of a clock uniform uT (a stepped clock, so
//                 scrubbing equals playing). GLSL supplies `void place(out vec3 p, out float size, out vec3 col, out float alive)`.
//                 Point size in px:  s_px = size_m * uPx / d,  uPx = H / (2 tan(fov/2)),  d = view depth.
//                 The hero is protected: any point within KEEP metres (x seal scale) of the chest is culled (L1/L2).
//   screenQuad()  a clip-space quad (gl_Position = (xy, z, 1)) painted in frame coordinates, depth-placed JUST BEHIND the seal:
//                 d_quad = dot(chest - eye, forward) + behind * scale,  z_ndc = (P10 (-d) + P14) / d   (perspective P)
//                 so the seal (nearer) always draws over the overlay, and everything farther is covered by it.
export const col = (THREE, hex) => new THREE.Color(hex);

export const HASH = /* glsl */ `
  float hh(float x) { return fract(sin(x * 127.1 + 311.7) * 43758.5453); }
  float hh2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hh(i), hh(i + 1.0), f); }
  float vn2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hh2(i), hh2(i + vec2(1, 0)), f.x), mix(hh2(i + vec2(0, 1)), hh2(i + vec2(1, 1)), f.x), f.y); }`;

const KEEP = 1.15; // metres x seal scale: nothing small and bright floats over the pup

export function points(ctx, { n, place, uniforms = {}, shape = 0, tex = null, seed = 1, grid = [8, 4] }) {
  const { THREE } = ctx, rnd = ctx.rng(seed);
  const aS = new Float32Array(n * 4);
  for (let i = 0; i < aS.length; i++) aS[i] = rnd();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute("aS", new THREE.BufferAttribute(aS, 4));
  const u = { uT: { value: 0 }, uPx: { value: 600 }, uKeep: { value: new THREE.Vector4() }, uTex: { value: tex }, uGrid: { value: new THREE.Vector2(...grid) }, ...uniforms };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthTest: true, depthWrite: true,
    vertexShader: /* glsl */ `${HASH}
      uniform float uT; uniform float uPx; uniform vec4 uKeep; attribute vec4 aS;
      varying vec3 vCol; varying float vLab;
      ${place}
      void main() {
        vec3 p; float size; vec3 c; float alive; place(p, size, c, alive);
        if (length(p - uKeep.xyz) < uKeep.w) alive = 0.0;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        vCol = c; vLab = floor(fract(aS.y * 7.31 + aS.w * 3.1) * 31.0);
        gl_PointSize = clamp(size * uPx / max(-mv.z, 0.1), 1.5, 256.0);
        gl_Position = alive > 0.5 && size > 0.0 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex; uniform vec2 uGrid; varying vec3 vCol; varying float vLab;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        if (${shape} == 1 && abs(q.x) + abs(q.y) > 1.0) discard;                       // diamond ember
        if (${shape} == 2) { vec2 cell = vec2(mod(vLab, uGrid.x), floor(vLab / uGrid.x));  // glyph atlas (PR numbers)
          vec2 uv = vec2((cell.x + gl_PointCoord.x) / uGrid.x, 1.0 - (cell.y + gl_PointCoord.y) / uGrid.y); // canvas row 0 is the top
          if (texture2D(uTex, uv).a < 0.5) discard; }
        gl_FragColor = vec4(vCol, 1.0);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  const c = new THREE.Vector3(), sz = new THREE.Vector2();
  pts.onBeforeRender = (r, s, cam) => {
    const rt = r.getRenderTarget(), h = rt ? rt.height : r.getDrawingBufferSize(sz).y;
    u.uPx.value = h / (2 * Math.tan((cam.fov * Math.PI) / 360));
    ctx.seal.chest(c);
    u.uKeep.value.set(c.x, c.y, c.z, KEEP * ctx.seal.scale);
  };
  pts.userData.dispose = () => { geo.dispose(); mat.dispose(); tex?.dispose?.(); };
  return pts;
}

export function screenQuad(ctx, { frag, uniforms = {}, behind = 0.6 }) {
  const { THREE } = ctx;
  const u = { uZ: { value: 0.99 }, uAsp: { value: 1.6 }, uRes: { value: new THREE.Vector2(1280, 720) }, ...uniforms };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthTest: true, depthWrite: true,
    vertexShader: "varying vec2 vN; uniform float uZ; void main() { vN = position.xy; gl_Position = vec4(position.xy, uZ, 1.0); }",
    fragmentShader: `${HASH}\nvarying vec2 vN; uniform float uZ; uniform float uAsp; uniform vec2 uRes;\n${frag}`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 900;
  const v = new THREE.Vector3(), f = new THREE.Vector3(), sz = new THREE.Vector2();
  mesh.onBeforeRender = (r, s, cam) => {
    const rt = r.getRenderTarget();
    if (rt) sz.set(rt.width, rt.height); else r.getDrawingBufferSize(sz);
    u.uRes.value.copy(sz); u.uAsp.value = sz.x / Math.max(1, sz.y);
    cam.getWorldDirection(f); ctx.seal.chest(v).sub(cam.position);
    const d = Math.max(cam.near * 2, v.dot(f) + behind * ctx.seal.scale), P = cam.projectionMatrix.elements;
    u.uZ.value = (P[10] * -d + P[14]) / d;
  };
  mesh.userData.dispose = () => { mesh.geometry.dispose(); mat.dispose(); };
  return mesh;
}
