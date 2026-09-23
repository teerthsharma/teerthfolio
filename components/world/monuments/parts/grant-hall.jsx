"use client";

// The hall behind the install: nine blocks of clear ice in a 3x3 grid, the
// cluster's nodes, each carrying two or three lit pods and the one agent a
// daemonset puts on every node (dsx-ai-factory/topograph #432's "grant"
// figure). Static and instanced: per figure.desc the cluster keeps running
// the whole time the gates open and close in Grant.jsx, so nothing here
// animates; only the coral reach that arcs INTO this hall does, drawn by the
// caller from REACH below.

import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, Object3D } from "three";
import { C, mat } from "../../palette";

const dummy = new Object3D();

const COLS = [-0.75, 0, 0.75];
const ROWS = [-0.35, -0.95, -1.55];
const BLADE = [0.58, 0.5, 0.46]; // x length, y height, z depth
const SINK = 0.08; // how far each block is set into the snow
const POD = 0.16;
const AGENT = [0.16, 0.26, 0.16];

const POD_AT = [[0, -0.09], [0.17, 0.09], [0, 0.09]]; // on a node's top, right of its agent
const TOP = BLADE[1] - SINK;

const LAYOUT = (() => {
  const blades = [];
  const pods = [];
  const agents = [];
  ROWS.forEach((z, j) => {
    COLS.forEach((x, i) => {
      blades.push({ x, y: BLADE[1] / 2 - SINK, z });
      POD_AT.slice(0, 2 + ((i + j) % 2)).forEach(([dx, dz]) => pods.push({ x: x + dx, y: TOP + POD / 2, z: z + dz }));
      agents.push({ x: x - BLADE[0] / 2 + AGENT[0] / 2 + 0.03, y: TOP + AGENT[1] / 2, z });
    });
  });
  return { blades, pods, agents };
})();

// Where each rule reaches, in this local space: pods list (the first pod on
// every node), nodes get/list (every node's top), daemonsets get (every
// node's agent).
export const REACH = [
  LAYOUT.blades.map((b) => [b.x + POD_AT[0][0], TOP + POD, b.z + POD_AT[0][1]]),
  LAYOUT.blades.map((b) => [b.x + 0.12, TOP, b.z + 0.14]),
  LAYOUT.agents.map((a) => [a.x, TOP + AGENT[1], a.z]),
];

const bladeGeo = new BoxGeometry(...BLADE);
const podGeo = new BoxGeometry(POD, POD, POD);
const agentGeo = new BoxGeometry(...AGENT);

const bladeMat = mat(C.ice, { roughness: 0.2, metalness: 0.05, opacity: 0.8 });

function place(mesh, items) {
  if (!mesh) return;
  items.forEach((it, idx) => {
    dummy.position.set(it.x, it.y, it.z);
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

  // The one accent this place owns (its org colour), on the pods it runs.
  // The daemonset agent on each node is the same family, darker, so it
  // still reads as its own thing next to the brighter pods.
  const podMat = useMemo(() => mat(accent, { roughness: 0.4, emissive: accent, emissiveIntensity: 0.9 }), [accent]);
  const agentColor = useMemo(() => `#${new Color(accent).multiplyScalar(0.45).getHexString()}`, [accent]);
  const agentMat = useMemo(() => mat(agentColor, { roughness: 0.4, emissive: agentColor, emissiveIntensity: 0.5 }), [agentColor]);

  useLayoutEffect(() => {
    place(bladeRef.current, LAYOUT.blades);
    place(podRef.current, LAYOUT.pods);
    place(agentRef.current, LAYOUT.agents);
  }, []);

  return (
    <group>
      <instancedMesh ref={bladeRef} args={[bladeGeo, bladeMat, LAYOUT.blades.length]} castShadow receiveShadow />
      <instancedMesh ref={podRef} args={[podGeo, podMat, LAYOUT.pods.length]} />
      <instancedMesh ref={agentRef} args={[agentGeo, agentMat, LAYOUT.agents.length]} />
    </group>
  );
}
