"use client";

// The hall behind the install: nine glass server blades in a 3x3 grid on
// their own floor, each carrying two or three lit pods and the one agent a
// daemonset puts on every node (dsx-ai-factory/topograph #432's "grant"
// figure). Static and instanced — per figure.desc the cluster keeps running
// the whole time the gates open and close in Grant.jsx, so nothing here
// animates; only the coral reach that reaches INTO this hall does, drawn by
// the caller.

import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, Object3D } from "three";
import { C, mat } from "../../palette";

const dummy = new Object3D();

const COLS = [-1, 0, 1];
const ROWS = [-1, -1.8, -2.6];
const BLADE = [0.62, 0.32, 0.36]; // x length, y height, z depth
const POD = 0.15;
const AGENT = [0.17, 0.24, 0.17];

// The hall's own footprint, in this same local space, so the caller can size
// a floor wash that lines up without knowing the grid above.
export const HALL_BOUNDS = { z: -1.8, width: 3.3, depth: 3.0 };

const bladeGeo = new BoxGeometry(...BLADE);
const podGeo = new BoxGeometry(POD, POD, POD);
const agentGeo = new BoxGeometry(...AGENT);
const slabGeo = new BoxGeometry(HALL_BOUNDS.width, 0.12, HALL_BOUNDS.depth);

const bladeMat = mat(C.ice, { roughness: 0.2, metalness: 0.05, opacity: 0.62 });
const slabMat = mat(C.warmWhite, { roughness: 0.85 });

const LAYOUT = (() => {
  const blades = [];
  const pods = [];
  const agents = [];
  ROWS.forEach((z, j) => {
    COLS.forEach((x, i) => {
      blades.push({ x, z });
      const n = 2 + ((i + j) % 2);
      for (let k = 0; k < n; k++) {
        const side = k % 2 === 0 ? -1 : 1;
        pods.push({ x: x + side * 0.16, y: BLADE[1] + POD / 2, z: z - 0.06 + 0.12 * Math.floor(k / 2) });
      }
      agents.push({ x: x - BLADE[0] / 2 + AGENT[0] / 2 + 0.03, y: BLADE[1] + AGENT[1] / 2, z });
    });
  });
  return { blades, pods, agents };
})();

function place(mesh, items, y) {
  if (!mesh) return;
  items.forEach((it, idx) => {
    dummy.position.set(it.x, it.y ?? y, it.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

export default function GrantHall({ accent }) {
  const bladeRef = useRef();
  const podRef = useRef();
  const agentRef = useRef();
  const layout = useMemo(() => LAYOUT, []);

  // The one accent this place owns (its org colour), on the pods it runs —
  // the plinth carries the same colour, so the hall reads as one piece with
  // it. The daemonset agent on top of each blade is the same family, darker,
  // so it still reads as its own thing next to the brighter pods.
  const podMat = useMemo(() => mat(accent, { roughness: 0.4, emissive: accent, emissiveIntensity: 0.9 }), [accent]);
  const agentColor = useMemo(() => `#${new Color(accent).multiplyScalar(0.5).getHexString()}`, [accent]);
  const agentMat = useMemo(() => mat(agentColor, { roughness: 0.4, emissive: agentColor, emissiveIntensity: 0.5 }), [agentColor]);

  useLayoutEffect(() => {
    place(bladeRef.current, layout.blades, BLADE[1] / 2);
    place(podRef.current, layout.pods, 0);
    place(agentRef.current, layout.agents, 0);
  }, [layout]);

  return (
    <group>
      <mesh position={[0, -0.06, HALL_BOUNDS.z]} receiveShadow material={slabMat} geometry={slabGeo} />
      <instancedMesh ref={bladeRef} args={[bladeGeo, bladeMat, layout.blades.length]} castShadow receiveShadow />
      <instancedMesh ref={podRef} args={[podGeo, podMat, layout.pods.length]} />
      <instancedMesh ref={agentRef} args={[agentGeo, agentMat, layout.agents.length]} />
    </group>
  );
}
