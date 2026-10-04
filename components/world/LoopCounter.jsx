"use client";

// THE LOOP'S STREAK, above the pup's head (the owner: "show it as a large
// counter on head"). A big cream comic number: 1, 2, then 3! on the win. It
// pops on each clean loop and shakes away on a messy one. Reads seal fields
// from lib/world/loop.js every frame and writes the DOM directly, so a
// streak change costs no React render.

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { CLEAN } from "../../lib/world/loop";
import { live } from "../../lib/world/store";

const HOLD_FAIL = 1.5; // s the reset shows after a messy loop
const HOLD_WIN = 2.5; // s the "3!" shows after the win

export default function LoopCounter() {
  const group = useRef();
  const el = useRef();
  const seen = useRef({ loops: 0, wins: 0, until: 0, text: "" });

  useFrame((state) => {
    const seal = live.seal;
    const g = group.current;
    const node = el.current;
    if (!seal || !g || !node) return;
    const t = state.clock.elapsedTime;
    const s = seen.current;
    g.position.set(seal.x, (seal.rideY || 0) + 2.4, seal.z);

    let cls = "";
    if (seal.wins !== s.wins) {
      s.wins = seal.wins;
      s.loops = seal.loops;
      s.text = `${CLEAN.need}!`;
      s.until = t + HOLD_WIN;
      cls = "pop win";
    } else if (seal.loops !== s.loops) {
      s.loops = seal.loops;
      if (seal.loopClean && seal.loopStreak > 0) {
        s.text = String(seal.loopStreak);
        s.until = Infinity; // stays while the streak lives
        cls = "pop";
      } else {
        s.text = "0";
        s.until = t + HOLD_FAIL;
        cls = "fail";
      }
    }
    // a streak that waited too long for its next entry is gone
    if (s.until === Infinity && seal.loopStreak > 0 && !seal.ride && seal.clock - seal.loopExitAt > CLEAN.gap) {
      s.text = "0";
      s.until = t + HOLD_FAIL;
      cls = "fail";
    }
    const show = t < s.until && !live.arrival?.id && document.documentElement.dataset.hud !== "off";
    if (cls) {
      node.textContent = s.text;
      node.className = "loop-count";
      void node.offsetWidth; // restart the animation
      node.className = `loop-count ${cls}`;
    }
    node.dataset.on = show ? "1" : "0";
  });

  return (
    <group ref={group}>
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div ref={el} className="loop-count" data-on="0" aria-live="polite" />
      </Html>
    </group>
  );
}
