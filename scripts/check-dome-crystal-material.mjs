import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { POLAR_DOME_LATTICE_GEOMETRY } from "../lib/polar-dome-lattice.js";

const root = process.cwd();
const source = readFileSync(join(root, "components", "PolarObservatoryDome.jsx"), "utf8");
const sceneSource = readFileSync(join(root, "components", "IglooScene.jsx"), "utf8");

const requires = (pattern, message) => {
  assert.match(source, pattern, message);
};

requires(
  /DOME_CRYSTAL_MATERIAL_CONTRACT[\s\S]*bright anime-soft crystalline ice[\s\S]*recessed blue-grey frost[\s\S]*hairline seam recesses[\s\S]*near-zero base emissive[\s\S]*bounded contact-weight optics/,
  "dome must publish the bright crystalline material contract",
);
requires(
  /DOME_CRYSTAL_PALETTE[\s\S]*iceBlue[\s\S]*frostIvory[\s\S]*seamBlueGrey[\s\S]*subsurfaceCyan/,
  "dome must expose separated ice, frost, seam, and subsurface colors",
);
// Inside and outside separate by VALUE, not hue. Everything visible through the
// block gaps and the doorway is the continuous inner shell, so it must be a dark
// near-neutral body carrying a near-white self-glow bright enough to read as a
// light source. Two hue-split regressions are pinned out by this: a slate-blue
// body plus subsurface-cyan emissive made every gap a cold blue lamp, and a
// sunrise-gold hearth flooded orange once the courses became real blocks with
// real gaps rather than tiles with hairline seams.
requires(
  /OBSERVATORY_INTERIOR_HEARTH_PROFILE[\s\S]*hearthColor: "#EDF4FF"[\s\S]*hearthIntensity[\s\S]*high: 0\.62[\s\S]*medium: 0\.52[\s\S]*shellColor: "#7E8C9C"/,
  "the dome interior must publish a near-white hearth profile that reads as a light source",
);
requires(
  /function useInnerShellMaterial[\s\S]{0,600}color: OBSERVATORY_INTERIOR_HEARTH_PROFILE\.shellColor[\s\S]{0,120}emissive: OBSERVATORY_INTERIOR_HEARTH_PROFILE\.hearthColor/,
  "the inner continuous shell must take both its body and its glow from the hearth profile",
);
{
  const innerShell = /function useInnerShellMaterial[\s\S]*?\n}/.exec(source)?.[0] || "";
  assert.ok(innerShell, "the inner shell material factory must stay reviewable");
  for (const cold of [/subsurfaceCyan/, /iceBlue/, /#3D5680/, /windCap/]) {
    assert.doesNotMatch(
      innerShell,
      cold,
      `inward-facing dome surfaces must carry no cold blue tint: ${cold}`,
    );
  }
  // The body stays a near-neutral shadow tone: no channel may run away from the
  // others, so the interior cannot drift back into a coloured lamp of either
  // temperature, and it stays inside the value window where a course joint reads
  // as a cut in snow rather than as a hole punched through the wall.
  const shellHex = /shellColor: "(#[0-9A-Fa-f]{6})"/.exec(source)[1];
  const shellChannels = [1, 3, 5].map((offset) =>
    parseInt(shellHex.slice(offset, offset + 2), 16),
  );
  const shellSpread = Math.max(...shellChannels) - Math.min(...shellChannels);
  const shellMax = Math.max(...shellChannels);
  assert.ok(
    shellSpread <= 30 && shellMax >= 64 && shellMax <= 172,
    `inner shell body ${shellHex} must stay a near-neutral shadow tone, never a void or a coloured lamp`,
  );
  // The glow must be near-white and bright enough to read as a source through the
  // block gaps. This is the whole inside/outside separation: value, not hue.
  const hearthHex = /hearthColor: "(#[0-9A-Fa-f]{6})"/.exec(source)[1];
  const hearthChannels = [1, 3, 5].map((offset) =>
    parseInt(hearthHex.slice(offset, offset + 2), 16),
  );
  const hearthMax = Math.max(...hearthChannels);
  assert.ok(
    hearthMax >= 225 && hearthMax - Math.min(...hearthChannels) <= 26,
    `inner shell glow ${hearthHex} must stay a near-white high-value tone`,
  );
  // Bounded on both sides. Too dim and the interior stops existing once the
  // wall comes off; too bright and it haloes every seated block, because the
  // shell sits directly behind the courses rather than deep inside the room.
  const hearthHigh = Number(/hearthIntensity[\s\S]*?high: ([\d.]+)/.exec(source)[1]);
  assert.ok(
    hearthHigh >= 0.4 && hearthHigh <= 0.85,
    `inner shell glow must read as light without haloing the seated courses (got ${hearthHigh})`,
  );
}
// Professional register: the brick face family must stay a desaturated high-value
// ice band. A saturated primary/cornflower face color is the exact regression that
// made the hero dome read as a toy block set.
//
// The band stays COOL and that is load-bearing, not inherited. A warm ivory face
// family was tried to satisfy the "jolly" brief and it measured well — lit-face
// saturation 0.170 -> 0.320, past its 0.308 baseline — while turning the building
// into terracotta, because warm albedo under a warm key leaves the shadow warm too
// (measured R-B +1.4 where ice needs it negative) and a body whose light and shadow
// share a hue is clay by definition. Warmth belongs on the light, which is what
// DOME_KEY_LIGHT_COLOR carries; these are snow.
const faceFamily = { frostIvory: "#DCE8F7", iceBlue: "#B7C8E2", windCap: "#F0F5FA" };
for (const [name, hex] of Object.entries(faceFamily)) {
  assert.match(
    source,
    new RegExp(`${name}: "${hex}"`),
    `dome ${name} must stay on the desaturated glacial face band (${hex})`,
  );
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(...channels);
  const saturation = (max - Math.min(...channels)) / max;
  // HSV saturation. The old toy-blue face family sat at 0.4-0.7 here; the glacial band
  // caps at 0.19 (#B7C9E2, the darkest face tone), so 0.2 is the regression ceiling.
  assert.ok(saturation <= 0.2, `dome ${name} must stay in the desaturated glacial band`);
  assert.ok(max > 0.7, `dome ${name} must stay a high-value ice tone`);
}
// The instanced body albedo, pinned by the three ways it has actually failed. It is
// the shell's exposure control — a pure multiplier over crown, faces, seams and
// shadow side alike — so it is also the first thing reached for when the building
// looks wrong, and every direction has a recorded regression. Too dark took the shell
// to a muddy mid-grey (#C4C2C6); warm turned it to terracotta under the warm key
// (#DCD8D2); and it must stay high-key because this is sunlit snow.
{
  const body = /color: "(#[0-9A-Fa-f]{6})",\n\s*\/\/ Body emissive is effectively off/.exec(
    source,
  );
  assert.ok(body, "the instanced ice body must declare a literal albedo");
  const channels = [1, 3, 5].map((offset) => parseInt(body[1].slice(offset, offset + 2), 16));
  assert.ok(
    Math.max(...channels) - Math.min(...channels) <= 6,
    `instanced ice body ${body[1]} must stay neutral; warm albedo under the warm key is what read as terracotta`,
  );
  // The floor is the exposure the flattened light rig gave up. Moving the key out to
  // 2.2x its radius cost whole-dome luma 0.462 -> 0.407 and left the crown khaki, and
  // this albedo is what pays that back; below ~0.88 the shell goes back to mid-grey.
  // The ceiling is the clipping the rig before it produced: at #E1E9F2 17.41% of the
  // dome's pixels were pinned at pure 255 with no form left in them.
  assert.ok(
    Math.min(...channels) >= 224 && Math.max(...channels) <= 248,
    `instanced ice body ${body[1]} must stay high-key without returning to the clipping ceiling`,
  );
}
// Hue at constant value is the only way the crown's temperature may be recovered.
// brickTemperature is normalised by its own luminance, so this mix rotates hue and
// leaves the value ladder alone; the warm end has a measured ceiling because past
// roughly 0.72 the still reads as a gold cap on a blue building rather than as sun on
// snow, which is the two-materials fault arriving through the hue channel.
{
  const split = /brickTemperature, mix\((0\.\d+), (0\.\d+), brickTemperatureMix\)/.exec(source);
  assert.ok(split, "the temperature split must stay a legible two-ended mix");
  const [, cool, warm] = split.map(Number);
  assert.ok(
    warm >= 0.64 && warm <= 0.72,
    `temperature split warm end ${warm} must clear the +25 crown R-B floor without painting a gold cap`,
  );
  assert.ok(
    cool < warm,
    "the shadow end of the temperature split must stay weaker than the lit end",
  );
}
// The dome's final response conditioning, pinned by what it is for and by the two
// ways the first version of it failed. Measured on the eleven panel centres at
// 1440x900 medium: luma spread 140.6 -> 113.3 and saturation range 0.029-0.654 ->
// 0.028-0.416, with the warm crown and cool body still opposed at +36.0 / -33.1.
{
  const profile = /DOME_MATERIAL_UNITY_PROFILE = Object\.freeze\(\{([\s\S]*?)\n\}\);/.exec(source);
  assert.ok(profile, "the dome must publish how it conditions its own final response");
  const number = (name) => Number(new RegExp(`${name}: ([\\d.]+)`).exec(profile[1])?.[1]);

  // The ceiling's whole job is to sit UNDER the post grade's vibrance band, which
  // RetroCinematicPostProcess documents as returning every pixel at or below its
  // lower edge bit-identical. Nine of the eleven panel centres sat inside that
  // band, so the grade was amplifying the dome's chroma hardest exactly where it
  // was already worst. The edge is read live from that file rather than copied
  // here, because a copy goes stale silently and this coupling is the reason the
  // number is what it is.
  const gradeSource = readFileSync(
    join(root, "components", "RetroCinematicPostProcess.jsx"),
    "utf8",
  );
  const band = /smoothstep\((0\.\d+), 0\.\d+, saturation\)/.exec(gradeSource);
  assert.ok(band, "the grade's vibrance band must stay locatable for the dome to stay under it");
  assert.ok(
    number("chromaCeiling") > 0.12 && number("chromaCeiling") < Number(band[1]),
    `dome chroma ceiling ${number("chromaCeiling")} must stay under the grade's vibrance floor ${band[1]} without going monochrome`,
  );
  // A CEILING, not a scale. Below it the pull is identically 1.0, so the
  // temperature split's direction survives at every light level and only its
  // extreme is capped — the shape the file's "READ THIS BEFORE TOUCHING ANY COOL
  // TERM" warning requires, since cool is what the mix returns at zero light.
  assert.match(
    source,
    /gl_FragColor\.rgb = mix\(\s*\n?\s*vec3\(domeUnityLuma\),\s*\n?\s*gl_FragColor\.rgb,\s*\n?\s*min\(1\.0, \$\{DOME_MATERIAL_UNITY_PROFILE\.chromaCeiling/,
    "the saturation ceiling must be a luminance-preserving pull that is identically off below the ceiling",
  );
  // The compression must be on the LIGHT, not on the composited pixel, and the
  // division by the fragment's own albedo is what makes that true. Measured on the
  // version that compressed the pixel: a joint at shader-linear 0.03 lifted to
  // 63/255 from 30/255 while the face it separates only came down 219 -> 196,
  // taking joint contrast from 7.3:1 to 3.1:1. Dividing the albedo out and
  // multiplying it back leaves the authored seam, bevel and crown ladder exact.
  assert.match(
    source,
    /float domeUnityLight = domeUnityLuma\s*\n?\s*\/ max\(dot\(diffuseColor\.rgb, vec3\(0\.2126, 0\.7152, 0\.0722\)\), 0\.0\d+\);/,
    "the compression must divide by the fragment's own albedo or it flattens the masonry it is meant to unify",
  );
  assert.match(
    source,
    /#include <opaque_fragment>[\s\S]{0,80}DOME_MATERIAL_UNITY_PROFILE/,
    "the conditioning must run after every authored value decision and before tone mapping",
  );
  assert.ok(
    number("lightContrast") > 0.3 && number("lightContrast") < 1,
    `light contrast ${number("lightContrast")} must compress the light range without erasing the form`,
  );
  assert.ok(
    number("lightPivot") > 0.5 && number("lightPivot") < 3,
    `light pivot ${number("lightPivot")} must stay near a fully lit surface; a pivot far below the range is a global darkener, and darkening the dome pushed it into the grade's teal shadow mask and took two panel centres from 0.063 and 0.029 saturation to 0.562 and 0.636`,
  );
}
requires(
  /brickSeamCore = 1\.0 - smoothstep\(brickSeamAa, brickBevelWidth \* 0\.42/,
  "seams must read as a hairline cut with a separate deep-recess core",
);
// The seam field must be measured in the block's own cell frame, and only on the face
// that has a rim. Both halves of this were regressions with the same shape: a band
// authored at 0.022-0.036 was being fed coordinates it did not describe, so it saturated
// into a painted frame instead of peaking on a cut line.
{
  // Half one. The geometry pass tapers x and y by the radial wedge, which puts the outer
  // face's half-extent at 0.532 and the inner face's at 0.953 of the unit box. Measured
  // against that, brickEdgeDistance ran -0.023 at the outer face's joint — wider than the
  // whole seam — so the recess sat at full strength across the outer ~10% of every face:
  // a 12px navy border, luma 71.9 against 199.6 on the panel it framed, where a plain
  // Lambert control put the same two regions at 1.49:1 rather than 2.78:1. The varying
  // must therefore be the untapered cell position, and it must be derived from the same
  // constants the geometry applies, so moving the taper cannot silently un-fix this.
  const taper = /DOME_BLOCK_TAPER = Object\.freeze\(\{ height: ([\d.]+), lean: ([\d.]+), width: ([\d.]+) \}\)/.exec(
    source,
  );
  assert.ok(taper, "the block taper must be published once for the geometry and the shader to share");
  const [, height, lean, width] = taper;
  assert.match(
    source,
    new RegExp(
      `brickCellY = position\\.y / \\(1\\.0 \\+ position\\.z \\* \\$\\{DOME_BLOCK_TAPER\\.height\\}\\)`,
    ),
    "the cell frame must undo the height taper from the published constant",
  );
  assert.match(
    source,
    /brickCellX = position\.x\s*\n?\s*\/ \(\(1\.0 \+ position\.z \* \$\{DOME_BLOCK_TAPER\.width\}\) \* \(1\.0 - \(brickCellY \+ 0\.5\) \* \$\{DOME_BLOCK_TAPER\.lean\}\)\)/,
    "the cell frame must undo the width taper and the lean, in that order, from the published constants",
  );
  assert.match(
    source,
    /vBrickLocalPosition = vec3\(brickCellX, brickCellY, position\.z\)/,
    "the seam, wind-cap and bevel bands must read the cell frame rather than the displaced pose",
  );
  // The geometry has to be the thing that taper describes, or the inverse above is fiction.
  assert.match(
    source,
    /const wedge = 1 \+ z \* DOME_BLOCK_TAPER\.width;\s*\n\s*x \*= wedge \* \(1 - \(y \+ 0\.5\) \* DOME_BLOCK_TAPER\.lean\);\s*\n\s*y \*= 1 \+ z \* DOME_BLOCK_TAPER\.height;/,
    "the geometry taper must consume the same published constants the shader inverts",
  );
  for (const [name, value] of [["height", height], ["lean", lean], ["width", width]]) {
    assert.ok(
      Number(value) > 0 && Number(value) < 0.2,
      `block taper ${name} ${value} must stay a radial wedge rather than a shear`,
    );
  }
  // Half two. A side wall carries x = +/-0.5 along its whole depth, so an inset measured
  // on it is zero everywhere and the recess paints the entire wall: 62% seam blue-grey
  // plus a 34% darkening over ~15% of the building's screen area. That was right when the
  // courses were thin tiles meeting at hairline joints and the wall was the inside of a
  // joint; these courses float apart on a published suspension gap, so the wall is an
  // exposed lit face. Measured painted: rgb(47,74,124) against rgb(224,197,154) on the
  // face it borders. The gate is that the inset is held out at 0.5 — no recess, no seam
  // core, no bevel band — away from the outer face.
  assert.match(
    source,
    /float brickEdgeDistance = mix\(0\.5, brickFaceInset, smoothstep\(0\.\d+, 0\.\d+, vBrickLocalPosition\.z\)\)/,
    "the seam must be confined to the outer face; a side wall is a lit surface, not a joint",
  );
  const gate = /brickEdgeDistance = mix\(0\.5, brickFaceInset, smoothstep\((0\.\d+), (0\.\d+), vBrickLocalPosition\.z\)\)/.exec(
    source,
  );
  const [, gateLow, gateHigh] = gate.map(Number);
  // The outer face sits at z >= 0.5 before its sagitta and the rounded rim wraps back to
  // about 0.454, so the gate has to close above the flat wall and open across that rim.
  assert.ok(
    gateLow > 0.1 && gateHigh > gateLow && gateHigh <= 0.5,
    `the outer-face gate (${gateLow}, ${gateHigh}) must close over the side wall and open across the rounded rim`,
  );
}
assert.doesNotMatch(
  source,
  /brickEdgeDistance = 0\.5 - max\(abs\(vBrickLocalPosition\.x\), abs\(vBrickLocalPosition\.y\)\)/,
  "the seam inset cannot be measured on tapered coordinates; that is what painted a frame around every block",
);
requires(
  /brickBevelWidth = mix\(0\.0[0-4]\d*, 0\.0[0-5]\d*, clamp\(vBrickBevel/,
  "the brick bevel band must stay hairline rather than chunky toy rounding",
);
requires(
  /Body emissive is effectively off[\s\S]*emissiveIntensity: quality === "high" \? 0\.0\d+ : 0\.0\d+/,
  "the brick body must be scene-lit rather than self-glowing",
);
assert.doesNotMatch(
  source,
  /totalEmissiveRadiance\s*\+=\s*brickSurface\s*\*\s*(\(0\.[1-9]|0\.[1-9])/,
  "the brick body emissive must stay near zero so the value ladder survives",
);
requires(
  /attribute float instanceBevel[\s\S]*varying float vBrickBevel[\s\S]*instanceBevel/,
  "each instanced block must carry bounded bevel variation",
);
requires(
  /attribute float instanceFacet[\s\S]*varying float vBrickFacet[\s\S]*instanceFacet/,
  "each instanced block must carry a stable crystalline facet seed",
);
requires(
  /brickAnisotropicFrost/,
  "full-quality ice must calculate anisotropic frost microfacets",
);
requires(
  /brickCrystalDx\s*=\s*dFdx[\s\S]*brickCrystalDy\s*=\s*dFdy/,
  "full-quality ice must convert frost height into derivative micro-normals",
);
requires(
  /brickWrappedDiffuse[\s\S]*brickTransmission[\s\S]*brickFresnel/,
  "ice optics must separate wrapped key, fake transmission, and Fresnel",
);
requires(
  /brickCrownHighlight[\s\S]*smoothstep[\s\S]*brickCrownHighlight/,
  "crown lighting must be a bounded authored highlight rather than an emissive hotspot",
);
requires(
  /brickContactOcclusion[\s\S]*uBrickImpact[\s\S]*bounded contact-weight optics/,
  "contact must affect a bounded optical response while retaining architectural weight",
);
requires(
  /instanceBevel[\s\S]*new THREE\.InstancedBufferAttribute\(bevel, 1\)[\s\S]*instanceFacet[\s\S]*new THREE\.InstancedBufferAttribute\(facet, 1\)/,
  "bevel and facet seeds must be uploaded once as instanced attributes",
);
requires(
  /shellBlocksByQuality:[\s\S]*high: POLAR_DOME_LATTICE_COUNTS\.high\.visibleCells[\s\S]*medium: POLAR_DOME_LATTICE_COUNTS\.medium\.visibleCells[\s\S]*shellBlockDraws: 1/,
  "generated medium/high shell blocks must remain one instanced draw",
);
requires(
  /airlockBlockDraws: 1[\s\S]*imageTextures: 0/,
  "airlock masonry must remain one instanced draw with no image textures",
);
requires(
  /maxFullFrameCalls: 8/,
  "the full dome must remain within eight submissions",
);
requires(
  /OBSERVATORY_HOME_WORLD_PROFILE[\s\S]*crystalline-articulated-observatory[\s\S]*cyan-white Antarctic frost sanctuary[\s\S]*sunrise-gold entrance\/contact light/,
  "the observatory must publish its crystalline Antarctic home identity",
);
requires(
  /STATION_PERSONALITY_PROFILES\["observatory-plaque"\][\s\S]*OBSERVATORY_HOME_LIGHT_PROFILE[\s\S]*color: OBSERVATORY_PERSONALITY\.palette\.glow[\s\S]*contactColor: OBSERVATORY_PERSONALITY\.palette\.accent[\s\S]*pointLight[\s\S]*sunrise-gold-observatory-threshold-light/,
  "the airlock threshold must carry a bounded sunrise-gold contact light",
);
requires(
  /OBSERVATORY_MACRO_SCALE_PROFILE[\s\S]*domeHeightInSealHeights:\s*3\.8[\s\S]*dockedViewportWidthRange:\s*Object\.freeze\(\[0\.42, 0\.68\]\)[\s\S]*worldScale:\s*1\.58[\s\S]*scale=\{OBSERVATORY_MACRO_SCALE_PROFILE\.worldScale\}/,
  "the docked observatory must read as 3-5 seal-height architecture across 42-68% of the viewport",
);
requires(
  /OBSERVATORY_HOME_DRESSING_PROFILE[\s\S]*sastrugi[\s\S]*expedition[\s\S]*one merged vertex-colored draw/,
  "the observatory must publish a bounded Antarctic ground-dressing contract",
);
requires(
  /createObservatoryHomeGroundGeometry[\s\S]*name="observatory-home-sastrugi-expedition-dressing one-draw"[\s\S]*vertexColors/,
  "sastrugi and expedition markers must replace a plinth draw rather than add an unbounded object pool",
);
requires(
  /pointLight[\s\S]*sunrise-warm-observatory-key-light/,
  "the crystalline blocks need a local warm key light",
);
// The dome's hue budget now lives on its two local lights rather than on its paint,
// so the split is pinned where it actually is. Both must stay inside the value band
// that keeps them reading as daylight rather than as coloured stage lamps, and they
// must stay on opposite sides of neutral — a rig that drifts back to two near-white
// lights is the regression this catches, because that is what left every face turned
// away from the key falling to the same flat grey.
{
  const key = /DOME_KEY_LIGHT_COLOR = "(#[0-9A-Fa-f]{6})"/.exec(source)[1];
  const fill = /DOME_FILL_LIGHT_COLOR = "(#[0-9A-Fa-f]{6})"/.exec(source)[1];
  const channels = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const warmth = (hex) => channels(hex)[0] - channels(hex)[2];
  assert.ok(warmth(key) >= 30, `key light ${key} must read warm, not neutral`);
  assert.ok(warmth(fill) <= -30, `fill light ${fill} must read cool, not neutral`);
  for (const [name, hex] of [["key", key], ["fill", fill]]) {
    assert.ok(
      Math.max(...channels(hex)) >= 224,
      `${name} light ${hex} must stay a high-value daylight tone rather than a coloured stage lamp`,
    );
  }
  requires(/color=\{DOME_KEY_LIGHT_COLOR\}/, "the key light must consume the published warm color");
  requires(/color=\{DOME_FILL_LIGHT_COLOR\}/, "the fill light must consume the published cool color");
}
requires(
  /DOME_POINTER_LIFT_PROFILE[\s\S]*heroLiftMeters:\s*0\.15[\s\S]*neighborFalloff:\s*"geodesic-normal"[\s\S]*recoveryResponse:\s*12/,
  "pointer lift must publish a visible but bounded hero-tile displacement contract",
);
requires(
  /brickHoverLift\s*=\s*instanceHover\s*\*\s*0\.15[\s\S]*transformed\.z\s*\+=\s*brickHoverLift/,
  "hovered blocks must lift outward along local Z rather than compress inward",
);
requires(
  /useSmoothHoverAttribute[\s\S]*THREE\.MathUtils\.damp[\s\S]*hover\.setX[\s\S]*hover\.needsUpdate\s*=\s*true/,
  "one inertial attribute-update path must animate lift and spring recovery",
);
requires(
  /DOME_FLOAT_PROFILE[\s\S]*courseWeight:\s*"smoothstep\(0\.08, 0\.85, normalizedBrickHeight\)"[\s\S]*proximityStirGain:\s*0\.5[\s\S]*suspensionGapRadiusRatio:\s*0\.015/,
  "the shell must publish the suspended ice-block float contract",
);
requires(
  /materialize:\s*Object\.freeze\(\{[\s\S]*margin:\s*0\.55[\s\S]*scaleFrom:\s*0\.62[\s\S]*slideInLocal:\s*0\.55[\s\S]*window:\s*0\.45/,
  "the float contract must publish the bottom-up staggered materialize sub-profile",
);
requires(
  /wake:\s*Object\.freeze\(\{[\s\S]*amplitudeRangeLocal:\s*Object\.freeze\(\[0\.03, 0\.1\]\)[\s\S]*decayTauSeconds:\s*0\.9[\s\S]*minSplatDistanceLocal:\s*0\.25[\s\S]*minSplatIntervalMs:\s*90[\s\S]*sigmaLocal:\s*0\.55[\s\S]*splatCount:\s*8/,
  "the float contract must publish the dissipating pointer splat wake sub-profile",
);
requires(
  /wave:\s*Object\.freeze\(\{[\s\S]*amplitudes:\s*Object\.freeze\(\[0\.02, 0\.007\]\)[\s\S]*angularWavenumber:\s*3[\s\S]*frequenciesHz:\s*Object\.freeze\(\[0\.09, 0\.178\]\)/,
  "the float contract must publish the coherent traveling azimuthal wave sub-profile",
);
requires(
  /attribute vec3 instanceFloat[\s\S]*new THREE\.InstancedBufferAttribute\(floatData, 3\)/,
  "normalized course height, drift phase, and centroid azimuth must upload once as one vec3 instanced attribute",
);
requires(
  /brickFloatWeight\s*=\s*smoothstep\(0\.08, 0\.85, instanceFloat\.x\)[\s\S]*uBrickFloatMotion\s*\*\s*\(1\.0\s*\+\s*0\.5\s*\*\s*uBrickProximity\)[\s\S]*transformed\.z\s*\+=\s*\(brickSuspensionGap \+ brickFloatDrift\)/,
  "suspension gap and temporal drift must displace outward along the hover-lift axis with proximity stir and a reduced-motion pin",
);
requires(
  /sin\(\$\{DOME_FLOAT_PROFILE\.wave\.angularWavenumber\.toFixed\(1\)\} \* instanceFloat\.z - 6\.28318530718 \* \$\{DOME_FLOAT_PROFILE\.wave\.frequenciesHz\[0\]\.toFixed\(3\)\} \* uBrickTime \+ instanceFloat\.x/,
  "idle drift must be one coherent traveling azimuthal wave rather than independent per-brick sinusoids",
);
requires(
  /uniform vec4 uSplatCoords\[\$\{DOME_FLOAT_PROFILE\.wake\.splatCount\}\];[\s\S]*uniform float uSplatAmps\[\$\{DOME_FLOAT_PROFILE\.wake\.splatCount\}\];[\s\S]*uniform float uSplatRadius;/,
  "the pointer wake must ride an eight-splat uniform ring buffer with a shared radius, never a texture",
);
requires(
  /brickWake\s*\+=\s*uSplatAmps\[splat\][\s\S]*exp\(-\(splatDistance \* splatDistance\)[\s\S]*exp\(-max\(splatAge, 0\.0\)[\s\S]*brickWake\s*=\s*min\(brickWake, 0\.16\)\s*\*\s*uBrickFloatMotion[\s\S]*transformed\.z\s*\+=\s*brickWake/,
  "wake displacement must sum gaussian-falloff exponentially-decaying splats, stay bounded, respect reduced motion, and push outward only",
);
requires(
  /function writePointerWakeSplat[\s\S]*minSplatDistanceLocal \* worldScale[\s\S]*minSplatIntervalMs[\s\S]*uSplatCoords\.value\[index\]\.set\(point\.x, point\.y, point\.z, uniforms\.uBrickTime\.value\)/,
  "pointer moves must append speed-scaled splats to the ring buffer with distance and interval gating",
);
requires(
  /onPointerMove=\{\(event\) => \{[\s\S]*writePointerWakeSplat\(assets\.material, event\)/,
  "the existing raycast pointer-move handlers must feed the wake splat writer",
);
requires(
  /brickReveal = smoothstep\(\s*instanceFloat\.x \* \$\{DOME_FLOAT_PROFILE\.materialize\.margin\.toFixed\(2\)\},[\s\S]*\+ \$\{DOME_FLOAT_PROFILE\.materialize\.window\.toFixed\(2\)\},\s*uBrickReveal[\s\S]*transformed \*= mix\(\$\{DOME_FLOAT_PROFILE\.materialize\.scaleFrom\.toFixed\(2\)\}, 1\.0, brickReveal\)[\s\S]*transformed\.z \+= \(brickReveal - 1\.0\) \* \$\{DOME_FLOAT_PROFILE\.materialize\.slideInLocal\.toFixed\(2\)\}/,
  "bricks must materialize bottom-up on stream reveal, scaling and sliding from slightly inward to seated",
);
requires(
  /updateInstancedIceUniforms\([\s\S]*reducedMotion \? 0 : 1,[\s\S]*reducedMotion \? 1 : THREE\.MathUtils\.clamp\(reveal, 0, 1\),/,
  "the existing per-frame uniform path must thread reveal progress with the reduced-motion materialize pin",
);
requires(
  /DOME_TILE_FALL_PROFILE[\s\S]*gravity[\s\S]*settle[\s\S]*detach/,
  "docked Observatory tiles must publish damped gravity detachment and soft settle",
);
requires(
  /instanceFallOffset[\s\S]*instanceFallVelocity[\s\S]*damped gravity/,
  "tile detachment must carry per-instance fall state instead of collapsing the dome",
);
// Proximity, not dock point: the dome's own reactions must ramp with continuous seal
// distance. A binary docked/near switch is the regression this pins out.
requires(
  /DOME_PROXIMITY_RESPONSE_PROFILE[\s\S]*contactRadius:\s*3\.2[\s\S]*farRadius:\s*7\.4[\s\S]*hoverEnableRamp:\s*0\.12[\s\S]*nearRadius:\s*3\.4[\s\S]*thresholdLightGain:\s*0\.55/,
  "the dome must publish a continuous distance-falloff response profile",
);
requires(
  /approachProximity\s*=\s*\n?\s*1 -\s*\n?\s*THREE\.MathUtils\.smoothstep\(\s*\n?\s*contactDistance,\s*\n?\s*DOME_PROXIMITY_RESPONSE_PROFILE\.nearRadius,\s*\n?\s*DOME_PROXIMITY_RESPONSE_PROFILE\.farRadius/,
  "approach reactivity must be a smooth distance falloff rather than a dock-point binary",
);
requires(
  /proximityInteractive\s*=\s*\n?\s*pointerInteractionEnabled \|\|\s*\n?\s*approachProximity > DOME_PROXIMITY_RESPONSE_PROFILE\.hoverEnableRamp/,
  "hover enable must come from the dome's own proximity ramp, not only the scene prop",
);
requires(
  /const target = pointerInteractionEnabled\s*\n?\s*\? \(targetsRef\.current\[index\] \?\? 0\) \* proximityGain/,
  "pointer lift targets must scale with the proximity ramp",
);
requires(
  /approachLift = 1 \+ proximity \* DOME_PROXIMITY_RESPONSE_PROFILE\.thresholdLightGain[\s\S]*thresholdLightRef\.current\.intensity =[\s\S]*\* approachLift/,
  "the airlock threshold must brighten continuously with nearness",
);
// Rammable: a real seal collision must knock bricks loose deterministically.
requires(
  /DOME_RAM_KNOCK_PROFILE[\s\S]*contactHeightLocal:\s*0\.42[\s\S]*damageReachGain:\s*1\.5[\s\S]*never Math\.random[\s\S]*knockRadiusLocal:\s*1\.15[\s\S]*lateralMetresPerSecond:\s*0\.9[\s\S]*maxBricksPerRam:\s*18[\s\S]*minStrength:\s*0\.26[\s\S]*tumbleSpinRadiansPerSecond:\s*2\.4/,
  "the dome must publish a bounded deterministic seal-ram knock profile",
);
requires(
  /function knockHash\(index, salt\)[\s\S]*Math\.sin\(index \* 12\.9898 \+ salt \* 78\.233\) \* 43758\.5453/,
  "knock tumble must be hashed from the brick index",
);
assert.doesNotMatch(
  source,
  /Math\.random\(/,
  "the damage path must stay deterministic; no Math.random() call anywhere in the dome",
);
requires(
  /pulse >= DOME_RAM_KNOCK_PROFILE\.minStrength &&\s*\n?\s*pulse > previousPulseRef\.current[\s\S]*damage\.knockPoint\.set\([\s\S]*damage\.knockSequence \+= 1/,
  "a rising seal-impact edge above the speed threshold must publish a dome-local knock point",
);
requires(
  /function knockBlocksNearContact[\s\S]*block\.basePosition\.distanceTo\(contactPoint\) > radius[\s\S]*detachKnockedBlock/,
  "the ram must detach only the bricks nearest the contact point",
);
requires(
  /KNOCK_QUATERNION\.setFromAxisAngle\(block\.knockAxis, block\.knockAngle\)[\s\S]*block\.renderMatrix\.compose\(KNOCK_POSITION, KNOCK_QUATERNION, block\.baseScale\)/,
  "knocked bricks must tumble on the same instances rather than spawning new meshes",
);
requires(
  /DOME_TILE_FALL_PROFILE\.groundFriction[\s\S]*knockVelocityX \*= friction/,
  "knocked bricks must lose lateral energy and settle on the snow",
);
// Destructible with a use-case, and never permanently broken.
requires(
  /DOME_DEMOLITION_PROFILE[\s\S]*collapseFraction:\s*0\.38[\s\S]*detachedShellBricks \/ totalShellBricks; runtime only, resets on reload[\s\S]*rebuildCooldownSeconds:\s*5\.5[\s\S]*rebuildSeconds:\s*1\.9[\s\S]*vanish and reappear at zero scale; no tumble[\s\S]*mined public-corpus crates, the warm hearth, and the plaque core/,
  "the dome must publish its damage, rebuild, and reduced-motion demolition contract",
);
requires(
  /detachedCount >= blocks\.length \* DOME_DEMOLITION_PROFILE\.collapseFraction[\s\S]*collapseRemainingBlocks\(blocks\)[\s\S]*damage\.demolished = true/,
  "passing the collapse fraction must bring the rest of the shell down",
);
requires(
  /OBSERVATORY_ENTRY_CACHE_PROFILE[\s\S]*one merged vertex-colored draw that takes the hidden inner weather shell's slot[\s\S]*mined public corpus, the warm hearth, and the plaque core/,
  "full demolition must reveal a meaningful buried entry cache, not a toy hole",
);
requires(
  /function BuriedEntryCache[\s\S]*observatory-buried-entry-cache mined-public-corpus hearth plaque-core one-draw/,
  "the revealed cache must stay one draw",
);
requires(
  /visible=\{tier === "low" && !shellDemolished\}[\s\S]*\{\(tier !== "low" \|\| shellDemolished\) && <BuriedEntryCache quality=\{tier\} \/>\}/,
  // The two conditions are exact complements, which is the whole invariant: the
  // continuous shell and the cache never draw together and never both sit out, so
  // the slot is occupied exactly once no matter which tier is running or whether
  // the shell is standing. Medium and high are permanently hollow — a solid white
  // surface behind masonry that hovers with real gaps read as a painted ball — so
  // there the cache holds the slot always, and low keeps the shell because on low
  // the shell IS the dome.
  "the cache must take the hidden inner weather shell's draw slot",
);
requires(
  /damage\.cooldown >= DOME_DEMOLITION_PROFILE\.rebuildCooldownSeconds[\s\S]*damage\.rebuildProgress = 0[\s\S]*damage\.rebuildSequence \+= 1/,
  "the dome must auto-rebuild after a cooldown so the world cannot be permanently broken",
);
requires(
  /const reveal = Math\.min\(streamReveal, damage\.rebuildProgress\)/,
  "the rebuild must replay the existing bottom-up materialize rather than add a second animation system",
);
requires(
  /if \(reducedMotion\) \{[\s\S]*block\.renderMatrix\.compose\(block\.basePosition, block\.baseQuaternion, KNOCK_ZERO_SCALE\)/,
  "reduced motion must make detached bricks disappear instead of tumbling",
);
requires(
  /canvas\.dataset\.observatoryDomeDamage[\s\S]*canvas\.dataset\.observatoryDomeDemolished[\s\S]*canvas\.dataset\.observatoryDomeRebuild/,
  "the damage fraction must be observable on the existing canvas diagnostic channel",
);
requires(
  /signature !== damageSignatureRef\.current/,
  "the damage diagnostic must only touch the DOM when the state actually changes",
);
requires(
  /if \(damage\.demolished \|\| damage\.detachedCount > 0 \|\| damage\.rebuildProgress < 1\) invalidate\(\)/,
  "a damaged dome must pump its own frames so the reduced-motion demand loop still rebuilds",
);
assert.match(
  sceneSource,
  /<PolarObservatoryDome[\s\S]*pointerInteractionEnabled=\{dockedStationId === "observatory-plaque" \|\| observatoryDistance <= 4\.6\}/,
  "brick pointer lift must be enabled while docked at Observatory or during close approach",
);

assert.doesNotMatch(
  source,
  /totalEmissiveRadiance\s*\+=\s*diffuseColor\.rgb\s*\*\s*\(1\./,
  "dome cannot flatten lighting by adding more than the full diffuse color back as emissive",
);
assert.doesNotMatch(
  source,
  /totalEmissiveRadiance\s*\+=\s*brickSurface\s*\*\s*\(0\.[4-9]/,
  "instanced ice cannot flatten its facets with a dominant base emissive term",
);
assert.doesNotMatch(
  source,
  /transformed\.z\s*-=/,
  "pointer interaction cannot pull Observatory blocks inward",
);
assert.doesNotMatch(
  source,
  /useTexture|textureLoader|\/assets\/pbr/i,
  "dome must remain texture-free and generated from geometry plus shader math",
);

// The contact disc, pinned by the two ways it has actually failed rather than by
// its appearance. Both failures were silent: the render kept working, the checks
// kept passing, and the only symptom was a building that looked like a sticker.
{
  const plinth = /function NeutralContactPlinth[\s\S]*?\n}/.exec(source)?.[0] || "";
  assert.ok(plinth, "the contact plinth must stay reviewable");
  const contactY = Number(
    /position=\{\[\s*[-\d.]+,\s*([-\d.]+),\s*[-\d.]+\s*\]\}/.exec(plinth)?.[1],
  );
  assert.ok(Number.isFinite(contactY), "the contact disc must declare a literal height");

  // Failure one: the disc spent its whole life at y=0.009, buried inside the
  // plinth's own snow cap, depth-rejected by the exact surface it darkens. Both
  // bounds are derived from the geometry that encloses it, so moving the cap or
  // the cache floor cannot leave this assertion pinned to a stale number.
  const ground = /function createObservatoryHomeGroundGeometry[\s\S]*?\n}/.exec(source)?.[0] || "";
  const cap = /CylinderGeometry\(1, 1\.018, 1[\s\S]*?\[0, ([\d.]+), 0\],\s*\[[\d.]+, ([\d.]+),/.exec(ground);
  assert.ok(cap, "the plinth snow cap must stay a locatable cylinder");
  const capTop = Number(cap[1]) + Number(cap[2]) / 2;
  const cacheFloor = /createEntryCacheGeometry[\s\S]*?CylinderGeometry\(1, 1, 1[\s\S]*?\[0, ([\d.]+), 0\],\s*\[[\d.]+, ([\d.]+),/.exec(source);
  assert.ok(cacheFloor, "the buried cache floor must stay a locatable cylinder");
  const cacheTop = Number(cacheFloor[1]) + Number(cacheFloor[2]) / 2;
  assert.ok(
    contactY > capTop,
    `the contact disc at y=${contactY} must clear the plinth cap top at ${capTop} or it is depth-rejected and invisible`,
  );
  assert.ok(
    contactY < cacheTop,
    `the contact disc at y=${contactY} must stay under the cache floor at ${cacheTop} so the excavated interior is unaffected`,
  );

  // Failure two: at renderOrder 1 the disc drew after the docked mascot and
  // painted over the character, which measured 70.3 luma against 132.8.
  const renderOrder = Number(/renderOrder=\{(-?\d+)\}/.exec(plinth)?.[1]);
  assert.ok(
    renderOrder < 0,
    "the contact disc must sort before the other transparents or it paints over the docked mascot",
  );

  // Occlusion, not a flat oval: strength has to come from a falloff the shell's
  // own footprint sits inside, and the disc has to be wider than that footprint
  // or there is no visible tail at all.
  assert.match(plinth, /alphaMap=\{occlusionTexture\}/, "the contact disc must carry a falloff ramp");
  const [scaleX, scaleZ] = /scale=\{\[\s*([\d.]+),\s*([\d.]+),/.exec(plinth).slice(1).map(Number);
  const [footprintX, , footprintZ] = POLAR_DOME_LATTICE_GEOMETRY.radii;
  assert.ok(
    scaleX > footprintX && scaleZ > footprintZ,
    `the contact disc (${scaleX} x ${scaleZ}) must reach past the lattice footprint (${footprintX} x ${footprintZ})`,
  );
  const plateau = Number(/CONTACT_OCCLUSION_FOOTPRINT = ([\d.]+)/.exec(source)?.[1]);
  assert.ok(
    Math.abs(plateau - footprintX / scaleX) < 0.02 && Math.abs(plateau - footprintZ / scaleZ) < 0.02,
    `the occlusion plateau ${plateau} must end where the shell does; at 0.62 against a 1.35 disc the ramp was spent before it cleared the blocks and measured 2.5 luma`,
  );
}

console.log("dome crystal material contract passed");
