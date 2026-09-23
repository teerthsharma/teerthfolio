"use client";

// The page shell: the 3D world full-screen, the HTML overlay on top, and the
// DOM-level input (keyboard, touch drag) that feeds live.* in the store.

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { getUi, live, setUi, useUi } from "../../lib/world/store";
import { PLACE_BY_ID, dockPoint } from "../../lib/world/places";
import Hud from "./Hud";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

const MOVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function useKeyboard() {
  useEffect(() => {
    const down = (e) => {
      if (e.target.closest?.("input, textarea, [contenteditable]")) return;
      const ui = getUi();
      if (e.code === "Escape") {
        setUi({ open: null, list: false });
        return;
      }
      if ((e.code === "KeyE" || e.code === "Enter") && ui.near && !ui.open && !ui.list) {
        e.preventDefault();
        setUi({ open: ui.near, started: true });
        return;
      }
      if (MOVE_KEYS.has(e.code)) {
        if (ui.open || ui.list) return;
        e.preventDefault();
        live.keys.add(e.code);
        if (!ui.started) setUi({ started: true });
      }
      if (e.key === "Shift") live.boost = true;
    };
    const up = (e) => {
      live.keys.delete(e.code);
      if (e.key === "Shift") live.boost = false;
    };
    const blur = () => {
      live.keys.clear();
      live.boost = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
}

// Camera distance the visitor can set with the wheel or a pinch.
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.7;
const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

// Touch: press and drag anywhere on the world to steer, like a joystick
// centred where the finger landed; a second finger turns it into a pinch
// zoom. A tap without a drag falls through to the scene's click handlers
// (walk there / open that building). The mouse wheel zooms too.
function useTouchStick(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let origin = null;
    let pinch = null;
    const touches = new Map();
    const spread = () => {
      const [a, b] = touches.values();
      return Math.hypot(a.x - b.x, a.y - b.y) || 1;
    };
    const down = (e) => {
      if (e.pointerType !== "touch") return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        origin = null;
        live.stick = null;
        live.boost = false;
        pinch = { spread: spread(), zoom: live.zoom };
      } else if (touches.size === 1) {
        origin = { x: e.clientX, y: e.clientY, id: e.pointerId };
      }
    };
    const move = (e) => {
      const touch = touches.get(e.pointerId);
      if (touch) {
        touch.x = e.clientX;
        touch.y = e.clientY;
      }
      if (pinch && touches.size >= 2) {
        live.zoom = clampZoom((pinch.zoom * pinch.spread) / spread());
        return;
      }
      if (!origin || e.pointerId !== origin.id) return;
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      const len = Math.hypot(dx, dy);
      if (len < 14) {
        // Thumb drifted back to where it landed: stop, don't keep coasting
        // on the last direction it had.
        live.stick = null;
        live.boost = false;
        return;
      }
      const reach = Math.min(1, len / 70);
      live.stick = { x: (dx / len) * reach, z: (dy / len) * reach };
      live.target = null;
      // Hysteresis: past 110 px sets boost, back under 90 px clears it, so a
      // finger hovering the threshold does not chatter the dash on and off.
      if (len > 110) live.boost = true;
      else if (len < 90) live.boost = false;
      if (!getUi().started) setUi({ started: true });
    };
    const up = (e) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;
      if (origin && e.pointerId === origin.id) {
        origin = null;
        live.stick = null;
        live.boost = false;
      }
    };
    const wheel = (e) => {
      e.preventDefault();
      const px = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      live.zoom = clampZoom(live.zoom * Math.exp(px * 0.0012));
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [ref]);
}

export default function SealGame() {
  const stage = useRef(null);
  const failed = useUi((s) => s.failed);
  useKeyboard();
  useTouchStick(stage);

  useEffect(() => {
    if (!hasWebGL()) setUi({ failed: true, list: true });
    // The server-rendered copy (app/page.jsx) is for crawlers and no-JS
    // visitors; with JS running, the HUD is the accessible route.
    document.getElementById("crawler-copy")?.setAttribute("inert", "");
    // ?spawn=<place id> starts the seal at that building's dock, and ?play
    // skips the intro card. Both exist for screenshots and for links that
    // point at one project.
    const params = new URLSearchParams(window.location.search);
    const place = PLACE_BY_ID[params.get("spawn")];
    if (place) {
      const dock = dockPoint(place);
      Object.assign(live.seal, { x: dock.x, z: dock.z, vx: 0, vz: 0, heading: Math.PI });
    }
    if (params.has("play") || place) setUi({ started: true });
  }, []);

  return (
    <div className="game">
      <div className="game-stage" ref={stage}>
        {!failed && <Scene />}
      </div>
      <Hud />
    </div>
  );
}
