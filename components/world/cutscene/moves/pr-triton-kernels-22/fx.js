// The effects: the slash strokes (tapered ink-and-white speed strokes drawn flat to the lens, pooled,
// instanced), the ink lettering, and the small shared helpers. No post pass anywhere.

import { CanvasTexture, DoubleSide, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, ShaderMaterial, SRGBColorSpace } from "three";

const D = new Object3D();
export const mat = (o = {}) => new MeshBasicMaterial({ toneMapped: false, fog: false, ...o });
export function put(m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  D.position.set(x, y, z);
  D.rotation.set(rx, ry, rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
}
export const hide = (m, i) => put(m, i, 0, -90, 0, 0.0001);
export function inst(g, m, n) {
  const mesh = new InstancedMesh(g, m, n);
  mesh.frustumCulled = false;
  return mesh;
}
export const putQ = (m, i, p, q, sx, sy) => {
  D.position.copy(p);
  D.quaternion.copy(q);
  D.scale.set(sx, sy, 1);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
};

// A slash: a tapered stroke, a black edge round a white core; style 1 is the heavy Cleave (red edge).
export function slashMaterial() {
  return new ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vStyle;
      void main() {
        vUv = uv;
        #ifdef USE_INSTANCING_COLOR
          vStyle = instanceColor.r;
        #else
          vStyle = 0.0;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying float vStyle;
      void main() {
        float y = abs(vUv.y * 2.0 - 1.0);
        float w = pow(sin(3.14159 * clamp(vUv.x, 0.0, 1.0)), 0.55);
        float aa = fwidth(y) * 1.2 + 0.02;
        float outer = 1.0 - smoothstep(w - aa, w + aa, y);
        float core = 1.0 - smoothstep(w * 0.46 - aa, w * 0.46 + aa, y);
        if (outer < 0.01) discard;
        vec3 edge = mix(vec3(0.055, 0.045, 0.05), vec3(0.8, 0.04, 0.09), vStyle);
        vec3 c = mix(edge, vec3(0.97, 0.95, 0.9), core);
        gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    side: DoubleSide,
  });
}

// INK LETTERING in the comic face: black strokes with a cream edge and a blood-red misregistration.
export function inkLettering(text) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 320;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const fam = () => getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif";
  const draw = () => {
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    g.translate(c.width / 2, c.height / 2);
    g.rotate(-0.06);
    let px = 200;
    g.font = `800 ${px}px ${fam()}`;
    while (g.measureText(text).width > c.width * 0.92 && px > 60) g.font = `800 ${(px -= 10)}px ${fam()}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.fillStyle = "#c8081c";
    g.fillText(text, px * 0.05, px * 0.04);
    g.lineWidth = px * 0.15;
    g.strokeStyle = "#f4efe2";
    g.strokeText(text, 0, 0);
    g.fillStyle = "#0e0b0d";
    g.fillText(text, 0, 0);
    g.restore();
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load?.(`800 100px ${fam()}`).then(draw, () => {});
  const m = new Mesh(new PlaneGeometry(1, 320 / 1024), mat({ map: tex, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide }));
  m.renderOrder = 30;
  m.frustumCulled = false;
  m.visible = false;
  return m;
}
