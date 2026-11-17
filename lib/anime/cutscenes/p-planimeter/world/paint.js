// The room's paint: one edit to the live cel shader (paper tooth, wall foot, wainscot seam, window gloss) and the flat
// materials the set and dress share. Every fragment writes alpha 0.99 (the engine reads alpha as the object id).
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, ShaderMaterial } from "three";
import { Mesher } from "../live/room.js";
import { FLOOR } from "../live/layout.js";

export function concat(geos) {
  const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const names = Object.keys(flat[0].attributes).filter((n) => flat.every((g) => g.attributes[n]));
  const out = new BufferGeometry();
  for (const n of names) {
    const size = flat[0].attributes[n].itemSize;
    const arr = new Float32Array(flat.reduce((s, g) => s + g.attributes[n].array.length, 0));
    let o = 0;
    for (const g of flat) { arr.set(g.attributes[n].array, o); o += g.attributes[n].array.length; }
    out.setAttribute(n, new BufferAttribute(arr, size));
  }
  return out;
}

const LAST = "gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(2.2)), 0.99);";
const PAINT = /* glsl */ `
  col *= 1.0 + 0.022 * (vn(vP.xy * 38.0 + vP.zz * 31.0) - 0.5);
  if (k == 1) { float st = smoothstep(0.82, 1.0, sin(vP.x * 9.0 + vP.z * 0.6) * 0.5 + 0.5); col += vec3(1.0, 0.78, 0.4) * 0.12 * st * smoothstep(-0.5, 2.5, vP.z); }
  col *= 1.0 - 0.20 * (1.0 - smoothstep(0.0, 0.55, vP.y + 0.93)) * step(an.y, 0.5);
  col *= 1.0 - 0.14 * (1.0 - smoothstep(0.0, 0.18, abs(vP.y - 0.5))) * float(k == 2);
  ${LAST}`;

export function paintRoom(material) {
  material.fragmentShader = material.fragmentShader.replace(LAST, PAINT);
  material.needsUpdate = true;
  return material;
}

export function flatDecal(rects) {
  const m = new Mesher();
  for (const [x0, z0, x1, z1] of rects) m.slab(x0, FLOOR + 0.014, z0, x1, FLOOR + 0.0152, z1, "#a8683a");
  const mat = new ShaderMaterial({
    side: DoubleSide,
    vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "void main() { gl_FragColor = vec4(pow(vec3(0.659, 0.408, 0.227), vec3(2.2)), 0.99); }",
  });
  const mesh = new Mesh(m.build(), mat);
  mesh.frustumCulled = false;
  return mesh;
}

export function flatVertexMaterial() {
  return new ShaderMaterial({
    side: DoubleSide,
    vertexShader: "attribute vec3 aCol; varying vec3 vC; void main() { vC = aCol; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 vC; void main() { gl_FragColor = vec4(pow(vC, vec3(2.2)), 0.99); }",
  });
}
