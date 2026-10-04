"use client";

// THE LOOP'S BANNER (the owner: "a banner so they know it's there, something
// is there"). A cream cloth on two poles on the north bank, facing the camera
// (up the screen is -z), hand-lettered LOOP IT x3 with three pips and a
// padlock. The pips fill with the clean-loop streak; the win pops the lock
// and the banner reads UNLOCKED for the rest of the session. It waves
// gently. The canvas redraws only when the state it shows changes.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, DoubleSide, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from "three";
import { CLEAN, ENTRY } from "../../lib/world/loop";
import { live } from "../../lib/world/store";
import { heightAt } from "../../lib/world/terrain";
import { C, mat } from "./palette";

const X = ENTRY.x0 - 4; // upstream of the catch, so it reads on the approach
const Z = ENTRY.z - 4.6; // the dry north bank
const W = 6.4;
const H = 2.3;
const TOP = 5.2; // the banner's top edge
const WIN_KEY = "seal:loopwin";

function wonBefore() {
  try {
    return Boolean(sessionStorage.getItem(WIN_KEY));
  } catch {
    return false;
  }
}

function draw(ctx, streak, won) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fbf8f2";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#1c1b22";
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.fillStyle = "#1c1b22";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const comic = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif";
  ctx.font = `800 120px ${comic}, sans-serif`;
  ctx.fillText(won ? "UNLOCKED!" : `LOOP IT ×${CLEAN.need}`, w / 2, h * 0.36);
  // three pips, then the padlock
  const r = 30;
  const gap = 92;
  const x0 = w / 2 - gap * 1.5;
  for (let i = 0; i < CLEAN.need; i++) {
    ctx.beginPath();
    ctx.arc(x0 + i * gap, h * 0.74, r, 0, Math.PI * 2);
    ctx.fillStyle = won || i < streak ? "#1ec8f0" : "#fbf8f2";
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.stroke();
  }
  const lx = x0 + CLEAN.need * gap + 6;
  const ly = h * 0.74;
  ctx.lineWidth = 9;
  ctx.beginPath(); // the shackle, swung open once won
  ctx.arc(lx + (won ? 26 : 0), ly - 22, 20, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = won ? "#ffd166" : "#1c1b22";
  ctx.fillRect(lx - 30, ly - 22, 60, 50);
  ctx.strokeRect(lx - 30, ly - 22, 60, 50);
  if (!won) {
    ctx.fillStyle = "#fbf8f2";
    ctx.font = `800 34px ${comic}, sans-serif`;
    ctx.fillText("?", lx, ly + 4);
  }
}

export default function LoopBanner() {
  const cloth = useRef();
  const state = useRef({ key: "", wave: 0 });
  const parts = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 368;
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    const geo = new PlaneGeometry(W, H, 24, 6);
    const rest = Float32Array.from(geo.attributes.position.array);
    const material = new MeshStandardMaterial({ map: tex, roughness: 0.9, side: DoubleSide });
    return { canvas, ctx: canvas.getContext("2d"), tex, geo, rest, material, pole: mat(C.woodDark) };
  }, []);
  useEffect(() => () => {
    parts.tex.dispose();
    parts.geo.dispose();
    parts.material.dispose();
  }, [parts]);

  const ground = heightAt(X, Z);

  useFrame((frame) => {
    const seal = live.seal;
    const won = (seal?.wins ?? 0) > 0 || wonBefore();
    const streak = seal?.loopStreak ?? 0;
    const key = `${won}:${streak}`;
    if (key !== state.current.key) {
      if (state.current.key) state.current.wave = 1; // a flourish on every change
      state.current.key = key;
      draw(parts.ctx, streak, won);
      parts.tex.needsUpdate = true;
    }
    // the cloth waves; harder for a moment when the state changes
    const t = frame.clock.elapsedTime;
    const amp = 0.08 + state.current.wave * 0.25;
    state.current.wave *= 0.97;
    const pos = parts.geo.attributes.position;
    const a = pos.array;
    const r = parts.rest;
    for (let i = 0; i < pos.count; i++) {
      const x = r[i * 3];
      const y = r[i * 3 + 1];
      const pin = 1 - Math.abs(x) / (W / 2); // the poles hold the ends still
      a[i * 3 + 2] = Math.sin(t * 2.2 + x * 1.3 + y * 0.8) * amp * pin;
    }
    pos.needsUpdate = true;
    if (cloth.current) cloth.current.visible = !live.stageOn;
  });

  return (
    <group position={[X, ground, Z]}>
      <group ref={cloth}>
        <mesh geometry={parts.geo} material={parts.material} position={[0, TOP - H / 2, 0]} castShadow />
        {[-W / 2 - 0.1, W / 2 + 0.1].map((x) => (
          <mesh key={x} position={[x, TOP / 2 + 0.2, 0]} material={parts.pole} castShadow>
            <cylinderGeometry args={[0.09, 0.11, TOP + 0.4, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
