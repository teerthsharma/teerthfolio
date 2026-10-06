// THE 3D KIT: reusable geometry for the near and mid ground (what the camera passes or orbits).
// Each returns a plain BufferGeometry; worlds paint them with paint() and the anime surface, whose
// grit / gloss / brush / fog modes give them the style's painted texture.
//   rng(seed)                          deterministic 0..1 stream
//   boulder(scale, at, seed, top)      faceted rock, shared corners jittered, optional flat top
//   horn(r, h, bend, seg, curl)        a cone bent along +x as it rises; curl makes a crescent
//   hipRoof(w, d, h, upturn, seg)      a hip roof surface whose eaves sweep up at the corners
//   bareTree(at, len, seed, depth)     a dead branching tree of tapered cylinders
//   skull / ribs / longBone          ossuary pieces, see BONES below
//   teeth(n, span, len, r, down, seed, arc, sharp)  a jaw row of irregular teeth; arc bends the row
//                                      into a mouth curve, sharp 0 (molar) .. 1 (fang)
//   arcWall(r, thick, a0, a1, h, seg)  a solid curved wall, a sector of a ring around the origin
//                                      (angles from -z toward +x), standing on y = 0
import { BufferGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, SphereGeometry, TorusGeometry, Float32BufferAttribute, IcosahedronGeometry, LatheGeometry, Matrix4, Quaternion, Shape, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const rng = (seed) => { let s = Math.max(1, Math.floor(seed)) % 2147483647; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

export function boulder(sc, at, seed, top = Infinity) {
  const g = new IcosahedronGeometry(1, 1), P = g.attributes.position, R = rng(seed * 7919 + 1), k = new Map();
  for (let i = 0; i < P.count; i++) {
    const key = [P.getX(i), P.getY(i), P.getZ(i)].map((v) => Math.round(v * 1000)).join();
    if (!k.has(key)) k.set(key, 1 + 0.24 * (R() - 0.5));
    const f = k.get(key);
    P.setXYZ(i, P.getX(i) * f * sc[0] + at[0], Math.min(top, P.getY(i) * f * sc[1] + at[1]), P.getZ(i) * f * sc[2] + at[2]);
  }
  g.deleteAttribute("normal"); g.deleteAttribute("uv"); g.computeVertexNormals();
  return g;
}

// curl > 0 sweeps the tip back toward the base line: a crescent claw rather than a flaring horn;
// curl 1 returns the tip over the base, curl 1.6 hooks it well past the base (a closed crescent)
export function horn(r, h, bend, seg = 12, curl = 0) {
  const g = new ConeGeometry(r, h, 12, seg).translate(0, h / 2, 0), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i), u = y / h; P.setX(i, P.getX(i) + bend * (curl > 0 ? h * Math.sin(Math.PI * u * (1 + 0.25 * (curl - 1))) * 0.5 : y * u)); }
  g.deleteAttribute("uv"); g.computeVertexNormals();
  return g.toNonIndexed();
}

export function hipRoof(w, d, h, upturn, seg = 48) {
  const pos = [], idx = [];
  const at = (u, v, under) => { const m = Math.max(Math.abs(u), Math.abs(v)); return [u * w, h * (1 - m) + upturn * m ** 6 - (under ? 0.35 * (1 - m * 0.5) : 0), v * d]; };
  for (const under of [false, true]) {
    const base = pos.length / 3;
    for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) pos.push(...at(-1 + 2 * i / seg, -1 + 2 * j / seg, under));
    for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
      const a = base + j * (seg + 1) + i, b = a + 1, c = a + seg + 1, e = c + 1;
      if (under) idx.push(a, b, c, b, e, c); else idx.push(a, c, b, b, c, e);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}

export function bareTree(at, len, seed, depth = 5) {
  const R = rng(seed), parts = [], up = new Vector3(0, 1, 0);
  const grow = (p, dir, l, r, k) => {
    const end = p.clone().addScaledVector(dir, l);
    const c = new CylinderGeometry(r * 0.62, r, l, 6, 1).translate(0, l / 2, 0);
    c.applyMatrix4(new Matrix4().compose(p, new Quaternion().setFromUnitVectors(up, dir), new Vector3(1, 1, 1)));
    parts.push(c.toNonIndexed());
    if (k === 0) return;
    const n = 2 + (R() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const d = dir.clone().add(new Vector3((R() - 0.5) * 1.6, 0.25 + R() * 0.5, (R() - 0.5) * 1.0)).normalize();
      grow(end, d, l * (0.6 + R() * 0.2), r * 0.62, k - 1);
    }
  };
  grow(new Vector3(...at), new Vector3(0, 1, 0), len, len * 0.09, depth);
  const g = mergeGeometries(parts); g.deleteAttribute("uv"); return g;
}

