"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { POST_PROCESS_BUDGET } from "../lib/polar-art-direction";
import { motionWarpFromVelocity } from "../lib/polar-world-cadence";

export const GLOBAL_ANIME_POST_PROFILE =
  "anime-soft depth pixel fog: camera-motion fisheye, linear depth, bounded luma/depth edge confidence, chromatic edge AA, toon quantization, stable dither, indigo ink, static scanline, wide vignette, tiered paper contrast grade; polar-dusk cinematic finish: soft-knee dual-radius thresholded highlight glow, toe-guarded filmic S-curve, anchor-sparing midtone vibrance band, teal-shadow warm-highlight split tone, warm-lifted vignette, luminance-weighted grain, sky-sparing depth-keyed aerial separation, cool-near-black point and headroom-proportional highlight shoulder";
export const GLOBAL_RETRO_POST_PROFILE = GLOBAL_ANIME_POST_PROFILE;
export const POINTER_VISUAL_EFFECTS = "none";

const qualityBudget = POST_PROCESS_BUDGET;

// Local cinematic layer tuned per quality tier, stacked on top of the frozen
// POST_PROCESS_BUDGET without changing how that budget is consumed.
// SHADER LAW 1: the camera-space layer is a whisper. Everything that reads as
// dirt on the glass (grain, screen snow, heavy vignette) is floored so the
// frame looks like a place, not a filtered image. Only bloom and the colour
// grade survive at strength, and bloom is threshold-gated to real highlights.
// Liveliness belongs to the world (sky aurora sector + cloud drift), not here.
//
// COLOUR IS TIER-INVARIANT; ONLY COST IS TIERED. vignette, grain and bloom stay
// per-tier because they are the three that cost fill or that a weak machine
// cannot afford. The three that decide what colour the world IS — sCurve,
// vibrance, splitTone — are one value across all three tiers on purpose. They are
// pure ALU on a pass every tier already runs, so tiering them buys no frames, and
// the measured convergence this world holds (118.2/122.2/120.0 whole-frame luma
// low/medium/high at the same station) took three iterations to find last time.
// Three more knobs that differ by tier is three more ways to lose it for nothing.
const CINEMATIC_GRADE = Object.freeze({
  low: Object.freeze({ vignette: 0.05, grain: 0, bloom: 0, sCurve: 0.34, vibrance: 0.28, splitTone: 0.2, snow: 0 }),
  medium: Object.freeze({ vignette: 0.06, grain: 0.01, bloom: 0.38, sCurve: 0.34, vibrance: 0.28, splitTone: 0.2, snow: 0 }),
  high: Object.freeze({ vignette: 0.07, grain: 0.012, bloom: 0.5, sCurve: 0.34, vibrance: 0.28, splitTone: 0.2, snow: 0 }),
});

const VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform float uCameraNear;
uniform float uCameraFar;
uniform float uTime;
uniform float uPixelSize;
uniform float uFisheyeStrength;
uniform float uMotionFisheye;
uniform vec2 uMotionVector;
uniform float uChromaticStrength;
uniform float uInkStrength;
uniform float uScanlineStrength;
uniform float uQuantizeStrength;
uniform float uSharpen;
uniform float uGradeBase;
uniform float uGradeCurve;
uniform float uShadowSeparation;
uniform float uVignetteStrength;
uniform float uGrainStrength;
uniform float uBloomStrength;
uniform float uSCurveStrength;
uniform float uVibranceStrength;
uniform float uSplitToneStrength;
uniform float uSnowStrength;
uniform float uExposureBreath;

varying vec2 vUv;

float animeLuminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

vec3 paperShadowSeparation(vec3 color) {
  float gradedLuma = animeLuminance(color);
  float shadowMask = 1.0 - smoothstep(0.18, 0.46, gradedLuma);
  float highlightMask = smoothstep(0.58, 0.88, gradedLuma);
  float gradeGain = 1.0 - shadowMask * uShadowSeparation
    + highlightMask * uShadowSeparation * 0.12;
  return color * gradeGain;
}

float interleavedGradientNoise(vec2 pixel, float seed) {
  vec2 seededPixel = pixel + vec2(seed * 0.754877666, seed * 0.569840296);
  return fract(52.9829189 * fract(dot(seededPixel, vec2(0.06711056, 0.00583715))));
}

float perspectiveDepthToViewZ(float invClipZ, float near, float far) {
  return (near * far) / ((far - near) * invClipZ - far);
}

float viewZToOrthographicDepth(float viewZ, float near, float far) {
  return (viewZ + near) / (near - far);
}

float readLinearDepth(vec2 uv) {
  float fragCoordZ = texture2D(tDepth, clamp(uv, 0.001, 0.999)).x;
  float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
  return clamp(viewZToOrthographicDepth(viewZ, uCameraNear, uCameraFar), 0.0, 1.0);
}

vec2 fisheyeUv(vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  centered *= 1.0 + (uFisheyeStrength + uMotionFisheye) * dot(centered, centered);
  return centered * 0.5 + 0.5 + uMotionVector;
}

float lumaEdgeConfidence(vec2 uv, vec2 texel) {
  float center = animeLuminance(texture2D(tDiffuse, uv).rgb);
  float left = animeLuminance(texture2D(tDiffuse, clamp(uv - vec2(texel.x, 0.0), 0.001, 0.999)).rgb);
  float right = animeLuminance(texture2D(tDiffuse, clamp(uv + vec2(texel.x, 0.0), 0.001, 0.999)).rgb);
  float down = animeLuminance(texture2D(tDiffuse, clamp(uv - vec2(0.0, texel.y), 0.001, 0.999)).rgb);
  float up = animeLuminance(texture2D(tDiffuse, clamp(uv + vec2(0.0, texel.y), 0.001, 0.999)).rgb);
  float contrast = max(abs(right - left), abs(up - down));
  return smoothstep(0.018, 0.11, max(contrast, abs(center - (left + right + down + up) * 0.25)));
}

