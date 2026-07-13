"use client";

import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world";

function makeManifoldCurve(start, end, index) {
  const startPoint = new THREE.Vector3(start.center.x, 0.3, start.center.z);
  const endPoint = new THREE.Vector3(end.center.x, 0.3, end.center.z);
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
  axisX = 0,
  depthZ = 0,
  quality = "high",
  reducedMotion = false,
  showLabels = false,
}) {
  const root = useRef(null);
  const activeId = activeArtifact?.id || artifacts[0]?.id;
  const artifactById = useMemo(
    () => new Map(artifacts.map((artifact) => [artifact.id, artifact])),
    [artifacts],
  );
  const links = useMemo(
    () =>
      STATION_WORLD_SCHEMA.edges.map((edge, index) => ({
        id: `${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        accent: artifactById.get(edge.to)?.accent || "#65C1BC",
        points: makeManifoldCurve(
          STATION_WORLD_SCHEMA.stations[edge.from],
          STATION_WORLD_SCHEMA.stations[edge.to],
          index,
        ),
      })),
    [artifactById],
  );
  const visibleArtifacts = useMemo(() => {
    const ranked = artifacts
      .map((artifact) => {
        const station = STATION_WORLD_SCHEMA.stations[artifact.id];
        return {
          artifact,
          distance: Math.hypot(axisX - station.center.x, depthZ - station.center.z),
        };
      })
      .sort((left, right) => left.distance - right.distance);
    const nearest = ranked[0];
    const active = ranked.find((entry) => entry.artifact.id === activeId);
    if (active && nearest && active.artifact.id !== nearest.artifact.id && active.distance <= 14) {
      return [nearest, active];
    }
    return ranked.slice(0, 2);
  }, [activeId, artifacts, axisX, depthZ]);
  const visibleIds = useMemo(
    () => new Set(visibleArtifacts.map(({ artifact }) => artifact.id)),
    [visibleArtifacts],
  );

  useFrame(({ clock }) => {
    if (!root.current) return;
    if (reducedMotion) {
      root.current.rotation.y = 0;
      root.current.position.z = 0;
      return;
    }
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
      {links.filter((link) => visibleIds.has(link.from) && visibleIds.has(link.to)).map((link) => (
        <Line
          color={link.accent}
          key={link.id}
          lineWidth={quality === "high" ? 1.25 : 0.75}
          opacity={quality === "low" ? 0.1 : 0.18}
          points={link.points}
          transparent
        />
      ))}

      {visibleArtifacts.map(({ artifact }, index) => {
        const active = artifact.id === activeId;
        const station = STATION_WORLD_SCHEMA.stations[artifact.id];
        const distance = Math.hypot(
          axisX - station.center.x,
          depthZ - station.center.z,
        );
        const opacity = active ? 0.68 : Math.max(0.08, 0.28 - distance * 0.026);
        const weight = bettiWeight(artifact);

        return (
          <group
            key={artifact.id}
            name={`topology-profile-node ${artifact.id}`}
            position={[station.center.x, artifact.position[1] + 0.18, station.center.z]}
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
