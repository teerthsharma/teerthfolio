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
  /DOME_CRYSTAL_MATERIAL_CONTRACT[\s\S]*bright anime-soft crystalline ice[\s\S]*recessed blue-grey frost[\s\S]*bounded contact-weight optics/,
  "dome must publish the bright crystalline material contract",
);
requires(
  /DOME_CRYSTAL_PALETTE[\s\S]*iceBlue[\s\S]*frostIvory[\s\S]*seamBlueGrey[\s\S]*subsurfaceCyan/,
  "dome must expose separated ice, frost, seam, and subsurface colors",
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
  /DOME_TILE_FALL_PROFILE[\s\S]*gravity[\s\S]*settle[\s\S]*detach/,
  "docked Observatory tiles must publish damped gravity detachment and soft settle",
);
requires(
  /instanceFallOffset[\s\S]*instanceFallVelocity[\s\S]*damped gravity/,
  "tile detachment must carry per-instance fall state instead of collapsing the dome",
);
assert.match(
  sceneSource,
  /<PolarObservatoryDome[\s\S]*pointerInteractionEnabled=\{dockedStationId === "observatory-plaque"\}/,
  "brick pointer lift must only be enabled while docked at Observatory",
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
