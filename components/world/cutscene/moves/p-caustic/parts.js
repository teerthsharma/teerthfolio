// Parts the caustic and Epsilon-Hollow scenes share (the Epsilon-Hollow move
// imports them from here): instancing helpers, the pup's own groups for a
// costume, hand-lettered onomatopoeia on a canvas plane, the full-frame flash
// quad, the shard maths for a shattering backdrop, and putting the island
// back while the stage still stands. No post pass anywhere: every effect is
// a mesh in the scene.

import { BufferAttribute, CanvasTexture, DoubleSide, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SRGBColorSpace } from "three";

const D = new Object3D();
export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const mat = (o = {}) => new MeshBasicMaterial({ toneMapped: false, fog: false, ...o });
export function put(m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  D.position.set(x, y, z);
  D.rotation.set(rx, ry, rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
}
export const hide = (m, i) => put(m, i, 0, -50, 0, 0.0001);
export function inst(g, m, n) {
  const mesh = new InstancedMesh(g, m, n);
  mesh.frustumCulled = false;
  return mesh;
}
// non-indexed, no uv or normal: ready to merge with anything
export const flat = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  return n;
};

// THE PUP'S GROUPS (components/world/seal/variants/D.jsx): the head is the
// group with the most children (face, looks, outfit, halo); the body group
// (`rear`, which carries the body, flippers and tail) is its grandparent.
export function pupParts(scene) {
  const root = scene.getObjectByName("seal");
  if (!root) return null;
  let head = null;
  let n = -1;
  root.traverse((o) => {
    if (o.type === "Group" && o.children.length > n) {
      n = o.children.length;
      head = o;
    }
  });
  return { root, head, rear: head?.parent?.parent ?? null };
}

