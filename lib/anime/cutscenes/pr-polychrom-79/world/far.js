// The far ring of the pr-polychrom-79 island: a Ferris wheel, a blue tower, two peach huts, a pink building, two snow banks, an igloo, the statue and the sign.
// Rig-frame estimates from live-sheet tile 1; each prop sits on `ground`, and the whole ring is one merged mesh with a vertex colour per part.
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PAL } from "../pal.js";

const FAR = [
  { k: "wheel", x: -17, z: -19, s: 4.2 },
  { k: "tower", x: -12.7, z: -18.1, s: 5.0 },
  { k: "hut", x: 20, z: -31, s: 3.2 },
  { k: "hut", x: -22, z: -26, s: 2.6 },
  { k: "pink", x: 20, z: -14, s: 4.0 },
  { k: "igloo", x: -29, z: -45, s: 3.6 },
  { k: "bank", x: -14, z: -8, s: 1.6 },
  { k: "bank", x: 6, z: -24, s: 1.4 },
  { k: "statue", x: -7.2, z: -2.4, s: 1.0 },
  { k: "sign", x: -6.2, z: -1.2, s: 1.0 },
];

// one colour per part as vertex colours, so `lit` (the island's vertex-lit material) draws the whole ring in one call
export const tint = (g, hex) => {
  const n = g.index ? g.toNonIndexed() : g.clone();
  n.deleteAttribute("uv");
  const c = new Color(hex), k = n.attributes.position.count, a = new Float32Array(k * 3);
  for (let i = 0; i < k; i++) a.set([c.r, c.g, c.b], i * 3);
  n.setAttribute("color", new Float32BufferAttribute(a, 3));
  return n;
};

export function buildFar(lit, ground) {
  const group = new Group(), made = [], parts = [];
  const put = (key, g) => parts.push(tint(g, PAL[key]));
  for (const { k, x, z, s } of FAR) {
    const g = k === "statue" || k === "sign" ? 0 : ground(x, z);
    if (k === "wheel") {
      const y = g + s + 0.6;
      put("wheel", new TorusGeometry(s, 0.25, 6, 48).translate(x, y, z));
      for (let i = 0; i < 8; i++) put("wheel", new BoxGeometry(0.12, 2 * s, 0.12).rotateZ((i * Math.PI) / 8).translate(x, y, z));
      put("wheelHub", new CylinderGeometry(0.4, 0.4, 0.4, 12).rotateX(Math.PI / 2).translate(x, y, z));
    } else if (k === "tower") {
      put("tower", new CylinderGeometry(1.1, 1.1, s, 16).translate(x, g + s / 2, z));
      put("towerCap", new ConeGeometry(1.3, 1.2, 16).translate(x, g + s + 0.6, z));
    } else if (k === "hut") {
      put("hut", new BoxGeometry(s, s * 0.8, s).translate(x, g + s * 0.4, z));
      put("roofDark", new BoxGeometry(s + 0.3, 0.25, s + 0.3).translate(x, g + s * 0.8 + 0.12, z));
    } else if (k === "pink") {
      put("pink", new BoxGeometry(2.6, s, 2.6).translate(x, g + s / 2, z));
    } else if (k === "igloo" || k === "bank") {
      put("igloo", new SphereGeometry(s, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, g, z));
    } else if (k === "statue") {
      put("statue", new BoxGeometry(0.8 * s, 0.6 * s, 0.8 * s).translate(x, 0.3 * s, z));
      put("statue", new SphereGeometry(0.4 * s, 12, 8).translate(x, s, z));
      put("statue", new SphereGeometry(0.25 * s, 12, 8).translate(x, 1.5 * s, z));
    } else if (k === "sign") {
      put("sign", new CylinderGeometry(0.05 * s, 0.05 * s, 1.4 * s, 8).translate(x, 0.7 * s, z));
      put("sign", new BoxGeometry(0.9 * s, 0.4 * s, 0.06 * s).translate(x, 1.3 * s, z));
    }
  }
  const geo = mergeGeometries(parts), mat = lit(), mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  group.add(mesh);
  made.push(geo, mat);
  return { group, made };
}