float depthEdgeConfidence(vec2 uv, vec2 texel) {
  float center = readLinearDepth(uv);
  float edge = 0.0;
  edge = max(edge, abs(center - readLinearDepth(uv + vec2(texel.x, 0.0))));
  edge = max(edge, abs(center - readLinearDepth(uv - vec2(texel.x, 0.0))));
  edge = max(edge, abs(center - readLinearDepth(uv + vec2(0.0, texel.y))));
  edge = max(edge, abs(center - readLinearDepth(uv - vec2(0.0, texel.y))));
  return smoothstep(0.0015, 0.018, edge);
}

float gaussianEdgeConfidence(vec2 uv, vec2 texel) {
  // Five-tap Gaussian approximation keeps the hand-drawn edge response
  // stable while avoiding a second post-processing pass.
  float center = animeLuminance(texture2D(tDiffuse, uv).rgb);
  float cross = 0.0;
  cross += animeLuminance(texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).rgb);
  cross += animeLuminance(texture2D(tDiffuse, uv - vec2(texel.x, 0.0)).rgb);
  cross += animeLuminance(texture2D(tDiffuse, uv + vec2(0.0, texel.y)).rgb);
  cross += animeLuminance(texture2D(tDiffuse, uv - vec2(0.0, texel.y)).rgb);
  return smoothstep(0.012, 0.09, abs(center - cross * 0.25));
}

vec3 chromaticEdgeAA(vec2 uv, vec2 texel, float edgeConfidence, float outerScreenMask) {
  vec2 fromCenter = uv - 0.5;
  vec2 radial = fromCenter / max(length(fromCenter), 0.0001);
  vec2 chromaOffset = radial * texel * uChromaticStrength * edgeConfidence * outerScreenMask;
  vec3 center = texture2D(tDiffuse, uv).rgb;
  vec3 chromatic = vec3(
    texture2D(tDiffuse, clamp(uv + chromaOffset, 0.001, 0.999)).r,
    center.g,
    texture2D(tDiffuse, clamp(uv - chromaOffset, 0.001, 0.999)).b
  );
  vec3 neighborAverage = (
    texture2D(tDiffuse, clamp(uv + vec2(texel.x, 0.0), 0.001, 0.999)).rgb +
    texture2D(tDiffuse, clamp(uv - vec2(texel.x, 0.0), 0.001, 0.999)).rgb +
    texture2D(tDiffuse, clamp(uv + vec2(0.0, texel.y), 0.001, 0.999)).rgb +
    texture2D(tDiffuse, clamp(uv - vec2(0.0, texel.y), 0.001, 0.999)).rgb
  ) * 0.25;
  float neighborAABlend = min(edgeConfidence * 0.18, 0.18);
  return mix(chromatic, neighborAverage, neighborAABlend);
}

vec3 toonQuantize(vec3 color) {
  float luma = max(animeLuminance(color), 0.001);
  float luminanceBand = floor(clamp(luma, 0.0, 0.9999) * 10.0) / 10.0;
  vec3 banded = clamp(color * (luminanceBand / luma), 0.0, 1.0);
  vec3 channelQuantized = floor(banded * 24.0 + 0.5) / 24.0;
  return mix(color, channelQuantized, uQuantizeStrength);
}

vec3 filmicSCurve(vec3 color) {
  // Smoothstep S-curve, toe-guarded. The guard fades the curve out below ~0.16
  // luma so the darkest dusk shadows keep their detail instead of compressing
  // toward the floor.
  //
  // The strength this ships at is 0.34, not the 0.06 it was authored with. 0.06
  // is a 3% steepening at the pivot (slope 1.03 against smoothstep's 1.5) — a
  // curve nobody can see, which is the same thing as no curve, and it is most of
  // why the world's final colour statement read as neutral rather than as a
  // decision. 0.34 puts the pivot slope at 1.17. The shoulder is what makes that
  // affordable: d/dx of smoothstep is 6x(1-x), which falls to zero at white, so
  // the curve compresses the top end while lifting it and cannot walk highlights
  // into the clip the way a straight contrast multiply would.
  vec3 curved = color * color * (3.0 - 2.0 * color);
  float toeGuard = smoothstep(0.035, 0.16, animeLuminance(color));
  return mix(color, curved, uSCurveStrength * toeGuard);
}

vec3 midtoneVibrance(vec3 color) {
  // A vibrance BAND, not a saturation knob, and here that is a constraint rather
  // than a preference.
  //
  // The polar colour contract requires >=35% of every frame to be low-saturation
  // high-luma snow (saturation <= 0.28, luma >= 100), and the tightest station
  // clears it by half a point. A flat saturate multiplies the chroma of every one
  // of those anchor pixels and walks the pool straight over the ceiling — the
  // failure would land on the one measurement that keeps this world reading as
  // snow rather than as a colour wash. A photographic vibrance is worse still,
  // not better: it weights its lift by (1 - saturation), so it lifts the anchors
  // HARDEST and leaves the saturated station accents alone, which is exactly
  // backwards for this frame.
  //
  // So the lift is a band whose lower edge sits above the anchor ceiling. Every
  // pixel at or below 0.30 saturation returns bit-identical, which makes the
  // anchor ratio arithmetically incapable of falling because of this term — not
  // unlikely to, incapable. The upper edge rolls back off before the aurora and
  // the station accents, which are already the most saturated things in the world
  // and do not need help to clip.
  //
  // Luma-preserving by construction: mix(vec3(L), c, 1 + k) = L + (1 + k)(c - L),
  // and since dot(c - L, luma weights) is zero by definition of L, the result
  // carries L unchanged whatever k is. This moves chroma only, so it cannot cost
  // the 108 mean-luma floor a single point.
  float peak = max(color.r, max(color.g, color.b));
  float saturation = (peak - min(color.r, min(color.g, color.b))) / max(peak, 0.0001);
  float band = smoothstep(0.30, 0.48, saturation) * (1.0 - smoothstep(0.66, 0.95, saturation));
  return max(
    mix(vec3(animeLuminance(color)), color, 1.0 + uVibranceStrength * band),
    vec3(0.0)
  );
}

