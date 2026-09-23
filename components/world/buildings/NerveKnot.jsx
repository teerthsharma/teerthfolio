"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, Color, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, lamp, mat } from "../palette";

// Landmark for PLACE_BY_ID["nerve"] in lib/world/places.js.
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius (1.8 m).
//
// nerve tested four hypotheses about knotted polymer chains against controls
// built to kill them; three were withdrawn. The trefoil knot is the shape
// itself, standing on a pedestal; the signal post's four flags drop one by
// one as each hypothesis is withdrawn, the knot turns once to prove it reads
// the same from every angle, and the fourth flag -- the one that survived --
// never comes down.

const RAIL_XS = [0.6, 0.9, 1.2, 1.5];
const RAIL_Y = 2.23;
const RAISED_Y = 2.6;
const WITHDRAWN_Y = 1.7;
const FLAG_Z = -0.2;

const EASE_RATE = 4; // ease k = 1 - exp(-EASE_RATE * dt), the one rate the kit uses everywhere
const TURN_SPEED = (Math.PI * 2) / 3; // one full turn in 3 s
const NEAR_SPIN = 0.3; // rad/s while the seal is near
const TAU = Math.PI * 2;

// Cycle timeline (seconds), looping: flags 0, 1, 2 drop every 2.5 s; once the
// third has dropped the knot turns once (3 s); then every flag rises together.
const DROP_AT = [0, 2.5, 5.0];
const TURN_START = 6.2;
const TURN_END = TURN_START + 3;
const CYCLE = 11;

// Pedestal rim + signal post + crossbar + 4 rails: one charcoal draw call,
// built once (module scope -- the shape never changes).
function buildStaticCharcoal() {
  const rim = new TorusGeometry(1.0, 0.12, 6, 20);
  rim.rotateX(Math.PI / 2);
  rim.translate(-0.35, 0.4, 0);

  const post = new BoxGeometry(0.18, 2.9, 0.18);
  post.translate(1.05, 1.45, FLAG_Z);

  const crossbar = new BoxGeometry(1.1, 0.14, 0.14);
  crossbar.translate(1.0, 2.85, FLAG_Z);

  const rails = RAIL_XS.map((x) => {
    const g = new BoxGeometry(0.12, 1.1, 0.12);
    g.translate(x, RAIL_Y, FLAG_Z);
    return g;
  });

  return mergeGeometries([rim, post, crossbar, ...rails], false);
}

const STATIC_GEO = buildStaticCharcoal();
const WARM_WHITE = new Color(C.warmWhite);

export default function NerveKnot({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);

  const charcoalMat = useMemo(() => mat(C.charcoal), []);
  const pedestalMat = useMemo(() => mat(C.warmWhite), []);
  const knotMat = useMemo(() => mat(A, { flat: false }), [A]);
  const flagMats = useMemo(() => RAIL_XS.map(() => mat(A).clone()), [A]);
  const lampMat = useMemo(() => lamp(A).clone(), [A]);
  const accentColor = useMemo(() => new Color(A), [A]);

  const knotRef = useRef(null);
  const flagRefs = useRef([]);
  // Per-frame animation state lives in a ref, never React state: it changes
  // 60x/s and must not trigger a render.
  const anim = useRef({
    cycleT: 0,
    spin: 0,
    flagY: [RAISED_Y, RAISED_Y, RAISED_Y, RAISED_Y],
    flagMix: [0, 0, 0, 0], // 0 = accent colour, 1 = withdrawn (warm white)
    lampMix: 0,
  });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const s = anim.current;
    const k = 1 - Math.exp(-EASE_RATE * dt);

    s.cycleT = (s.cycleT + dt) % CYCLE;
    const inTurn = s.cycleT >= TURN_START && s.cycleT < TURN_END;

    // Flags 0-2 go down once their drop time arrives, and come back up once
    // the knot's turn has finished. Flag 3 -- the survivor -- never drops.
    for (let i = 0; i < 3; i++) {
      const down = s.cycleT >= DROP_AT[i] && s.cycleT < TURN_END;
      s.flagY[i] += ((down ? WITHDRAWN_Y : RAISED_Y) - s.flagY[i]) * k;
      s.flagMix[i] += ((down ? 1 : 0) - s.flagMix[i]) * k;
    }
    s.flagY[3] += (RAISED_Y - s.flagY[3]) * k;
    s.flagMix[3] += (0 - s.flagMix[3]) * k;

    for (let i = 0; i < 4; i++) {
      const flag = flagRefs.current[i];
      if (flag) flag.position.y = s.flagY[i];
      flagMats[i].color.copy(accentColor).lerp(WARM_WHITE, s.flagMix[i]);
    }

    const spinSpeed = near ? NEAR_SPIN : inTurn ? TURN_SPEED : 0;
    s.spin = (s.spin + spinSpeed * dt) % TAU;
    if (knotRef.current) knotRef.current.rotation.y = s.spin;

    s.lampMix += ((near ? 1 : 0) - s.lampMix) * k;
    lampMat.emissiveIntensity = 0.15 + s.lampMix * 2.25;
  });

  return (
    <group>
      <mesh castShadow receiveShadow position={[-0.35, 0.2, 0]} material={pedestalMat}>
        <cylinderGeometry args={[1.0, 1.0, 0.4, 10]} />
      </mesh>

      <mesh castShadow receiveShadow geometry={STATIC_GEO} material={charcoalMat} />

      <mesh ref={knotRef} castShadow receiveShadow position={[-0.35, 1.55, 0]} material={knotMat}>
        <torusKnotGeometry args={[0.65, 0.26, 96, 10, 2, 3]} />
      </mesh>

      {RAIL_XS.map((x, i) => (
        <mesh
          key={x}
          ref={(el) => (flagRefs.current[i] = el)}
          castShadow
          position={[x, RAISED_Y, FLAG_Z]}
          material={flagMats[i]}
        >
          <boxGeometry args={[0.26, 0.3, 0.06]} />
        </mesh>
      ))}

      <mesh position={[1.5, 3.0, FLAG_Z]} material={lampMat}>
        <sphereGeometry args={[0.1, 10, 8]} />
      </mesh>
    </group>
  );
}
