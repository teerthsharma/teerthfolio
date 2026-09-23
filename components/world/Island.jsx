"use client";

// The ground itself: snow, the cliff edge, paths between neighbourhoods,
// signposts, boulders, one warm sun, and Teerth's name pressed into the snow
// where the seal starts. Geometry comes from island/build.js (pure, built
// once). The water around it is Sea.jsx; the sky is Atmosphere.jsx.

import { Center, Text3D } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { ISLAND_RADIUS } from "../../lib/world/places";
import { live } from "../../lib/world/store";
import Instances from "./Instances";
import { buildIsland } from "./island/build";
import { C, LIGHT, mat } from "./palette";

// Offset from the seal to the sun. The shadow camera rides with the seal so
// the 2048 map is always spent on the part of the island in view.
const SUN = [-14, 26, 12];
const SHADOW_HALF = 28;

function Sun() {
  const light = useRef();
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const { x, z } = live.seal;
    l.position.set(x + SUN[0], SUN[1], z + SUN[2]);
    l.target.position.set(x, 0, z);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      color={LIGHT.sun}
      intensity={LIGHT.sunIntensity}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
      shadow-camera-left={-SHADOW_HALF}
      shadow-camera-right={SHADOW_HALF}
      shadow-camera-top={SHADOW_HALF}
      shadow-camera-bottom={-SHADOW_HALF}
      shadow-camera-near={1}
      shadow-camera-far={90}
    />
  );
}

function NameInSnow() {
  return (
    <group position={[0, 0.02, 3]} rotation={[-Math.PI / 2, 0, 0]}>
      <Center>
        <Text3D
          font="/fonts/helvetiker_bold.typeface.json"
          size={1.6}
          height={0.35}
          letterSpacing={0.08}
          bevelEnabled
          bevelSize={0.04}
          bevelThickness={0.04}
          curveSegments={6}
          castShadow
          receiveShadow
        >
          TEERTH SHARMA
          <meshStandardMaterial color={C.snow} roughness={0.85} />
        </Text3D>
      </Center>
    </group>
  );
}

// Click or tap on the snow: the seal slides there.
function walkHere(event) {
  if (event.delta > 8) return;
  live.target = { x: event.point.x, z: event.point.z };
  live.pendingOpen = null;
}

export default function Island() {
  const kit = useMemo(buildIsland, []);
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    gl.toneMapping = LIGHT.toneMapping;
  }, [gl]);

  return (
    <>
      <color attach="background" args={[C.sky]} />
      <fog attach="fog" args={[C.sky, 80, 190]} />
      <hemisphereLight args={[LIGHT.hemiSky, LIGHT.hemiGround, LIGHT.hemiIntensity]} />
      <Sun />

      {/* the walkable snow, then the kit's smooth snow shaping above it */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={walkHere}>
        <circleGeometry args={[ISLAND_RADIUS + 0.6, 128]} />
        <meshStandardMaterial color={C.snow} roughness={0.95} />
      </mesh>
      <mesh geometry={kit.snowSmoothGeo} material={mat(C.snow, { flat: false, roughness: 0.95 })} receiveShadow />
      <mesh geometry={kit.pathsDocksGeo} material={mat(C.path, { flat: false, roughness: 0.9 })} receiveShadow />
      <mesh geometry={kit.rockBatchGeo} material={mat("#ffffff", { vertexColors: true, roughness: 0.6 })} castShadow receiveShadow />
      <mesh geometry={kit.woodBatchGeo} material={mat(C.wood)} castShadow receiveShadow />
      <mesh geometry={kit.accentBatchGeo} material={mat("#ffffff", { vertexColors: true })} castShadow />

      <Instances geometry={kit.boulderTemplateGeo} items={kit.boulders.ice} material={mat(C.ice, { roughness: 0.5 })} />
      <Instances geometry={kit.boulderTemplateGeo} items={kit.boulders.deepIce} material={mat(C.deepIce, { roughness: 0.5 })} />

      <NameInSnow />
    </>
  );
}
