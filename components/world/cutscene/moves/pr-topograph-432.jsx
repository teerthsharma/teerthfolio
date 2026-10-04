"use client";

// pr-topograph-432: THE THRONE ROOM OF NAZARICK as a modern American comic (Marvel/DC cover art, Mignola/Lee). Bold ink
// outlines (inverted hulls), three flat cel bands, cross-hatching in the shadows (screen space), deep purple and black with
// gold and crimson. Ainz, an angular comic lich, sits his throne at the top of a stair, then rises, cape flaring, staff up;
// the pup, in its Ainz cloak (ink and cel too), stands at the stair's foot. The lens cuts between low-angle panels (a hard
// cut through a black gutter), with speed lines and a thick panel border drawn by ./pr-topograph-432/banner.jsx.
// Card: lib/world/cutscene/cards/pr-topograph-432.js. Parts: ./pr-topograph-432/ (comic, hall, villain, ainz, assets).

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { smooth, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, useCutFrame } from "../kit";
import { flashQuad, holdFlash } from "./p-caustic/parts";
import { registerWarm, takeWarm } from "../prewarm";
import Banner from "./pr-topograph-432/banner";
import { disposeAssets, getAssets, getGear } from "./pr-topograph-432/assets";
import { SH } from "./pr-topograph-432/comic";
import { THRONE_Z, TOP_Y } from "./pr-topograph-432/hall";
import { poseAinz } from "./pr-topograph-432/villain";

const UP = new Vector3(0, 1, 0);
const V = new Vector3();
const W = new Vector3();
const H = new Vector3();
const E = new Vector3();
const BASE = new Vector3();
const L0 = new Vector3();
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const banner = () => (typeof document !== "undefined" ? document.getElementById("topo-banner") : null);

// the panels: [from s, to s, eye a, eye b, look a, look b, fov a, fov b, roll, pup yaw]; positions are in the rig frame
// (the pup at the origin, the stair and the throne toward -z)
const SHOTS = [
  [1.5, 4.4, [0.9, 0.55, 5.4], [0.5, 0.7, 4.4], [0, 4.0, -9], [0, 4.4, -9.6], 40, 38, 0, 0.5], // low, looking up the stair
  [4.4, 7.4, [1.2, 5.0, -6.6], [0.5, 5.2, -8.0], [0, 5.3, -11.2], [0, 5.35, -11.2], 30, 26, 0.07, 0.5], // the skull, the eyes ignite
  [7.4, 8.5, [-2.2, 2.6, -3.4], [-1.4, 2.4, -4.4], [0, 6.0, -10.4], [0, 6.5, -10.2], 44, 46, -0.08, 0.5], // he rises (extreme low)
  [8.5, 12.2, [-2.6, 1.2, 3.4], [-1.8, 1.0, 2.6], [0, 6.2, -9.5], [0, 6.6, -9.5], 44, 48, 0.05, 0.5], // standing, arms wide
  [12.2, 15.3, [0.7, 1.0, 3.0], [0.6, 1.1, 2.4], [0, 1.2, 0], [0, 1.35, 0], 36, 34, 0, 0.45], // cut to the pup
  [15.3, 20, [1.6, 1.4, 2.7], [1.3, 1.6, 2.3], [-0.2, 4.6, -8], [-0.1, 5.2, -8.5], 44, 46, 0.03, 2.6], // over the pup's shoulder
  [20, 24.2, [2.6, 0.4, 4.2], [1.8, 0.5, 3.6], [0, 6.4, -10], [0, 6.8, -10], 50, 52, -0.06, 2.6], // extreme low wide
  [24.2, 28.7, [0, 3.2, 7.5], [0, 6.0, 13.5], [0, 6.0, -10], [0, 6.2, -10], 46, 50, 0, 2.6], // the pull-back
];
const GUTTER = 0.09; // s of black between panels

