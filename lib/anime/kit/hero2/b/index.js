// buildSealB(engine, look) -> { group, head, set({ expr, view }), update(ts), stats(), dispose() }; a look is data (looks/sukuna.js) over the neutral form.
// Another character = another look file: fur tones and strokes, eye pair, marks, hair rows and tones, outfit and hand colours.
import { Group, Matrix4, Vector3 } from "three";
import { ell, paint, polygonize } from "../../../sdf.js";
import { ARM, HEAD_AT, bodyGeometry, collarGeometry, hairGeometry, handsGeometry, headGeometry } from "./form.js";
import { clothMaterial, faceMaterial } from "./drawn.js";
import { EXPR } from "./expr.js";

export function buildSealB(engine, look) {
  const group = new Group(); group.name = "hero2b";
  const head = new Group(); head.position.fromArray(HEAD_AT); head.rotation.order = "YXZ";
  const figs = [], mats = [], geos = [];
  const fig = (geo, mat, mul = 1) => {
    const f = engine.figure(geo, { ink: look.fur.ink, lineMul: mul });
    if (mat) { f.userData.mesh.material.dispose(); f.userData.mesh.material = mat; mats.push(mat); }
    figs.push(f); geos.push(geo); return f;
  };
  const cloth = clothMaterial(engine.shared, look), skin = faceMaterial(engine.shared, look), collarMat = clothMaterial(engine.shared, look), handMat = clothMaterial(engine.shared, look, look.hands.foldCol ?? "#8a6e6c", 0.8);
  group.add(fig(bodyGeometry(look), cloth, 1.4));
  group.add(fig(collarGeometry(look), collarMat, 1.1));
  group.add(fig(polygonize([ell([0.215, 0.605, 0.148], [0.016, 0.016, 0.01], paint(look.outfit.button, "#7a5a1c"), 0.004, [0.2, 0.5, 0.1])], 0.003), null, 0.8));
  group.add(fig(handsGeometry(look), handMat, 0.9));
  group.add(head);
  head.add(fig(headGeometry(look), skin, 0.75));
  const hair = fig(hairGeometry(look), null, 0.9);
  hair.userData.hullMesh.geometry = hair.userData.mesh.geometry.userData.hullGeo; geos.push(hair.userData.hullMesh.geometry);
  head.add(hair);

  const U = skin.uniforms, E = look.eyes;
  U.uEye.value[0].set(...E.main); U.uEye.value[1].set(...E.low);
  U.uEyeT.value[0].set(E.tilt[0], 1); U.uEyeT.value[1].set(E.tilt[1], 0.9);

  const state = { expr: "grin", view: "front" };
  const inv = new Matrix4(), L = new Vector3();
  const h = {
    group, head, look, state,
    set(s) { Object.assign(state, s); return h; },
    update(ts = 0) {
      const x = EXPR[state.expr] ?? EXPR.grin, e = x.eyes, m = x.mouth, b = x.brow;
      U.uEyeA.value.set(e.open, e.tilt, e.cut, e.lower); U.uEyeB.value.set(e.glow, 0, 0, 0);
      U.uMouthA.value.set(m.kind, m.amt, m.lift, m.sharp);
      U.uBrow.value.set(0.104, 0.092, b.ang, b.drop); U.uFace.value.x = b.vis;
      const v = state.view, turn = v === "three" ? 0.25 : 0, sway = 0.012 * Math.sin(ts * 1.7);
      head.rotation.set(x.head.nod + (v === "low" ? -0.03 : 0), x.head.turn + turn + sway, x.head.tilt);
      group.position.y = 0.004 * Math.sin(ts * 2.1);
      group.updateMatrixWorld(true);
      L.copy(engine.shared.uLightDir.value);
      skin.uniforms.uLightL.value.copy(L).transformDirection(inv.copy(head.matrixWorld).invert());
      for (const mt of [cloth, collarMat, handMat]) mt.uniforms.uLightL.value.copy(L).transformDirection(inv.copy(group.matrixWorld).invert());
      return h;
    },
    anchors() { group.updateMatrixWorld(true); return { head: head.localToWorld(new Vector3(0, 0, 0)), chest: group.localToWorld(new Vector3(0, 0.3, 0.2)), handR: group.localToWorld(new Vector3(...ARM.W)) }; },
    stats() { let tri = 0; for (const g of geos) tri += (g.index ? g.index.count : g.attributes.position.count) / 3; return { meshes: figs.length * 2, triangles: tri * 2 }; },
    dispose() { group.removeFromParent(); for (const f of figs) { f.userData.mat.dispose(); f.userData.hull.dispose(); } for (const m of mats) m.dispose(); for (const g of geos) g.dispose(); },
  };
  h.update(0);
  return h;
}
