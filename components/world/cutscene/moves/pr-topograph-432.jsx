"use client";

// The Topograph moat: Gandalf ("You shall not pass."). A tall hat-and-staff
// ink figure, no face, lifts the staff and slams it: a line of light runs
// across the water and stands up as a pale veil. A flood of small YES cards
// rushes at it out of the distance, bounces back and piles up in front of
// the line, failing; the pup's fist lands on the beat of its line and the
// flood bounces again. One instanced mesh of 44 cards, the veil and its line,
// the ring: four draw calls beyond the figure.
// Card: lib/world/cutscene/cards/pr-topograph-432.js.

import { useMemo, useRef } from "react";
import { AdditiveBlending, BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, MeshBasicMaterial, Object3D, PlaneGeometry, RingGeometry } from "three";
import { paletteFor } from "../../../../lib/world/cutscene/look";
import { DefaultMove, onTwos, smooth } from "../kit";
import { colorBox, CREAM, FigureAttach, flatMat, inkGeo, inkMats, merged, srgb, useStageGroup } from "./g3/common";

const LINE_Z = -2.85; // the staff's foot, in the pup's space
const LINE_X1 = 1.54;
const LINE_W = 10.6;
const SLAM = 3.35; // s: the staff comes down
const N = 44;

// the hat and the staff, in the figure's own space (head at y 1.9, staff in the hands)
function gear() {
  const hat = [
    new CylinderGeometry(0.46, 0.5, 0.035, 9).translate(0, 2.03, 0.02), // the brim
    new ConeGeometry(0.27, 0.85, 8).translate(0, 2.47, 0.02), // the crown
    new ConeGeometry(0.1, 0.34, 6).rotateZ(-0.7).translate(0.17, 2.97, 0.02), // its bent tip
  ];
  const staff = [
    new CylinderGeometry(0.036, 0.046, 2.25, 6).translate(0.05, 1.12, 0.34),
    new IcosahedronGeometry(0.11, 0).translate(0.05, 2.3, 0.34),
    new ConeGeometry(0.04, 0.18, 4).translate(0.05, 2.5, 0.34),
  ];
  return { hat: inkGeo(hat), staff: inkGeo(staff) };
}

const yes = () =>
  merged([
    colorBox(0.5, 0.32, 0.03, [0, 0, 0], "#2a1c14"),
    colorBox(0.46, 0.28, 0.03, [0, 0, 0.004], CREAM),
    colorBox(0.14, 0.14, 0.04, [-0.12, 0.04, 0.01], "#5ad17a"), // the YES
    colorBox(0.2, 0.04, 0.04, [0.09, 0.06, 0.01], "#2a1c14"),
    colorBox(0.2, 0.04, 0.04, [0.09, -0.04, 0.01], "#2a1c14"),
  ]);

