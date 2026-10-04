// Epsilon-Hollow: Evangelion. The lab sphere stays lit against the night and
// speaks. An orange octagonal AT-FIELD flares round it (nested octagon
// outlines and a faint fill, billboarded to the lens); a giant ink finger
// drops from the top of the frame and points it out (line A); the pup
// squashes, then yeets itself at the door with one white flash that stays on
// the sphere, and three dots rise out of the flash and vanish (line B).
// Shape, colour, pose. Card: lib/world/cutscene/cards/p-epsilon-hollow.js.

import { useMemo, useRef } from "react";
import { CylinderGeometry, BoxGeometry, CircleGeometry, IcosahedronGeometry, RingGeometry, Color, MeshBasicMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Stage, onTwos, smooth, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Rig, glow, landLocal, pulse, useInk } from "./g4/parts";

const ORANGE = "#ff8a1f";
const OCT = Math.PI / 8; // an octagon, flat-topped

// A fist and one pointing finger, forearm running off the top: a silhouette, no body.
function fingerGeometry() {
  const arm = new CylinderGeometry(0.3, 0.38, 8, 7).translate(0, 4.9, 0);
  const wrist = new CylinderGeometry(0.4, 0.3, 0.6, 7).translate(0, 0.9, 0);
  const fist = new BoxGeometry(1.15, 0.85, 0.9).translate(0, 0.3, 0);
  const finger = new CylinderGeometry(0.14, 0.24, 1.9, 6).translate(0.22, -1.0, 0);
  const tip = new IcosahedronGeometry(0.16, 0).translate(0.22, -2.0, 0);
  const thumb = new BoxGeometry(0.34, 0.6, 0.34).translate(-0.62, 0.1, 0.2);
  const knuckles = [-0.3, 0, 0.3].map((x) => new BoxGeometry(0.24, 0.3, 0.3).translate(x, -0.3, 0.55));
  return mergeGeometries([arm, wrist, fist, finger, tip, thumb, ...knuckles].map((g) => g.toNonIndexed()));
}

