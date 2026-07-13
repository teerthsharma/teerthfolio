"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  POLAR_PARTICLE_FRAGMENT_SHADER,
  POLAR_PARTICLE_QUALITY,
  POLAR_PARTICLE_SOURCE_CREDIT,
  POLAR_PARTICLE_VERTEX_SHADER,
  createPolarSemanticParticleAttributes,
  polarParticleStationIndex,
} from "../lib/polar-semantic-particles";

function createParticleGeometry(quality) {
  const attributes = createPolarSemanticParticleAttributes(quality);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(attributes.count * 3), 3));
  geometry.setAttribute("aBehavior", new THREE.BufferAttribute(attributes.behaviors, 1));
  geometry.setAttribute("aBounds", new THREE.BufferAttribute(attributes.bounds, 3));
  geometry.setAttribute("aCenter", new THREE.BufferAttribute(attributes.centers, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(attributes.colors, 3));
  geometry.setAttribute("aLocal", new THREE.BufferAttribute(attributes.locals, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(attributes.seeds, 4));
  geometry.setAttribute("aStation", new THREE.BufferAttribute(attributes.stations, 1));
  geometry.setAttribute("aVelocity", new THREE.BufferAttribute(attributes.velocities, 3));
  geometry.computeBoundingSphere();
  if (geometry.boundingSphere) geometry.boundingSphere.radius += 4;
  geometry.userData = {
    count: attributes.count,
    quality: attributes.quality,
    sourceCredit: POLAR_PARTICLE_SOURCE_CREDIT,
  };
  return geometry;
}

function createParticleMaterial(quality) {
  const tier = POLAR_PARTICLE_QUALITY[quality];
  return new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    fragmentShader: POLAR_PARTICLE_FRAGMENT_SHADER,
    transparent: true,
    uniforms: {
      uActiveStation: { value: 0 },
      uImpulseAge: { value: 8 },
      uMotion: { value: 1 },
      uMorphPhase: { value: 0 },
      uPointScale: { value: 32 * tier.pointScale },
      uTime: { value: 0 },
      uTravelerXZ: { value: new THREE.Vector2() },
    },
    vertexShader: POLAR_PARTICLE_VERTEX_SHADER,
  });
}

export default function PolarSemanticParticles({
  activeStationId = "observatory-plaque",
  enabled = true,
  quality = "high",
  reducedMotion = false,
  travelerRef,
  visible = true,
}) {
  const resolvedQuality = quality === "low" || quality === "medium" ? quality : "high";
  const { gl, size } = useThree();
  const geometry = useMemo(() => createParticleGeometry(resolvedQuality), [resolvedQuality]);
  const material = useMemo(() => createParticleMaterial(resolvedQuality), [resolvedQuality]);
  const previousStationRef = useRef(activeStationId);
  const impulseAgeRef = useRef(8);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.dataset.semanticParticleCount = String(geometry.userData.count);
    canvas.dataset.semanticParticleDraws = "1";
    canvas.dataset.semanticParticlePrograms = "1";
    canvas.dataset.semanticParticleSource = "cortiz-igloo-concepts-original-webgl-port";
    return () => {
      delete canvas.dataset.semanticParticleCount;
      delete canvas.dataset.semanticParticleDraws;
      delete canvas.dataset.semanticParticlePrograms;
      delete canvas.dataset.semanticParticleSource;
      delete canvas.dataset.semanticParticleStation;
      delete canvas.dataset.semanticParticleMode;
    };
  }, [geometry, gl]);

  useEffect(() => {
    gl.domElement.dataset.semanticParticleStation = activeStationId;
  }, [activeStationId, gl]);

  useEffect(() => {
    gl.domElement.dataset.semanticParticleMode = enabled && visible ? "active" : "suspended";
  }, [enabled, gl, visible]);

  useEffect(() => {
    material.uniforms.uMotion.value = reducedMotion ? 0 : 1;
  }, [material, reducedMotion]);

  useEffect(() => {
    material.uniforms.uActiveStation.value = polarParticleStationIndex(activeStationId);
    if (previousStationRef.current !== activeStationId) {
      previousStationRef.current = activeStationId;
      impulseAgeRef.current = 0;
    }
  }, [activeStationId, material]);

  useFrame(({ clock }, delta) => {
    if (!enabled || !visible) return;
    const pose = travelerRef?.current;
    const travelerX = Number.isFinite(pose?.x) ? pose.x : Number.isFinite(pose?.position?.x) ? pose.position.x : 0;
    const travelerZ = Number.isFinite(pose?.z) ? pose.z : Number.isFinite(pose?.position?.z) ? pose.position.z : 0;
    impulseAgeRef.current = Math.min(8, impulseAgeRef.current + Math.min(delta, 1 / 20));
    material.uniforms.uImpulseAge.value = impulseAgeRef.current;
    const morphProgress = Math.min(1, impulseAgeRef.current / 1.15);
    material.uniforms.uMorphPhase.value = reducedMotion ? 0 : Math.sin(morphProgress * Math.PI);
    material.uniforms.uPointScale.value =
      size.height * gl.getPixelRatio() * 0.036 * POLAR_PARTICLE_QUALITY[resolvedQuality].pointScale;
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    material.uniforms.uTravelerXZ.value.set(travelerX, travelerZ);
  });

  return (
    <points
      frustumCulled={false}
      geometry={geometry}
      material={material}
      name="Wave F semantic hologram particles / Cortiz-Igloo concepts adapted to bounded WebGL"
      renderOrder={3}
      userData={{
        count: geometry.userData.count,
        sourceCredit: POLAR_PARTICLE_SOURCE_CREDIT,
        stationSpecific: true,
      }}
      visible={enabled && visible}
    />
  );
}
