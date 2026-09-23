"use client";

// Stand-in used until a building has its own model: a block in the project's
// colour so the island is walkable end to end from day one.

export default function Placeholder({ place, height = 3 }) {
  const w = place.radius * 1.3;
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[w, height, w]} />
        <meshStandardMaterial color="#e9edf2" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, height + 0.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[w * 0.8, 1, 4]} />
        <meshStandardMaterial color={place.color} roughness={0.6} flatShading />
      </mesh>
    </group>
  );
}
