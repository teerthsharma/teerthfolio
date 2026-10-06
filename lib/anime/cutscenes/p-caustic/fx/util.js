// Small helpers for the p-caustic FX layer.
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

// win(cue, name, t0, dur) -> {s, k, on}. If the scene defines the beat `name`, time runs from that beat;
// otherwise from the bible's absolute second t0. Either way a window is a pure function of the clock.
export function makeWin(ctx) {
  const names = new Set((ctx.scene.beats || []).map((b) => b.name));
  return (cue, name, t0, dur) => {
    let s = names.has(name) ? cue.since(name) : cue.t - t0;
    if (!isFinite(s)) s = -1;
    return { s, k: clamp01(s / dur), on: s >= 0 && s <= dur };
  };
}

export function disposeAll(group) {
  group.traverse((o) => {
    o.geometry && o.geometry.dispose();
    const m = o.material;
    (Array.isArray(m) ? m : [m]).forEach((x) => x && x.dispose && x.dispose());
  });
}

// An InstancedBufferGeometry from a base geometry plus per-instance attributes {name: [itemSize, Float32Array]}.
export function instanced(THREE, base, n, attrs) {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute("position", base.getAttribute("position"));
  if (base.getAttribute("uv")) g.setAttribute("uv", base.getAttribute("uv"));
  if (base.getAttribute("normal")) g.setAttribute("normal", base.getAttribute("normal"));
  g.instanceCount = n;
  for (const k in attrs) g.setAttribute(k, new THREE.InstancedBufferAttribute(attrs[k][1], attrs[k][0]));
  return g;
}

// A camera-facing radial glow card. uniforms: uA (alpha), uCol (rgb), uPow (falloff exponent).
import { BILL } from "./glsl.js";
export function glowCard(THREE, { size = 10, col = "#ffffff", a = 1, pow = 2, blending = THREE.AdditiveBlending } = {}) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending,
    uniforms: { uA: { value: a }, uCol: { value: new THREE.Color(col) }, uPow: { value: pow }, uS: { value: size } },
    vertexShader: BILL + `varying vec2 vQ; uniform float uS;
      void main(){ vQ=position.xy*2.; vec3 c=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;
        gl_Position=projectionMatrix*viewMatrix*vec4(bill(c,position.xy*2.,uS),1.); }`,
    fragmentShader: `varying vec2 vQ; uniform float uA,uPow; uniform vec3 uCol;
      void main(){ float r=length(vQ); if(r>1.) discard; float a=pow(1.-r,uPow); gl_FragColor=vec4(uCol*a*uA,a*uA);}`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
  mesh.frustumCulled = false;
  return mesh;
}
