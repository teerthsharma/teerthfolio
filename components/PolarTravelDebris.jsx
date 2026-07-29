"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { POLAR_PALETTE, STATION_SHADER_PROFILES } from "../lib/polar-art-direction";
import {
  POLAR_TRAVEL_DEBRIS_CONTRACT,
  TRAVEL_DEBRIS_BUDGET,
  buildTravelDebrisSeeds,
  createWindCutFlakeGeometry,
  sampleWeightedDebrisArc,
} from "../lib/polar-travel-debris";

export const POLAR_TRAVEL_DEBRIS_PROFILE =
  "bright pooled frost wake / one instanced draw / deterministic mass-weighted arcs / zero reduced-motion shards";

/**
 * B. TRAVEL WARP — the frost wake's shader-level upgrade. Above uTravelSpeed
 * 0.25 each flake elongates along the travel heading and its surface carries
 * an anisotropic stretched-noise streak field with gaussian radial banding
 * (accretion-streak style), tinted by the shared aurora anchors. On dock
 * approach the wake converges station-ward and takes the station accent as a
 * brief arrival pulse; the warp layer yields to the assembly veil's sweep
 * window (uDockProgress 0.05..0.6) and is absent entirely at idle and under
 * reduced motion.
 */
const TRAVEL_WARP_SPEED_THRESHOLD = 0.25;
const MANUAL_SPEED_REFERENCE = 4;
// ponytail: mirrors lib/polar-travel-debris.js SPEED_REFERENCE + cycle law so
// the spawn/despawn fade envelope stays phase-locked with the arc sampler;
// fold into the lib if the cycle law ever changes.
const ARC_SPEED_REFERENCE = 5.8;

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
  uniform float uWorldTime;
  uniform float uTravelSpeed;
  uniform vec2 uTravelVelocity;
  uniform float uDockProgress;
  uniform vec3 uStationAccent;
  uniform float uQualityTier;
  uniform float uReducedMotion;
  varying vec3 vTint;
  varying float vMass;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocalPosition;
  #include <fog_pars_fragment>

  float pn_hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float pn_noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(pn_hash(i), pn_hash(i + vec2(1.0, 0.0)), f.x),
               mix(pn_hash(i + vec2(0.0, 1.0)), pn_hash(i + vec2(1.0, 1.0)), f.x), f.y); }
  float pn_fbm(vec2 p){
    float octaves = uQualityTier < 0.5 ? 2.0 : 4.0;
    float a = 0.5; float v = 0.0;
    for (int i = 0; i < 4; i++){
      if (float(i) >= octaves) break;
      v += a * pn_noise(p); p *= 2.03; a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 normal = normalize(vViewNormal);
    vec3 viewDirection = normalize(vViewPosition);
    vec3 lightDirection = normalize(vec3(0.34, 0.88, 0.31));
    float wrapped = clamp((dot(normal, lightDirection) + 0.72) / 1.72, 0.0, 1.0);
    float toon = floor(wrapped * 3.0 + 0.5) / 3.0;
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.2);
    float windGlint = 0.5 + 0.5 * sin(
      uWorldTime * 1.2 + vLocalPosition.z * 5.6 + vLocalPosition.x * 8.0 + vMass * 3.1
    );
    vec3 frostWhite = vec3(0.70, 0.79, 0.92);
    vec3 color = vTint * (0.82 + toon * 0.18);
    color = mix(color, frostWhite, fresnel * 0.34 + windGlint * uTravelSpeed * 0.055);
    color += vec3(0.10, 0.16, 0.28) * fresnel * 0.08;

    // --- travel warp layer: only alive above the speed threshold ---
    float warp = smoothstep(0.25, 0.85, uTravelSpeed);
    // yield to the assembly veil's sweep window during dock transitions
    float veilWindow = smoothstep(0.05, 0.22, uDockProgress)
      * (1.0 - smoothstep(0.55, 0.72, uDockProgress));
    warp *= 1.0 - veilWindow;
    warp *= 1.0 - uReducedMotion;

    // anisotropic stretched noise: fine grain across the flake, long filaments
    // flowing along the travel axis (local z is aligned to velocity heading)
    vec2 headingPhase = uTravelVelocity * 0.03;
    vec2 streakUv = vec2(
      vLocalPosition.x * 13.0 + vMass * 7.0 + headingPhase.x,
      vLocalPosition.z * 1.35 - uWorldTime * (1.6 + uTravelSpeed * 3.6) + headingPhase.y
    );
    float filaments = smoothstep(0.28, 0.86, pn_fbm(streakUv));

    // gaussian radial banding across the streak cross-section (accretion style)
    float radial = length(vLocalPosition.xy * vec2(3.6, 9.0));
    float band = exp(-pow(radial * 3.1, 2.0))
      + exp(-pow((radial - 0.52) * 4.2, 2.0)) * 0.55;

    // energy gathers toward the leading tip of the streak
    float head = smoothstep(-0.9, 0.4, vLocalPosition.z);

    vec3 auroraMint = vec3(0.4353, 0.9059, 0.7843);
    vec3 auroraViolet = vec3(0.5529, 0.4118, 0.8392);
    vec3 warpTint = mix(auroraViolet, auroraMint, clamp(filaments * 0.72 + head * 0.4, 0.0, 1.0));
    // Wind-torn snow, not sci-fi plasma: the streak stays dominantly frost
    // white with only a whisper of aurora in its filaments.
    warpTint = mix(warpTint, frostWhite, 0.62);

    float dockPulse = smoothstep(0.62, 0.97, uDockProgress);
    warpTint = mix(warpTint, uStationAccent, dockPulse * 0.5);

    float warpEnergy = band * (0.35 + filaments * 0.65) * head * warp;
    color = mix(color, warpTint, clamp(warpEnergy * 0.72, 0.0, 0.7));
    color += warpTint * warpEnergy * (0.24 + dockPulse * 0.14);

    // Taper: the streak dissolves toward its tail while warping, and the
    // filament field erodes the body so long streaks break into torn wisps.
    float taper = mix(1.0, clamp(smoothstep(-0.86, 0.5, vLocalPosition.z) + 0.16, 0.0, 1.0), warp);
    taper *= mix(1.0, 0.55 + 0.45 * filaments, warp * 0.85);

    gl_FragColor = vec4(color, taper);
    #include <fog_fragment>
  }