export default function Move(cut) {
  const { card, tl, mode } = cut;
  const { ink, rim, p } = useInk(card);
  const finger = useMemo(fingerGeometry, []);
  const octFill = useMemo(() => new CircleGeometry(1, 8).rotateZ(OCT), []);
  const octA = useMemo(() => new RingGeometry(0.955, 1, 8).rotateZ(OCT), []);
  const octB = useMemo(() => new RingGeometry(0.97, 1, 8), []); // the second, turned half a facet
  const disc = useMemo(() => new CircleGeometry(1, 32), []);
  const dot = useMemo(() => new IcosahedronGeometry(1, 1), []);
  const mats = useMemo(
    () => ({ fill: glow(ORANGE), a: glow(ORANGE), b: glow("#ffd9a0"), flash: glow("#ffffff"), dots: [0, 1, 2].map((i) => new MeshBasicMaterial({ color: new Color(p.star[i]), toneMapped: false, fog: false, transparent: true })) }),
    [p],
  );
  const field = useRef();
  const hand = useRef();
  const flash = useRef();
  const dots = useRef([]);
  const at = useRef([0, 0, 0]);

  useCutFrame((t, state) => {
    if (mode !== "full") return;
    const lin = smooth(tl.sign[0], tl.sign[1], t) * (1 - smooth(tl.collapse[1], tl.duration, t));
    // the squash holds through line A's last beat, then the throw
    const crouch = smooth(tl.move[0] - 0.7, tl.move[0], t) * (1 - smooth(tl.move[0], tl.move[0] + 0.15, t));
    const go = smooth(tl.move[0], tl.move[1], t);
    live.pose.sign = lin * (1 - smooth(tl.sign[1] + 0.3, tl.sign[1] + 0.6, t));
    live.pose.crouch = crouch;
    live.pose.spin = go;
    live.pose.raise = Math.max(0, go * (1 - smooth(tl.move[1], tl.move[1] + 0.5, t)));
    live.seal.air = 0.22 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - tl.move[0]) / 0.9))); // the yeet: one hop

    const L = landLocal(cut, at.current);
    const s = 1 + 0.1 * Math.sin(t * 7); // the field hums
    const open = smooth(tl.enter - 0.2, tl.enter + 0.45, t);
    const pop = Math.exp(-6 * Math.max(0, t - tl.lineB)) * (t >= tl.lineB ? 1 : 0);
    const fp = field.current;
    fp.position.set(L[0], L[1], L[2]);
    fp.lookAt(state.camera.position);
    fp.scale.setScalar(Math.max(0.01, onTwos(open) * (3.7 + 0.1 * s + 0.6 * pop)));
    const vis = pulse(t, tl.enter - 0.2, tl.collapse[0], 0.4);
    mats.fill.opacity = vis * (0.1 + 0.08 * Math.sin(t * 9) ** 2 + 0.2 * pop);
    mats.a.opacity = vis * 0.95;
    mats.b.opacity = vis * 0.4;

    // the finger drops from the top (a drop, a rebound, settled), then lifts away
    const drop = smooth(tl.enter, tl.enter + 0.4, t);
    const bounce = Math.exp(-9 * Math.max(0, t - tl.enter - 0.4)) * Math.sin(40 * Math.max(0, t - tl.enter - 0.4)) * 0.5;
    const lift = smooth(tl.move[0], tl.move[1], t);
    const h = hand.current;
    // it comes in from the top left along its own arm, fingertip at the sphere
    const away = (1 - onTwos(drop)) * 20 + onTwos(lift) * 20 + bounce;
    h.position.set(L[0] - 2.7 - 0.78 * away, L[1] - 0.6 + 0.62 * away, L[2] + 1.5);
    h.rotation.set(0, 0, 0.9);
    h.scale.setScalar(1.55);
    h.visible = t > tl.enter - 0.05 && t < tl.move[1] + 0.6;

    // the white flash: one hit on the sphere's face as the pup goes in, never the whole frame
    const f = flash.current;
    f.position.set(L[0], L[1] - 1.9, L[2]);
    f.lookAt(state.camera.position);
    f.translateZ(1.5);
    const hit = onTwos(Math.exp(-5 * Math.max(0, t - tl.move[1] + 0.1)) * smooth(tl.move[1] - 0.25, tl.move[1] - 0.1, t));
    f.scale.setScalar(2.4 * (0.5 + hit));
    mats.flash.opacity = hit;

    // three dots rise out of the flash, hang, and vanish
    const rise = smooth(tl.lineB, tl.lineB + 0.7, t);
    const gone = smooth(tl.collapse[0] - 1.2, tl.collapse[0] - 0.4, t);
    dots.current.forEach((d, i) => {
      if (!d) return;
      const a = (i - 1) * 0.9;
      d.position.set(L[0] + Math.sin(a) * 2.2 * rise, L[1] - 2.4 + 1.3 * rise + Math.cos(a * 2) * 0.25, L[2] + 1.8);
      d.scale.setScalar(Math.max(0.001, 0.22 * onTwos(rise) * (1 - onTwos(gone))));
    });
  });

  return (
    <>
      <Stage {...cut} />
      <Rig cut={cut}>
        <group ref={field}>
          <mesh geometry={octFill} material={mats.fill} />
          <mesh geometry={octA} material={mats.a} />
          <mesh geometry={octB} material={mats.b} scale={1.14} />
        </group>
        <group ref={hand} visible={false}>
          <mesh geometry={finger} material={ink} />
          <mesh geometry={finger} material={rim} scale={1.12} />
        </group>
        <mesh ref={flash} geometry={disc} material={mats.flash} />
        {[0, 1, 2].map((i) => (
          <mesh key={i} ref={(m) => (dots.current[i] = m)} geometry={dot} material={mats.dots[i]} />
        ))}
      </Rig>
    </>
  );
}