vec3 duskSplitTone(vec3 color) {
  // Shadows drift toward #2C3F66 twilight blue, highlights toward #F5C98A
  // low-sun amber. Tint ratios are luma-normalized (0.2126*1.19 + 0.7152*0.977 +
  // 0.0722*0.671 = 1.000, and the same for the shadow triple) so this is a hue
  // decision and never an exposure one — which is the only reason it can be run
  // at a strength that reads without arguing with the mean-luma floor.
  //
  // The highlight mask opens at 0.40 rather than 0.55. That threshold is the
  // difference between a split tone the frame HAS and one it SHOWS: this world is
  // mostly snowfield, the snowfield sits at 0.45-0.70 graded luma, and a mask
  // that only starts at 0.55 warmed the sky and the specular tops while leaving
  // the surface the world is made of on the cool side of the split. Measured at
  // the observatory before this, highlight R-B was +11.6 against a shadow -37.8;
  // at two of the three probe stations the highlight decile was NEGATIVE, i.e.
  // the "warm highlights" existed in the source and not in the picture.
  //
  // THE TWO HALVES ARE NOT THE SAME STRENGTH, and that asymmetry is the gap-3
  // lever rather than a taste. Measured across four stations, 63-80% of every
  // frame's chroma still sits in three adjacent 10-degree bins, all of them the
  // world's ambient 200-240 blue. The shadow half of a symmetric split is a
  // CONTRIBUTOR to that: at 0.2 its tint resolves to (0.942, 1.004, 1.130), which
  // manufactures 0.166 of pure blue saturation on a neutral shadow pixel — the
  // grade adding chroma to the exact hue bin the frame already has too much of.
  // The scene supplies its own cool: shadow (R-B) measures -28 to -55 at the four
  // stations, so the shadows stay unambiguously cool at 0.8 and the frame spends
  // less of its chroma budget on the hue it is already drowning in.
  //
  // The highlight half takes the surplus at 2.2, and it is the only instrument
  // in this pass that can reach the surface the world is mostly made of. The
  // vibrance band above deliberately starts at 0.30 saturation so it cannot touch
  // an anchor pixel — which also means it cannot touch SNOW, whose saturation is
  // 0.10-0.15, so at the observatory it does precisely nothing. Measured there,
  // whole-frame saturation came out 0.157 against the contract's 0.18 floor: the
  // frame is 72.8% near-neutral against a 35% requirement, i.e. far too neutral
  // rather than too colourful, and warming its bright snow is the one lever that
  // moves it.
  //
  // The anchor does not bound this the way it looks like it should, and the
  // measurement is worth keeping because it is counter-intuitive. Warm tint on
  // BLUE snow does not add saturation, it cancels it — the tint's hue opposes the
  // pixel's, so saturation falls before it rises again on the far side of
  // neutral. Raising this multiplier to 1.45 moved qpu-ice-bridge, the tightest
  // anchor in the camp, from 7.2pt of margin to 10.1pt. The stations this term
  // saturates are the ones already warm, and those are the ones with 20-38pt to
  // spend.
  //
  // The highlight mask opens at 0.26, one step further down the same road that
  // took it from 0.55 to 0.40. At 0.40 the warm tint reached the top decile and
  // stopped: measured at the observatory, highlight (R-B) was a healthy +27.7
  // while whole-frame saturation sat at 0.157, because the decile is a tenth of
  // the frame and the other nine tenths are mid snow the mask never opened on.
  // Raising the multiplier against a mask that is zero where the pixels are
  // bought +0.001 — the term was strong in a place the frame barely has.
  float splitLuma = animeLuminance(color);
  float splitShadowMask = 1.0 - smoothstep(0.06, 0.46, splitLuma);
  float splitHighlightMask = smoothstep(0.26, 0.78, splitLuma);
  vec3 shadowTinted = color * vec3(0.712, 1.02, 1.651);
  vec3 highlightTinted = color * vec3(1.19, 0.977, 0.671);
  color = mix(color, shadowTinted, splitShadowMask * uSplitToneStrength * 0.8);
  return mix(color, highlightTinted, min(splitHighlightMask * uSplitToneStrength * 1.8, 1.0));
}

// The colour the deepest end of the histogram lands on: #0E111B, luma 0.068.
// Not vec3(0.0), for two reasons that are the same reason. This world bans pure
// black, and a black point that lands on zero is also a black point with no hue,
// which is exactly the mistake the split tone exists to stop making at the other
// end of the range. 0.068 also sits deliberately ABOVE the 16/255 that
// check-polar-color-continuity counts as a black pixel, so the floor cannot
// manufacture the failure it is here to prevent.
const vec3 TONE_NEAR_BLACK = vec3(0.055, 0.068, 0.104);

