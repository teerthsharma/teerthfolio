"use client";

// A fixed-angle follow camera, the way Bruno Simon's site frames its car: the
// view never rotates, so "up the screen" always means the same way on the
// island and the visitor never has to relearn the controls.
//
// Before the visitor starts, the camera holds a slow overview of the whole
// island; pressing a button swoops it down a curve into the follow framing
// (JUMP_IN in lib/world/moments.js), landing as the seal lands. ?play and
// ?spawn= (started at load) and reduced motion cut straight to the follow.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { ARRIVAL, JUMP_IN, RADIATION, SKIP_WINDOW, ZOOM_IN, ZOOM_OUT } from "../../lib/world/moments";
import { MOTION } from "../../lib/world/motion";
import { PLACE_BY_ID } from "../../lib/world/places";
import { getUi, live } from "../../lib/world/store";

// Direction from the seal to the camera: 42 degrees of elevation, so the
// districts ahead show, 35.5 m away. Fixed: the azimuth never rotates.
const ELEVATION = (42 * Math.PI) / 180;
const FOLLOW_DISTANCE = 35.5;
const OFFSET = new Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION)).multiplyScalar(FOLLOW_DISTANCE);
const LEAD_TIME = 0.5; // seconds of velocity the view leads by
const LEAD_Z = 1.5; // moving down the screen only: its bottom edge is just 12.4 m from the seal
const LEAD_MAX = 5.5; // m
const RIVER_LEAD = 4; // m of extra lead at full depth: riding, the view leans down the current
const LEAD_SMOOTH_DAMP = 4; // 1/s: a bump can't reverse the focus in one frame
const FOCUS_DAMP = 3.5;
const SPEED_ZOOM_DAMP = 1.5;
const USER_ZOOM_DAMP = 8;
const OPEN_ZOOM = 0.62; // the building fills the free half beside the panel
const NEAR_ZOOM = 0.93;
const NEAR_PULL = 0.35;
const PANEL_RETRY_FRAMES = 30;
const PANEL_LEFT_FRACTION = 0.4;
const PANEL_TOP_FRACTION = 0.2;
const FREE_RECT_RAISE = 0.1;
const TRAUMA_DECAY = 2.5; // 1/s
const TRAUMA_RISE_MIN = 0.12;
const TRAUMA_IMPACT_MIN = 0.3;
const TRAUMA_GAIN = 1.4;
const LANDING_TRAUMA = 0.55; // the camera's share of the seal's landing thump
const SHAKE_AMPLITUDE = 0.25; // m
// The showcase is a slow dolly round the place from a lower, heroic angle,
// aimed at the place's middle rather than the snow (the owner: "the
// cutscene doesn't focus well"): at 42 degrees looking at the ground, tall
// places were cropped and the name banner sat on top of them.
const ARRIVAL_ORBIT = 0.7; // rad the view pans round the place over the showcase
const ARRIVAL_PUSH = 0.35; // share of the distance it eases in by
const ARRIVAL_LEAN = 0.72; // the focus moves most of the way onto the place: the place is the star, the seal stays in shot
const ARRIVAL_ELEVATION = (26 * Math.PI) / 180;
const ARRIVAL_LOOK_Y = 2.2; // m: aim at the place's middle, not its foot
const RAD_CREEP = 0.06; // share the view creeps in while radiation floods it
const RAD_KICK = 0.05; // share it kicks back out at the mutation
const RAD_TRAUMA = 0.45; // the mutation's shake
const UP = new Vector3(0, 1, 0);

// The overview before Start: high over the island centre, swaying slowly.
const OVERVIEW_CENTRE = new Vector3(0, 0, -10);
const OVERVIEW_DISTANCE = 150;
const OVERVIEW_ELEVATION = (52 * Math.PI) / 180;
const OVERVIEW_SWAY = 0.2; // rad either side
const OVERVIEW_PERIOD = 70; // s
const SWOOP_SWING = 18; // m sideways the curve bows out, so the dive reads as a swoop

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

