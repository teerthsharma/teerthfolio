import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
// Warm hearth inside, cold ice outside. Everything visible through the brick
// suspension gaps and the doorway is the continuous inner shell, so it must be a dark
// warm-neutral body with a sunrise-gold self-glow. The old slate-blue body plus
// subsurface-cyan emissive turned every gap into a cold blue lamp.
requires(
  /OBSERVATORY_INTERIOR_HEARTH_PROFILE[\s\S]*hearthColor: OBSERVATORY_PERSONALITY\.palette\.glow[\s\S]*hearthIntensity[\s\S]*high: 0\.72[\s\S]*medium: 0\.64[\s\S]*shellColor: "#2E2620"/,
  "the dome interior must publish a warm-neutral hearth profile lit by the sunrise-gold glow",
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
  // Warm means warm: R > B on the hearth body colour, not a neutral grey.
  const shellHex = /shellColor: "(#[0-9A-Fa-f]{6})"/.exec(source)[1];
  const [red, , blue] = [1, 3, 5].map((offset) => parseInt(shellHex.slice(offset, offset + 2), 16));
  assert.ok(red > blue, `inner shell body ${shellHex} must be warm-neutral, never blue`);
}
// Professional glacial register: the brick face family must stay desaturated pale
// white-blue. A saturated primary/cornflower face color is the exact regression that
// made the hero dome read as a toy block set.
const faceFamily = { frostIvory: "#D9E6F5", iceBlue: "#B7C9E2", windCap: "#F0F5FA" };
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
requires(
  /brickSeamCore = 1\.0 - smoothstep\(brickSeamAa, brickBevelWidth \* 0\.42/,
  "seams must read as a hairline cut with a separate deep-recess core",
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
  /pointLight[\s\S]*cyan-white-observatory-key-light/,
  "the crystalline blocks need a local cyan-white key light",
);
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
  /visible=\{!shellDemolished\}[\s\S]*\{shellDemolished && <BuriedEntryCache quality=\{tier\} \/>\}/,
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

console.log("dome crystal material contract passed");