vec3 tonalRange(vec3 color) {
  // A BLACK POINT AND A HIGHLIGHT SHOULDER. Measured before this, at 1440x900 in
  // real Chrome across three stations at medium, the frame had neither end:
  //
  //   highlight tail (luma > 87.5%)   0.02% / 0.00% / 0.00%
  //   shadow tail    (luma < 12.5%)   0.95% / 2.96% / 4.96%
  //   four mid bins (25-75% luma)     88% / 87% / 86% of every pixel
  //
  // The shadow end was already committed at two of the three stations; the
  // highlight end did not exist. A frame in which literally two hundredths of a
  // percent of pixels are bright is not "soft lighting", it is a range that never
  // resolved, and it is most of why the world reads as one continuous grey-blue
  // value with objects drawn on it.
  //
  // Both ends are shaped as a GAIN, and that is load-bearing rather than
  // stylistic: saturation is (max - min) / max, which is invariant under scaling,
  // so this term cannot move any pixel's saturation by construction. The sky
  // gradient's stops are solved against the vibrance transfer, which IS a
  // saturation transfer, so a tonal pass written as a gain cannot reach that
  // calibration at all. The mix toward TONE_NEAR_BLACK is the one part that is
  // not a gain, and it only opens below 0.28 luma — far under anything the sky
  // occupies at any station.
  float toneLuma = animeLuminance(color);
  // Deep end. The ramp closes at 0.28 so the four mid bins that hold ~87% of the
  // frame are untouched and the 108 mean-luma floor is not spent here. Pixels
  // under the near-black's own luma are LIFTED toward it rather than pushed past
  // it, which is what makes this a black POINT rather than a crush.
  float deep = 1.0 - smoothstep(0.0, 0.28, toneLuma);
  // 0.50 rather than a rounder number: at deep = 1 a source pixel of pure black
  // lands on 0.50 * 0.068 = 8.7/255, just over the 8 that
  // verify-polar-biome-visuals counts as a black pixel. The floor is chosen so it
  // clears the gate it exists to satisfy rather than landing on top of it.
  color = mix(color, TONE_NEAR_BLACK, deep * 0.50);
  // Bright end. (1 - toneLuma) is the shoulder itself: the lift is proportional
  // to the headroom left, so it is largest through the upper mid-tones where the
  // world's snow actually sits and falls to nothing at white. Genuine highlights
  // — the aurora hem, the dome crown, the sun horizon — climb to a clean
  // near-white instead of being walked into a flat clipped one, which is what a
  // straight contrast multiply at this strength would do.
  //
  // NARROWER AND STRONGER, not wider. The onset was moved down to 0.44 first, on
  // the theory that a mask opening at 0.60 opens above the snowfield this world
  // is made of — which is true, and it is still the wrong fix. Measured at four
  // stations, 0.44 did buy the highlight tail (2.34/1.76/0.32/0.87% went to
  // 4.47/3.59/0.75/1.06%) and it bought it by lifting roughly half the frame: at
  // 0.60 input the lift was +17/255 on mid snow, so the observatory frame at high
  // tier came back milky, which is the exact reading this whole brief exists to
  // remove. A shoulder that lifts the snowfield is an exposure change wearing a
  // shoulder's name, and exposure was already measured and rejected as the lever.
  //
  // 0.54 with 1.25 was tried next and went too far the other way: it took the
  // milk out and took the world's mean luma with it, putting field-chamber-coils
  // on 103.8 and assembly-tool-locker on 107.7 against this project's 108 floor
  // for mascot legibility. That floor is the binding constraint on this term, not
  // the histogram — the shoulder is carrying two stations over it.
  //
  // 0.48 with 1.30 holds both ends: mid snow at 0.60 input moves +17/255, which
  // is the lift the floor needs, while 0.75 input lands on 237 and 0.85 clips to
  // white outright, which is the specular the benchmark asked for. The earlier
  // 0.44 arm reached the same luma without ever clipping, so it read as milk
  // rather than as sparkle; the difference is the strength, not the onset.
  //
  // Safe against both gates it sits near, by construction rather than by luck.
  // It is a GAIN, so saturation is invariant and no snow-anchor pixel can cross
  // the 0.28 ceiling; and it only ever raises luma, so it can only push pixels
  // over the anchor's luma-100 half and over the 108 mean floor, never under.
  // The (1 - toneLuma) factor still falls to zero at white, so even at 1.25 the
  // curve cannot walk a highlight into a flat clipped one.
  float crown = smoothstep(0.48, 0.88, toneLuma) * (1.0 - toneLuma);
  return color * (1.0 + crown * 1.30);
}

vec3 glowSample(vec2 uv) {
  vec3 tap = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb;
  // Soft-knee threshold at 0.80 (knee 0.045): the quadratic ramp-in removes
  // the hard clip edge that banded the old glow, while the threshold stays
  // high so only genuine highlights (window glass, indicator lights,
  // telemetry, sun kiss) bloom. Lower thresholds smear the frame into haze.
  vec3 knee = clamp(tap - vec3(0.755), vec3(0.0), vec3(0.09));
  knee = knee * knee * (1.0 / 0.18);
  return max(max(tap - vec3(0.80), vec3(0.0)), knee);
}

vec3 highlightGlow(vec2 uv, vec2 texel) {
  // Cheap in-pass bloom approximation: still eight taps, now split across
  // two radii — a tight cardinal cross (1.7 texels) plus a wider diagonal
  // ring (3.3 texels) — with normalized gaussian-ish weights so the falloff
  // rolls off smoothly instead of printing one hard ring. Callers only
  // invoke this when uBloomStrength > 0 (medium/high tiers), so the low
  // tier never pays for the extra texture reads.
  vec2 inner = texel * 1.7;
  vec2 outer = texel * 3.3 * 0.7071;
  vec3 nearRing = glowSample(uv + vec2(inner.x, 0.0))
    + glowSample(uv - vec2(inner.x, 0.0))
    + glowSample(uv + vec2(0.0, inner.y))
    + glowSample(uv - vec2(0.0, inner.y));
  vec3 farRing = glowSample(uv + outer)
    + glowSample(uv - outer)
    + glowSample(uv + vec2(outer.x, -outer.y))
    + glowSample(uv - vec2(outer.x, -outer.y));
  // Weights sum to one: the near cross carries the core, the far ring the
  // soft skirt.
  return nearRing * 0.17 + farRing * 0.08;
}

