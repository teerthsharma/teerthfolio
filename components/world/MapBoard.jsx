"use client";

// THE MAP BOARD at the start point (a reviewer: "you need a map on the board
// at start points and some directions"): a trail-map table tilted toward
// the camera just south-west of spawn, drawn once from the real layout
// (lib/world/places.js, river.js, land.js): the island, the river and moat,
// the highway, every place as a dot in its colour with its name, north up
// like the view. A glowing marker bobs over "you are here". Its collider is
// lib/world/land.js MAP_BOARD.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from "three";
import { HIGHWAY, MAP_BOARD } from "../../lib/world/land";
import { ISLAND_RADIUS, PLACES, SPAWN } from "../../lib/world/places";
import { WATERS } from "../../lib/world/river";
import { C, lamp, mat } from "./palette";

const SIZE = 3.6; // m, the board's side
const TILT = -0.95; // rad back from vertical, so the 42-degree camera reads it
const PX = 1024;
const SPAN = ISLAND_RADIUS + 8;
const toPx = (v) => ((v + SPAN) / (2 * SPAN)) * PX;

function drawMap() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PX;
  const g = canvas.getContext("2d");
  g.fillStyle = "#1d6f8a"; // the sea
  g.fillRect(0, 0, PX, PX);
  g.fillStyle = "#fbfaf7"; // the island
  g.beginPath();
  g.arc(toPx(0), toPx(0), (ISLAND_RADIUS / (2 * SPAN)) * PX, 0, Math.PI * 2);
  g.fill();
  g.lineCap = g.lineJoin = "round";
  for (const line of WATERS) {
    g.strokeStyle = "#39b7e0";
    g.lineWidth = ((line.width ?? 8) / (2 * SPAN)) * PX;
    g.beginPath();
    line.points.forEach(([x, z], i) => (i ? g.lineTo(toPx(x), toPx(z)) : g.moveTo(toPx(x), toPx(z))));
    g.stroke();
  }
  g.strokeStyle = "#3d3b4a";
  g.lineWidth = (HIGHWAY.width / (2 * SPAN)) * PX;
  for (const leg of HIGHWAY.legs) {
    g.beginPath();
    leg.forEach(([x, z], i) => (i ? g.lineTo(toPx(x), toPx(z)) : g.moveTo(toPx(x), toPx(z))));
    g.stroke();
  }
  const r = HIGHWAY.roundabout;
  g.lineWidth = (r.width / (2 * SPAN)) * PX;
  g.beginPath();
  g.arc(toPx(r.x), toPx(r.z), (r.radius / (2 * SPAN)) * PX, 0, Math.PI * 2);
  g.stroke();
  // places: a dot each; one name per area (MujoRush's three faces share one)
  const named = new Set();
  g.textAlign = "center";
  for (const p of PLACES) {
    const x = toPx(p.x);
    const y = toPx(p.z);
    g.fillStyle = p.radiation ?? p.color;
    g.strokeStyle = "#ffffff";
    g.lineWidth = 5;
    g.beginPath();
    g.arc(x, y, 22, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    const name = p.section === "upstream" ? p.district?.name ?? p.name : p.name;
    if (named.has(name)) continue;
    named.add(name);
    g.font = "700 34px system-ui, sans-serif";
    g.lineWidth = 9;
    g.strokeStyle = "#fbfaf7";
    g.strokeText(name, x, y - 32);
    g.fillStyle = "#1c1b19";
    g.fillText(name, x, y - 32);
  }
  // north, up like the view
  g.font = "700 40px system-ui, sans-serif";
  g.fillStyle = "#fbfaf7";
  g.fillText("N", PX - 60, 70);
  g.beginPath();
  g.moveTo(PX - 60, 82);
  g.lineTo(PX - 74, 110);
  g.lineTo(PX - 46, 110);
  g.closePath();
  g.fill();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default function MapBoard() {
  const texture = useMemo(() => (typeof document === "undefined" ? null : drawMap()), []);
  const face = useMemo(() => new MeshStandardMaterial({ map: texture, roughness: 0.85 }), [texture]);
  useEffect(() => () => {
    texture?.dispose();
    face.dispose();
  }, [texture, face]);
  const marker = useRef();

  // where spawn sits on the board, in the board's own frame
  const here = useMemo(() => [((SPAWN.x / (2 * SPAN)) * SIZE), -((SPAWN.z / (2 * SPAN)) * SIZE)], []);

  useFrame((state) => {
    if (marker.current) {
      marker.current.position.z = 0.35 + 0.08 * Math.sin(state.clock.elapsedTime * 3);
      marker.current.rotation.z = state.clock.elapsedTime * 2;
    }
  });

  return (
    <group position={[MAP_BOARD.x, 0, MAP_BOARD.z]}>
      {/* two posts and a frame, the board tilted back toward the camera */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={POST} material={mat(C.charcoal)} position={[s * SIZE * 0.38, 0.55, 0]} castShadow />
      ))}
      <group position={[0, 1.15, 0]} rotation={[TILT, 0, 0]}>
        <mesh geometry={FRAME} material={mat("#8a5a36", { roughness: 0.8 })} castShadow />
        <mesh geometry={FACE} material={face} position={[0, 0, 0.09]} />
        <group position={[here[0], here[1], 0]}>
          <mesh ref={marker} geometry={PIN} material={lamp("#ff4d6a", 1.4)} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
      </group>
    </group>
  );
}

const POST = new CylinderGeometry(0.07, 0.09, 1.1, 8);
const FRAME = new BoxGeometry(SIZE + 0.2, SIZE + 0.2, 0.1);
const FACE = new PlaneGeometry(SIZE, SIZE);
const PIN = new ConeGeometry(0.14, 0.34, 12).translate(0, -0.17, 0);
