"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  POLAR_TRAVEL_DEBRIS_CONTRACT,
  TRAVEL_DEBRIS_BUDGET,
  buildTravelDebrisSeeds,
  createWindCutFlakeGeometry,
  sampleWeightedDebrisArc,
} from "../lib/polar-travel-debris";

export const POLAR_TRAVEL_DEBRIS_PROFILE =
  "bright pooled frost wake / one instanced draw / deterministic mass-weighted arcs / zero reduced-motion shards";

const VERTEX_SHADER = `
  attribute vec3 instanceTint;
  attribute float instanceMass;
  varying vec3 vTint;
  varying float vMass;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocalPosition;
  #include <fog_pars_vertex>

  void main() {
    vec4 transformed = vec4(position, 1.0);
    vec3 transformedNormal = normal;
    #ifdef USE_INSTANCING
      transformed = instanceMatrix * transformed;
      transformedNormal = mat3(instanceMatrix) * transformedNormal;
    #endif
    vec4 mvPosition = modelViewMatrix * transformed;
    vTint = instanceTint;
    vMass = instanceMass;
    vViewNormal = normalize(normalMatrix * transformedNormal);
    vViewPosition = -mvPosition.xyz;
    vLocalPosition = position;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT_SHADER = `
  uniform float uMotion;
  uniform float uTime;
  varying vec3 vTint;
  varying float vMass;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocalPosition;
  #include <fog_pars_fragment>

  void main() {
    vec3 normal = normalize(vViewNormal);
    vec3 viewDirection = normalize(vViewPosition);
    vec3 lightDirection = normalize(vec3(0.34, 0.88, 0.31));
    float wrapped = clamp((dot(normal, lightDirection) + 0.72) / 1.72, 0.0, 1.0);
    float toon = floor(wrapped * 3.0 + 0.5) / 3.0;
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.2);
    float windGlint = 0.5 + 0.5 * sin(
      uTime * 1.2 + vLocalPosition.z * 5.6 + vLocalPosition.x * 8.0 + vMass * 3.1
    );
    vec3 frostWhite = vec3(0.975, 1.0, 0.985);
    vec3 color = vTint * (0.82 + toon * 0.18);
    color = mix(color, frostWhite, fresnel * 0.34 + windGlint * uMotion * 0.055);
    color += vec3(0.05, 0.12, 0.14) * fresnel * 0.08;
    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
  }
`;

function PolarTravelDebrisPool({ quality, traversalPoseRef }) {
  const mesh = useRef(null);
  const gl = useThree((state) => state.gl);
  const seeds = useMemo(() => buildTravelDebrisSeeds(quality), [quality]);
  const budget = TRAVEL_DEBRIS_BUDGET[quality] || TRAVEL_DEBRIS_BUDGET.medium;
  const transform = useMemo(() => new THREE.Object3D(), []);
  const arcScratch = useRef({});
  const geometry = useMemo(() => {
    const nextGeometry = createWindCutFlakeGeometry();
    const tints = new Float32Array(budget.instances * 3);
    const masses = new Float32Array(budget.instances);
    const color = new THREE.Color();
    for (let index = 0; index < budget.instances; index += 1) {
      const seed = seeds[index];
      color.set(POLAR_TRAVEL_DEBRIS_CONTRACT.palette[seed.paletteIndex]);
      color.toArray(tints, index * 3);
      masses[index] = seed.mass;
    }
    nextGeometry.setAttribute(
      "instanceTint",
      new THREE.InstancedBufferAttribute(tints, 3),
    );
    nextGeometry.setAttribute(
      "instanceMass",
      new THREE.InstancedBufferAttribute(masses, 1),
    );
    return nextGeometry;
  }, [budget.instances, seeds]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        fog: true,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uMotion: { value: 0 },
            uTime: { value: 0 },
          },
        ]),
        vertexShader: VERTEX_SHADER,
      }),
    [],
  );

  useLayoutEffect(() => {
    if (!mesh.current) return undefined;
    mesh.current.count = budget.instances;
    mesh.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return undefined;
  }, [budget.instances]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.dataset.travelDebrisDrawCalls = String(POLAR_TRAVEL_DEBRIS_CONTRACT.drawCalls);
    canvas.dataset.travelDebrisInstances = String(budget.instances);
    canvas.dataset.travelDebrisPrograms = String(POLAR_TRAVEL_DEBRIS_CONTRACT.programs);
    canvas.dataset.travelDebrisTextures = String(POLAR_TRAVEL_DEBRIS_CONTRACT.textures);
    canvas.dataset.travelDebrisProfile = POLAR_TRAVEL_DEBRIS_PROFILE;
    return () => {
      delete canvas.dataset.travelDebrisDrawCalls;
      delete canvas.dataset.travelDebrisInstances;
      delete canvas.dataset.travelDebrisPrograms;
      delete canvas.dataset.travelDebrisTextures;
      delete canvas.dataset.travelDebrisProfile;
    };
  }, [budget.instances, gl]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const pose = traversalPoseRef?.current || { vx: 0, vz: 0, x: 0, z: 0 };
    const speed = Math.hypot(pose.vx || 0, pose.vz || 0);
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uMotion.value = THREE.MathUtils.clamp(speed / 4, 0, 1);

    for (let index = 0; index < budget.instances; index += 1) {
      const sample = sampleWeightedDebrisArc(
        seeds[index],
        pose,
        clock.elapsedTime,
        arcScratch.current,
      );
      transform.position.set(sample.x, sample.y, sample.z);
      transform.rotation.set(sample.rotationX, sample.rotationY, sample.rotationZ);
      transform.scale.set(
        sample.scale * (0.82 + seeds[index].mass * 0.28),
        sample.scale * (0.72 + (1 - seeds[index].mass) * 0.22),
        sample.scale,
      );
      transform.updateMatrix();
      mesh.current.setMatrixAt(index, transform.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group
      name={POLAR_TRAVEL_DEBRIS_PROFILE}
      userData={{
        drawCalls: POLAR_TRAVEL_DEBRIS_CONTRACT.drawCalls,
        instances: budget.instances,
        programs: POLAR_TRAVEL_DEBRIS_CONTRACT.programs,
        qaContract: "polar-travel-debris-v1",
        textures: POLAR_TRAVEL_DEBRIS_CONTRACT.textures,
      }}
    >
      <instancedMesh
        args={[geometry, material, budget.instances]}
        castShadow={false}
        dispose={null}
        frustumCulled={false}
        name="pooled weighted frost-wake flakes"
        ref={mesh}
        receiveShadow={false}
      />
    </group>
  );
}

export default function PolarTravelDebris({
  quality = "medium",
  reducedMotion = false,
  traversalPoseRef,
}) {
  if (reducedMotion) return null;
  return <PolarTravelDebrisPool quality={quality} traversalPoseRef={traversalPoseRef} />;
}
