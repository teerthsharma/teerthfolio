"use client";

// Separatrix: Fist of the North Star. The broad pointing silhouette, seven
// chest dots lit, says "You're already dead." and shakes (the figure only).
// The pup answers with the HUNDRED-CRACK fist: a flurry of fist afterimages
// on twos. It does not explode. Then the data decides, and the ending
// alternates by visit: a closed green ring slams down on the pup (certified),
// or an amber ring with a gap opens over a hole in the coral curve (refused).
// Shape, colour and pose only. Card: lib/world/cutscene/cards/p-separatrix.js.
// Cost: 30 instanced ghosts (1 draw), dots, ring, shock, hole, curve, rim:
// about 7 draws, ~1k triangles.

import { useMemo, useRef } from "react";
import { CapsuleGeometry, CircleGeometry, InstancedMesh, Object3D, RingGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Speaker, Stage, useCutFrame } from "../kit";
import { figureAt, figureScale } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { additive, fade, figureFrame, flat, outK, ramp, rand, ribbon, twos, useStageGroup } from "./g5/fx";

const BARRAGE = [3.65, 4.6];
const VERDICT = 4.85;
const GHOSTS = 36;
const PER = 6; // ghosts a drawing
const DOTS = [[-0.14, 1.5], [-0.05, 1.46], [0.04, 1.42], [0.12, 1.36], [0.1, 1.24], [0.2, 1.2], [0.22, 1.32]];
const OK = "#8ff0bf"; // a certified ring: green, as the project's own rings are
const NO = "#ffb43a"; // refused: amber
const CURVE = "#ff6b5a"; // the separatrix itself: coral

// the ending for this visit: both are the product, so it alternates (window.__sepEnding pins one for a capture)
const endingNow = () => (typeof window !== "undefined" && window.__sepEnding) || (Math.random() < 0.5 ? "certified" : "refused");