float snowCellHash(vec2 cell) {
  return fract(sin(dot(cell, vec2(41.3, 289.1))) * 43758.5453);
}

// One drifting screen-space snow layer. Cells are hashed to a flake centre so
// the field costs no texture reads; uTime is pinned to 0 under reduced motion,
// which freezes the drift in place exactly like the grain field above.
float snowLayer(vec2 uv, float density, float fallSpeed, float sway) {
  vec2 drifted = uv * density;
  drifted.y += uTime * fallSpeed;
  drifted.x += sin(uTime * 0.31 + uv.y * 5.4) * sway;
  vec2 cell = floor(drifted);
  vec2 inCell = fract(drifted) - 0.5;
  float presence = snowCellHash(cell);
  // Only a sparse subset of cells carry a flake, so the field reads as weather
  // rather than static.
  if (presence < 0.72) return 0.0;
  vec2 jitter = vec2(snowCellHash(cell + 17.0), snowCellHash(cell + 51.0)) - 0.5;
  float flake = length((inCell - jitter * 0.6) * vec2(1.0, 0.85));
  return smoothstep(0.34, 0.03, flake) * (0.55 + presence * 0.45);
}

vec3 ambientSnow(vec2 uv) {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 snowUv = vec2(uv.x * aspect, uv.y);
  // Near layer is sparser, larger, and falls faster than the hazy far layer.
  float far = snowLayer(snowUv, 46.0, 0.085, 0.010) * 0.55;
  float near = snowLayer(snowUv + vec2(0.37, 0.19), 22.0, 0.16, 0.018);
  return vec3(0.92, 0.96, 1.0) * (far + near);
}

