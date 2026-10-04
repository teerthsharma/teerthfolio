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
import { Box3, Group, Matrix4, Vector3 } from "three";
import { radiusAt } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, smooth, useCutFrame } from "../kit";
import { islandList, pupParts } from "./p-caustic/parts";
import { flipperAt, pupRig, usePupFront, usePupPost } from "./g3/common";
import { cape, pupPrint, vAura } from "./pr-openxla-46539/hero";
import { nearMovers } from "./pr-openxla-46539/island";
import { applyPunch } from "./pr-openxla-46539/punch";
import { makeWorld } from "./pr-openxla-46539/world";
import { cutFor } from "../../../../lib/world/cutscene/timeline";
import { registerWarm, takeWarm } from "../prewarm";

const ID = "pr-openxla-46539";
const narrow = () => typeof window !== "undefined" && window.innerWidth / window.innerHeight < 0.8;
// the shared prewarm (../prewarm.js) builds the Kamino street while the seal walks up to the dock
function buildWorld() {
  return makeWorld({ tl: cutFor(ID).tl, KN: narrow() ? 0.62 : 1 });
}
registerWarm(ID, buildWorld);

const FIST_REST = [0.9, 2.2, 0.4];
const RM = new Matrix4();

// `rig` (a child of the pup's root) takes the place of `src` (a part somewhere inside the pup) every frame, in the root's space
function follow(rig, src, root) {
  src.updateWorldMatrix(true, false);
  root.updateWorldMatrix(true, false);
  rig.matrix.copy(RM.copy(root.matrixWorld).invert()).multiply(src.matrixWorld);
  rig.matrixWorldNeedsUpdate = true;
}

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const pup = useRef(null);
  const paint = useRef(null);
  const island = useRef([]);
  const cleared = useRef(null);
  const prep = useRef({ boxes: [], i: 0, done: false, shown: 0 }); // the island's tall pieces and their boxes, measured a few a frame before the scene needs them
  useEffect(() => () => { for (const x of cleared.current || []) x.visible = true; }, []);
  const movers = useRef(null); // the island's cars and flakes held out of sight from the tear to the end
  const hero = useRef(null);
  const shake = useRef(new Vector3());
  const fist = useRef(FIST_REST);
  const pupY = useRef(0);
  const yaw = useRef(0);
  const clock = useRef(0); // the scene's own time (scrubbable), for the pup's post pass

  // the screen decides how wide the street is: a portrait lens sees a narrow slice
  const KN = useMemo(() => (typeof window !== "undefined" && window.innerWidth / window.innerHeight < 0.8 ? 0.62 : 1), []);
  const w = useMemo(() => takeWarm(ID, () => makeWorld({ tl, KN })), [tl, KN]);

  // the pup's printed twin, the cape and the V ride its own groups; the island list is taken before the stage hides it
  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    paint.current = p?.root ? pupPrint(p.root) : null;
    // All Might's cape and V of light are children of the pup's own root rig (the "seal" group), each in a rig that
    // follows the body and the head, added here and removed on exit
    const h = { cape: null, aura: null, capeRig: null, auraRig: null, rear: p?.rear, head: p?.head };
    if (p?.head && p.rear) {
      const body = p.rear.children.find((o) => o.isMesh);
      h.cape = cape(body);
      h.capeRig = new Group();
      h.capeRig.matrixAutoUpdate = false;
      h.capeRig.add(h.cape.mesh);
      p.root.add(h.capeRig);
      h.aura = vAura();
      h.aura.mesh.position.set(0, 0.4, 0.3);
      h.auraRig = new Group();
      h.auraRig.matrixAutoUpdate = false;
      h.auraRig.add(h.aura.mesh);
      p.root.add(h.auraRig);
    }
    hero.current = h;
    // BUILD NOW, DRAW LATER: every program and texture the scene will use is made while the seal is still walking
    // up (the move mounts on the approach), so no frame of the scene links a shader or uploads a canvas.
    const cut = scene.getObjectByName("cutscene");
    if (cut) gl.compile(cut, camera, scene);
    if (paint.current && p?.root) {
      paint.current.set(true);
      gl.compile(p.root, camera, scene);
      paint.current.set(false);
    }
    for (const t of w.textures) gl.initTexture(t);
    const pr = prep.current;
    pr.boxes = island.current.filter((x) => !x.isInstancedMesh).map((x) => [x, new Box3()]);
    pr.i = 0;
    pr.done = false;
    pr.shown = 0;
    return () => {
      h.capeRig?.removeFromParent();
      h.auraRig?.removeFromParent();
      for (const x of [h.cape, h.aura]) {
        if (!x) continue;
        x.mesh.removeFromParent();
        x.g.dispose();
        x.m.dispose();
      }
      hero.current = null;
      for (const m of movers.current ?? []) m.visible = true;
      movers.current = null;
      paint.current?.dispose();
      paint.current = null;
      pup.current = null;
      w.dispose();
    };
  }, [scene, w, gl, camera]);

  // impacts shake the frame two drawings each: the street and the pup together (after Seal.jsx places it)
  // a skip clears the arrival: nothing of the dimension draws for the frame before this unmounts
  useFrame(() => {
    const p = pup.current;
    const pr = prep.current;
    if (pr.i < pr.boxes.length) {
      const [x, b] = pr.boxes[pr.i++];
      b.setFromObject(x); // one piece a frame
    } else pr.done = true;
    if (!live.arrival.id) {
      for (const m of movers.current ?? []) m.visible = true;
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
  // the lens follows the Detroit Smash (look += 0.6 toward the dashing pup) and, for the screen punch, comes to 2.2 m in front of the pup
  const cam3 = useMemo(() => ({ look: new Vector3(), tgt: new Vector3() }), []);
  useFrame((state) => {
    const o = w.last;
    if (!o || !live.arrival.id || mode !== "full") return;
    const cam = state.camera;
    if (o.dashK2 > 0.01) {
      cam.getWorldDirection(cam3.look).multiplyScalar(10).add(cam.position);
      cam3.tgt.set(o.dashPos[0], o.dashPos[1], o.dashPos[2]);
      cam3.look.addScaledVector(cam3.tgt.sub(cam3.look), 0.6 * o.dashK2);
      cam.lookAt(cam3.look);
    }
    if (o.pull > 0.001) {
      cam3.tgt.set(live.seal.x, 1.0, live.seal.z);
      cam3.look.copy(cam.position).sub(cam3.tgt).setLength(2.2).add(cam3.tgt);
      cam.position.lerp(cam3.look, o.pull);
      cam.lookAt(cam3.tgt.x, cam3.tgt.y + 0.3, cam3.tgt.z);
    }
  }, 0.5);
  // the dash turns the pup side-on to its path (toward the Nomu), then back to the lens
  useFrame(() => {
    if (!live.arrival.id || mode !== "full" || yaw.current <= 0.001) return;
    const rig = pupRig(scene);
    if (rig) rig.seal.rotation.y += (Math.PI * 0.78 - rig.seal.rotation.y) * yaw.current;
  }, -0.5);

  // the fist: where the right flipper's tip is, in the rig's space; the punch thrusts it straight up
  usePupPost(cut, (t, r) => {
    applyPunch(r.flipR, w.punch ?? 0);
    const p = flipperAt(r.flipR, w.root, [0.75, 0.1, 0]);
    fist.current = [p.x, p.y, p.z];
    const h = hero.current;
    if (h?.capeRig && pup.current?.root) {
      follow(h.capeRig, h.rear, pup.current.root);
      follow(h.auraRig, h.head, pup.current.root);
    }
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
    w.last = o;
    shake.current.set(o.shakeX + o.dashX, o.shakeY, o.dashZ);
    yaw.current = o.yaw;
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
    if (o.reveal) {
      const pr = prep.current;
      // the stage lens stands where an island wall may be: hold any top-level piece the lens is inside or against out of sight until the end
      if (!cleared.current) {
        cleared.current = [];
        for (const [x, b] of pr.boxes) if (!b.isEmpty() && b.distanceToPoint(state.camera.position) < 5 && b.max.y - b.min.y > 3) cleared.current.push(x);
      }
      // the island comes back a twelfth at a time, never in one frame
      const list = island.current;
      const upto = Math.min(list.length, pr.shown + Math.ceil(list.length / 12));
      for (let i = pr.shown; i < upto; i++) list[i].visible = !cleared.current.includes(list[i]);
      pr.shown = upto;
      movers.current ??= nearMovers(list, live.seal.x, live.seal.z);
    }
    if (movers.current && t > tl.lineC - 0.7) for (const m of movers.current) m.visible = false;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={w.flash} />
      <primitive object={w.root} />
    </>
  );
}