export default function Separatrix(cut) {
  const { card, tl, mode } = cut;
  const refs = useRef({});
  const ending = useMemo(endingNow, [card, live.arrival.start]);
  const k = useMemo(() => {
    const dot = new CircleGeometry(0.04, 10);
    const dots = mergeGeometries(DOTS.map(([x, y]) => dot.clone().translate(x * 1.28, y * 0.96, 0.292)));
    const curve = [];
    for (let i = 0; i <= 28; i++) {
      const u = i / 28;
      const x = -3 + 6 * u;
      curve.push([x, 0.55 * Math.sin(u * Math.PI * 1.1 - 0.35) * 1.3 - 0.9 * (u - 0.5) ** 2 * 2]);
    }
    const ghost = new CapsuleGeometry(0.07, 0.34, 2, 8).rotateZ(Math.PI / 2); // a flipper, lying along x
    const ghosts = new InstancedMesh(ghost, flat("#a9bdf5", { transparent: true, opacity: 0.45, depthWrite: false }), GHOSTS);
    ghosts.frustumCulled = false;
    const refused = ending === "refused";
    return {
      ghosts,
      dots,
      dotMat: additive("#ffffff"),
      ring: new TorusGeometry(0.95, 0.065, 8, 44, refused ? 5.0 : Math.PI * 2),
      ringMat: flat(refused ? NO : OK),
      shock: new RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2),
      shockMat: additive(refused ? NO : OK),
      hole: new CircleGeometry(1, 36).rotateX(-Math.PI / 2),
      holeMat: flat("#04020c"),
      curve: ribbon(curve, 0.15).rotateX(-Math.PI / 2),
      curveMat: flat(CURVE),
      dummy: new Object3D(),
    };
  }, [ending]);

  // the pup: the fist flurries on twos, then it does not explode. It sits, certified, or is taken down.
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = outK(tl, t);
    const f = Math.floor(t * 12);
    const barrage = t >= BARRAGE[0] && t < BARRAGE[1];
    const wind = ramp(3.2, 3.6, t) * (1 - ramp(BARRAGE[1], BARRAGE[1] + 0.2, t));
    live.pose.fist = wind * (barrage ? (f % 2 ? 1 : 0.55) : 0.8) * o;
    live.pose.crouch = (barrage ? 0.25 : 0) * o;
    const v = ramp(VERDICT, VERDICT + 0.35, t);
    if (ending === "certified") live.pose.sit = v * 0.9 * o;
    else live.pose.crouch = Math.max(live.pose.crouch, v * 0.8 * o);
  });

  const root = useStageGroup(cut, (t) => {
    const r = refs.current;
    const tt = twos(t);
    const o = outK(tl, t);
    const F = Math.floor(t * 12);
    const D = k.dummy;
    // the speaker: seven dots lit on line A, a nani shake before the barrage
    const ff = figureFrame(t, tl, mode);
    r.fig.visible = Boolean(ff);
    r.shake.position.set(0, 0, 0);
    r.shake.rotation.z = 0;
    if (ff) {
      const at = figureAt(card);
      const sc = figureScale(card);
      r.fig.position.set(at[0], at[1], at[2]);
      r.fig.scale.set(sc * ff[0], sc * ff[1], sc * ff[0]);
      r.fig.rotation.y = -0.42;
      const lit = ramp(tl.lineA, tl.lineA + 0.2, t);
      k.dotMat.opacity = lit * (0.7 + 0.3 * Math.sin(tt * 8));
      r.dots.visible = lit > 0;
      if (t > 3.2 && t < 3.75) {
        r.shake.position.x = Math.sin(F * 5.1) * 0.06;
        r.shake.rotation.z = Math.sin(F * 3.7) * 0.012;
      }
    }
    // the hundred-crack fist: afterimages on twos, a drawing of six at a time
    k.ghosts.visible = t >= BARRAGE[0] && t < BARRAGE[1] + 0.5;
    for (let j = 0; j < GHOSTS; j++) {
      const fj = F - Math.floor(j / PER);
      const age = (F - fj) / 6;
      const live_ = fj >= BARRAGE[0] * 12 && fj < BARRAGE[1] * 12 && age < 1;
      if (live_) {
        const rr = rand(fj * 131 + (j % PER) * 17 + 3);
        D.position.set(-0.75 + (rr() - 0.5) * 1.2, 0.95 + (rr() - 0.5) * 0.9, 0.95 + rr() * 0.3);
        D.rotation.set(0, 0, 0.35 + (rr() - 0.5) * 1.5);
        D.scale.setScalar((0.5 + rr() * 0.8) * (1 - age * 0.7) * o);
      } else D.scale.setScalar(0);
      D.updateMatrix();
      k.ghosts.setMatrixAt(j, D.matrix);
    }
    k.ghosts.instanceMatrix.needsUpdate = true;
    // the verdict
    const a = t - VERDICT;
    const slam = ramp(0, 0.12, a);
    r.ring.visible = a > 0;
    const settle = a > 0.12 ? Math.exp(-(a - 0.12) * 6) * Math.sin((a - 0.12) * 28) * 0.05 : 0;
    r.ring.position.set(0, 0.45 + (1 - slam) * 2.2 + settle, 0.0);
    r.ring.rotation.set(Math.PI / 2, 0, ending === "refused" ? 0.9 : 0);
    r.ring.scale.setScalar((1 + (1 - slam) * 1.2) * Math.max(o, 0.0001));
    r.shock.visible = a > 0.1 && a < 1.2;
    r.shock.position.y = 0.06;
    r.shock.scale.setScalar(0.9 + 2.2 * ramp(0.1, 1.1, a));
    fade(k.shockMat, 0.8 * (1 - ramp(0.1, 1.2, a)));
    const refused = ending === "refused";
    r.hole.visible = refused && a > 0.1;
    r.hole.position.y = 0.035;
    r.hole.scale.setScalar(1.15 * ramp(0.1, 0.55, a) * Math.max(o, 0.0001));
    r.curve.visible = refused && a > 0;
    k.curve.setDrawRange(0, Math.floor(ramp(0, 0.5, a) * 168 / 6) * 6);
    r.curve.position.set(0, 0.05, 0.1);
    k.ringMat.opacity = 1;
  });

  const set = (name) => (m) => {
    refs.current[name] = m;
  };
  return (
    <>
      <Stage {...cut} />
      <group ref={set("shake")}>
        <Speaker {...cut} />
      </group>
      <group ref={root} visible={false}>
        <group ref={set("fig")}>
          <mesh ref={set("dots")} geometry={k.dots} material={k.dotMat} />
        </group>
        <primitive object={k.ghosts} />
        <mesh ref={set("ring")} geometry={k.ring} material={k.ringMat} visible={false} />
        <mesh ref={set("shock")} geometry={k.shock} material={k.shockMat} visible={false} />
        <mesh ref={set("hole")} geometry={k.hole} material={k.holeMat} visible={false} />
        <mesh ref={set("curve")} geometry={k.curve} material={k.curveMat} visible={false} />
      </group>
    </>
  );
}
