// THE GIORNO PUP, on the real 3D pup (round head, NO ears): three round curls across the FRONT of the forehead
// (never at the sides), a short braid at the back of the head, a pink-violet jacket with a ladybug brooch on the
// chest. The hair and braid ride the head group, the jacket and brooch the body group (pupParts, as the
// Caustic scene's Madara does); the jacket and hair are figure-kind fresco parts (flat tones, umber contour),
// the brooch is gold leaf.

import { Box3, CylinderGeometry, Group, Mesh, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { merge, paint, smooth } from "./geo";
import { giornoBraid, giornoHair } from "./cast";

export function giorno(parts, fres, goldMat) {
  const body = parts.rear.children.find((o) => o.isMesh);
  body.geometry.computeBoundingBox();
  const bb = new Box3().copy(body.geometry.boundingBox).applyMatrix4(body.matrix);
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const P = (g, hex) => paint(g, hex, 4);
  // the jacket: an open shell round the front two-thirds of the body, a collar, a gold-trimmed hem
  const rx = (s.x / 2) * 1.1;
  const ry = (s.y / 2) * 1.1;
  const len = s.z * 0.62;
  const z0 = c.z + s.z * 0.5 - len / 2 + 0.02;
  const shell = new CylinderGeometry(1, 1, len, 18, 1, true).rotateX(Math.PI / 2).scale(rx, ry, 1).translate(c.x, c.y, z0);
  const hem = new TorusGeometry(1, 0.035, 5, 22).scale(rx * 1.002, ry * 1.002, 1).translate(c.x, c.y, z0 - len / 2);
  const collar = new TorusGeometry(1, 0.1, 6, 22).scale(rx * 0.92, ry * 0.92, 1).translate(c.x, c.y + 0.02, z0 + len / 2 - 0.02);
  const jacket = new Group();
  const jm = merge([P(shell, "#d985bd"), P(collar, "#b8559a"), P(hem, "#f0c860")]);
  const jmesh = new Mesh(jm, fres);
  jacket.add(jmesh);
  // the ladybug brooch: a gold-leaf shell with a dark line and spots, on the chest
  const brooch = new Group();
  const shellG = smooth(new SphereGeometry(0.1, 14, 8).scale(1, 1, 0.32));
  const bm = new Mesh(shellG, goldMat);
  const spots = new Mesh(merge([P(new SphereGeometry(0.022, 6, 4).translate(-0.04, 0.03, 0.03), "#2a1a24"), P(new SphereGeometry(0.022, 6, 4).translate(0.04, 0.03, 0.03), "#2a1a24"), P(new SphereGeometry(0.02, 6, 4).translate(-0.045, -0.03, 0.03), "#2a1a24"), P(new SphereGeometry(0.02, 6, 4).translate(0.045, -0.03, 0.03), "#2a1a24"), P(new SphereGeometry(0.035, 6, 4).translate(0, 0.085, 0.02), "#2a1a24")]), fres);
  brooch.add(bm, spots);
  brooch.position.set(c.x, c.y + ry * 0.62, c.z + s.z * 0.5 - 0.02);
  brooch.rotation.x = -0.6;
  jacket.add(brooch);
  const hair = new Group();
  const hm = new Mesh(giornoHair(), fres);
  hair.add(hm);
  const braid = new Mesh(giornoBraid(), fres);
  hair.add(braid);
  for (const g of [hair, jacket]) {
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
    g.visible = false;
  }
  return {
    hair,
    jacket,
    braid,
    dispose() {
      for (const g of [hair, jacket]) {
        g.removeFromParent();
        g.traverse((o) => o.isMesh && o.geometry.dispose());
      }
    },
  };
}
