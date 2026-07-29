import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const PROBE_CLASS = "igloo-axis-probe";
const EPSILON = 0.012;
const WORLD_PILOT_SCALE = new THREE.Vector3(0.46, 0.46, 0.46);
const DOME_CLEARANCE_RANGE = 2.4;
const SEAL_BASE_OFFSET_X = 0.42;
const SEAL_DOME_OFFSET_X = 1.74;
const SEAL_DOME_OFFSET_Z = 1.05;
const WHITE_QUILTED_DIAMOND_PBR = {
  map: "/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_albedo.png",
  aoMap: "/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_ao.png",
  displacementMap: "/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_height.png",
  metalnessMap: "/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_metallic.png",
  normalMap: "/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_normal-ogl.png",
  roughnessMap: "/assets/pbr/seal/white-quilted-diamond-bl/white-quilted-diamond_roughness.png",
};

const SDF_COLLISION_PROBES = [
  { id: "epsilon", label: "EPS", position: [1.32, -0.04, 0.24], scale: [0.16, 0.16, 0.16], sample: { x: 1.02, y: -0.05, z: 0.16 } },
  { id: "field", label: "FLD", position: [0.48, -0.32, -0.56], scale: [0.18, 0.12, 0.24], sample: { x: 0.38, y: -0.31, z: -0.45 } },
  { id: "qpu", label: "QPU", position: [-0.92, -0.2, 0.52], scale: [0.14, 0.18, 0.18], sample: { x: -0.78, y: -0.22, z: 0.41 } },
  { id: "archive", label: "ARC", position: [-1.3, 0.12, -0.16], scale: [0.2, 0.14, 0.14], sample: { x: -1.08, y: 0.08, z: -0.13 } },
];

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uAccent;
  uniform float uTime;
  uniform float uVelocity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPosition;

  void main() {
    float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vViewDir)));
    float edge = smoothstep(0.34, 0.74, rim);
    float field = sin((vWorldPosition.x * 5.0) + (vWorldPosition.y * 7.0) + uTime * 0.8) * 0.5 + 0.5;
    vec3 whiteBody = mix(vec3(0.55, 0.65, 0.78), vec3(0.90, 0.88, 0.80), 0.82 + field * 0.08);
    vec3 cyanWake = uAccent * (0.12 + abs(uVelocity) * 0.2);
    vec3 edgeInk = vec3(0.005, 0.008, 0.01);
    vec3 color = mix(whiteBody + cyanWake, edgeInk, edge);
    gl_FragColor = vec4(color, 0.95);
  }