`;

function qualityTierValue(quality) {
  if (quality === "high") return 2;
  if (quality === "low") return 0;
  return 1;
}

function PolarTravelDebrisPool({ quality, reducedMotion, traversalPoseRef }) {
  const mesh = useRef(null);
  const gl = useThree((state) => state.gl);
  const seeds = useMemo(() => buildTravelDebrisSeeds(quality), [quality]);
  const budget = TRAVEL_DEBRIS_BUDGET[quality] || TRAVEL_DEBRIS_BUDGET.medium;
  const transform = useMemo(() => new THREE.Object3D(), []);
  const arcScratch = useRef({});
  const accentStationRef = useRef(null);
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
        depthWrite: false,
        fog: true,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uDockProgress: { value: 0 },
            uQualityTier: { value: 1 },
            uReducedMotion: { value: 0 },
            uStationAccent: { value: new THREE.Color(POLAR_PALETTE.skyMint) },
            uTravelSpeed: { value: 0 },
            uTravelVelocity: { value: new THREE.Vector2(0, 0) },
            uWorldTime: { value: 0 },
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
    const originX = pose.x || 0;
    const originZ = pose.z || 0;
    const speed = Math.hypot(pose.vx || 0, pose.vz || 0);
    const travelSpeed = THREE.MathUtils.clamp(speed / MANUAL_SPEED_REFERENCE, 0, 1);
    const dockProgress = THREE.MathUtils.clamp(pose.stationProximity || 0, 0, 1);
    const warp = THREE.MathUtils.smoothstep(travelSpeed, TRAVEL_WARP_SPEED_THRESHOLD, 0.85);
    const converge = THREE.MathUtils.smoothstep(dockProgress, 0.7, 1);
    const uniforms = material.uniforms;
    uniforms.uWorldTime.value = clock.elapsedTime;
    uniforms.uTravelSpeed.value = travelSpeed;
    uniforms.uTravelVelocity.value.set(pose.vx || 0, pose.vz || 0);
    uniforms.uDockProgress.value = dockProgress;
    uniforms.uQualityTier.value = qualityTierValue(quality);
    uniforms.uReducedMotion.value = reducedMotion ? 1 : 0;
    const accentId = pose.dockedId || pose.proximityStationId || null;
    if (accentId !== accentStationRef.current) {
      accentStationRef.current = accentId;
      uniforms.uStationAccent.value.set(
        STATION_SHADER_PROFILES[accentId]?.accent || POLAR_PALETTE.skyMint,
      );
    }

    // streak anisotropy: elongate along the velocity heading as speed rises
    // (a touch of stretch already below the warp threshold, full streaks
    // above it), thin the cross-section; dock convergence pulls the wake
    // station-ward
    const stretch = 1 + (travelSpeed * 0.7 + warp * 4.9) * (1 - converge * 0.7);
    const thin = 1 / (1 + warp * 0.9);
    const pull = 1 - converge * 0.55;
    const heading = Math.atan2(pose.vx || 0, pose.vz || 0);
    const align = warp * 0.85;
    const arcMotion = THREE.MathUtils.clamp(speed / ARC_SPEED_REFERENCE, 0, 1);

    for (let index = 0; index < budget.instances; index += 1) {
      const sample = sampleWeightedDebrisArc(
        seeds[index],
        pose,
        clock.elapsedTime,
        arcScratch.current,
      );
      // Fade each flake in as it spawns at the wake head and out before its
      // cycle wraps, so respawns never pop into view mid-air.
      const cycleRate = 0.34 + arcMotion * 0.3 + (1 - seeds[index].mass) * 0.06;
      const cycle = (clock.elapsedTime * cycleRate + seeds[index].phase) % 1;
      const envelope =
        THREE.MathUtils.smoothstep(cycle, 0, 0.14) *
        (1 - THREE.MathUtils.smoothstep(cycle, 0.8, 1));
      // Lighter flakes tear into longer streaks than dense shards.
      const instanceStretch = 1 + (stretch - 1) * (0.8 + (1 - seeds[index].mass) * 0.8);
      transform.position.set(
        originX + (sample.x - originX) * pull,
        sample.y + warp * (0.16 + seeds[index].height * 0.5),
        originZ + (sample.z - originZ) * pull,
      );
      // collapse tumbling toward the exact travel heading while warping so the
      // field reads as one coherent set of parallel speed streaks
      const yawResidual = Math.atan2(
        Math.sin(sample.rotationY - heading),
        Math.cos(sample.rotationY - heading),
      );
      const pitchWrapped = Math.atan2(Math.sin(sample.rotationX), Math.cos(sample.rotationX));
      const rollWrapped = Math.atan2(Math.sin(sample.rotationZ), Math.cos(sample.rotationZ));
      const tumble = (1 - align) * (1 - align);
      transform.rotation.set(
        pitchWrapped * tumble,
        heading + yawResidual * (1 - align),
        rollWrapped * tumble,
      );
      transform.scale.set(
        sample.scale * (0.82 + seeds[index].mass * 0.28) * thin * envelope,
        sample.scale * (0.72 + (1 - seeds[index].mass) * 0.22) * thin * envelope,
        sample.scale * instanceStretch * envelope,
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
  return (
    <PolarTravelDebrisPool
      quality={quality}
      reducedMotion={reducedMotion}
      traversalPoseRef={traversalPoseRef}
    />
  );
}