// a rounded tooth: a lathe profile, fat at the root, a blunt point, slightly bent
function tooth(r, l, bend, sharp = 0) {
  const prof = [[0, 0], [0.85, 0.02], [1.0, 0.22], [0.95 - 0.1 * sharp, 0.5], [0.7 - 0.3 * sharp, 0.78], [0.32 - 0.24 * sharp, 0.95], [0, 1]].map(([x, y]) => new Vector2(x * r, y * l));
  const g = new LatheGeometry(prof, 14), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setX(i, P.getX(i) + bend * (y / l) ** 2); }
  g.deleteAttribute("uv"); g.computeVertexNormals();
  return g.toNonIndexed();
}
export function teeth(n, span, len, r, down, seed, arc = 0, sharp = 0) {
  const R = rng(seed), parts = [];
  for (let i = 0; i < n; i++) {
    const x = -span / 2 + span * (i + 0.5) / n + (R() - 0.5) * span / n * 0.3;
    const l = len * (0.65 + 0.7 * R()), rr = r * (0.75 + 0.5 * R());
    const g = tooth(rr, l, (R() - 0.5) * 0.25 * l, sharp).scale(1, 1, 0.8);
    const u = 2 * x / span; // the mouth curve: the row bends toward the jaw's corners, teeth fan with it
    g.rotateZ((R() - 0.5) * 0.25 + (down ? 1 : -1) * arc * u * 0.6);
    if (down) g.rotateX(Math.PI);
    g.translate(x, (down ? -1 : 1) * arc * u * u * span * 0.25, (R() - 0.5) * r * 0.6 - Math.abs(u) * arc * r);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

// mirror in x and fix the winding (a plain scale(-1) turns the faces inside out)
export function flipX(g) {
  g = g.index ? g.toNonIndexed() : g;
  g.scale(-1, 1, 1);
  for (const a of Object.values(g.attributes)) { const n = a.itemSize, arr = a.array;
    for (let t = 0; t < a.count; t += 3) for (let k = 0; k < n; k++) { const i1 = (t + 1) * n + k, i2 = (t + 2) * n + k, v = arr[i1]; arr[i1] = arr[i2]; arr[i2] = v; } }
  g.computeVertexNormals();
  return g;
}
// merge anything: non-indexed, uv dropped, normals present (kit pieces mix primitives freely)
// (mergeGeometries returns null on mismatched attribute sets; this throws, naming the part)
export function merge(gs, name = "parts") {
  const keep = ["position", "normal"];
  const clean = gs.map((g) => {
    g = g.index ? g.toNonIndexed() : g;
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k);
    return g;
  });
  const out = mergeGeometries(clean);
  if (!out) throw new Error(`kit3d.merge failed for ${name}: attribute sets ${clean.map((g) => Object.keys(g.attributes).join("+")).join(" | ")}`);
  return out;
}

export function arcWall(r, thick, a0, a1, h, seg = 48) {
  const s = new Shape(), P = (rr, a) => [Math.sin(a) * rr, Math.cos(a) * rr]; // rotateX(-90deg): shape y -> world -z, depth -> +y
  s.moveTo(...P(r, a0));
  for (let i = 1; i <= seg; i++) s.lineTo(...P(r, a0 + (a1 - a0) * i / seg));
  for (let i = seg; i >= 0; i--) s.lineTo(...P(r + thick, a0 + (a1 - a0) * i / seg));
  const g = new ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 1 }).rotateX(-Math.PI / 2);
  g.deleteAttribute("uv"); return g.toNonIndexed();
}

// BONES (for ossuary mounds): each returns { bone, dark } geometries so the sockets can be painted black
//   skull(s)      cranium, cheekbones, upper jaw; dark: eye sockets and the nasal hole (faces +z)
//   ribs(s, n)    a fanned rib cage of half-hoops around a spine
//   longBone(l, r) a shaft with knobbed ends along +y
export function skull(s) {
  const bone = [new SphereGeometry(s, 14, 10).scale(1, 0.92, 1.12).translate(0, s * 0.25, -s * 0.05),
    new SphereGeometry(s * 0.62, 12, 8).scale(1.25, 0.8, 1).translate(0, -s * 0.35, s * 0.42),
    new CylinderGeometry(s * 0.55, s * 0.5, s * 0.4, 10).translate(0, -s * 0.72, s * 0.5)];
  const dark = [new SphereGeometry(s * 0.27, 10, 8).scale(1, 1.1, 0.6).translate(-s * 0.38, s * 0.05, s * 0.86),
    new SphereGeometry(s * 0.27, 10, 8).scale(1, 1.1, 0.6).translate(s * 0.38, s * 0.05, s * 0.86),
    new ConeGeometry(s * 0.12, s * 0.3, 3).rotateX(Math.PI).translate(0, -s * 0.28, s * 0.92)];
  return { bone: merge(bone, "skull"), dark: merge(dark, "sockets") };
}
export function ribs(s, n = 5) {
  const parts = [new CylinderGeometry(s * 0.07, s * 0.07, s * 1.6, 6).translate(0, s * 0.8, 0)];
  for (let i = 0; i < n; i++) { const r = s * (0.45 + 0.12 * Math.sin(Math.PI * (i + 0.5) / n));
    parts.push(new TorusGeometry(r, s * 0.045, 5, 14, Math.PI * 1.2).rotateX(Math.PI / 2).rotateY(-Math.PI * 0.1).translate(0, s * (0.25 + i * 0.26), r * 0.85)); }
  return { bone: merge(parts, "ribs"), dark: null };
}
export function longBone(l, r) {
  return { bone: merge([new CylinderGeometry(r, r, l, 8).translate(0, l / 2, 0), new SphereGeometry(r * 1.8, 8, 6).scale(1.3, 1, 1).translate(0, 0, 0),
    new SphereGeometry(r * 1.8, 8, 6).scale(1.3, 1, 1).translate(0, l, 0)], "long bone"), dark: null };
}