void main() {
  vec2 texel = 1.0 / max(uResolution, vec2(1.0));

  // 1. Bounded camera-motion fisheye precedes scene sampling; pointer input never changes pixels.
  vec2 warpedUv = fisheyeUv(vUv);
  vec2 clampedUv = clamp(warpedUv, 0.001, 0.999);

  // 2-3. Linear depth drives a subtle, capped pixel-fog sample shift after 54% depth.
  float linearDepth = readLinearDepth(clampedUv);
  float depthFogMask = smoothstep(0.54, 0.96, linearDepth);
  float pixelSize = max(1.0, uPixelSize);
  vec2 pixelUv = (floor(clampedUv * uResolution / pixelSize) + 0.5) * pixelSize / uResolution;
  vec2 sampleUv = mix(clampedUv, clamp(pixelUv, 0.001, 0.999), depthFogMask * 0.04);

  // 4. Four cardinal luma taps and four depth taps share one bounded line-confidence field.
  float lumaEdge = lumaEdgeConfidence(sampleUv, texel);
  float depthEdge = depthEdgeConfidence(sampleUv, texel);
  float gaussianEdge = gaussianEdgeConfidence(sampleUv, texel);
  float edgeConfidence = clamp(max(max(lumaEdge, gaussianEdge), depthEdge * 1.15), 0.0, 1.0);

  // 5. RGB offsets only exist on confident outer-screen edges; neighbor AA is capped at 18%.
  vec2 normalizedScreen = vUv * 2.0 - 1.0;
  float outerScreenMask = smoothstep(0.18, 1.12, dot(normalizedScreen, normalizedScreen));
  vec3 color = chromaticEdgeAA(sampleUv, texel, edgeConfidence, outerScreenMask);

  // 5b. Contrast-adaptive unsharp, before the stylisation rather than after, so
  // it sharpens the rendered image and not the ink, scanline or vignette laid on
  // top of it. Placed ahead of the quantize on purpose: a sharpened pixel is more
  // likely to land on the far side of a band edge, which carries detail through
  // the quantiser instead of flattening against it. The four taps are the same
  // cardinal neighbours the edge fields already walk, and the correction is
  // scaled down where local contrast is already high so edges do not ring.
  if (uSharpen > 0.001) {
    vec3 nT = texture2D(tDiffuse, clamp(sampleUv + vec2(0.0, texel.y), 0.001, 0.999)).rgb;
    vec3 sT = texture2D(tDiffuse, clamp(sampleUv - vec2(0.0, texel.y), 0.001, 0.999)).rgb;
    vec3 eT = texture2D(tDiffuse, clamp(sampleUv + vec2(texel.x, 0.0), 0.001, 0.999)).rgb;
    vec3 wT = texture2D(tDiffuse, clamp(sampleUv - vec2(texel.x, 0.0), 0.001, 0.999)).rgb;
    vec3 neighbourhood = (nT + sT + eT + wT) * 0.25;
    vec3 detail = color - neighbourhood;
    float localContrast = length(max(max(abs(nT - color), abs(sT - color)), max(abs(eT - color), abs(wT - color))));
    float ringGuard = 1.0 - smoothstep(0.16, 0.42, localContrast);
    color = clamp(color + detail * uSharpen * ringGuard, 0.0, 1.0);
  }
  color = mix(color, vec3(0.2902, 0.3725, 0.5333), depthFogMask * 0.08);

  // 6-7. Ten luminance bands, 24 channel levels, then stable 0.0025 dither.
  color = toonQuantize(color);
  float temporalSeed = floor(uTime * 6.0);
  float dither = interleavedGradientNoise(gl_FragCoord.xy, temporalSeed) - 0.5;
  color += vec3(dither * 0.0025);

  // 8-10. Indigo ink, faint static scanlines, and an 8% maximum wide vignette finish the pass.
  vec3 animeInk = vec3(0.2, 0.2510, 0.4314);
  color = mix(color, animeInk, edgeConfidence * uInkStrength);
  float scanline = 0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159265);
  color *= 1.0 - scanline * uScanlineStrength * 0.45;
  float vignette = smoothstep(0.50, 1.45, dot(normalizedScreen, normalizedScreen));
  color = mix(color, animeInk, vignette * 0.025);

  // 11. A tiered paper-grade curve restores ink structure; medium/high retain brighter snow.
  color *= (uGradeBase + uGradeCurve * color);
  color = paperShadowSeparation(color);

  // 12. Polar-dusk cinematic finish. Highlight glow only samples on medium/high.
  if (uBloomStrength > 0.0005) {
    vec3 glow = highlightGlow(sampleUv, texel);
    color += glow * uBloomStrength * vec3(1.06, 0.98, 0.88);
  }
  // Contrast first, then chroma, then hue. The order is load-bearing: vibrance
  // reads the saturation of the CONTRASTED pixel, so the band lands where the
  // frame's colour actually ended up; and it runs before the split tone rather
  // than after so it amplifies the world's own colour instead of amplifying the
  // tint this pass just laid on, which would double the split and put anchor
  // pixels at risk for a look that is already paid for.
  color = filmicSCurve(color);
  color = midtoneVibrance(color);
  color = duskSplitTone(color);

  // 12b. DEPTH-KEYED AERIAL SEPARATION. Nothing in this frame separated subject
  // from background: the distant snowfield, the ridge line and the ground the
  // traveller is standing on all arrived at the same chroma and the same local
  // contrast, so the docked station sat IN the picture instead of in front of it.
  //
  // linearDepth is already read at the top of this pass for the pixel-fog mask,
  // so this costs no tap and no second pass — it is the depth buffer this shader
  // has always bound, finally used for the one thing depth is actually for.
  //
  // The ramp runs 0.06 to 0.45 of the 94-unit far plane, i.e. ~6m to ~42m: the
  // docked station sits at 3-8m and stays at zero, the terrain plane (58 units
  // wide) fills the upper half of the ramp. The step at 0.985 is the SKY, and it
  // is an exclusion rather than an accident. The sky dome draws with depthWrite
  // off, so sky and the aurora shell in front of it both read exactly 1.0 here —
  // and their saturation is calibrated elsewhere, against the vibrance transfer.
  // Letting a distance falloff take 15% of the sky's chroma would silently
  // re-solve somebody else's gradient stops.
  float aerial = smoothstep(0.06, 0.45, linearDepth) * (1.0 - step(0.985, linearDepth));
  // Chroma first: distance loses 15% of its saturation relative to the near
  // subject. Then local contrast: a 10% pull toward a neutral polar pivot, which
  // is a linear map and therefore scales neighbour differences by exactly 0.9 —
  // contrast falls without a blur, a DOF or a single extra sample. The pivot sits
  // above the far bands' own mean, so the haze lifts distance slightly rather
  // than darkening it, which is both what aerial perspective does over snow and
  // the direction the mean-luma floor prefers.
  color = mix(color, vec3(animeLuminance(color)), aerial * 0.15);
  // The haze pivot is WARM, and it is free — this mix already ran against a
  // neutral vec3(0.56) and a coloured constant costs the same instruction. Its
  // luma is 0.5626, i.e. the same pivot height the neutral one had, so the
  // "haze lifts distance slightly rather than darkening it" property is
  // unchanged and this is a hue decision only. It is also the one place in the
  // pass that can put a second hue family into the frame without touching a
  // station's authored palette: the term above has just stripped 15% of the
  // distance's blue, and what fills the gap is now low-sun warmth on far snow
  // instead of grey. Warm/cool across DEPTH rather than across value, which is
  // hue variety the sky and the eight station palettes never have to supply.
  color = mix(color, vec3(0.615, 0.556, 0.472), aerial * 0.10);

  // 13. Smooth cinematic vignette with a slightly warm-lifted center.
  float cineRadial = dot(normalizedScreen, normalizedScreen);
  float cineVignette = smoothstep(0.24, 1.7, cineRadial);
  color *= 1.0 - cineVignette * uVignetteStrength;
  color += vec3(0.028, 0.02, 0.01) * (1.0 - cineVignette) * uVignetteStrength;

  // 14. Filmic grain, luminance-weighted toward shadows. uTime is pinned to 0
  // under reduced motion, which freezes the grain field in place.
  float grainSeed = floor(uTime * 24.0);
  float grain = interleavedGradientNoise(gl_FragCoord.xy + vec2(7.0, 113.0), grainSeed) - 0.5;
  float grainWeight = 1.0 - smoothstep(0.25, 0.85, animeLuminance(color));
  color += vec3(grain * uGrainStrength * (0.4 + 0.6 * grainWeight));

  // 15. Ambient two-layer screen-space snow drift, additive so it never
  // darkens the polar grade. Frozen under reduced motion with uTime.
  if (uSnowStrength > 0.0005) {
    color += ambientSnow(vUv) * uSnowStrength;
  }

  // 16. Slow exposure breathing keeps the settled frame alive without moving
  // any geometry; the CPU pins this to 1.0 under reduced motion.
  color *= uExposureBreath;

  // 17. The black point and the highlight shoulder, last, AFTER the exposure.
  //
  // The position is the whole term. Run before this line — where it was first
  // written, next to the rest of the grade — the shoulder is measurably a no-op
  // at the top end, and the reason is arithmetic rather than tuning: this
  // multiply is SCENE_EXPOSURE 0.82 times the tier trim, so the brightest value
  // the pass can emit is 213/255 at medium and 209 at high. Bin 8 of the
  // histogram, luma above 87.5%, is not dark — it is UNREACHABLE. Measured that
  // way: lifting the upper mid-tones from 3.5% to 6.0% of the frame moved the
  // highlight tail from 0.02% to 0.02%, because every pixel it lifted was then
  // scaled back under the ceiling.
  //
  // A print grade belongs after exposure anyway. Here the shoulder works on the
  // values a visitor actually sees, so a highlight that earns near-white gets
  // near-white, and the black point is a decision about the displayed frame
  // rather than about an intermediate this pass never shows anyone.
  color = tonalRange(color);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