`;

function length3(p) {
  return Math.hypot(p.x, p.y, p.z);
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function rotateZ(p, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}

function sdfSphere(p, radius) {
  return length3(p) - radius;
}

function sdfEllipsoid(p, radius) {
  const k0 = length3({ x: p.x / radius.x, y: p.y / radius.y, z: p.z / radius.z });
  const k1 = length3({
    x: p.x / (radius.x * radius.x),
    y: p.y / (radius.y * radius.y),
    z: p.z / (radius.z * radius.z),
  });
  return (k0 * (k0 - 1)) / Math.max(k1, 0.0001);
}

function smin(a, b, k) {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return a * h + b * (1 - h) - k * h * (1 - h);
}

function sdfSeal(point) {
  const body = sdfEllipsoid(point, { x: 1.18, y: 0.36, z: 0.48 });
  const head = sdfSphere(sub(point, { x: 0.92, y: 0.1, z: 0.03 }), 0.38);
  const tail = sdfEllipsoid(rotateZ(sub(point, { x: -1.1, y: 0, z: 0 }), -0.14), { x: 0.32, y: 0.12, z: 0.28 });
  const leftFlipper = sdfEllipsoid(rotateZ(sub(point, { x: -0.06, y: -0.26, z: 0.42 }), -0.38), {
    x: 0.48,
    y: 0.06,
    z: 0.18,
  });
  const rightFlipper = sdfEllipsoid(rotateZ(sub(point, { x: 0.05, y: -0.25, z: -0.42 }), -0.3), {
    x: 0.44,
    y: 0.06,
    z: 0.16,
  });
  const core = smin(body, head, 0.22);
  const withTail = smin(core, tail, 0.16);
  return smin(withTail, Math.min(leftFlipper, rightFlipper), 0.15);
}

function sealGradient(point) {
  const dx =
    sdfSeal({ x: point.x + EPSILON, y: point.y, z: point.z }) -
    sdfSeal({ x: point.x - EPSILON, y: point.y, z: point.z });
  const dy =
    sdfSeal({ x: point.x, y: point.y + EPSILON, z: point.z }) -
    sdfSeal({ x: point.x, y: point.y - EPSILON, z: point.z });
  const dz =
    sdfSeal({ x: point.x, y: point.y, z: point.z + EPSILON }) -
    sdfSeal({ x: point.x, y: point.y, z: point.z - EPSILON });
  const length = Math.hypot(dx, dy, dz) || 1;
  return { x: dx / length, y: dy / length, z: dz / length };
}

function rigidBodyBridge() {
  return SDF_COLLISION_PROBES.map((probe) => {
    const distance = sdfSeal(probe.sample);
    return {
      ...probe,
      active: distance < 0.08,
      distance,
      normal: sealGradient(probe.sample),
    };
  });
}

function sealSpawnOffset(axisX, homeX) {
  const nearDome = Math.max(0, 1 - Math.abs(axisX - homeX) / DOME_CLEARANCE_RANGE);
  return {
    x: THREE.MathUtils.lerp(SEAL_BASE_OFFSET_X, SEAL_DOME_OFFSET_X, nearDome),
    z: SEAL_DOME_OFFSET_Z * nearDome,
  };
}

function SealShaderMaterial({ accent, materialRef, velocity }) {
  const uniforms = useMemo(
    () => ({
      uAccent: { value: new THREE.Color(accent) },
      uTime: { value: 0 },
      uVelocity: { value: velocity },
    }),
    [accent, velocity],
  );

  useEffect(() => {
    uniforms.uAccent.value.set(accent);
  }, [accent, uniforms]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uVelocity.value = velocity;
  });

  return (
    <shaderMaterial
      ref={materialRef}
      depthWrite={false}
      depthTest={false}
      fragmentShader={fragmentShader}
      transparent
      uniforms={uniforms}
      vertexShader={vertexShader}
    />
  );
}

function SealQuiltedMaterial({ accent, opacity = 0.96 }) {
  const maps = useTexture(WHITE_QUILTED_DIAMOND_PBR);
  const normalScale = useMemo(() => new THREE.Vector2(0.075, 0.11), []);

  useEffect(() => {
    for (const map of Object.values(maps)) {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(2.8, 1.6);
      map.anisotropy = 8;
      map.needsUpdate = true;
    }
    maps.map.colorSpace = THREE.SRGBColorSpace;
  }, [maps]);

  return (
    <meshPhysicalMaterial
      aoMap={maps.aoMap}
      clearcoat={0.96}
      clearcoatRoughness={0.18}
      color="#DCE9F4"
      displacementMap={maps.displacementMap}
      displacementScale={0.006}
      emissive={accent}
      emissiveIntensity={0.14}
      map={maps.map}
      metalness={0.02}
      metalnessMap={maps.metalnessMap}
      normalMap={maps.normalMap}
      normalScale={normalScale}
      opacity={opacity}
      reflectivity={0.78}
      roughness={0.34}
      roughnessMap={maps.roughnessMap}
      transparent
    />
  );
}

function CollisionCrate({ accent, probe }) {
  const color = probe.active ? accent : "#A8F0E8";
  const normalTarget = [
    probe.position[0] + probe.normal.x * 0.34,
    probe.position[1] + probe.normal.y * 0.34,
    probe.position[2] + probe.normal.z * 0.34,
  ];
  const midpoint = [
    (probe.position[0] + normalTarget[0]) * 0.5,
    (probe.position[1] + normalTarget[1]) * 0.5,
    (probe.position[2] + normalTarget[2]) * 0.5,
  ];

  return (
    <group name={`SDF collision probe ${probe.id}`}>
      <mesh position={probe.position} scale={probe.scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={accent}
          emissiveIntensity={probe.active ? 0.5 : 0.12}
          metalness={0.08}
          opacity={probe.active ? 0.82 : 0.36}
          roughness={0.42}
          transparent
        />
      </mesh>
      <mesh position={midpoint} rotation={[Math.PI / 2, 0, Math.atan2(probe.normal.y, probe.normal.x)]}>
        <cylinderGeometry args={[0.01, 0.01, 0.34, 6]} />
        <meshBasicMaterial color={color} transparent opacity={probe.active ? 0.72 : 0.26} />
      </mesh>
      <Html position={[probe.position[0], probe.position[1] + 0.22, probe.position[2]]} transform distanceFactor={8}>
        <span className="sdf-probe-label">{probe.label}</span>
      </Html>
    </group>
  );
}

function CompositeSdfSeal({ accent, axisVelocity }) {
  const materialRef = useRef(null);

  return (
    <group name="CompositeSdfSeal" renderOrder={8}>
      {/* F(p) is the composite seal field: body/head/flippers combined with polynomial smin. */}
      <mesh scale={[1.18, 0.36, 0.48]} rotation={[0.02, 0, -0.03]}>
        <sphereGeometry args={[1, 64, 32]} />
        <SealQuiltedMaterial accent={accent} />
      </mesh>
      <mesh position={[0.88, 0.1, 0.03]} scale={[0.38, 0.34, 0.36]}>
        <sphereGeometry args={[1, 48, 24]} />
        <SealQuiltedMaterial accent={accent} />
      </mesh>
      <mesh position={[-1.07, 0.01, 0]} rotation={[0, 0, Math.PI / 2.12]} scale={[0.3, 0.13, 0.28]}>
        <coneGeometry args={[1, 1, 5]} />
        <SealQuiltedMaterial accent={accent} opacity={0.9} />
      </mesh>
      <mesh position={[-0.1, -0.28, 0.43]} rotation={[0.18, -0.2, -0.38]} scale={[0.48, 0.055, 0.18]}>
        <sphereGeometry args={[1, 24, 12]} />
        <SealQuiltedMaterial accent={accent} opacity={0.92} />
      </mesh>
      <mesh position={[0.03, -0.27, -0.42]} rotation={[-0.12, 0.24, -0.3]} scale={[0.44, 0.055, 0.16]}>
        <sphereGeometry args={[1, 24, 12]} />
        <SealQuiltedMaterial accent={accent} opacity={0.92} />
      </mesh>
      <mesh scale={[1.22, 0.38, 0.5]} rotation={[0.02, 0, -0.03]}>
        <sphereGeometry args={[1, 64, 16]} />
        <meshBasicMaterial color="#010304" opacity={0.28} side={THREE.BackSide} transparent />
      </mesh>
      <mesh position={[0.88, 0.1, 0.03]} scale={[0.4, 0.36, 0.38]}>
        <sphereGeometry args={[1, 32, 12]} />
        <meshBasicMaterial color="#010304" opacity={0.24} side={THREE.BackSide} transparent />
      </mesh>
      <mesh position={[1.13, 0.18, 0.2]} scale={[0.038, 0.038, 0.02]}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshBasicMaterial color="#010304" />
      </mesh>
      <mesh position={[1.12, 0.17, 0.04]} scale={[0.03, 0.03, 0.016]}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshBasicMaterial color="#010304" />
      </mesh>
      <mesh position={[1.16, 0.06, 0.12]} rotation={[0, Math.PI / 2, 0]} scale={[0.012, 0.012, 0.12]}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshBasicMaterial color="#010304" />
      </mesh>
      <mesh position={[-0.06, -0.03, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.12, 0.46, 1]}>
        <torusGeometry args={[0.72, 0.005, 8, 120]} />
        <SealShaderMaterial accent={accent} materialRef={materialRef} velocity={axisVelocity} />
      </mesh>
    </group>
  );
}

export default function SdfSealMascot({
  accent = "#6FE7C8",
  activeArtifact,
  axisVelocity = 0,
  axisX = 0,
  depthVelocity = 0,
  depthZ = 0,
  homeX = 0,
  moving = false,
}) {
  const root = useRef(null);
  const field = useRef(null);
  const bridge = useMemo(() => rigidBodyBridge(), []);
  const showDiagnostics = false;
  const target = useMemo(() => new THREE.Vector3(), []);
  const initialPositionRef = useRef(null);

  if (!initialPositionRef.current) {
    const offset = sealSpawnOffset(axisX, homeX);
    initialPositionRef.current = [axisX + offset.x, 0.98, depthZ + offset.z];
  }

  useFrame(({ clock }) => {
    if (!root.current) return;
    const t = clock.elapsedTime;
    const domeDistance = Math.abs(axisX - homeX);
    const movementStrength = Math.min(1, Math.hypot(axisVelocity, depthVelocity));
    const impact = Math.max(0, 1 - domeDistance / 0.78) * Math.min(1, movementStrength * 1.4);
    const direction = axisVelocity === 0 ? 1 : Math.sign(axisVelocity);
    const offset = sealSpawnOffset(axisX, homeX);
    target.set(
      axisX + offset.x - impact * direction * 0.34,
      0.98 + Math.sin(t * 1.8) * 0.06 + impact * 0.28,
      depthZ + offset.z + Math.sin(t * 0.7) * 0.12 + depthVelocity * 0.28 - impact * 0.24,
    );
    root.current.position.lerp(target, moving ? 0.22 : 0.12);
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, -0.06 + impact * 0.18, 0.1);
    const heading = movementStrength > 0.05 ? Math.atan2(depthVelocity, axisVelocity || 0.001) : Math.PI * 0.5;
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, heading + Math.PI * 0.5, 0.12);
    root.current.rotation.z = THREE.MathUtils.lerp(
      root.current.rotation.z,
      -0.12 + Math.sin(t * 1.4) * 0.035 - axisVelocity * 0.16 + depthVelocity * 0.08,
      0.12,
    );
    root.current.scale.lerp(WORLD_PILOT_SCALE.clone().multiplyScalar(1 + impact * 0.16), 0.1);
    if (field.current) {
      field.current.rotation.y = t * 0.18 + axisVelocity * 0.24;
      field.current.rotation.z = Math.sin(t * 0.21) * 0.08 + impact * 0.28;
    }
  });

  return (
    <group ref={root} name="SdfSealMascot" position={initialPositionRef.current} renderOrder={8} userData={{ className: PROBE_CLASS }}>
      <group scale={1.0}>
        <CompositeSdfSeal accent={accent} axisVelocity={axisVelocity} />
      </group>

      <group ref={field} name="SDF topology field" position={[-0.05, -0.03, 0]}>
        {[0.86, 1.14, 1.42, 1.72].map((radius, index) => (
          <mesh key={radius} rotation={[Math.PI / 2, 0, index * 0.42]} scale={[1.3 + index * 0.08, 0.74, 1]}>
            <torusGeometry args={[radius, 0.006, 8, 96]} />
            <meshBasicMaterial color={index % 2 === 0 ? accent : "#A8F0E8"} transparent opacity={0.16 - index * 0.02} />
          </mesh>
        ))}
      </group>

      {showDiagnostics && bridge.map((probe) => (
        <CollisionCrate accent={accent} key={probe.id} probe={probe} />
      ))}

      {showDiagnostics && (
        <Html position={[-1.44, 0.86, 0.1]} transform distanceFactor={2.8}>
          <div className="sdf-seal-proof">
            <span>CompositeSdfSeal</span>
            <strong>F(p) &lt;= 0</strong>
            <p>ellipsoid body + sphere head + flipper fields / polynomial smin / normal-based edge</p>
          </div>
        </Html>
      )}

      {showDiagnostics && (
        <Html position={[0.66, -0.5, 0.34]} transform distanceFactor={2.8}>
          <div className="sdf-collision-bridge">
            <span>rigidBodyBridge</span>
            <strong>{activeArtifact?.shortLabel || "axis"} docked</strong>
            <p>crate vertices sample the seal field; gradient normals define repulsion.</p>
          </div>
        </Html>
      )}

      <pointLight color={accent} intensity={moving ? 2.8 : 1.7} distance={5.4} />
    </group>
  );
}
