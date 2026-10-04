// openxla/xla #46539: My Hero Academia, All Might's UNITED STATES OF SMASH, in
// the American golden-age comic dimension: Ben-Day dots, four-colour print a
// little off register, thick ink on every outline, panel borders on impacts.
// The island converts into a night in Kamino ward: a ruined avenue of lit
// and dead towers, collapsed blocks, rubble, bent street lamps and smoke under
// a low storm, the XLA geyser a glowing crater in the street, the burning
// city's glow on the horizon, rain. A NOMU (exposed brain dome, beak jaw)
// rises out of the street and throws two glowing answer cards, different
// every run, at the pup. The pup is All Might: raised fist, a cape, a hair-tuft
// V of light. It crouches, springs, and punches UP: a printed starburst, the
// shock dome, a beam into the clouds; the storm is blasted open into a vortex
// with a pillar of clear sky and sunlight flooding down and the rain turning
// to updraft; the two answer cards are smashed into one gold card with a
// check; the civilians on the rooftops cheer, flags and cape whip, rubble
// settles, debris arcs, the frame shakes. The blow is so big it tears the
// page: the panel border returns and cracks, RIIIP, the whole picture falls
// away as shards of paper, and the real island is what was behind the page.
// The pup, itself again, says the flex. No post pass: every effect is a mesh.
// Card: lib/world/cutscene/cards/pr-openxla-46539.js. Parts: ./pr-openxla-46539/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { radiusAt } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, smooth, useCutFrame } from "../kit";
import { islandList, pupParts } from "./p-caustic/parts";
import { flipperAt, usePupFront, usePupPost } from "./g3/common";
import { cape, pupPrint, vAura } from "./pr-openxla-46539/hero";
import { makeWorld } from "./pr-openxla-46539/world";

const FIST_REST = [0.9, 2.2, 0.4];

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const pup = useRef(null);
  const paint = useRef(null);
  const island = useRef([]);
  const hero = useRef(null);
  const shake = useRef(new Vector3());
  const fist = useRef(FIST_REST);
  const pupY = useRef(0);
  const clock = useRef(0); // the scene's own time (scrubbable), for the pup's post pass

  // the screen decides how wide the street is: a portrait lens sees a narrow slice
  const KN = useMemo(() => (typeof window !== "undefined" && window.innerWidth / window.innerHeight < 0.8 ? 0.62 : 1), []);
  const w = useMemo(() => makeWorld({ tl, KN }), [tl, KN]);

  // the pup's printed twin, the cape and the V ride its own groups; the island list is taken before the stage hides it
  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    paint.current = p?.root ? pupPrint(p.root) : null;
    const h = { cape: null, aura: null };
    if (p?.head && p.rear) {
      const body = p.rear.children.find((o) => o.isMesh);
      h.cape = cape(body);
      p.rear.add(h.cape.mesh);
      h.aura = vAura();
      h.aura.mesh.position.set(0, 0.4, 0.3);
      p.head.add(h.aura.mesh);
    }
    hero.current = h;
    return () => {
      for (const x of [h.cape, h.aura]) {
        if (!x) continue;
        x.mesh.removeFromParent();
        x.g.dispose();
        x.m.dispose();
      }
      hero.current = null;
      paint.current?.dispose();
      paint.current = null;
      pup.current = null;
      w.dispose();
    };
  }, [scene, w]);

  // impacts shake the frame two drawings each: the street and the pup together (after Seal.jsx places it)
  // a skip clears the arrival: nothing of the dimension draws for the frame before this unmounts
  useFrame(() => {
    const p = pup.current;
    if (!live.arrival.id) {
      w.root.visible = false;
      paint.current?.set(false);
      const h = hero.current;
      if (h?.cape) h.cape.mesh.visible = false;
      if (h?.aura) h.aura.mesh.visible = false;
      return;
    }
    if (p?.root && mode === "full") {
      p.root.position.add(shake.current);
      p.root.position.y += pupY.current;
    }
  }, -0.5);

  usePupFront(cut, 1.5, 2.0);

  // the fist: where the right flipper's tip is, in the rig's space; the punch thrusts it straight up
  usePupPost(cut, (t, r) => {
    const k = w.punch ?? 0;
    if (k > 0) {
      const e = r.flipR.rotation;
      r.flipR.rotation.set(e.x + (0 - e.x) * k, e.y + (-0.55 - e.y) * k, e.z + (1.75 - e.z) * k, "YZX");
      r.flipR.scale.setScalar(1 + 0.45 * k);
    }
    const p = flipperAt(r.flipR, w.root, [0.75, 0.1, 0]);
    fist.current = [p.x, p.y, p.z];
  });

  useCutFrame((t0, state) => {
    const full = mode === "full";
    const h = hero.current;
    w.root.visible = full;
    w.flash.visible = false;
    if (!full) {
      paint.current?.set(false);
      if (h?.cape) h.cape.mesh.visible = false;
      if (h?.aura) h.aura.mesh.visible = false;
      shake.current.set(0, 0, 0);
      pupY.current = 0;
      return;
    }
    // a capture scrub: window.__xlaT, when a probe sets it, holds the scene at one instant
    const t = typeof window !== "undefined" && window.__xlaT != null ? window.__xlaT : t0;
    clock.current = t;
    const o = w.update({ t, cam: state.camera, width: state.size.width, height: state.size.height, dpr: state.gl.getPixelRatio(), seal: live.seal, r: radiusAt(tl, t), fist: fist.current, out: 1 - smooth(tl.collapse[0], tl.collapse[1], onTwos(t)) });
    w.punch = o.punch;
    shake.current.set(o.shakeX, o.shakeY, 0);
    pupY.current = o.pupY;
    for (const k in o.pose) live.pose[k] = o.pose[k];
    paint.current?.set(o.paint);
    if (h?.cape) {
      h.cape.mesh.visible = o.capeOn;
      h.cape.m.uniforms.uWind.value = o.wind;
      h.cape.m.uniforms.uBillow.value = o.billow;
    }
    if (h?.aura) {
      h.aura.mesh.visible = o.auraOn;
      h.aura.m.uniforms.uK.value = o.auraK;
    }
    if (o.reveal) for (const x of island.current) x.visible = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={w.flash} />
      <primitive object={w.root} />
    </>
  );
}
