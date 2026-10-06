// KIRIGAMI ROSETTE AND SPLIT PIN (bible section 3, FX "rosette pop"). Laid on the fox's chest, facing the seal.
// Rosette = 12 violet petals #4a3466 (r 2.2) + 8 cream petals #f6ecd6 (r 1.3, offset half a step) + a cream hub ring.
// Pop (18 frames from tRos = tBurst + 0.2): each petal hinges at its root about its local Y: fold(k) = 1.45 (1 - e(k_j)) rad,
//   k_j = clamp((k - 0.04 j)/0.6) so petals unfurl in a ripple; group scale 0.25 -> 1.
// Pin (6 frames from tPin = tRos + 0.75): brass #ffb04a shaft + dome head + two split legs (the split pin), punches down the
//   rosette's normal: z(k) = 3 (1 - k^2); a cream click ring + gold flash at contact. The cream hull (BackSide) is the die-cut edge.
// Everything sinks 16 m through the floor over the last 1.8 s with the stage.
import { ph, sm, startOf, spriteMat, glowTex, disposeTree } from "./util.js";

export default function build(ctx, S) {
  const { THREE } = ctx, g = new THREE.Group(), geos = [];
  const ctr = S.F.clone().addScaledVector(S.toSeal, 5.2); ctr.y += 5.2; // chest of the fox, seal side
  const root = new THREE.Group(); root.position.copy(ctr); root.lookAt(ctr.clone().add(S.toSeal)); g.add(root);
  const basicM = (c, extra = {}) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, toneMapped: false, ...extra });
  const petalShape = (len, wid) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(len * 0.55, wid); s.lineTo(len, 0); s.lineTo(len * 0.55, -wid); s.closePath(); return s; };
  const petals = [];
  const mkLayer = (n, len, wid, col, off, z) => {
    const geo = new THREE.ShapeGeometry(petalShape(len, wid)); geos.push(geo);
    const hullG = new THREE.ShapeGeometry(petalShape(len * 1.06, wid * 1.18)); geos.push(hullG);
    for (let j = 0; j < n; j++) {
      const piv = new THREE.Group(); piv.rotation.z = off + (j / n) * 6.2832; piv.position.z = z;
      const hinge = new THREE.Group(); piv.add(hinge);
      const hull = new THREE.Mesh(hullG, basicM(0xf6ecd6)); hull.position.set(-len * 0.03, 0, -0.02);
      hinge.add(new THREE.Mesh(geo, basicM(col)), hull); root.add(piv); petals.push({ hinge, j, n });
    }
  };
  mkLayer(12, 2.2, 0.62, 0x4a3466, 0, 0); mkLayer(8, 1.3, 0.5, 0xf6ecd6, Math.PI / 8, 0.02);
  const hubG = new THREE.RingGeometry(0.22, 0.36, 24); geos.push(hubG);
  const hub = new THREE.Mesh(hubG, basicM(0xf6ecd6)); hub.position.z = 0.04; root.add(hub);
  // brass split pin
  const pin = new THREE.Group(); root.add(pin);
  const brass = basicM(0xffb04a), dark = basicM(0xa86a08);
  const head = new THREE.SphereGeometry(0.55, 14, 8, 0, 6.2832, 0, 1.5708), shaft = new THREE.CylinderGeometry(0.17, 0.17, 2, 8), leg = new THREE.BoxGeometry(0.1, 1.1, 0.07);
  geos.push(head, shaft, leg);
  const hd = new THREE.Mesh(head, brass); hd.rotation.x = Math.PI / 2; hd.position.z = 1.9;
  const sh = new THREE.Mesh(shaft, brass); sh.rotation.x = Math.PI / 2; sh.position.z = 0.9;
  const l1 = new THREE.Mesh(leg, dark), l2 = new THREE.Mesh(leg, brass); l1.position.set(0.1, 0, -0.35); l2.position.set(-0.1, 0, -0.35);
  l1.rotation.set(Math.PI / 2, 0, 0.45); l2.rotation.set(Math.PI / 2, 0, -0.45);
  pin.add(hd, sh, l1, l2);
  const gl = glowTex(THREE, 1.6);
  const click = new THREE.Sprite(spriteMat(THREE, gl, { color: 0xffd54a, opacity: 0 })); click.position.copy(ctr).addScaledVector(S.toSeal, 0.6); g.add(click);
  const ringC = document.createElement("canvas"); ringC.width = ringC.height = 96; const x = ringC.getContext("2d");
  x.strokeStyle = "#fff"; x.lineWidth = 7; x.beginPath(); x.arc(48, 48, 38, 0, 6.2832); x.stroke();
  const ringT = new THREE.CanvasTexture(ringC);
  const ring = new THREE.Sprite(spriteMat(THREE, ringT, { color: 0xf6ecd6, opacity: 0 })); ring.position.copy(click.position); g.add(ring);
  root.visible = false;

  return {
    group: g,
    update(t, dt, cue) {
      const tb = startOf(cue, "burst", 10.7), tr = startOf(cue, "rosette", tb + 0.2), tp = startOf(cue, "pin", tr + 0.75);
      const sink = ph(t, ctx.scene.duration - 1.8, ctx.scene.duration - 0.8);
      g.position.y = -16 * sm(sink);
      root.visible = t >= tr;
      if (!root.visible) { click.material.opacity = ring.material.opacity = 0; return; }
      const k = ph(t, tr, tr + 18 / 24);
      root.scale.setScalar(0.25 + 0.75 * sm(Math.min(1, k * 1.4)));
      for (const p of petals) { const kj = Math.min(1, Math.max(0, (k - 0.04 * (p.j % 12)) / 0.6)); p.hinge.rotation.y = 1.45 * (1 - (1 - Math.pow(1 - kj, 3))); }
      const pk = ph(t, tp, tp + 6 / 24);
      pin.visible = t >= tp - 0.3;
      pin.position.z = 3 * (1 - pk * pk) * (t < tp + 6 / 24 ? 1 : 0); pin.scale.setScalar(t >= tp - 0.3 ? 1 : 0);
      const sc = t - (tp + 6 / 24);
      click.material.opacity = sc >= 0 ? 0.9 * Math.max(0, 1 - sc / 0.3) : 0; click.scale.setScalar(5 + 7 * Math.min(1, Math.max(0, sc) / 0.3));
      ring.material.opacity = sc >= 0 ? 0.8 * Math.max(0, 1 - sc / 0.5) : 0; ring.scale.setScalar(3 + 14 * Math.min(1, Math.max(0, sc) / 0.5));
    },
    dispose() { gl.dispose(); ringT.dispose(); geos.forEach((x) => x.dispose()); disposeTree(g); },
  };
}