function makeRenderTarget(width = 1, height = 1) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    colorSpace: THREE.SRGBColorSpace,
    depthBuffer: true,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    // The scene never reaches the default framebuffer, so the canvas `antialias`
    // flag can never touch it: every edge is resolved here or not at all.
    // MSAA was measured at -19% framerate (prod, 1440x900, discrete GPU: 36 ->
    // 29fps median) for edges that supersampling gives away free wherever the
    // pixels already exist - the post target now tracks devicePixelRatio to 1.5,
    // so any HiDPI display downsamples through the linear blit below. Machines
    // that cannot afford the pixels do not pay for coverage they never see.
    // ponytail: no MSAA, revisit if a DPR-1 desktop pass ever needs clean edges.
    samples: 0,
    stencilBuffer: false,
  });
  target.depthTexture = new THREE.DepthTexture(width, height);
  target.depthTexture.format = THREE.DepthFormat;
  target.depthTexture.type = THREE.UnsignedIntType;
  return target;
}

/**
 * Whole-scene exposure, applied where the tone map actually is.
 *
 * The reference holds its hero at the same luma as the snow it stands on (97
 * against 98). This world was running its snowfield at 160 against a dome that
 * could only reach 127 without clipping its upward courses, a 0.79 ratio. The
 * dome cannot rise to meet the field at this exposure, so the field comes down
 * to meet the dome.
 */
export const SCENE_EXPOSURE = 0.82;

/**
 * Per-tier exposure trim.
 *
 * CINEMATIC_GRADE drops bloom to zero on low, and bloom is what lifts the
 * frame's upper mid-tones. Measured over the world area of a 1440x900 capture
 * at the home dock: mean luminance 126.4 at high, 121.8 at medium, 101.1 at
 * low; over the mascot specifically 120.0 / 113.1 / 85.7. The same character
 * reads as a pale seal at high and a dark lump at low, 29% darker.
 *
 * That was tolerable while low was a rescue tier for weak hardware. It is not
 * now the quality ladder steps down to low on any machine that cannot hold
 * 60fps at high, because low is what most visitors see.
 *
 * The trim goes here rather than on the renderer. gl.toneMappingExposure never
 * reaches the world pass — the scene renders into a WebGLRenderTarget and three
 * applies tone mapping only on the pass that reaches the default framebuffer —
 * which the comment in the frame loop below already records, and which this was
 * re-derived the hard way by setting it and measuring 0.0 luma of change.
 */
export const SCENE_EXPOSURE_BY_TIER = Object.freeze({
  high: 1,
  low: 1.05,
  medium: 1.02,
});

/**
 * Why the low trim is 1.05 and not the 1.2 this started at.
 *
 * 1.2 was fitted to world-mean luminance at the home dock, where low measured
 * 101.1 against high's 126.4. Out in open field the same trim puts low's snow at
 * 181.8 against high's 135.7 — 46 luma too bright — because a global exposure
 * multiplies the terrain, which paints its own brightness in a custom
 * ShaderMaterial, far more than it lifts anything the light rig actually
 * illuminates. Chasing the dock deficit with exposure made the mascot's
 * contrast against snow worse everywhere else.
 *
 * The dock deficit is now handled where it belongs: the observatory's own point
 * lights no longer dim with the tier. Exposure keeps a small trim and stops
 * pretending it can correct a difference that varies with where the traveller
 * is standing.
 */

