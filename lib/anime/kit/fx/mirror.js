// MIRROR: a horizontal planar mirror at height y (black water, a polished floor) showing the scene reflected, by the
// method of three.js Reflector. In the plane's onBeforeRender (the layer-1 character pass) a camera mirrored across the
// plane, with an oblique near plane on the surface, renders layers 0 and 1 into a target at res x the drawing buffer,
// once per step of fps; the plane samples it projectively through a banded ripple reseeded each step, tints it, fades
// it with distance from the eye and mixes it over its own base colour by gain.
//   const m = makeMirror(engine, { y: 0, size: [14, 12], gain: 0.55, tint: "#3d7fc4", exclude: [card] });
//   layer.group.add(m.group); in the layer's update every frame: m.update(ts, cue); m.set({ k }) fades the reflection.
// Options (DEFAULTS): y, at [x, z], size [w, d] m; base (surface colour), sky (empty reflection, null = base); gain, tint,
// tintAmt; ripple px; fade (share of gain lost by fadeDist[1] m from the eye); emit (gain on reflected light above 1, so
// glints bloom); exclude (objects hidden in the reflection only); onPass(on) (true before, false after the pass, for
// reflection-only tweaks); fps (null = the style's); res; id (0.51..0.999, >= 0.98 draws no line art); seed; k.
// The plane is a set: opaque, depth written, id in alpha, layer 1, out of the shadow map and hidden in every mirror's
// pass, so no mirror recurses. Screen-space plates (ctx.bake.plateLayer) cannot mirror: put them in exclude.
import { BoxGeometry, Color, ConeGeometry, Float32BufferAttribute, Group, HalfFloatType, LinearFilter, Matrix4, Mesh, Object3D, PerspectiveCamera, Plane, PlaneGeometry, Quaternion, ShaderMaterial, SphereGeometry, Vector2, Vector3, Vector4, WebGLRenderTarget } from "three";
import { glslFor } from "../../tools/index.js";

export const DEFAULTS = {
  y: 0, at: [0, 0], size: [20, 20], base: "#0e1a26", sky: null,
  gain: 0.5, tint: "#3d7fc4", tintAmt: 0.15, ripple: 1.5, fade: 0.35, fadeDist: [3, 40], emit: 1,
  exclude: [], onPass: null, fps: null, res: 0.5, id: 0.6, seed: 1, k: 1,
};

const NOOP = Object3D.prototype.onBeforeRender;
const LIVE = new Set();
let busy = false;