export default function CameraRig() {
  const { camera, size } = useThree();
  const focus = useRef(new Vector3(live.seal.x, 0, live.seal.z));
  const wanted = useRef(new Vector3());
  const lead = useRef(new Vector3());
  const leadSmooth = useRef(new Vector3());
  const lookAt = useRef(new Vector3());
  const followPos = useRef(new Vector3());
  const followLook = useRef(new Vector3());
  const shake = useRef(new Vector3());
  const groundHit = useRef(new Vector3());
  const ndc = useRef(new Vector2());
  const raycaster = useRef(new Raycaster());
  const groundPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  // The swoop: where it left from, and the control point of its curve.
  const swoop = useRef({ t0: -1, landed: true, from: new Vector3(), fromLook: new Vector3(), ctrl: new Vector3() });
  const started = useRef(null); // ui.started last frame; null before the first frame
  const firstFrame = useRef(null);
  const fog = useRef({ fog: null, near: 0, far: 0 });

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
  const userZoom = useRef(live.zoom);

  const trauma = useRef(0);
  const orbit = useRef(new Vector3());
  const radKicked = useRef(-100);
  const prevImpact = useRef(live.seal.impact);

  // The open building's panel: looked up by class each time `open` changes
  // (it mounts after the state change) and again on resize, retried for a
  // few frames since it is not there yet on the first one.
  const panel = useRef({ id: null, el: null, tries: 0, rect: null, full: null });
  // For capture probes: project a place to screen pixels.
  useEffect(() => {
    window.__world = { ...(window.__world || {}), camera };
  }, [camera]);

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
    if (firstFrame.current === null) firstFrame.current = t;
    const aspect = size.width / size.height;
    // Portrait screens see a sliver of the island at the desktop distance, so
    // pull back a little: not all the way to the desktop width, or the seal
    // shrinks to a speck on a phone.
    const pull = clamp(1.2 / aspect, 1, 1.5);

    // The jump-in: started turning true from a button swoops; at load (?play,
    // ?spawn=) or with reduced motion it cuts.
    let cut = false;
    if (started.current === null) started.current = ui.started;
    if (ui.started && !started.current) {
      if (reduced.current || t - firstFrame.current < SKIP_WINDOW) {
        cut = true;
      } else {
        const s = swoop.current;
        s.t0 = t;
        s.landed = false;
        s.from.copy(camera.position);
        s.fromLook.copy(lookAt.current);
      }
    }
    started.current = ui.started;

    const speedZoomTarget = reduced.current
      ? 1
      : 1 + 0.1 * clamp(seal.speed / MOTION.maxSpeed, 0, 1) + 0.06 * (live.boost && seal.throttle ? 1 : 0);
    speedZoom.current += (speedZoomTarget - speedZoom.current) * damp(SPEED_ZOOM_DAMP, dt);
    userZoom.current += (live.zoom - userZoom.current) * damp(USER_ZOOM_DAMP, dt);

    // ZOOM_IN / ZOOM_OUT: the push toward an opened building and the ease
    // back, each reaching 95% within its moment's duration.
    const nearSlow = ui.near && seal.speed < 2;
    const modeZoomTarget = ui.open ? OPEN_ZOOM : nearSlow ? NEAR_ZOOM : 1;
    const modeRate = 3 / (modeZoomTarget < modeZoom.current ? ZOOM_IN.duration : ZOOM_OUT.duration);
    modeZoom.current += (modeZoomTarget - modeZoom.current) * damp(modeRate, dt);

    // THE ARRIVAL (moments.js): 0 -> 1 -> 0 over the moment; the view leans
    // toward the place, swings round it and eases in, then settles back.
    const arrival = live.arrival;
    const cutU = clamp((t - arrival.start) / ARRIVAL.duration, 0, 1);
    const cutK = !reduced.current && arrival.id && PLACE_BY_ID[arrival.id] ? Math.sin(Math.PI * cutU) ** 0.6 : 0;
    // THE RADIATION beat (moments.js): the view creeps in while the area's
    // radiation floods it, then kicks back out at the mutation.
    const radSince = t - live.rad.start;
    const creep = live.rad.id && radSince >= 0 && radSince < RADIATION.mutateAt ? radSince / RADIATION.mutateAt : 0;
    const kick = radSince >= RADIATION.mutateAt && radSince < RADIATION.mutateAt + 0.45 ? Math.sin((Math.PI * (radSince - RADIATION.mutateAt)) / 0.45) : 0;
    const radZoom = reduced.current ? 1 : 1 - RAD_CREEP * creep + RAD_KICK * kick;

    const dNow = pull * zoom.current * userZoom.current * speedZoom.current * modeZoom.current * (1 - ARRIVAL_PUSH * cutK) * radZoom;
    const dTarget = pull * zoom.current * live.zoom * speedZoomTarget * modeZoomTarget;

    lead.current.set(seal.vx * LEAD_TIME, 0, seal.vz * LEAD_TIME * (seal.vz > 0 ? LEAD_Z : 1));
    const leadLen = lead.current.length();
    const leadMax = LEAD_MAX + RIVER_LEAD * (seal.water || 0);
    if (leadLen > leadMax) lead.current.multiplyScalar(leadMax / leadLen);
    // A bump reverses seal velocity in one frame; smoothing the lead
    // separately from focus.lerp keeps that reversal from snapping the view.
    leadSmooth.current.lerp(lead.current, damp(LEAD_SMOOTH_DAMP, dt));

    // Where the view is heading, strongest mode first.
    if (ui.open && PLACE_BY_ID[ui.open]) {
      const place = PLACE_BY_ID[ui.open];
      if (panel.current.id !== ui.open) panel.current = { id: ui.open, el: null, tries: 0, rect: null, full: null };
      if (!panel.current.el && panel.current.tries < PANEL_RETRY_FRAMES) {
        // Not plain `.sheet`: the list and the project panel share the Sheet
        // shell, so the first match could be the closed list.
        const el = document.querySelector('.hud-panel, .sheet[data-state="open"]');
        if (el) panel.current.el = el;
        else panel.current.tries += 1;
      }
      const el = panel.current.el;
      let ground = null;
      if (el) {
        // On phones the sheet rests half-open via a CSS transform, so
        // offsetTop/offsetLeft (below) read where it would sit before that
        // transform. Measure the real rect once its slide has settled, and
        // again after a resize (onResize clears it) or a drag to full height.
        if (panel.current.full !== el.dataset.full) {
          panel.current.full = el.dataset.full;
          panel.current.rect = null;
        }
        if (!panel.current.rect && el.getAnimations().length === 0) panel.current.rect = el.getBoundingClientRect();
        const w = size.width;
        const h = size.height;
        // Until then (and on desktop, where the resting sheet has no
        // transform and .hud is a fixed full-viewport box, so the two agree)
        // offsetLeft/offsetTop are a fine estimate.
        const rect = panel.current.rect;
        const pl = rect ? rect.left : el.offsetLeft;
        const pt = rect ? rect.top : el.offsetTop;
        let fw = w;
        let fh = h;
        if (pl > PANEL_LEFT_FRACTION * w) fw = pl;
        else if (pt > PANEL_TOP_FRACTION * h) fh = pt;
        const px = fw / 2;
        const py = fh / 2 - FREE_RECT_RAISE * fh;
        ndc.current.set((px / w) * 2 - 1, -(py / h) * 2 + 1);
        raycaster.current.setFromCamera(ndc.current, camera);
        ground = raycaster.current.ray.intersectPlane(groundPlane.current, groundHit.current);
      }
      if (ground && ui.started) {
        const scale = dTarget / (dNow || 1e-6);
        wanted.current.set(
          place.x - (ground.x - focus.current.x) * scale,
          0,
          place.z - (ground.z - focus.current.z) * scale
        );
      } else {
        // No panel found (or no ray hit, or the overview is up): centre it.
        wanted.current.set(place.x, 0, place.z);
      }
    } else if (nearSlow && PLACE_BY_ID[ui.near]) {
      const place = PLACE_BY_ID[ui.near];
      wanted.current.set(seal.x + NEAR_PULL * (place.x - seal.x), 0, seal.z + NEAR_PULL * (place.z - seal.z));
    } else {
      wanted.current.set(seal.x + leadSmooth.current.x, 0, seal.z + leadSmooth.current.z);
    }

    if (cutK > 0) {
      const place = PLACE_BY_ID[arrival.id];
      wanted.current.x += (place.x - wanted.current.x) * ARRIVAL_LEAN * cutK;
      wanted.current.z += (place.z - wanted.current.z) * ARRIVAL_LEAN * cutK;
    }

    if (cut) focus.current.copy(wanted.current);
    else focus.current.lerp(wanted.current, damp(FOCUS_DAMP, dt));

    // Camera shake: trauma rises on a sharp impact spike and decays on its
    // own, translating the view without ever rotating it.
    const impact = seal.impact;
    const rise = impact - prevImpact.current;
    prevImpact.current = impact;
    const s = swoop.current;
    const since = t - s.t0;
    if (reduced.current) {
      trauma.current = 0;
    } else {
      trauma.current = Math.max(0, trauma.current - TRAUMA_DECAY * dt);
      if (rise >= TRAUMA_RISE_MIN && impact >= TRAUMA_IMPACT_MIN) {
        trauma.current = Math.min(1, trauma.current + rise * TRAUMA_GAIN);
      }
      if (!s.landed && since >= JUMP_IN.landAt) trauma.current = Math.max(trauma.current, LANDING_TRAUMA);
      if (live.rad.id && radSince >= RADIATION.mutateAt && radKicked.current !== live.rad.start) {
        radKicked.current = live.rad.start;
        trauma.current = Math.max(trauma.current, RAD_TRAUMA);
      }
    }
    if (!s.landed && since >= JUMP_IN.landAt) s.landed = true;
    if (trauma.current > 0) {
      const amp = SHAKE_AMPLITUDE * trauma.current * trauma.current;
      shake.current.set(Math.sin(t * 37.1) * amp, Math.sin(t * 29.3 + 1.3) * amp, Math.sin(t * 33.7 + 2.1) * amp);
    } else {
      shake.current.set(0, 0, 0);
    }

    const elevation = ELEVATION + (ARRIVAL_ELEVATION - ELEVATION) * cutK;
    orbit.current.set(0, Math.sin(elevation), Math.cos(elevation)).multiplyScalar(FOLLOW_DISTANCE).applyAxisAngle(UP, ARRIVAL_ORBIT * cutK * (cutU - 0.5));
    followPos.current.copy(orbit.current).multiplyScalar(dNow).add(focus.current).add(shake.current);
    followLook.current.set(focus.current.x, 0.6 + (ARRIVAL_LOOK_Y - 0.6) * cutK, focus.current.z).add(shake.current);

    if (!ui.started) {
      // The overview: the whole island and the sea round it.
      const az = reduced.current ? 0 : OVERVIEW_SWAY * Math.sin((t / OVERVIEW_PERIOD) * Math.PI * 2);
      const d = OVERVIEW_DISTANCE * pull;
      const flat = Math.cos(OVERVIEW_ELEVATION) * d;
      camera.position.set(
        OVERVIEW_CENTRE.x + Math.sin(az) * flat,
        OVERVIEW_CENTRE.y + Math.sin(OVERVIEW_ELEVATION) * d,
        OVERVIEW_CENTRE.z + Math.cos(az) * flat
      );
      lookAt.current.copy(OVERVIEW_CENTRE);
    } else if (since < JUMP_IN.duration) {
      // The swoop: a quadratic curve that dives first (down and out to the
      // side), then glides in level behind the seal.
      const e = easeInOut(clamp(since / JUMP_IN.duration, 0, 1));
      const a = s.from;
      const b = followPos.current;
      const c = s.ctrl.set(b.x + SWOOP_SWING, b.y + 0.3 * (a.y - b.y), a.z);
      const k0 = (1 - e) * (1 - e);
      const k1 = 2 * (1 - e) * e;
      const k2 = e * e;
      camera.position.set(
        a.x * k0 + c.x * k1 + b.x * k2,
        a.y * k0 + c.y * k1 + b.y * k2,
        a.z * k0 + c.z * k1 + b.z * k2
      );
      lookAt.current.lerpVectors(s.fromLook, followLook.current, e);
    } else {
      camera.position.copy(followPos.current);
      lookAt.current.copy(followLook.current);
    }
    camera.lookAt(lookAt.current);

    // Fog is tuned for the follow distance; push it back by however much
    // farther the camera stands (overview, swoop, zoomed out) so the island
    // does not fade to sky.
    const sceneFog = state.scene.fog;
    if (sceneFog?.isFog) {
      const f = fog.current;
      if (f.fog !== sceneFog) {
        f.fog = sceneFog;
        f.near = sceneFog.near;
        f.far = sceneFog.far;
      }
      const extra = Math.max(0, camera.position.distanceTo(lookAt.current) - FOLLOW_DISTANCE * pull);
      sceneFog.near = f.near + extra;
      sceneFog.far = f.far + extra;
      if (camera.far < f.far + extra) {
        camera.far = f.far + extra;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
