// SMALL SET PROPS that animate (layer 1): DIO's BANANA floating in the reservoir (easter egg, 6.9 s). A 1.2 m crescent made of a
// tube along an 80 degree arc (r 0.8 m), yellow #ffe14a with brown #8a5a10 tips, ink hulled, bobbing on the WORLD clock.
import { CatmullRomCurve3, Group, TubeGeometry, Vector3 } from "three";
import { L } from "./layout.js";
import { Parts, disposeTree, inked } from "./geo.js";

export function buildBanana(U, T) {
  const pts = [];
  for (let i = 0; i <= 8; i++) { const a = -0.7 + (1.4 * i) / 8; pts.push(new Vector3(Math.sin(a) * 0.8, 0.8 - Math.cos(a) * 0.8, 0)); }
  const p = new Parts();
  p.add(new TubeGeometry(new CatmullRomCurve3(pts), 12, 0.13, 5, false), "#ffe14a");
  p.cone(0.1, 0.22, 5, "#8a5a10", { x: pts[0].x - 0.02, y: pts[0].y + 0.02, rz: 0.9 });
  p.cone(0.1, 0.22, 5, "#8a5a10", { x: pts[8].x + 0.02, y: pts[8].y + 0.02, rz: -0.9 });
  const m = inked(p.build(), U, { tint: 0.1, px: 3 });
  const g = new Group(); g.add(m); g.visible = false;
  g.position.set(L.BANANA.x, L.WATER_Y, L.BANANA.z);
  g.rotation.set(0.2, 0.6, 0.15);
  g.userData.set = (t, wt) => {
    g.visible = t >= 6.9 && t < T.tear;
    g.position.y = L.WATER_Y + 0.05 + 0.06 * Math.sin(wt * 3.1);
    g.rotation.z = 0.15 + 0.08 * Math.sin(wt * 2.3);
  };
  g.userData.dispose = () => disposeTree(g);
  return g;
}
