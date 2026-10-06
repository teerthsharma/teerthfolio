// SEA (bible 3.2, frame 06): #0a7fb4 shallow to #0b5f9a deep in three FLAT bands, a white foam rim #e8f6ff hugging the quay and the headland,
// hard white-cyan streak strokes redrawn on threes, no fbm sheen. Layer 1 (animated); the world freeze stops the streaks.
// Maths:
//   shallowness s = smoothstep(0, 16, min(sdQuay, sdIsland)); bands: celSteps(s, 3) -> base = mix(#0a7fb4, #0b5f9a, bands).
//   sdQuay = signed distance to the 22 x 24 m deck rectangle (half extents 11, 12); sdIsland = ellipse field round the cliff foot at
//     (0, -96) with radii (74, 30): (|(p - c)/r| - 1) min(r).
//   foam rim: sd < 0.45 + 0.35 vn(p 1.3) + 0.18 sin(3.1 p.x + 6 phase) -> #e8f6ff. phase = floor(uTw 8) (threes), so the lap redraws on threes.
//   streaks: cell = floor((0.16 x + 0.37 phase, 0.85 z)); present when h21(cell) > 0.80; stroke = |fract(z') - 0.5| < 0.05 + 0.05 h and
//     fract(x') in (0.12, 0.88): a hard rectangle, 4 to 8 px tall at the wide. Colour #bff4ff.
//   far haze: c = mix(c, #7fc8e8 -> #bfe6ff, smoothstep(110, 380, dist)) so the plane meets the dome horizon without a seam.
import { PlaneGeometry } from "three";
import { C, V, mat, part } from "./common.js";

const SEA = /* glsl */ `
  float sdBox2(vec2 p, vec2 h) { vec2 d = abs(p) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  vec3 shade(vec3 P, vec3 N, vec3 V) {
    float edge = revealEdge(P);
    float phase = floor(uTw * 8.0);
    float sdQ = sdBox2(P.xz, vec2(11.0, 12.0));
    float sdI = (length((P.xz - vec2(0.0, -96.0)) / vec2(74.0, 30.0)) - 1.0) * 30.0;
    float sd = min(sdQ, sdI);
    float s = smoothstep(0.0, 16.0, sd);
    float bands = celSteps(s, 3.0);
    vec3 c = mix(${V(C.seaA)}, ${V(C.seaB)}, bands);
    // a second, darker current band so the deep water reads as paint strokes, not a flat plane
    float cur = celStep(vn(P.xz * vec2(0.06, 0.11) + phase * 0.02), 0.62);
    c = mix(c, c * vec3(0.92, 0.94, 1.0), cur * 0.5);
    float foamK = 0.45 + 0.35 * vn(P.xz * 1.3) + 0.18 * sin(3.1 * P.x + 6.0 * phase);
    float foam = 1.0 - celStep(sd, foamK);
    vec2 q = vec2(P.x * 0.16 + phase * 0.37, P.z * 0.85);
    vec2 cell = floor(q), f = fract(q);
    float hh = h21(cell);
    float stroke = step(0.80, hh) * step(abs(f.y - 0.5), 0.05 + 0.05 * hh) * step(0.12, f.x) * step(f.x, 0.88);
    c = mix(c, ${V(C.seaStreak)}, stroke * 0.9);
    c = mix(c, ${V(C.foam)}, foam);
    float dist = length(P.xz - cameraPosition.xz);
    c = mix(c, mix(${V("#7fc8e8")}, ${V(C.dayHorizon)}, smoothstep(220.0, 380.0, dist)), smoothstep(110.0, 380.0, dist));
    c += ${V(C.rim)} * 0.12 * uStrike * step(0.5, h21(cell + 7.0));
    c = finishW(c, P, 0.0);
    return withEdge(c, edge);
  }`;

export function buildSea(ctx, U) {
  const geo = part(new PlaneGeometry(760, 760, 96, 96).rotateX(-Math.PI / 2).translate(0, -1.2, -60), C.seaA, 0);
  const material = mat(ctx, U, SEA, { id: 0.99 });
  const mesh = new ctx.THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.userData.layer = 1; // animated (streaks on threes)
  return { mesh, dispose() { geo.dispose(); material.dispose(); } };
}
