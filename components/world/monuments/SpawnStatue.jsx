"use client";

// THE SPAWN STATUE: SEAL SEAL, the bronze pup on a granite plinth at SPAWN {0, 9}, under the igloo (z -8). The seal spawns on the
// plinth's front half (lib/world/plinth.js lifts it to the top, 0.85 m). The pup stands 2.8 m on the back half, facing +z (the follow
// camera); the plaque, 1.2 x 0.7 m, lies at its feet with the live GitHub avatar and the two cut lines. The metal is a written toon
// shader (ramp, rim, spec band), not a stock material.

import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, Color, DoubleSide, MeshBasicMaterial, ShaderMaterial, SRGBColorSpace, TextureLoader } from "three";
import { mat } from "../palette";
import { PLINTH } from "../../../lib/world/plinth";
import { SPAWN } from "../../../lib/world/places";

// github.com/teerthsharma.png 302s to this host, which serves the same live avatar with CORS open.
const PFP_URL = "https://avatars.githubusercontent.com/teerthsharma";
const GRANITE = "#9e928d";
const GRANITE_DARK = "#6a625c";
const INK = "#1c1824";
const PW = 1.2;
const PH = 0.7;

function bronzeMaterial() {
  return new ShaderMaterial({
    uniforms: { uBase: { value: new Color("#6e5344") }, uDeep: { value: new Color("#2e211b") }, uRim: { value: new Color("#c4a574") }, uSun: { value: [0.45, 0.8, 0.4] } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase; uniform vec3 uDeep; uniform vec3 uRim; uniform vec3 uSun;
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 n = normalize(vN);
        float l = dot(n, normalize(uSun));
        float ramp = smoothstep(-0.15, 0.1, l) * 0.55 + smoothstep(0.35, 0.5, l) * 0.45;
        vec3 c = mix(uDeep, uBase, ramp);
        float rim = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 3.0);
        c += uRim * smoothstep(0.35, 0.6, rim) * 0.85;
        vec3 h = normalize(normalize(uSun) + normalize(vV));
        c += uRim * smoothstep(0.93, 0.96, dot(n, h)) * 0.5;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// Stone face with the two cut lines; the cameo sits at the left.
function plaqueTexture() {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 598;
  const g = c.getContext("2d");
  g.fillStyle = GRANITE;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = GRANITE_DARK;
  g.lineWidth = 14;
  g.strokeRect(7, 7, c.width - 14, c.height - 14);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = INK;
  g.font = "bold 104px Georgia, serif";
  g.fillText("SEAL SEAL", 640, 240);
  g.font = "italic 46px Georgia, serif";
  g.fillText("founder of seal city", 640, 370);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export default function SpawnStatue() {
  const bronze = useMemo(bronzeMaterial, []);
  const granite = useMemo(() => mat(GRANITE, { roughness: 0.85 }), []);
  const graniteDk = useMemo(() => mat(GRANITE_DARK, { roughness: 0.9 }), []);
  const eye = useMemo(() => new MeshBasicMaterial({ color: "#06b6d4", toneMapped: false }), []);
  const face = useMemo(() => {
    const map = plaqueTexture();
    return new MeshBasicMaterial({ map, color: map ? "#ffffff" : GRANITE, toneMapped: false });
  }, []);
  const [pfp, setPfp] = useState(null);
  useEffect(() => {
    let dead = false;
    const loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      PFP_URL,
      (t) => {
        t.colorSpace = SRGBColorSpace;
        if (!dead) setPfp(new MeshBasicMaterial({ map: t, toneMapped: false, side: DoubleSide }));
      },
      undefined,
      () => {}, // down or refused: the bronze disc stays
    );
    return () => {
      dead = true;
    };
  }, []);

  const { top } = PLINTH;
  const k = 0.85; // pup scale: 3.3 m * 0.85 = 2.8 m
  return (
    <group position={[SPAWN.x, 0, SPAWN.z]}>
      <mesh position={[0, top / 2, PLINTH.z - SPAWN.z]} receiveShadow castShadow material={granite}>
        <cylinderGeometry args={[PLINTH.r0, PLINTH.r1, top, 12]} />
      </mesh>
      {/* the pup, on the back half of the plinth, facing +z */}
      <group position={[0, top, -3.0]} scale={k}>
        <mesh position={[0, 1.15, 0]} scale={[0.95, 1.25, 1.05]} castShadow material={bronze}><sphereGeometry args={[1, 24, 18]} /></mesh>
        <mesh position={[0, 0.3, -0.5]} rotation={[0.9, 0, 0]} scale={[1, 1.1, 0.35]} castShadow material={bronze}><sphereGeometry args={[0.7, 14, 10]} /></mesh>
        <mesh position={[0, 2.62, 0.1]} castShadow material={bronze}><sphereGeometry args={[0.66, 24, 18]} /></mesh>
        <mesh position={[0, 2.42, 0.62]} scale={[1.2, 0.85, 1]} castShadow material={bronze}><sphereGeometry args={[0.26, 16, 12]} /></mesh>
        <mesh position={[0, 2.52, 0.86]} material={graniteDk}><sphereGeometry args={[0.085, 10, 8]} /></mesh>
        {[-0.27, 0.27].map((x) => (
          <mesh key={x} position={[x, 2.8, 0.55]} material={eye}><sphereGeometry args={[0.1, 12, 10]} /></mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.95, 0.95, 0.35]} rotation={[0.3, 0, -s * 0.5]} scale={[0.28, 0.85, 0.5]} castShadow material={bronze}><sphereGeometry args={[1, 14, 10]} /></mesh>
        ))}
      </group>
      {/* the plaque on the plinth between the pup's feet and the spawn pad, leaning back to the follow camera */}
      <group position={[-1.55, top + 0.3, 0.25]} rotation={[-1.0, 0.25, 0]}>
        <mesh castShadow receiveShadow material={graniteDk}><boxGeometry args={[PW + 0.12, PH + 0.12, 0.12]} /></mesh>
        <mesh position={[0, 0, 0.062]} material={face}><planeGeometry args={[PW, PH]} /></mesh>
        <group position={[-0.37, 0, 0.07]}>
          <mesh material={bronze}><torusGeometry args={[0.21, 0.025, 8, 32]} /></mesh>
          {pfp ? (
            <mesh position={[0, 0, 0.004]} material={pfp}><circleGeometry args={[0.2, 32]} /></mesh>
          ) : (
            <mesh position={[0, 0, 0.004]} material={bronze}><circleGeometry args={[0.2, 24]} /></mesh>
          )}
        </group>
      </group>
    </group>
  );
}
