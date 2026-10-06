// Shared helpers for the pr-nemo-relay-481 FX layer. Pure functions of the clock (scrub == play).
export const GLSL_NOISE = /* glsl */ `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// value noise: bilinear blend of lattice hashes with smoothstep weights u = f^2 (3 - 2f)
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
// fbm: 3 octaves, amplitude 1/2, frequency x2.03 (bible: noisy fizz, 3 octaves)
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++){ s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
`;
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const sstep = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };

// Beat windows: scene.js beats are authoritative; the bible's time is the fallback (so the layer plays alone).
export function makeWin(scene) {
  const beats = scene.beats || [];
  return (name, fb0, fbdur) => {
    const b = beats.find((x) => x.name === name);
    return b ? { t0: b.t, dur: b.dur ?? fbdur, has: true, b } : { t0: fb0, dur: fbdur, has: false, b: null };
  };
}
// k in 0..1 across the window, or -1 before, 2 after
export const wk = (w, t) => (t < w.t0 ? -1 : t > w.t0 + w.dur ? 2 : (t - w.t0) / Math.max(1e-4, w.dur));

// Seal frame helpers: seal-local (x right, y up, z forward) to world.
export function sealFrame(ctx) {
  const THREE = ctx.THREE, s = ctx.seal;
  const base = new THREE.Vector3(), chest = new THREE.Vector3();
  const f = { base, chest, yaw: 0, H: 1, c: 1, s: 0 };
  f.update = () => {
    s.group.getWorldPosition(base);
    f.yaw = typeof s.yaw === "number" ? s.yaw : s.group.rotation.y;
    f.H = (typeof s.height === "number" ? s.height : 1) || 1;
    f.c = Math.cos(f.yaw); f.s = Math.sin(f.yaw);
    chest.set(base.x, base.y + f.H * 0.55, base.z);
  };
  f.world = (x, y, z, out) => out.set(base.x + x * f.c + z * f.s, base.y + y, base.z - x * f.s + z * f.c);
  f.update();
  return f;
}

// A camera-facing card placed `back` metres behind the seal's chest (so the seal always draws in front).
export function makeCard(ctx, frag, uniforms, w, h, opts = {}) {
  const THREE = ctx.THREE;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uA: { value: 0 }, uSeed: { value: 0 }, ...uniforms },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: GLSL_NOISE + frag,
    transparent: true, depthWrite: false, depthTest: true,
    blending: opts.blending ?? THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.frustumCulled = false; mesh.renderOrder = opts.order ?? 4; mesh.visible = false;
  const anchor = new THREE.Vector3(), dir = new THREE.Vector3();
  mesh.userData.anchor = anchor; mesh.userData.back = opts.back ?? 0.5; mesh.userData.lift = opts.lift ?? 0;
  mesh.onBeforeRender = (r, s, cam) => {
    dir.copy(anchor).sub(cam.position).normalize();
    mesh.position.copy(anchor).addScaledVector(dir, mesh.userData.back);
    mesh.position.y += mesh.userData.lift;
    mesh.quaternion.copy(cam.quaternion);
    mesh.updateMatrix(); mesh.updateMatrixWorld(true);
  };
  return mesh;
}
export function disposeAll(obj) {
  obj.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => x.dispose?.()); });
}
