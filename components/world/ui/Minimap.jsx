"use client";

// The island's shape, small: every place as a tinted dot and the seal's live
// position, tap a place to go there. This is a pointer/touch convenience,
// not the accessible way to reach a place — the "Projects" list already
// gives every place a focusable, 44px, screen-reader-labelled row, so the
// map's dots stay decorative (aria-hidden) rather than promising keyboard
// reach to 22 targets a few pixels wide. Only the show/hide toggle, which a
// phone needs to get the map out of the way, is itself a real control.

import { useEffect, useRef, useState } from "react";
import { ISLAND_RADIUS, PLACES, PLACE_BY_ID } from "../../../lib/world/places";
import { live } from "../../../lib/world/store";
import { IconMap } from "./icons";

const SIZE = 168;
const CENTER = SIZE / 2;
const RIM = 72; // px, the island's rim on the map
const SCALE = RIM / ISLAND_RADIUS;
const project = (x, z) => [CENTER + x * SCALE, CENTER + z * SCALE];

export default function Minimap({ onSelect }) {
  const [open, setOpen] = useState(true);
  const sealRef = useRef(null);

  // Phones start collapsed so the map doesn't sit on top of the near-prompt;
  // desktop keeps it open (and CSS forces it open above 720px regardless).
  useEffect(() => {
    if (window.matchMedia?.("(max-width: 720px)").matches) setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let raf;
    const tick = () => {
      const [x, y] = project(live.seal.x, live.seal.z);
      sealRef.current?.setAttribute("transform", `translate(${x} ${y})`);
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
          <circle cx={CENTER} cy={CENTER} r={RIM} className="minimap-island" />
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
            <circle r={3.5} />
          </g>
        </svg>
      </div>
    </div>
  );
}
