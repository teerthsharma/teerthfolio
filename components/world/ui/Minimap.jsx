"use client";

// The island's shape, small: every district tinted, the river and moat as
// water, every place as a dot, and the seal's live position and heading.
// Tap a place to go there — a pointer/touch convenience, not the accessible
// way to reach one; the "Projects" list already gives every place a
// focusable, 44px, screen-reader-labelled row, so the map's dots stay
// decorative (aria-hidden) rather than promising keyboard reach to 22
// targets a few pixels wide. Only the show/hide toggle, which a phone needs
// to get the map out of the way, is itself a real control.

import { useEffect, useRef, useState } from "react";
import { HIGHWAY } from "../../../lib/world/land";
import { DISTRICTS, ISLAND_RADIUS, PLACES, PLACE_BY_ID } from "../../../lib/world/places";
import { WATERS } from "../../../lib/world/river";
import { live } from "../../../lib/world/store";
import { IconMap } from "./icons";

// The design size; CSS scales the rendered box up above 720px (the viewBox
// stays this, so the seal dot and strokes scale with it, not separately).
const SIZE = 168;
const CENTER = SIZE / 2;
const RIM = 80; // px, the island's rim on the map: a square game map, sea to its edges
const SCALE = RIM / ISLAND_RADIUS;
const MOVE_EPS = 0.05; // m: skip the DOM write below this — the seal is still
const project = (x, z) => [CENTER + x * SCALE, CENTER + z * SCALE];
const waterPoints = (points) => points.map(([x, z]) => project(x, z).join(",")).join(" ");

export default function Minimap({ onSelect }) {
  const [open, setOpen] = useState(true);
  const sealRef = useRef(null);
  const last = useRef({ x: Infinity, z: Infinity }); // forces the first tick to draw

  // Phones start collapsed so the map doesn't sit on top of the near-prompt;
  // desktop keeps it open (and CSS forces it open above 720px regardless).
  useEffect(() => {
    if (window.matchMedia?.("(max-width: 720px)").matches) setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let raf;
    const tick = () => {
      const { x, z, heading } = live.seal;
      if (Math.hypot(x - last.current.x, z - last.current.z) >= MOVE_EPS) {
        last.current = { x, z };
        const [px, py] = project(x, z);
        // The map shares the world's own XZ axes (no flip), so a forward
        // vector of (sin h, cos h) turns into an SVG rotation of -h.
        const deg = (-heading * 180) / Math.PI;
        sealRef.current?.setAttribute("transform", `translate(${px} ${py}) rotate(${deg})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return (
    <div className="minimap" data-open={open}>
      <button
        type="button"
        className="minimap-toggle"
        aria-expanded={open}
        aria-label={open ? "Hide map" : "Show map"}
        onClick={() => setOpen((o) => !o)}
      >
        <IconMap />
      </button>
      <div className="minimap-panel">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden="true">
          <rect width={SIZE} height={SIZE} className="minimap-sea" />
          <circle cx={CENTER} cy={CENTER} r={RIM} className="minimap-island" />
          {DISTRICTS.map((d) => {
            const [x, y] = project(d.x, d.z);
            return (
              <circle
                key={d.id}
                cx={x}
                cy={y}
                r={d.radius * SCALE}
                className="minimap-district"
                style={{ "--accent": d.radiation ?? d.color }}
              />
            );
          })}
          {WATERS.map((line, i) => (
            <polyline
              key={i}
              points={waterPoints(line.points)}
              className="minimap-water"
              style={{ strokeWidth: (line.width ?? 8) * SCALE }}
            />
          ))}
          {HIGHWAY.legs.map((leg, i) => (
            <polyline key={`hw${i}`} points={waterPoints(leg)} className="minimap-road" style={{ strokeWidth: HIGHWAY.width * SCALE }} />
          ))}
          <circle cx={project(HIGHWAY.roundabout.x, 0)[0]} cy={project(0, HIGHWAY.roundabout.z)[1]} r={HIGHWAY.roundabout.radius * SCALE} className="minimap-road" style={{ strokeWidth: HIGHWAY.roundabout.width * SCALE }} />
          {PLACES.filter((p) => p.id !== "home").map((place) => {
            const [x, y] = project(place.x, place.z);
            const tint = place.district?.radiation ?? place.district?.color;
            return (
              <circle
                key={place.id}
                cx={x}
                cy={y}
                r={4.5}
                tabIndex={-1}
                className="minimap-dot"
                data-tinted={Boolean(tint)}
                style={{ "--accent": place.color, ...(tint ? { "--ring": tint } : null) }}
                onClick={() => onSelect(place)}
              />
            );
          })}
          {(() => {
            const home = PLACE_BY_ID.home;
            const [x, y] = project(home.x, home.z);
            return (
              <circle cx={x} cy={y} r={6} tabIndex={-1} className="minimap-home" onClick={() => onSelect(home)} />
            );
          })()}
          <g ref={sealRef} className="minimap-seal">
            <circle r={5} className="minimap-seal-ring" />
            <path d="M0 9L-3 3L3 3Z" className="minimap-seal-heading" />
            <circle r={3.5} className="minimap-seal-dot" />
          </g>
        </svg>
      </div>
    </div>
  );
}
