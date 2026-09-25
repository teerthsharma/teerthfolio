"use client";

// How to move, shown the way this visitor can move (a reviewer: "it needs to
// be more clear that you need to swipe somewhere to start navigating"). The
// hint follows the input actually in use: a finger dragging on touch, WASD
// keys pressing on a keyboard, a click on the snow with a mouse; it switches
// live (a keyboard plugged into an iPad, a touch laptop). It appears once the
// jump-in lands, leaves once the seal has slid a few metres, and comes back
// if the visitor stands idle without ever having moved.

import { useEffect, useState } from "react";
import { live, useUi } from "../../../lib/world/store";

const LEARNED_M = 4; // metres the seal must travel before the coach leaves
const DELAY_MS = 1800; // after Start: let the jump-in land first


export default function MoveCoach() {
  const started = useUi((s) => s.started);
  const open = useUi((s) => s.open);
  const list = useUi((s) => s.list);
  const cutscene = useUi((s) => s.cutscene);
  const [mode, setMode] = useState("keys"); // the server's guess; the device decides after mount
  const [ready, setReady] = useState(false);
  const [learned, setLearned] = useState(false);

  // Start from the device, then follow whatever the visitor last used.
  useEffect(() => {
    // iPad Safari asks for desktop sites by default and reports a fine
    // pointer, so the touch-point count is the signal that holds.
    if (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) setMode("touch");
    const onPointer = (e) => setMode(e.pointerType === "touch" || e.pointerType === "pen" ? "touch" : (m) => (m === "keys" ? "keys" : "mouse"));
    const onKey = () => setMode("keys");
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Wait for the jump-in, then watch the seal until it has really moved.
  useEffect(() => {
    if (!started || learned) return undefined;
    const t = setTimeout(() => setReady(true), DELAY_MS);
    const from = { x: live.seal.x, z: live.seal.z };
    const poll = setInterval(() => {
      if (Math.hypot(live.seal.x - from.x, live.seal.z - from.z) > LEARNED_M) setLearned(true);
    }, 250);
    return () => {
      clearTimeout(t);
      clearInterval(poll);
    };
  }, [started, learned]);

  const visible = started && ready && !learned && !open && !list && !cutscene;
  return (
    <div className="coach" data-visible={visible} data-mode={mode} aria-live="polite">
      {mode === "touch" && (
        <>
          <div className="coach-swipe" aria-hidden="true">
            <span className="coach-trail" />
            <svg className="coach-hand" viewBox="0 0 48 56">
              <path d="M18 4a4 4 0 0 1 8 0v20l2-1a4 4 0 0 1 5 2l1 1 2-1a4 4 0 0 1 5 2l1 2 1-.5a4 4 0 0 1 5 3.5v9c0 8-6 14-14 14h-5c-5 0-8-2-11-6L7 39a4 4 0 0 1 6-5l5 5V4z" />
            </svg>
          </div>
          <p>
            <strong>Swipe</strong> to slide
            <span> · tap a place to go there</span>
          </p>
        </>
      )}
      {mode === "keys" && (
        <>
          <div className="coach-key" aria-hidden="true">
            <span className="coach-arrow">▲</span>
            <kbd>W</kbd>
          </div>
          <p>
            Hold <strong>W</strong> to slide
            <span> · A D to turn · S back · Shift dash · E open</span>
          </p>
        </>
      )}
      {mode === "mouse" && (
        <>
          <div className="coach-pad" aria-hidden="true">
            <span className="coach-click" />
          </div>
          <p>
            <strong>Click the snow</strong> to slide there
            <span> · or use WASD</span>
          </p>
        </>
      )}
    </div>
  );
}
