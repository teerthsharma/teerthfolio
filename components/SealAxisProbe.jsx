import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const PROBE_CLASS = "igloo-axis-probe";

export default function SealAxisProbe({
  accent = "#5ff8e7",
  axisVelocity = 0,
  axisX = 0,
  moving = false,
}) {
  const root = useRef(null);
  const glow = useMemo(() => new THREE.Color(accent), [accent]);
  const target = useMemo(() => new THREE.Vector3(axisX - 0.74, 0.18, 1.18), [axisX]);

  useFrame(({ clock }) => {
    if (!root.current) return;
    const t = clock.elapsedTime;
    target.set(axisX - 0.74, 0.18 + Math.sin(t * 2.2) * 0.018, 1.18);
    root.current.position.lerp(target, moving ? 0.22 : 0.12);
    root.current.rotation.z = THREE.MathUtils.lerp(root.current.rotation.z, -axisVelocity * 0.18, 0.12);
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, axisVelocity * 0.08, 0.08);
  });

  return (
    <group ref={root} name="SealAxisProbe" userData={{ className: PROBE_CLASS }}>
      <mesh scale={[0.72, 0.22, 0.28]} rotation={[0, 0, -0.04]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial
          color="#111c20"
          emissive={accent}
          emissiveIntensity={moving ? 0.24 : 0.12}
          metalness={0.18}
          roughness={0.42}
        />
      </mesh>
      <mesh position={[0.56, 0.06, 0]} scale={[0.25, 0.2, 0.22]}>
        <sphereGeometry args={[1, 24, 12]} />
        <meshStandardMaterial color="#17272c" emissive={accent} emissiveIntensity={0.18} metalness={0.14} roughness={0.38} />
      </mesh>
      <mesh position={[0.72, 0.08, 0.08]} scale={[0.025, 0.025, 0.025]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#dffdf7" />
      </mesh>
      <mesh position={[0.72, 0.08, -0.08]} scale={[0.025, 0.025, 0.025]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#dffdf7" />
      </mesh>
      <mesh position={[-0.08, -0.12, 0.25]} rotation={[0.2, 0.1, -0.34]} scale={[0.38, 0.04, 0.16]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#0d171a" emissive={accent} emissiveIntensity={moving ? 0.2 : 0.08} roughness={0.52} />
      </mesh>
      <mesh position={[-0.08, -0.12, -0.25]} rotation={[-0.2, -0.1, -0.34]} scale={[0.38, 0.04, 0.16]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#0d171a" emissive={accent} emissiveIntensity={moving ? 0.2 : 0.08} roughness={0.52} />
      </mesh>
      <mesh position={[-0.68, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.18, 0.08, 0.12]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial color="#0b1215" emissive={accent} emissiveIntensity={moving ? 0.18 : 0.06} roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.84, 0.86, 72]} />
        <meshBasicMaterial color={glow} transparent opacity={moving ? 0.42 : 0.22} />
      </mesh>
      <pointLight color={accent} intensity={moving ? 1.1 : 0.46} distance={2.4} />
    </group>
  );
}
