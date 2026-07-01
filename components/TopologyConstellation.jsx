"use client";

import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function makeManifoldCurve(start, end, index) {
  const startPoint = new THREE.Vector3(start[0], start[1] + 0.18, start[2] * 0.34);
  const endPoint = new THREE.Vector3(end[0], end[1] + 0.18, end[2] * 0.34);
  const midpoint = startPoint.clone().lerp(endPoint, 0.5);
  midpoint.y += 0.56 + (index % 3) * 0.16;
  midpoint.z += Math.sin(index * 1.7) * 0.28;

  return new THREE.CatmullRomCurve3([startPoint, midpoint, endPoint]).getPoints(42);
}

function bettiWeight(artifact) {
  const digits = artifact.betti.match(/\d+/g)?.map(Number) || [1, 0, 0];
  return Math.max(1, digits.reduce((sum, value) => sum + value, 0));
}

export default function TopologyConstellation({
  activeArtifact,
  artifacts,
  axisX,
  quality = "high",
  showLabels = false,
}) {
  const root = useRef(null);
  const activeId = activeArtifact?.id || artifacts[0]?.id;
  const links = useMemo(
    () =>
      artifacts.slice(1).map((artifact, index) => ({
        id: `${artifacts[index].id}-${artifact.id}`,
        accent: artifact.accent,
        points: makeManifoldCurve(artifacts[index].position, artifact.position, index),
      })),
    [artifacts],
  );

  useFrame(({ clock }) => {
    if (!root.current) return;
    const t = clock.elapsedTime;
    root.current.rotation.y = Math.sin(t * 0.1) * 0.012;
    root.current.position.z = Math.cos(t * 0.16) * 0.035;
  });

  return (
    <group
      ref={root}
      name="TopologyConstellation manifold-profile-field persistent homology Betti"
      userData={{ className: "manifold-profile-field" }}
    >
      {links.map((link) => (
        <Line
          color={link.accent}
          key={link.id}
          lineWidth={quality === "high" ? 1.25 : 0.75}
          opacity={quality === "low" ? 0.1 : 0.18}
          points={link.points}
          transparent
        />
      ))}

      {artifacts.map((artifact, index) => {
        const active = artifact.id === activeId;
        const distance = Math.abs(axisX - artifact.position[0]);
        const opacity = active ? 0.68 : Math.max(0.08, 0.28 - distance * 0.026);
        const weight = bettiWeight(artifact);

        return (
          <group
            key={artifact.id}
            name={`topology-profile-node ${artifact.id}`}
            position={[artifact.position[0], artifact.position[1] + 0.18, artifact.position[2] * 0.34]}
            userData={{ className: "topology-profile-node", topology: artifact.topology }}
          >
            <mesh>
              <icosahedronGeometry args={[active ? 0.08 : 0.052, 1]} />
              <meshBasicMaterial color={artifact.accent} transparent opacity={active ? 0.92 : 0.46} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.22 + weight * 0.018, 0.004, 6, 72]} />
              <meshBasicMaterial color={artifact.accent} transparent opacity={opacity} />
            </mesh>
            <mesh rotation={[Math.PI / 2.45, 0, index * 0.42]}>
              <torusGeometry args={[0.34 + (index % 3) * 0.035, 0.003, 6, 72]} />
              <meshBasicMaterial color="#dffdf7" transparent opacity={active ? 0.22 : 0.08} />
            </mesh>
            {showLabels && active && quality !== "low" && (
              <Html
                center
                className="manifold-profile-field topology-profile-node"
                distanceFactor={2}
                position={[0, 0.34, 0]}
                transform
              >
                <span>persistent homology</span>
                <strong>{artifact.handle}</strong>
                <small>
                  {artifact.betti} / {artifact.topology}
                </small>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
