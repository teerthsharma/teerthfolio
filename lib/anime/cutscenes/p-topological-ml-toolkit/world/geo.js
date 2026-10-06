// GEO: a tiny accumulator that merges many primitives into ONE BufferGeometry carrying the stage attributes:
//   aCol / aShade  lit and shadow albedo      aKind (kind, seed, y0, y1)  material kind + the box's own vertical extent
//   aHub (xyz, w)  rotor pivot + angular speed multiplier (w > 0 spins)   aCen (cx, cz, hullMul)  rigid-bloom centre + ink width (0 = no ink)
//   aHN            hull extrusion direction: the CORNER direction on boxes, so flat faces ink without gaps at the corners.
// REUSABLE: promote `Acc` (merged attribute-carrying geometry) to a shared kit.
import { BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, RingGeometry, SphereGeometry } from "three";

export class Acc {
  constructor() { this.a = { position: [], normal: [], aCol: [], aShade: [], aKind: [], aHub: [], aCen: [], aHN: [] }; this.idx = []; this.n = 0; }
  // g: geometry already placed in world space. o: { kind, seed, col, shade, cen:[x,z], xw, hub:[x,y,z,w], hn:Float32Array, y0, y1 }
  add(g, o = {}) {
    const P = g.attributes.position, N = g.attributes.normal, n = P.count, a = this.a;
    const col = new Color(o.col ?? "#ffffff"), sh = new Color(o.shade ?? o.col ?? "#888888");
    g.computeBoundingBox(); const bb = g.boundingBox;
    const cen = o.cen ?? [(bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2], hub = o.hub ?? [0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      a.position.push(P.getX(i), P.getY(i), P.getZ(i)); a.normal.push(N.getX(i), N.getY(i), N.getZ(i));
      a.aCol.push(col.r, col.g, col.b); a.aShade.push(sh.r, sh.g, sh.b);
      a.aKind.push(o.kind ?? 4, o.seed ?? 0, o.y0 ?? bb.min.y, o.y1 ?? bb.max.y);
      a.aHub.push(hub[0], hub[1], hub[2], hub[3]); a.aCen.push(cen[0], cen[1], o.xw ?? 0);
      if (o.hn) a.aHN.push(o.hn[3 * i], o.hn[3 * i + 1], o.hn[3 * i + 2]); else a.aHN.push(N.getX(i), N.getY(i), N.getZ(i));
    }
    const ix = g.index; for (let i = 0; i < ix.count; i++) this.idx.push(ix.getX(i) + this.n);
    this.n += n; g.dispose();
    return this;
  }
  box(w, h, d, x, y, z, o = {}) {
    const g = new BoxGeometry(w, h, d), P = g.attributes.position, hn = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { hn[3 * i] = Math.sign(P.getX(i)); hn[3 * i + 1] = Math.sign(P.getY(i)); hn[3 * i + 2] = Math.sign(P.getZ(i)); }
    g.translate(x, y, z);
    return this.add(g, { y0: y - h / 2, y1: y + h / 2, ...o, hn });
  }
  cyl(rt, rb, h, x, y, z, o = {}, seg = 10) { return this.add(new CylinderGeometry(rt, rb, h, seg).translate(x, y, z), { y0: y - h / 2, y1: y + h / 2, ...o }); }
  sph(r, x, y, z, o = {}, ws = 10, hs = 8) { return this.add(new SphereGeometry(r, ws, hs).translate(x, y, z), { y0: y - r, y1: y + r, ...o }); }
  ring(r0, r1, x, y, z, o = {}, seg = 40) { return this.add(new RingGeometry(r0, r1, seg, 1).translate(x, y, z), { y0: y - r1, y1: y + r1, ...o }); }
  build() {
    const g = new BufferGeometry(), a = this.a, K = { position: 3, normal: 3, aCol: 3, aShade: 3, aKind: 4, aHub: 4, aCen: 3, aHN: 3 };
    for (const k in K) g.setAttribute(k, new BufferAttribute(new Float32Array(a[k]), K[k]));
    g.setIndex(new BufferAttribute(this.n > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx), 1));
    g.computeBoundingSphere(); g.boundingSphere.radius = 1e5; // the stage moves vertices in the shader: never cull
    return g;
  }
}