export default function RetroCinematicPostProcess({
  motionPoseRef,
  quality = "high",
  reducedMotion = false,
}) {
  const { camera, gl, scene, size } = useThree();
  const motionFisheyeCurrent = useRef(0);
  const motionShiftCurrent = useMemo(() => new THREE.Vector2(), []);
  const motionShiftTarget = useMemo(() => new THREE.Vector2(), []);
  const target = useMemo(() => makeRenderTarget(), []);
  const postCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const postScene = useMemo(() => new THREE.Scene(), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          tDiffuse: { value: target.texture },
          tDepth: { value: target.depthTexture },
          uCameraFar: { value: 100 },
          uCameraNear: { value: 0.1 },
          uChromaticStrength: { value: qualityBudget.high.chroma },
          uFisheyeStrength: { value: qualityBudget.high.fisheye },
          uMotionFisheye: { value: 0 },
          uMotionVector: { value: new THREE.Vector2() },
          uInkStrength: { value: qualityBudget.high.ink },
          uGradeBase: { value: qualityBudget.high.gradeBase },
          uGradeCurve: { value: qualityBudget.high.gradeCurve },
          uShadowSeparation: { value: qualityBudget.high.shadowSeparation },
          uPixelSize: { value: qualityBudget.high.pixel },
          uQuantizeStrength: { value: qualityBudget.high.quantize },
          uSharpen: { value: qualityBudget.high.sharpen },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uScanlineStrength: { value: qualityBudget.high.scanline },
          uTime: { value: 0 },
          uVignetteStrength: { value: CINEMATIC_GRADE.high.vignette },
          uGrainStrength: { value: CINEMATIC_GRADE.high.grain },
          uBloomStrength: { value: CINEMATIC_GRADE.high.bloom },
          uSCurveStrength: { value: CINEMATIC_GRADE.high.sCurve },
          uVibranceStrength: { value: CINEMATIC_GRADE.high.vibrance },
          uSplitToneStrength: { value: CINEMATIC_GRADE.high.splitTone },
          uSnowStrength: { value: CINEMATIC_GRADE.high.snow },
          uExposureBreath: { value: 1 },
        },
        vertexShader: VERTEX_SHADER,
      }),
    [target],
  );

  useEffect(() => {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, material);
    postScene.add(quad);
    return () => {
      postScene.remove(quad);
      geometry.dispose();
    };
  }, [material, postScene]);

  useEffect(() => {
    const budget = qualityBudget[quality] || qualityBudget.high;
    // Hard-clamping to 1 meant every HiDPI visitor got a CSS-pixel render
    // upscaled into a larger backing store - soft on top of aliased. Track the
    // real ratio to 1.5 so the target matches the canvas on ordinary retina.
    const dpr = Math.min(gl.getPixelRatio(), 1.5);
    const width = Math.max(1, Math.floor(size.width * dpr * budget.scale));
    const height = Math.max(1, Math.floor(size.height * dpr * budget.scale));
    target.setSize(width, height);
    material.uniforms.uResolution.value.set(width, height);
    material.uniforms.uFisheyeStrength.value = budget.fisheye;
    material.uniforms.uChromaticStrength.value = budget.chroma;
    material.uniforms.uInkStrength.value = budget.ink;
    material.uniforms.uGradeBase.value = budget.gradeBase;
    material.uniforms.uGradeCurve.value = budget.gradeCurve;
    material.uniforms.uShadowSeparation.value = budget.shadowSeparation;
    material.uniforms.uScanlineStrength.value = budget.scanline;
    material.uniforms.uPixelSize.value = budget.pixel;
    material.uniforms.uQuantizeStrength.value = budget.quantize;
    // Sharpen follows the upscale, not the tier name. The per-tier values were
    // chosen on a desktop whose display is one device pixel per CSS pixel, where
    // `high` renders at scale 1 and dpr 1 and is therefore not upscaled at all —
    // hence its 0. That reasoning does not survive a phone: a 390pt viewport on a
    // dpr-3 screen clamps to 1.5 at `high`, so the browser stretches the canvas
    // by 2x before the visitor sees it, which is more resampling than any desktop
    // tier does. The tier most in need of the filter had it switched off.
    //
    // So a tier that authored 0 takes medium's strength whenever the canvas is
    // actually being upscaled. Tiers that already sharpen keep the strength they
    // were swept for; this only closes the hole.
    const upscale = window.devicePixelRatio / Math.max(0.0001, gl.getPixelRatio() * budget.scale);
    material.uniforms.uSharpen.value =
      budget.sharpen > 0 || upscale <= 1.15 ? budget.sharpen : qualityBudget.medium.sharpen;
    const cinematic = CINEMATIC_GRADE[quality] || CINEMATIC_GRADE.high;
    material.uniforms.uVignetteStrength.value = cinematic.vignette;
    material.uniforms.uGrainStrength.value = reducedMotion ? cinematic.grain * 0.6 : cinematic.grain;
    material.uniforms.uBloomStrength.value = cinematic.bloom;
    material.uniforms.uSCurveStrength.value = cinematic.sCurve;
    material.uniforms.uVibranceStrength.value = cinematic.vibrance;
    material.uniforms.uSplitToneStrength.value = cinematic.splitTone;
    material.uniforms.uSnowStrength.value = cinematic.snow;
  }, [gl, material, quality, reducedMotion, size.height, size.width, target]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => target.dispose(), [target]);

  useFrame(({ clock }, delta) => {
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    // Authored exposure times the +-0.5% breath at 0.08Hz; flat under reduced
    // motion. The exposure has to live here because the scene renders into a
    // WebGLRenderTarget: three.js applies its tone mapping only on the pass that
    // reaches the default framebuffer, so gl.toneMappingExposure never touched
    // the world pass. Setting it to 0.94 changed the rendered dome by 0.00 luma
    // and 0.00% clipping, which is how that was found.
    material.uniforms.uExposureBreath.value =
      SCENE_EXPOSURE *
      (SCENE_EXPOSURE_BY_TIER[quality] ?? 1) *
      (reducedMotion
        ? 1
        : 1 + Math.sin(clock.elapsedTime * Math.PI * 2 * 0.08) * 0.005);
    material.uniforms.uCameraNear.value = camera.near;
    material.uniforms.uCameraFar.value = camera.far;
    const motionPose = motionPoseRef?.current;
    const motionWarp = motionWarpFromVelocity(motionPose?.vx, motionPose?.vz, {
      quality,
      reducedMotion,
    });
    motionShiftTarget.set(motionWarp.x, motionWarp.y);
    const motionDamping = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 8.5);
    motionShiftCurrent.lerp(motionShiftTarget, motionDamping);
    motionFisheyeCurrent.current = THREE.MathUtils.lerp(
      motionFisheyeCurrent.current,
      motionWarp.fisheye,
      motionDamping,
    );
    material.uniforms.uMotionVector.value.copy(motionShiftCurrent);
    material.uniforms.uMotionFisheye.value = motionFisheyeCurrent.current;
    const previousAutoClear = gl.autoClear;
    gl.autoClear = true;
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.clear();
    gl.render(postScene, postCamera);
    gl.autoClear = previousAutoClear;
  }, 1);

  return null;
}