export default function Move(cut) {
  const { card, tl } = cut;
  const root = useRef();
  const flood = useRef();
  const light = useRef();
  const veil = useRef();
  const ring = useRef();
  const staff = useRef();
  const g = useMemo(() => {
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cards = Array.from({ length: N }, (_, i) => ({
      x: -7.4 + 8.4 * rand(),
      y0: 0.5 + 1.9 * rand(),
      vy: 1.5 + 2.2 * rand(),
      h: i < 32 ? SLAM + 0.2 + 2.3 * rand() : tl.move[1] - 0.12 + 0.2 * rand(), // the last dozen are for the pup's blow
      spin: (rand() - 0.5) * 9,
      rest: 0.05 + 0.075 * (i % 6),
      zr: 0.1 * (i % 3),
    }));
    return {
      cards,
      geo: yes(),
      mat: flatMat(),
      o: new Object3D(),
      gear: gear(),
      line: new BoxGeometry(1, 0.07, 0.12).translate(-0.5, 0.04, 0),
      veil: new PlaneGeometry(1, 3.1).translate(-0.5, 1.55, 0),
      lineMat: new MeshBasicMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, fog: false }),
      veilMat: new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false, fog: false, opacity: 0.16 }),
      ring: new RingGeometry(0.85, 1, 36).rotateX(-Math.PI / 2),
      ringMat: new MeshBasicMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, fog: false }),
    };
  }, [tl]);
  useMemo(() => {
    const p = paletteFor(card);
    srgb(g.lineMat.color, p.core);
    srgb(g.veilMat.color, p.pool);
    srgb(g.ringMat.color, p.core);
  }, [card, g]);

  const ink = inkMats();
  useStageGroup(root, cut, (t) => {
    const T = onTwos(t);
    // the flood: in from the distance, stopped at the line, bounced, piled
    const mesh = flood.current;
    const o = g.o;
    for (let i = 0; i < N; i++) {
      const c = g.cards[i];
      const tau = T - c.h;
      let x = c.x;
      let y = c.y0;
      let z;
      let rx = 0;
      let rz = 0.1 * Math.sin(i);
      let s = 1;
      if (tau < 0) {
        z = LINE_Z - 0.18 + 9 * tau;
        s = smooth(-1.7, -1.3, tau);
        y += 0.15 * Math.sin(T * 7 + i);
      } else {
        const k = 1 - Math.exp(-3 * tau);
        z = LINE_Z - 0.18 - (0.5 + c.zr) * k - 1.1 * Math.min(tau, 0.35);
        y = Math.max(c.rest, c.y0 + c.vy * tau - 4.9 * tau * tau);
        rx = (-Math.PI / 2) * smooth(0.25, 0.95, tau);
        rz += c.spin * Math.min(tau, 0.6) * (1 - smooth(0.5, 0.95, tau));
        x += 0.2 * k * Math.sign(c.spin);
      }
      o.position.set(x, y, z);
      o.rotation.set(rx, 0, rz);
      o.scale.setScalar(Math.max(0.001, s * 1.15));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    // the line of light: from the staff's foot out across the water, then the veil stands
    const run = smooth(SLAM, SLAM + 0.3, T);
    const pup = T >= tl.move[1];
    const pulse = pup ? Math.exp(-(T - tl.move[1]) * 3) : Math.exp(-Math.max(0, T - SLAM) * 3) * 0.6;
    light.current.visible = run > 0.001;
    light.current.position.set(LINE_X1, 0, LINE_Z);
    light.current.scale.set(Math.max(0.001, LINE_W * run), 1, 1);
    g.lineMat.opacity = Math.min(1, 0.7 + 0.5 * pulse);
    veil.current.visible = run > 0.001;
    veil.current.position.set(LINE_X1, 0, LINE_Z);
    veil.current.scale.set(Math.max(0.001, LINE_W * run), smooth(SLAM + 0.05, SLAM + 0.4, T), 1);
    g.veilMat.opacity = 0.14 + 0.28 * pulse;
    // the rings: the staff's blow, then the pup's
    const age = pup ? T - tl.move[1] : T >= SLAM ? T - SLAM : 9;
    ring.current.visible = age < 0.5;
    if (ring.current.visible) {
      ring.current.position.set(pup ? 0.3 : LINE_X1 - 0.16, 0.03, pup ? LINE_Z + 0.4 : LINE_Z + 0.33);
      ring.current.scale.setScalar(0.3 + 3 * Math.min(1, age / 0.45));
      g.ringMat.opacity = 1 - age / 0.5;
    }
    // the staff: up before the blow, down on it
    if (staff.current) staff.current.position.y = 0.34 * smooth(SLAM - 0.55, SLAM - 0.2, T) * (T < SLAM ? 1 : 0);
  });

  return (
    <>
      <DefaultMove {...cut} />
      <FigureAttach {...cut}>
        <mesh geometry={g.gear.hat.outline} material={ink.outline} />
        <mesh geometry={g.gear.hat.ink} material={ink.ink} />
        <group ref={staff}>
          <mesh geometry={g.gear.staff.outline} material={ink.outline} />
          <mesh geometry={g.gear.staff.ink} material={ink.ink} />
        </group>
      </FigureAttach>
      <group ref={root} visible={false}>
        <instancedMesh ref={flood} args={[g.geo, g.mat, N]} frustumCulled={false} />
        <mesh ref={light} geometry={g.line} material={g.lineMat} />
        <mesh ref={veil} geometry={g.veil} material={g.veilMat} />
        <mesh ref={ring} geometry={g.ring} material={g.ringMat} visible={false} />
      </group>
    </>
  );
}
