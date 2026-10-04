// Monodromy: Steins;Gate. The upper sheet speaks as land. The pup answers on
// the phone (a flipper at its head: "El Psy Kongroo."), a nixie-tube
// divergence meter flickers beside it, and on the move it runs the floor loop,
// a bright bead tracing the ring on the ground and coming home to where it
// started. The same loop on the sheet above is an open arc: the lifted bead
// ends one sheet over, short of its start (the loop closed below, not
// above). One glitch frame where the two beads disagree.
// Card: lib/world/cutscene/cards/p-monodromy.js.

import { useMemo, useRef } from "react";
import { BoxGeometry, CircleGeometry, Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, RingGeometry, TorusGeometry } from "three";
import { Stage, onTwos, smooth, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Rig, glow, useInk } from "./g4/parts";

const R = 2.2; // m: the loop
const C = [0.3, 0, -0.5]; // its centre, in the pup's frame
const SHEET = 3.0; // m: the sheet above
const RU = 1.6; // m: its loop
const TILT = 0.95; // rad: the sheet leans toward the lens, so its loop reads as a loop
const GAP = 0.78; // the lifted loop closes only this far round: it ends one sheet over
const TUBES = 7;
const NIXIE = "#ff9a3c";
const TURN = Math.PI * 2;

const flat = (g) => g.rotateX(-Math.PI / 2);
const draw = (g, frac, tubular) => g.setDrawRange(0, Math.round(Math.max(0, Math.min(1, frac)) * tubular) * 5 * 6);

export default function Move(cut) {
  const { card, tl, mode } = cut;
  const { p } = useInk(card);
  const floorGeo = useMemo(() => flat(new TorusGeometry(R, 0.04, 5, 72)), []);
  const upperGeo = useMemo(() => flat(new TorusGeometry(RU, 0.04, 5, 72, TURN * GAP)), []);
  const sheetGeo = useMemo(() => flat(new CircleGeometry(RU * 1.3, 40)), []);
  const edgeGeo = useMemo(() => flat(new RingGeometry(RU * 1.3 - 0.04, RU * 1.3, 40)), []);
  const beadGeo = useMemo(() => new IcosahedronGeometry(0.13, 1), []);
  const plateGeo = useMemo(() => new BoxGeometry(2.1, 0.8, 0.08), []);
  const tubeGeo = useMemo(() => new CylinderGeometry(0.07, 0.07, 0.5, 8).translate(0, 0.25, 0), []);
  const mats = useMemo(
    () => ({
      floor: glow(p.accent),
      upper: glow(p.accent),
      sheet: glow(p.accent),
      edge: glow(p.accent),
      real: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false, fog: false }),
      ghost: new MeshBasicMaterial({ color: new Color(p.rim), toneMapped: false, fog: false }),
      plate: new MeshBasicMaterial({ color: new Color(p.ink), toneMapped: false, fog: false }),
      tube: new MeshBasicMaterial({ color: NIXIE, toneMapped: false, fog: false }),
    }),
    [p],
  );
  const tubes = useMemo(() => {
    const m = new InstancedMesh(tubeGeo, mats.tube, TUBES);
    m.frustumCulled = false;
    return m;
  }, [tubeGeo, mats]);
  const real = useRef();
  const ghost = useRef();
  const meter = useRef();
  const o = useMemo(() => new Object3D(), []);

  useCutFrame((t) => {
    if (mode !== "full") return;
    const fade = 1 - smooth(tl.collapse[0], tl.collapse[1], t);
    const sign = smooth(tl.sign[0], tl.sign[1], t) * (1 - smooth(tl.move[0], tl.move[0] + 0.15, t));
    live.pose.sign = sign;
    live.pose.spin = smooth(tl.move[0], tl.move[1], t); // the cartoon run: one turn, in place
    live.pose.crouch = smooth(tl.move[0] - 0.25, tl.move[0], t) * (1 - smooth(tl.move[0], tl.move[0] + 0.2, t));

    // the sheet and its loop come up with the stage
    const up = onTwos(smooth(tl.enter - 0.1, tl.enter + 0.7, t)) * fade;
    mats.sheet.opacity = 0.1 * up;
    mats.edge.opacity = 0.5 * up;
    mats.floor.opacity = 0.9 * up;
    mats.upper.opacity = 0.9 * up;
    draw(floorGeo, smooth(tl.enter, tl.enter + 0.8, t), 72);

    // the run: the real bead goes once round the floor loop and comes home; the lift follows it up
    const run = smooth(tl.move[0], tl.move[1] + 0.35, t);
    const lift = smooth(tl.move[0] + 0.2, tl.move[1] + 0.7, t);
    draw(upperGeo, lift, 72);
    const a = run * TURN;
    const r = real.current;
    r.position.set(C[0] + R * Math.cos(a), 0.14, C[2] - R * Math.sin(a));
    r.visible = run > 0 && fade > 0;
    const g = ghost.current;
    const b = lift * TURN * GAP; // the lift ends short of the start
    g.position.set(RU * Math.cos(b), 0.14, -RU * Math.sin(b));
    // the one frame the two disagree: the real bead blinks out while the lift lands
    const glitch = t > tl.lineB + 0.55 && t < tl.lineB + 0.55 + 1 / 12;
    g.visible = lift > 0 && fade > 0 && !glitch;
    r.visible = r.visible && !glitch;

    // the nixie meter: tubes flick through digits, then settle as the run ends
    const settle = smooth(tl.move[1], tl.move[1] + 0.5, t);
    for (let i = 0; i < TUBES; i++) {
      const flick = 0.25 + 0.75 * Math.abs(Math.sin(Math.floor(t * 12) * (i + 2.3) * 1.7));
      const h = (flick * (1 - settle) + (i === 0 ? 1 : 0.62 + 0.04 * i) * settle) * onTwos(up);
      o.position.set(-0.8 + i * 0.28 - 0.0, -0.05, 0.08);
      o.scale.set(1, Math.max(0.001, h), 1);
      o.updateMatrix();
      tubes.setMatrixAt(i, o.matrix);
    }
    tubes.instanceMatrix.needsUpdate = true;
    meter.current.scale.setScalar(Math.max(0.001, onTwos(up)));
  });

  return (
    <>
      <Stage {...cut} />
      <Rig cut={cut}>
        <group position={[C[0], 0.05, C[2]]}>
          <mesh geometry={floorGeo} material={mats.floor} position={[0, 0, 0]} />
        </group>
        <group position={[C[0] + 0.6, SHEET, C[2] - 0.8]} rotation={[TILT, 0, 0]}>
          <mesh geometry={upperGeo} material={mats.upper} />
          <mesh geometry={sheetGeo} material={mats.sheet} />
          <mesh geometry={edgeGeo} material={mats.edge} />
          <mesh ref={ghost} geometry={beadGeo} material={mats.ghost} />
        </group>
        <mesh ref={real} geometry={beadGeo} material={mats.real} />
        <group ref={meter} position={[-2.2, 2.4, -1.2]}>
          <mesh geometry={plateGeo} material={mats.plate} position={[0.25, 0.2, -0.06]} />
          <primitive object={tubes} />
        </group>
      </Rig>
    </>
  );
}