// HAND LETTERING in the comic face (Shantell Sans, the bubbles' own), ink in
// `color` with a cream stroke and a cyan misregistration, on one plane that
// draws over the scene (depthTest off) where the move puts it.
export function lettering(text, color = "#e0559b", tilt = -0.08) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 320;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d");
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif";
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    g.translate(c.width / 2, c.height / 2);
    g.rotate(tilt);
    let px = 220;
    g.font = `800 ${px}px ${fam}`;
    while (g.measureText(text).width > c.width * 0.9 && px > 60) g.font = `800 ${(px -= 10)}px ${fam}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.fillStyle = "#22d3ee";
    g.globalAlpha = 0.85;
    g.fillText(text, -px * 0.045, px * 0.03);
    g.globalAlpha = 1;
    g.lineWidth = px * 0.14;
    g.strokeStyle = "#fbfaf7";
    g.strokeText(text, 0, 0);
    g.fillStyle = color;
    g.fillText(text, 0, 0);
    g.restore();
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load?.(`800 100px ${getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim()}`).then(draw, () => {});
  const m = new Mesh(new PlaneGeometry(1, 320 / 1024), mat({ map: tex, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide }));
  m.renderOrder = 30;
  m.frustumCulled = false;
  m.visible = false;
  return m;
}

// THE FLASH: one quad held a metre in front of the lens, sized to cover it.
export function flashQuad(color = "#ffffff") {
  const m = new Mesh(new PlaneGeometry(1, 1), mat({ color, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  m.renderOrder = 40;
  m.frustumCulled = false;
  m.visible = false;
  return m;
}
export function holdFlash(m, camera, k) {
  m.visible = k > 0.002;
  if (!m.visible) return;
  m.material.opacity = Math.min(1, k);
  camera.getWorldDirection(m.position);
  m.position.multiplyScalar(1).add(camera.position);
  m.quaternion.copy(camera.quaternion);
  const h = 2 * Math.tan((camera.fov * Math.PI) / 360) * 1.2;
  m.scale.set(h * camera.aspect, h, 1);
}

// SHARDS: a triangle mesh made ready to break. Each triangle gets its centre
// (aCenter), a random (aRand) and barycentric corners (aBary) for the cracks.
// `jitter` moves shared corners together, so the shards are irregular but
// the surface stays closed until it breaks.
export function shardify(geometry, jitter = 0) {
  const g = flat(geometry);
  const p = g.attributes.position;
  const n = p.count;
  if (jitter) {
    for (let i = 0; i < n; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const k = Math.round(x * 31) * 7.13 + Math.round(y * 31) * 3.71 + Math.round(z * 31) * 1.37;
      p.setXYZ(i, x + (hash(k, 1) - 0.5) * jitter, y + (hash(k, 2) - 0.5) * jitter, z + (hash(k, 3) - 0.5) * jitter);
    }
  }
  const center = new Float32Array(n * 3);
  const rand = new Float32Array(n);
  const bary = new Float32Array(n * 3);
  for (let t = 0; t < n; t += 3) {
    const r = hash(t * 0.37 + 0.5, 9);
    for (let k = 0; k < 3; k++) {
      for (let a = 0; a < 3; a++) center[(t + k) * 3 + a] = (p.array[t * 3 + a] + p.array[t * 3 + 3 + a] + p.array[t * 3 + 6 + a]) / 3;
      rand[t + k] = r;
      bary[(t + k) * 3 + k] = 1;
    }
  }
  g.setAttribute("aCenter", new BufferAttribute(center, 3));
  g.setAttribute("aRand", new BufferAttribute(rand, 1));
  g.setAttribute("aBary", new BufferAttribute(bary, 3));
  return g;
}

// The shard motion, in the vertex shader. uBreak: seconds since the break
// (< 0: whole). uPull 1: the shard is first drawn in along its own view ray
// to 11..20 m from the lens (the same picture, now in front of the island),
// then each one gaps, tumbles about its centre, shrinks and falls.
export const SHARD_VERT = /* glsl */ `
  attribute vec3 aCenter;
  attribute float aRand;
  attribute vec3 aBary;
  uniform float uBreak;
  uniform float uPull;
  varying vec3 vOrig;
  varying vec3 vBary;
  varying float vRand;
  vec3 rot(vec3 v, vec3 k, float a) {
    return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a));
  }
  vec3 shard(vec3 pos) {
    vec4 w0 = modelMatrix * vec4(pos, 1.0);
    vOrig = w0.xyz;
    vBary = aBary;
    vRand = aRand;
    if (uBreak <= 0.0) return w0.xyz;
    vec3 c = (modelMatrix * vec4(aCenter, 1.0)).xyz;
    vec3 rel = w0.xyz - c;
    float tau = uBreak;
    if (uPull > 0.5) {
      float s = (11.0 + 9.0 * aRand) / max(length(c - cameraPosition), 1.0);
      c = cameraPosition + (c - cameraPosition) * s;
      rel *= s;
    }
    vec3 axis = normalize(vec3(aRand - 0.5, 0.7, fract(aRand * 7.3) - 0.5));
    rel = rot(rel, axis, tau * (1.5 + 5.0 * aRand)) * (0.9 - 0.75 * clamp(tau / 1.3, 0.0, 1.0));
    vec3 side = normalize(c - cameraPosition);
    c += vec3(side.x, 0.0, side.z) * tau * (1.0 + 3.0 * aRand) * 1.5;
    c += normalize(c - cameraPosition) * -tau * 2.0 * fract(aRand * 3.1);
    c.y -= 5.5 * tau * tau * (0.5 + aRand);
    return c + rel;
  }`;
// the crack web, in the fragment shader: bright along the triangle edges
export const SHARD_FRAG = /* glsl */ `
  varying vec3 vBary;
  float crackLine(float width) {
    float e = min(vBary.x, min(vBary.y, vBary.z));
    return 1.0 - smoothstep(width * 0.4, width, e);
  }`;

// THE ISLAND, BACK: the top-level objects the stage hid (it hides everything
// but the cutscene, the pup and the lights once the camera is inside), shown
// again while the stage still stands; the stage restores them as usual on
// the collapse or a skip. Snapshot taken at mount, before the stage blooms.
export function islandList(scene) {
  return scene.children.filter((o) => o.visible && !o.isLight && o.name !== "cutscene" && o.name !== "seal");
}
