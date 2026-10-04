// THE TWO SMASHES' EFFECTS, all built at mount (nothing is made mid-scene): the Detroit Smash's focus lines,
// afterimages and shockwave ring, and the United States of Smash's cracked-glass screen. Each is a mesh the
// world holds a frame-in-front-of-the-lens (screen) or in the street (ring, ghosts).
import { AdditiveBlending, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry, ShaderMaterial, SphereGeometry } from "three";
import { PRINT, u } from "./print";

const vert = "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const screen = (uniforms, frag) =>
  new ShaderMaterial({ uniforms: { uK: u(0), uAsp: u(1.5), uCen: u([0, 0]), uT: u(0), ...uniforms }, transparent: true, depthTest: false, depthWrite: false, vertexShader: vert, fragmentShader: `uniform float uK, uAsp, uT; uniform vec2 uCen; varying vec2 vUv; ${PRINT} ${frag}` });

// manga focus lines round the dashing pup (uCen, in screen units), white on the edges, 12 drawings a second
export function focusFx() {
  const g = new PlaneGeometry(1, 1);
  const m = screen({}, /* glsl */ `
    void main() {
      vec2 p = (vUv - 0.5) * 2.0 * vec2(uAsp, 1.0) - uCen;
      float r = length(p);
      float a = atan(p.y, p.x) * 90.0 / 6.2831;
      float id = floor(a);
      float seed = h21(vec2(id, floor(uT * 12.0)));
      float w = 0.18 + 0.5 * seed;
      float line = step(fract(a), w) * step(0.38, seed);
      float edge = smoothstep(0.35 + 0.5 * seed, 1.5, r);
      float al = line * edge * uK;
      if (al < 0.01) discard;
      gl_FragColor = vec4(pow(mix(vec3(1.0, 0.96, 0.85), vec3(1.0, 0.82, 0.1), step(0.8, seed)), vec3(2.2)), al);
    }`);
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 33;
  mesh.visible = false;
  return { mesh, g, m };
}

// the screen CRACK: spiderweb glass from the fist's point of impact, shards in comic halftone, white-cored cracks
export function crackFx() {
  const g = new PlaneGeometry(1, 1);
  const m = screen({}, /* glsl */ `
    void main() {
      vec2 p = (vUv - 0.5) * 2.0 * vec2(uAsp, 1.0) - uCen;
      float r = length(p);
      float s = (atan(p.y, p.x) / 6.2831 + 0.5) * 16.0;
      float sec = floor(s);
      float reach = (0.9 + 2.2 * h21(vec2(sec, 3.0))) * uK;
      float inR = 1.0 - smoothstep(reach - 0.05, reach, r);
      // radial cracks
      float dr = abs(fract(s + 0.4 * (h21(vec2(sec, 9.0)) - 0.5)) - 0.5) * 0.39 * r;
      // concentric cracks, offset per sector so the glass breaks into irregular plates
      float ring = r * 4.2 + 0.9 * h21(vec2(sec, 7.0));
      float dc = abs(fract(ring) - 0.5) / 4.2 * 0.5 + 0.0;
      float ringOn = 1.0 - smoothstep(0.0, 0.35, reach / 2.4 - r * 0.9) * 0.0;
      float d = min(dr, mix(9.0, dc, step(r, reach * 0.62)));
      float core = (1.0 - smoothstep(0.003, 0.009, d)) * inR;
      float edge = (1.0 - smoothstep(0.012, 0.03, d)) * inR;
      // shards: each plate its own tone under a Ben-Day screen
      float hc = h21(vec2(sec, floor(ring)));
      float dots = step(length(fract(p * 30.0) - 0.5), 0.18 + 0.3 * hc);
      vec3 tint = hc < 0.5 ? vec3(0.05, 0.78, 1.0) : vec3(1.0, 0.18, 0.62);
      float plate = inR * mix(0.07 + 0.17 * dots * step(0.25, hc), 0.0, uT * 0.8);
      vec3 col = tint;
      float al = plate;
      col = mix(col, vec3(0.04, 0.03, 0.08), edge);
      al = max(al, edge * 0.85);
      col = mix(col, vec3(1.0, 0.99, 0.9), core);
      al = max(al, core);
      // the blow's own dent: a dark dotted crater at the point of impact
      float cr = (1.0 - smoothstep(0.1, 0.22, r)) * uK;
      col = mix(col, vec3(0.04, 0.03, 0.08), cr * 0.8);
      al = max(al, cr * (0.55 + 0.4 * dots));
      if (al < 0.01) discard;
      gl_FragColor = vec4(pow(col, vec3(2.2)), al);
    }`);
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 36;
  mesh.visible = false;
  return { mesh, g, m };
}

// the shockwave ring at the Detroit Smash's impact, facing the lens
export function ringFx() {
  const g = new RingGeometry(0.88, 1, 56);
  const m = new MeshBasicMaterial({ color: "#fff3b0", transparent: true, opacity: 0, side: DoubleSide, depthTest: false, depthWrite: false, blending: AdditiveBlending });
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 21;
  mesh.visible = false;
  return { mesh, g, m };
}

// motion-blur afterimages: N ghosts of the pup's body, left along the dash, in the print's cyan and magenta
export function ghostsFx(n = 5) {
  const g = new SphereGeometry(0.62, 12, 8);
  const ms = [];
  const meshes = [];
  for (let i = 0; i < n; i++) {
    const m = new MeshBasicMaterial({ color: i % 2 ? "#ff2d8a" : "#19d3ff", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
    const mesh = new Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.renderOrder = 17;
    ms.push(m);
    meshes.push(mesh);
  }
  return { meshes, g, ms };
}
