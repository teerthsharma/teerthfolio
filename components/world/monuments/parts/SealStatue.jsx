"use client";

// The seal statue at Epsilon-Hollow's plaza centre: the pup in bronze on a
// granite plinth, with a plaque stone at its feet facing the dock (+z).
// The plaque carries the live GitHub avatar (TextureLoader, CORS); if it
// fails, a bronze relief of the pup face stands in, never a broken quad.
// Local origin: the snow at the place centre.

import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, DoubleSide, MeshBasicMaterial, SRGBColorSpace, TextureLoader } from "three";
import { mat } from "../../palette";

const BRONZE = "#8a7a68";
const GRANITE = "#9e928d";
const GRANITE_DARK = "#6a625c";
const INK = "#1c1824";
// github.com/teerthsharma.png 302s to avatars.githubusercontent.com without CORS headers; this host serves the same live avatar by handle with ACAO *.
export const PFP_URL = "https://avatars.githubusercontent.com/teerthsharma";

const PLINTH_H = 0.5;
const PW = 2.0; // plaque face width, m
const PH = 0.9;

// Stone face with the two incised lines, drawn once (the cameo sits at the left).
function plaqueTexture() {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 460;
  const g = c.getContext("2d");
  g.fillStyle = GRANITE;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = GRANITE_DARK;
  g.lineWidth = 14;
  g.strokeRect(7, 7, c.width - 14, c.height - 14);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = INK;
  g.font = "bold 118px Georgia, 'Times New Roman', serif";
  g.fillText("SEAL SEAL", 690, 170);
  g.font = "italic 52px Georgia, 'Times New Roman', serif";
  g.fillText("founder of seal city", 690, 310);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// The pup's face in relief: shown until (or instead of) the live avatar.
function PupRelief({ eye, bronze, dark }) {
  return (
    <group scale={[1, 1, 0.35]}>
      <mesh material={bronze}><sphereGeometry args={[0.3, 20, 14]} /></mesh>
      <mesh position={[0, -0.09, 0.26]} material={bronze}><sphereGeometry args={[0.15, 14, 10]} /></mesh>
      <mesh position={[0, -0.03, 0.4]} material={dark}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.08, 0.26]} material={eye}><sphereGeometry args={[0.035, 8, 6]} /></mesh>
      ))}
    </group>
  );
}

export default function SealStatue({ accent }) {
  const bronze = useMemo(() => mat(BRONZE, { roughness: 0.4, metalness: 0.55 }), []);
  const granite = useMemo(() => mat(GRANITE, { roughness: 0.85 }), []);
  const graniteDk = useMemo(() => mat(GRANITE_DARK, { roughness: 0.9 }), []);
  const eye = useMemo(() => new MeshBasicMaterial({ color: accent, toneMapped: false }), [accent]);
  const dark = useMemo(() => mat("#2a2420", { roughness: 0.6 }), []);
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
      () => {}, // GitHub down or CORS refused: the bronze relief stays
    );
    return () => {
      dead = true;
    };
  }, []);

  const tilt = -0.42; // the plaque leans back so it reads from the dock's eye height
  return (
    <group>
      <mesh position={[0, PLINTH_H / 2, 0]} castShadow receiveShadow material={granite}>
        <cylinderGeometry args={[1.25, 1.45, PLINTH_H, 8]} />
      </mesh>
      {/* the pup: a seated seal, flippers at its sides, flukes behind */}
      <group position={[0, PLINTH_H, 0]}>
        <mesh position={[0, 1.15, 0]} scale={[0.95, 1.25, 1.05]} castShadow material={bronze}><sphereGeometry args={[1, 24, 18]} /></mesh>
        <mesh position={[0, 0.3, -0.5]} rotation={[0.9, 0, 0]} scale={[1, 1.1, 0.35]} castShadow material={bronze}><sphereGeometry args={[0.7, 14, 10]} /></mesh>
        <mesh position={[0, 2.62, 0.1]} castShadow material={bronze}><sphereGeometry args={[0.66, 24, 18]} /></mesh>
        <mesh position={[0, 2.42, 0.62]} scale={[1.2, 0.85, 1]} castShadow material={bronze}><sphereGeometry args={[0.26, 16, 12]} /></mesh>
        <mesh position={[0, 2.52, 0.86]} material={dark}><sphereGeometry args={[0.085, 10, 8]} /></mesh>
        {[-0.27, 0.27].map((x) => (
          <mesh key={x} position={[x, 2.8, 0.55]} material={eye}><sphereGeometry args={[0.1, 12, 10]} /></mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.95, 0.95, 0.35]} rotation={[0.3, 0, -s * 0.5]} scale={[0.28, 0.85, 0.5]} castShadow material={bronze}><sphereGeometry args={[1, 14, 10]} /></mesh>
        ))}
      </group>
      {/* plaque stone at the statue's feet, facing the dock */}
      <group position={[0, 0.5, 2.1]} rotation={[tilt, 0, 0]}>
        <mesh castShadow receiveShadow material={graniteDk}><boxGeometry args={[PW + 0.3, PH + 0.3, 0.3]} /></mesh>
        <mesh position={[0, 0, 0.152]} material={face}><planeGeometry args={[PW, PH]} /></mesh>
        <group position={[-0.62, 0, 0.16]}>
          <mesh material={bronze}><torusGeometry args={[0.35, 0.04, 8, 32]} /></mesh>
          {pfp ? (
            <mesh position={[0, 0, 0.005]} material={pfp}><circleGeometry args={[0.34, 32]} /></mesh>
          ) : (
            <group position={[0, 0, 0.01]}><PupRelief eye={eye} bronze={bronze} dark={dark} /></group>
          )}
        </group>
      </group>
    </group>
  );
}
