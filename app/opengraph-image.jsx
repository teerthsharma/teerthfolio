import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { PROFILE, PLACES, ISLAND_RADIUS } from "../lib/world/places";
import { C } from "../components/world/palette";

// Static OG card in the landing site's palette (teerthsharma.github.io):
// ground/paper, ink text, blue-700 name, a hairline-bordered card holding a
// flat-shape seal-on-an-island drawing (a real mini map of PLACES, not a
// generic house). No external images; fonts are a committed Latin-only
// Instrument Sans subset, well under 200 KB each.
//
// The card itself reuses the game's own colours (components/world/palette.js)
// so the share preview doesn't contradict the island: sea for the water,
// warm-white snow for the ice, slate for the seal.

export const alt = `${PROFILE.name} — ${PROFILE.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const paper = "#fbfaf7";
const raised = "#ffffff";
const hairline = "#e5e2da";
const ink = "#1c1b19";
const muted = "#5f5b53";
const blue = "#163d9a";
const cream = "#fbf6ec";
const snow = "#fbfaf7";
const snowShadow = "#f3f1eb";
const sea = C.sea; // "#0c7490" — the game's open water, not a fabricated navy
const sealBody = "#6f7f94"; // in-game slate, contrasts against warm-white snow
const charcoal = "#2d3140";

// Mini map: scale each place's world x/z (metres, origin at island centre)
// onto the ice ellipse, leaving margin so a building's footprint stays
// inside the shoreline. +z is "down the screen" here, matching how it reads
// "further up the screen" as z shrinks (see lib/world/places.js).
const MAP_CX = 210;
const MAP_CY = 210;
const ICE_RX = 165;
const ICE_RY = 140;
const MARGIN = 0.8;
const scaleX = (ICE_RX * MARGIN) / ISLAND_RADIUS;
const scaleY = (ICE_RY * MARGIN) / ISLAND_RADIUS;
const mapPoint = (place) => ({
  x: MAP_CX + place.x * scaleX,
  y: MAP_CY + place.z * scaleY,
});

export default async function OgImage() {
  // eslint.config.js only gives Node globals to app/api/**/*.js and lib/**/*.js;
  // this file runs in the Node runtime too (Next's documented pattern for local
  // font loading in opengraph-image.jsx), so `process` is disabled per-line
  // rather than reworking a shared config file this workstream doesn't own.
  const root = process.cwd(); // eslint-disable-line no-undef
  const [bold, regular] = await Promise.all([
    readFile(join(root, "app/og-fonts/InstrumentSans-Bold.ttf")),
    readFile(join(root, "app/og-fonts/InstrumentSans-Regular.ttf")),
  ]);

  // "Seal's Topology Land" -> ["Seal’s", "Topology Land"], so the title never
  // wraps mid-word and leaves "Land" alone on its own line.
  const [titleLine1, ...titleRest] = PROFILE.title.replace("'", "’").split(" ");
  const titleLine2 = titleRest.join(" ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: paper,
          padding: 64,
          fontFamily: "Instrument Sans",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, paddingRight: 48 }}>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 4, color: muted, textTransform: "uppercase", fontWeight: 400 }}>
            Portfolio game
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 68, fontWeight: 700, color: ink, letterSpacing: -2, lineHeight: 1.08, marginTop: 18 }}>
            <div style={{ display: "flex" }}>{titleLine1}</div>
            <div style={{ display: "flex" }}>{titleLine2}</div>
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: blue, marginTop: 22 }}>{PROFILE.name}</div>
          <div style={{ display: "flex", fontSize: 22, color: muted, marginTop: 18, maxWidth: 600, fontWeight: 400 }}>
            {`${PLACES.length - 1} projects and a home, on one ice island.`}
          </div>
        </div>
        <div style={{ display: "flex", width: 420, height: 420, alignItems: "center", justifyContent: "center" }}>
          <svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
            <rect width="420" height="420" rx="28" fill={sea} stroke={hairline} strokeWidth="2" />
            <ellipse cx={MAP_CX} cy={MAP_CY} rx={ICE_RX} ry={ICE_RY} fill={snow} stroke={snowShadow} strokeWidth="3" />
            {PLACES.filter((p) => p.id !== "home").map((place) => {
              const { x, y } = mapPoint(place);
              const s = 9 + place.radius * 2.2;
              return (
                <rect
                  key={place.id}
                  x={x - s / 2}
                  y={y - s / 2}
                  width={s}
                  height={s}
                  rx={3}
                  fill={place.color}
                />
              );
            })}
            {(() => {
              const home = mapPoint(PLACES.find((p) => p.id === "home"));
              // A dome with a door, so it reads as the igloo and not as a
              // ball balanced on the seal's nose.
              return (
                <g>
                  <path d={`M ${home.x - 14} ${home.y + 5} A 14 14 0 0 1 ${home.x + 14} ${home.y + 5} Z`} fill={raised} stroke={hairline} strokeWidth="2" />
                  <path d={`M ${home.x - 4} ${home.y + 5} L ${home.x - 4} ${home.y} A 4 4 0 0 1 ${home.x + 4} ${home.y} L ${home.x + 4} ${home.y + 5} Z`} fill={charcoal} />
                </g>
              );
            })()}
            {/* soft contact shadow, seal drawn on top */}
            <ellipse cx="210" cy="272" rx="58" ry="15" fill={charcoal} opacity="0.13" />
            {/* the seal, reusing the icon's silhouette: head, snout, body, tail
                flipper — sized to read at 506px share-preview width and parked
                in front of the Igloo, near SPAWN (0,9) on the map */}
            <g transform="translate(139,150) scale(2.2)">
              <ellipse cx="35" cy="40" rx="21" ry="15" fill={sealBody} />
              <ellipse cx="54" cy="49" rx="7" ry="4" fill={sealBody} transform="rotate(15 54 49)" />
              <circle cx="17" cy="33" r="12" fill={sealBody} />
              <ellipse cx="8" cy="35" rx="5" ry="3.5" fill={cream} />
              <circle cx="13" cy="29.5" r="2.6" fill={charcoal} />
              <ellipse cx="7.5" cy="35.3" rx="1.9" ry="1.5" fill={charcoal} />
            </g>
          </svg>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Sans", data: bold, weight: 700, style: "normal" },
        { name: "Instrument Sans", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