function buildWorld() {
  return { root: getAssets().root, dispose: () => disposeAssets() };
}
registerWarm("pr-topograph-432", buildWorld);

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const full = mode === "full";
  const camera = useThree((s) => s.camera);
  const rig = useRef();
  const pup = useRef(null);
  const gear = useRef(null);
  const twin = useRef(null);
  const st = useRef({ yaw: null, turn: 0, shot: null, t: 0 });
  const A = useMemo(() => {
    if (!full) return null;
    takeWarm("pr-topograph-432", buildWorld);
    return getAssets();
  }, [full]);
  const flash = useMemo(() => (full ? flashQuad("#05020a") : null), [full]);

  useEffect(() => {
    if (!full) return undefined;
    const G = getGear();
    pup.current = G?.p ?? null;
    if (G) {
      gear.current = G.gear;
      twin.current = G.twin;
      rig.current?.add(G.gear.staff);
    }
    return () => {
      gear.current = null;
      twin.current = null;
      pup.current = null;
      const b = banner();
      if (b) b.dataset.off = "1";
      flash.geometry.dispose();
      flash.material.dispose();
      disposeAssets();
    };
  }, [full, A, flash]);

  // the pup upright, yawed per panel; a skip clears the arrival and everything is hidden that frame
  useFrame(() => {
    if (!full) return;
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      twin.current?.set(false);
      if (gear.current) gear.current.cloak.visible = gear.current.staff.visible = false;
      flash.visible = false;
      const b = banner();
      if (b) b.dataset.off = "1";
      return;
    }
    const p = pup.current;
    if (p?.root) {
      p.root.rotation.x = p.root.rotation.z = 0;
      if (st.current.yaw != null) p.root.rotation.y = st.current.yaw + st.current.turn;
    }
  }, -0.5);

  // the staff follows the pup's right flipper, upright
  useFrame(() => {
    const G = gear.current;
    const p = pup.current;
    const g = rig.current;
    if (!full || !G || !p?.flipR || !live.arrival.id || !g?.visible) return;
    const s = live.seal;
    BASE.set(s.x, 0, s.z);
    p.flipR.updateWorldMatrix(true, false);
    p.flipR.localToWorld(H.set(0.62, 0.05, 0)).sub(BASE).applyAxisAngle(UP, -st.current.turn);
    E.set(0.12, 1, 0.08).normalize();
    G.staff.quaternion.setFromUnitVectors(UP, E);
    G.staff.position.copy(H);
  }, 0);

  // the lens: the current panel, written after the CameraRig and before the composer
  useFrame((state) => {
    const S = st.current;
    const sh = S.shot;
    const g = rig.current;
    if (!full || !live.arrival.id || !sh || !g?.visible) return;
    g.updateWorldMatrix(true, false);
    const k = smooth(sh[0], sh[1], S.t);
    V.lerpVectors(W.set(...sh[2]), E.set(...sh[3]), k);
    L0.lerpVectors(H.set(...sh[4]), BASE.set(...sh[5]), k);
    camera.position.copy(g.localToWorld(V));
    const look = g.localToWorld(L0);
    const fov = sh[6] + (sh[7] - sh[6]) * k;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    camera.rotateZ(sh[8]);
    const dpr = state.gl.getPixelRatio();
    SH.uRes.value.set(state.size.width * dpr, state.size.height * dpr);
    SH.uOut.value = 2.6 * dpr;
  }, 0.5);

  useCutFrame((t, state) => {
    const g = rig.current;
    if (!full) return;
    const S = st.current;
    S.t = t;
    const s = live.seal;
    const turn = turnFor(card, place, s.x, s.z);
    S.turn = turn;
    g.rotation.y = turn;
    g.position.set(s.x, 0, s.z);
    const on = t >= 1.5 && t < tl.collapse[0] + 0.1;
    g.visible = on;
    SH.uTime.value = Math.floor(t * 12) / 12;
    const b = banner();
    if (b) {
      b.dataset.dock = t > 1.3 ? "1" : "0";
      b.dataset.on = on ? "1" : "0";
    }
    // the current panel and the black gutter between panels
    S.shot = SHOTS.find((x) => t >= x[0] && t < x[1]) ?? SHOTS[SHOTS.length - 1];
    S.yaw = on ? S.shot[9] : null;
    const into = t - S.shot[0];
    const gutter = on ? (into < GUTTER ? 1 : 0) : t > 1.15 && t < 1.5 ? 1 : t > tl.collapse[0] - 0.08 ? smooth(tl.collapse[0] - 0.08, tl.collapse[0] + 0.1, t) : 0;
    holdFlash(flash, state.camera, gutter);

    // Ainz: seated, eyes ignite, rises with the cape flaring, arms wide and staff up, then sits again
    const rise = smooth(7.4, 9.7, t) * (1 - smooth(25, 27.2, t));
    const open = smooth(9, 11, t) * (1 - smooth(24.6, 26, t));
    const flare = clamp01(0.12 + smooth(8.4, 10, t) * 0.88 * (1 - smooth(25, 27, t)));
    const B = A.ainz;
    B.root.position.set(0, TOP_Y + 1.15 + 0.78 * rise, THRONE_Z + 0.25 + 2.0 * rise);
    poseAinz(B, { rise, open, flare, eye: smooth(5.0, 5.35, t) });
    A.hall.circle.rotation.z = Math.floor(t * 6) * 0.04;
    A.hall.circle.material.opacity = 0.55 + 0.4 * smooth(7.4, 10, t);
    A.hall.small.rotation.z = -Math.floor(t * 6) * 0.06;

    // the pup: the opening sign, then it raises its staff in the closing panels
    const G = gear.current;
    const gearOn = t >= 1.4 && t < tl.collapse[0] + 0.1;
    live.pose.sign = smooth(0.45, 1.05, t) * (1 - smooth(1.5, 1.9, t));
    live.pose.raise = smooth(12.4, 13.2, t) * (t < tl.collapse[0] ? 0.8 : 0);
    live.pose.mouth = (t > 2.4 && t < 4.4) || (t > 15.4 && t < 19.8) ? 0.8 : 0;
    twin.current?.set(gearOn);
    if (G) {
      G.cloak.visible = gearOn;
      G.staff.visible = gearOn;
    }
  });

  if (!full) return <Banner still />;
  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <Banner />
      <group ref={rig} visible={false}>
        <primitive object={A.root} />
      </group>
      <primitive object={flash} />
    </>
  );
}