const VS = /* glsl */ `
  uniform mat4 uTexMat; varying vec4 vProj; varying vec3 vWP;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; vProj = uTexMat * w; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FS = /* glsl */ `
  uniform sampler2D tRefl; uniform vec2 uRes; uniform vec3 uBase; uniform vec3 uTint; uniform vec4 uMix; uniform vec2 uFadeD; uniform vec2 uRip; uniform float uId;
  varying vec4 vProj; varying vec3 vWP;
  ${glslFor(["noise"])}
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  void main() {
    vec2 uv = vProj.xy / vProj.w;
    // ripple: horizontal bands in reflection space (fixed to the plane within a step), each band shifted sideways
    vec2 g = uv * uRes / vec2(28.0, 3.0) + uRip.y;
    vec2 d = vec2(vn(g) - 0.5, 0.35 * (vn(g * 0.7 + 31.7) - 0.5)) * 2.0 * uRip.x;
    vec3 r = texture2D(tRefl, clamp(uv + d / uRes, vec2(0.0), vec2(1.0))).rgb;
    float a = uMix.x * (1.0 - uMix.z * smoothstep(uFadeD.x, uFadeD.y, distance(vWP, cameraPosition)));
    vec3 c = mix(uBase, mix(min(r, vec3(1.0)), uTint, uMix.y), a);
    float y = dot(c, LUMA);
    if (y > 0.92) c *= 0.92 / y;
    gl_FragColor = vec4(c + max(r - 1.0, vec3(0.0)) * a * uMix.w, uId);
  }`;

export function makeMirror(engine, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const rt = new WebGLRenderTarget(4, 4, { type: engine.composer?.type ?? HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter });
  const u = {
    tRefl: { value: rt.texture }, uTexMat: { value: new Matrix4() }, uRes: { value: new Vector2(1280, 800) },
    uBase: { value: new Color() }, uTint: { value: new Color() }, uMix: { value: new Vector4() },
    uFadeD: { value: new Vector2() }, uRip: { value: new Vector2() }, uId: { value: 0.6 },
  };
  const mat = new ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const geo = new PlaneGeometry(1, 1), plane = new Mesh(geo, mat), group = new Group();
  plane.name = "mirror"; plane.rotation.x = -Math.PI / 2;
  plane.userData.layer = 1; plane.userData.noShadow = true; plane.layers.set(1);
  group.add(plane); LIVE.add(plane);
  const vc = new PerspectiveCamera(); vc.layers.mask = 3;
  const sky = new Color(), cc = new Color(), sz = new Vector2(), R = new Matrix4(), pl = new Plane(), clip = new Vector4(), q = new Vector4();
  const P = new Vector3(), E = new Vector3(), N = new Vector3(), V = new Vector3(), L = new Vector3(), T = new Vector3();
  const hid = [], turned = [], qs = [], st = { key: 0, done: NaN, force: true, fps: 12 };
  const visit = (x) => {
    if (x.onBeforeRender === NOOP || LIVE.has(x)) return;
    const i = turned.push(x) - 1;
    (qs[i] ??= new Quaternion()).copy(x.quaternion);
  };

  function apply(p) {
    Object.assign(o, p);
    if ("y" in p || "at" in p || "size" in p) { plane.position.set(o.at[0], o.y, o.at[1]); plane.scale.set(o.size[0], o.size[1], 1); }
    if ("base" in p || "sky" in p) { u.uBase.value.set(o.base); sky.set(o.sky ?? o.base); }
    if ("tint" in p) u.uTint.value.set(o.tint);
    u.uMix.value.set(o.gain * Math.max(0, o.k), o.tintAmt, o.fade, o.emit);
    u.uFadeD.value.set(o.fadeDist[0], o.fadeDist[1]);
    u.uId.value = Math.min(0.999, Math.max(0.51, o.id));
    st.fps = o.fps ?? engine.style?.timing?.fps ?? 12;
  }
  apply(o);

  plane.onBeforeRender = (r, scene, cam) => {
    if (busy || !cam.isPerspectiveCamera || !(u.uMix.value.x > 0) || (st.key === st.done && !st.force)) return;
    P.setFromMatrixPosition(plane.matrixWorld); E.setFromMatrixPosition(cam.matrixWorld);
    R.extractRotation(plane.matrixWorld); N.set(0, 0, 1).applyMatrix4(R);
    V.subVectors(P, E);
    if (V.dot(N) > -1e-6) return;
    V.reflect(N).negate().add(P);
    R.extractRotation(cam.matrixWorld);
    L.set(0, 0, -1).applyMatrix4(R).add(E);
    T.subVectors(P, L).reflect(N).negate().add(P);
    vc.position.copy(V); vc.up.set(0, 1, 0).applyMatrix4(R).reflect(N); vc.lookAt(T);
    vc.near = cam.near; vc.far = cam.far; vc.updateMatrixWorld();
    const M = vc.projectionMatrix.copy(cam.projectionMatrix), e = M.elements;
    u.uTexMat.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(M).multiply(vc.matrixWorldInverse);
    // oblique near plane on the surface (Lengyel): nothing under the water reaches the reflection
    pl.setFromNormalAndCoplanarPoint(N, P).applyMatrix4(vc.matrixWorldInverse);
    clip.set(pl.normal.x, pl.normal.y, pl.normal.z, pl.constant);
    q.set((Math.sign(clip.x) + e[8]) / e[0], (Math.sign(clip.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
    clip.multiplyScalar(2 / clip.dot(q));
    e[2] = clip.x; e[6] = clip.y; e[10] = clip.z + 1; e[14] = clip.w;
    vc.projectionMatrixInverse.copy(M).invert();
    r.getDrawingBufferSize(sz); u.uRes.value.copy(sz);
    const f = o.res * (engine.tier <= 1 ? 0.5 : 1), w = Math.max(1, Math.round(sz.x * f)), h = Math.max(1, Math.round(sz.y * f));
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);

    busy = true;
    const prev = r.getRenderTarget(), face = r.getActiveCubeFace(), mip = r.getActiveMipmapLevel();
    r.getClearColor(cc);
    const ca = r.getClearAlpha(), xr = r.xr.enabled, sau = r.shadowMap.autoUpdate, bg = scene.background;
    for (const x of LIVE) hid.push(x, x.visible);
    for (const x of o.exclude) if (x) hid.push(x, x.visible);
    for (let i = 0; i < hid.length; i += 2) hid[i].visible = false;
    scene.traverse(visit);
    try {
      o.onPass?.(true);
      r.xr.enabled = false; r.shadowMap.autoUpdate = false; scene.background = null;
      r.setRenderTarget(rt); r.setClearColor(sky, 0); r.state.buffers.depth.setMask(true);
      if (!r.autoClear) r.clear();
      r.render(scene, vc);
    } finally {
      r.xr.enabled = xr; r.shadowMap.autoUpdate = sau; scene.background = bg;
      r.setClearColor(cc, ca); r.setRenderTarget(prev, face, mip);
      for (let i = 0; i < hid.length; i += 2) hid[i].visible = hid[i + 1];
      for (let i = 0; i < turned.length; i++) turned[i].quaternion.copy(qs[i]); // camera-facing cards turned to vc
      hid.length = 0; turned.length = 0; busy = false;
      o.onPass?.(false);
    }
    st.done = st.key; st.force = false;
  };

  return {
    group,
    update(ts, cue) {
      st.key = Math.floor(ts * st.fps + 1e-6);
      if (cue?.cut || cue?.dt === 0) st.force = true;
      const s = Math.sin(st.key * 127.1 + o.seed * 311.7) * 43758.5453;
      u.uRip.value.set(o.ripple, (s - Math.floor(s)) * 97);
    },
    set: apply,
    dispose() {
      LIVE.delete(plane); plane.onBeforeRender = NOOP; group.remove(plane);
      rt.dispose(); mat.dispose(); geo.dispose();
    },
  };
}

const fill = (n, c) => { const a = new Float32Array(n * 3); for (let i = 0; i < a.length; i += 3) a.set(c, i); return new Float32BufferAttribute(a, 3); };
function painted(engine, geo, col, shade, id, x, y, z) {
  const n = geo.attributes.position.count;
  geo.setAttribute("aCol", fill(n, new Color(col).toArray())); geo.setAttribute("aShade", fill(n, new Color(shade).toArray())); geo.setAttribute("aXrd", fill(n, [0.5, 1, 0]));
  const m = engine.ink(engine.prop(geo, id));
  m.position.set(x, y, z);
  return m;
}

// three mirrors side by side: black water with a ripple, a still polished floor that drops one card from its
// reflection, and a rippled floor whose reflection fades in and out with k. Each hides the others' props.
export function demo(engine) {
  const group = new Group(), Y = 0.12, X = [-0.68, 0, 0.68], gA = new Group(), gB = new Group(), gC = new Group();
  const pillar = painted(engine, new BoxGeometry(0.14, 0.95, 0.14), "#d1260c", "#5a0a0a", 0.58, X[0], Y + 0.475, -0.2);
  gA.add(pillar, painted(engine, new BoxGeometry(0.1, 0.5, 0.1), "#7fe0e6", "#19828b", 0.6, X[0] + 0.2, Y + 0.25, -0.28));
  for (let i = 0; i < 3; i++) gB.add(painted(engine, new BoxGeometry(0.5 - i * 0.12, 0.12, 0.16), "#f4e8c8", "#999f96", 0.55 + i * 0.01, X[1], Y + 0.06 + i * 0.12, -0.15 - i * 0.12));
  const ball = painted(engine, new SphereGeometry(0.09, 20, 12), "#f4f4f0", "#8a93b0", 0.62, X[1] + 0.16, Y + 0.09, 0.12);
  const card = painted(engine, new BoxGeometry(0.12, 0.2, 0.02), "#ff4d5a", "#7a1e17", 0.63, X[1] - 0.17, Y + 0.1, 0.1);
  gB.add(ball, card);
  const cone = painted(engine, new ConeGeometry(0.15, 0.55, 6), "#ffb040", "#a0521a", 0.64, X[2], Y + 0.275, -0.15);
  gC.add(cone);
  const size = [0.6, 0.8];
  const A = makeMirror(engine, { y: Y, at: [X[0], 0], size, base: "#0c1e1f", gain: 0.45, tint: "#19828b", fadeDist: [1.5, 6], exclude: [gB, gC], seed: 3 });
  const B = makeMirror(engine, { y: Y, at: [X[1], 0], size, base: "#101a2c", gain: 0.55, ripple: 0, fade: 0, exclude: [gA, gC, card] });
  const C = makeMirror(engine, { y: Y, at: [X[2], 0], size, base: "#1a1430", gain: 0.5, tint: "#ff9a2a", tintAmt: 0.2, ripple: 3, exclude: [gA, gB], seed: 7 });
  group.add(gA, gB, gC, A.group, B.group, C.group);
  group.userData.layer = 1;
  group.traverse((x) => x.layers.set(1));
  const kp = { k: 0 };
  return {
    group,
    update(ts) {
      const t = ((ts % 4) + 4) % 4, ph = (t / 4) * Math.PI * 2;
      pillar.rotation.y = ph / 4; cone.rotation.y = -ph / 6;
      ball.position.y = Y + 0.09 + 0.4 * Math.abs(Math.sin(ph));
      kp.k = 0.5 - 0.5 * Math.cos(ph); C.set(kp);
      A.update(t); B.update(t); C.update(t);
    },
    dispose() {
      for (const m of [A, B, C]) m.dispose();
      group.traverse((x) => { x.geometry?.dispose(); x.material?.dispose(); });
    },
  };
}
