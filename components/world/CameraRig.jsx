"use client";

// A fixed-angle follow camera, the way Bruno Simon's site frames its car: the
// view never rotates, so "up the screen" always means the same way on the
// island and the visitor never has to relearn the controls.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { MOTION } from "../../lib/world/motion";
import { PLACE_BY_ID } from "../../lib/world/places";
import { getUi, live } from "../../lib/world/store";

// Direction from the seal to the camera (elevation about 49 degrees). Fixed:
// the azimuth never rotates and neither the offset nor the FOV change.
const OFFSET = new Vector3(0, 27, 23);
const LEAD_TIME = 0.5; // seconds of velocity the view leads by
const LEAD_Z = 1.5; // the bottom of the frame is only 11.6 m away
const LEAD_MAX = 5.5; // m
const LEAD_SMOOTH_DAMP = 4; // 1/s: a bump can't reverse the focus in one frame
const FOCUS_DAMP = 3.5;
const SPEED_ZOOM_DAMP = 1.5;
const INTRO_DAMP = 2;
const MODE_ZOOM_DAMP = 2;
const NEAR_PULL = 0.35;
const PANEL_RETRY_FRAMES = 30;
const PANEL_LEFT_FRACTION = 0.4;
const PANEL_TOP_FRACTION = 0.2;
const FREE_RECT_RAISE = 0.1;
const TRAUMA_DECAY = 2.5; // 1/s
const TRAUMA_RISE_MIN = 0.12;
const TRAUMA_IMPACT_MIN = 0.3;
const TRAUMA_GAIN = 1.4;
const SHAKE_AMPLITUDE = 0.25; // m

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default function CameraRig() {
  const { camera, size } = useThree();
  const focus = useRef(new Vector3(live.seal.x, 0, live.seal.z));
  const wanted = useRef(new Vector3());
  const lead = useRef(new Vector3());
  const leadSmooth = useRef(new Vector3());
  const lookAt = useRef(new Vector3());
  const shake = useRef(new Vector3());
  const groundHit = useRef(new Vector3());
  const ndc = useRef(new Vector2());
  const raycaster = useRef(new Raycaster());
  const groundPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));

  // ?zoom=0.35 brings the camera in for close-up screenshots of the seal or a
  // building; it is a debugging aid, not a player control.
  const zoom = useRef(null);
  if (zoom.current === null) {
    const value = typeof window === "undefined" ? NaN : Number(new URLSearchParams(window.location.search).get("zoom"));
    zoom.current = value > 0 ? value : 1;
  }

  const reduced = useRef(null);
  if (reduced.current === null) {
    reduced.current = typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }

  // Eased distance factors, smoothed independently so a one-frame spike in
  // any single input (a bump collapsing seal.speed, say) cannot snap the
  // camera: only speedZoom sees speed directly, and it is itself damped.
  const speedZoom = useRef(1);
  const modeZoom = useRef(1);
  const introZoom = useRef(null);
  if (introZoom.current === null) introZoom.current = getUi().started ? 1 : 1.45;

  const trauma = useRef(0);
  const prevImpact = useRef(live.seal.impact);

  // The open building's panel: looked up by class each time `open` changes
  // (it mounts after the state change) and again on resize, retried for a
  // few frames since it is not there yet on the first one.
  const panel = useRef({ id: null, el: null, tries: 0, rect: null });
  useEffect(() => {
    const onResize = () => {
      panel.current.el = null;
      panel.current.tries = 0;
      panel.current.rect = null;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const seal = live.seal;
    const ui = getUi();
    const t = state.clock.elapsedTime;
    const aspect = size.width / size.height;
    // Portrait screens see a sliver of the island at the desktop distance, so
    // pull back until roughly the same width of ground is in view.
    const pull = clamp(1.35 / aspect, 1, 1.9);

    const speedZoomTarget = reduced.current
      ? 1
      : 1 + 0.1 * clamp(seal.speed / MOTION.maxSpeed, 0, 1) + 0.06 * (live.boost && seal.throttle ? 1 : 0);
    speedZoom.current += (speedZoomTarget - speedZoom.current) * damp(SPEED_ZOOM_DAMP, dt);

    const introTarget = ui.started ? 1 : 1.45;
    if (reduced.current) introZoom.current = introTarget;
    else introZoom.current += (introTarget - introZoom.current) * damp(INTRO_DAMP, dt);

    const nearSlow = ui.near && seal.speed < 2;
    const modeZoomTarget = ui.open ? 0.9 : nearSlow ? 0.93 : 1;
    modeZoom.current += (modeZoomTarget - modeZoom.current) * damp(MODE_ZOOM_DAMP, dt);

    const dNow = pull * zoom.current * speedZoom.current * introZoom.current * modeZoom.current;
    const dTarget = pull * zoom.current * speedZoomTarget * introTarget * modeZoomTarget;

    lead.current.set(seal.vx * LEAD_TIME, 0, seal.vz * LEAD_TIME * LEAD_Z);
    const leadLen = lead.current.length();
    if (leadLen > LEAD_MAX) lead.current.multiplyScalar(LEAD_MAX / leadLen);
    // A bump reverses seal velocity in one frame; smoothing the lead
    // separately from focus.lerp keeps that reversal from snapping the view.
    leadSmooth.current.lerp(lead.current, damp(LEAD_SMOOTH_DAMP, dt));

    // Where the view is heading, strongest mode first.
    if (ui.open && PLACE_BY_ID[ui.open]) {
      const place = PLACE_BY_ID[ui.open];
      if (panel.current.id !== ui.open) panel.current = { id: ui.open, el: null, tries: 0, rect: null };
      if (!panel.current.el && panel.current.tries < PANEL_RETRY_FRAMES) {
        // Not plain `.sheet`: the list and the project panel share the Sheet
        // shell, so the first match could be the closed list.
        const el = document.querySelector('.hud-panel, .sheet[data-state="open"]');
        if (el) {
          panel.current.el = el;
          // On phones the sheet rests half-open via a CSS transform, so
          // offsetTop/offsetLeft (below) read where it would sit before that
          // transform, not where it actually is. Measure the real rect once
          // the open transition settles.
          const onEnd = (e) => {
            if (e.target === el && e.propertyName === "transform") panel.current.rect = el.getBoundingClientRect();
          };
          el.addEventListener("transitionend", onEnd, { once: true });
        } else {
          panel.current.tries += 1;
        }
      }
      const el = panel.current.el;
      let ground = null;
      if (el) {
        const w = size.width;
        const h = size.height;
        // Before the transition settles (or on desktop, where the sheet
        // never transforms and .hud is a fixed full-viewport box so the two
        // are equivalent), offsetLeft/offsetTop are still a fine estimate.
        const rect = panel.current.rect;
        const pl = rect ? rect.left : el.offsetLeft;
        const pt = rect ? rect.top : el.offsetTop;
        let fx = 0;
        let fy = 0;
        let fw = w;
        let fh = h;
        if (pl > PANEL_LEFT_FRACTION * w) fw = pl;
        else if (pt > PANEL_TOP_FRACTION * h) fh = pt;
        const px = fx + fw / 2;
        const py = fy + fh / 2 - FREE_RECT_RAISE * fh;
        ndc.current.set((px / w) * 2 - 1, -(py / h) * 2 + 1);
        raycaster.current.setFromCamera(ndc.current, camera);
        ground = raycaster.current.ray.intersectPlane(groundPlane.current, groundHit.current);
      }
      if (ground) {
        const scale = dTarget / (dNow || 1e-6);
        wanted.current.set(
          place.x - (ground.x - focus.current.x) * scale,
          0,
          place.z - (ground.z - focus.current.z) * scale
        );
      } else {
        // No `.hud-panel` found (or no ray hit): centre the building.
        wanted.current.set(place.x, 0, place.z);
      }
    } else if (nearSlow && PLACE_BY_ID[ui.near]) {
      const place = PLACE_BY_ID[ui.near];
      wanted.current.set(seal.x + NEAR_PULL * (place.x - seal.x), 0, seal.z + NEAR_PULL * (place.z - seal.z));
    } else {
      wanted.current.set(seal.x + leadSmooth.current.x, 0, seal.z + leadSmooth.current.z);
    }

    focus.current.lerp(wanted.current, damp(FOCUS_DAMP, dt));

    // Camera shake: trauma rises on a sharp impact spike and decays on its
    // own, translating the view without ever rotating it.
    const impact = seal.impact;
    const rise = impact - prevImpact.current;
    prevImpact.current = impact;
    if (reduced.current) {
      trauma.current = 0;
    } else {
      trauma.current = Math.max(0, trauma.current - TRAUMA_DECAY * dt);
      if (rise >= TRAUMA_RISE_MIN && impact >= TRAUMA_IMPACT_MIN) {
        trauma.current = Math.min(1, trauma.current + rise * TRAUMA_GAIN);
      }
    }
    if (trauma.current > 0) {
      const amp = SHAKE_AMPLITUDE * trauma.current * trauma.current;
      shake.current.set(Math.sin(t * 37.1) * amp, Math.sin(t * 29.3 + 1.3) * amp, Math.sin(t * 33.7 + 2.1) * amp);
    } else {
      shake.current.set(0, 0, 0);
    }

    camera.position.copy(OFFSET).multiplyScalar(dNow).add(focus.current).add(shake.current);
    lookAt.current.set(focus.current.x, 0.6, focus.current.z).add(shake.current);
    camera.lookAt(lookAt.current);
  });

  return null;
}
