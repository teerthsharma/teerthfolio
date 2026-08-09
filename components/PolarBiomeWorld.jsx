"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  POLAR_BIOME_FRAGMENT_SHADER,
  POLAR_BIOME_PROFILES,
  POLAR_BIOME_QUALITY,
  POLAR_BIOME_SHADER_POLICY,
  POLAR_BIOME_VERTEX_SHADER,
  resolveLocalWorldOwnership,
  resolveNearestWeather,
  resolveTwoNearestBiomes as resolveTwoNearestBiomesFromFields,
} from "../lib/polar-biome-fields";
import { POLAR_PROP_CONTACT_COUNT, polarGroundHeight } from "../lib/polar-ground";

export const resolveTwoNearestBiomes = resolveTwoNearestBiomesFromFields;

export const POLAR_BIOME_WORLD_PROFILE =
  "dominant local Antarctic owner with one optional framed neighbor; eight continuous-XZ atmospheres; neutral remote field; singular nearest weather; two programs; zero textures";

export const POLAR_BIOME_WORLD_INTEGRATION = Object.freeze({
  requiredPose: "canonical traversal world XZ; no depth multiplier or world wrapping",
  props: Object.freeze([
    "axisX",
    "depthZ",
    "travelerRef",
    "quality",
    "reducedMotion",
    "safeMode",
    "simulationPaused",
    "visible",
    "onBiomeChange",
  ]),
  drawBudget: POLAR_BIOME_SHADER_POLICY.maxDrawCalls,
  programBudget: POLAR_BIOME_SHADER_POLICY.maxCompiledPrograms,
  textureBudget: POLAR_BIOME_SHADER_POLICY.textures,
});

const TERRAIN_SIZE = 58;
const SKY_RADIUS = 44;
const TERRAIN_RECENTER_STEP = 8;
const DEG_TO_RAD = Math.PI / 180;
const NEUTRAL_FOG_COLOR = "#697CA6";
const NEUTRAL_KEY_COLOR = "#FFEFD8";
const NEUTRAL_FILL_COLOR = "#B8C6DC";
const NEUTRAL_RIM_COLOR = "#DCE8FF";
const NEUTRAL_FOG_DENSITY = 0.0085;
const LOCAL_ENVIRONMENT_CAP = 0.42;

/**
 * Rig neutrality. Station identity may TINT the rig, it may never DYE it.
 * A docked station drives key/fill/rim from its own identity hue at full weight
 * (`environmentCap` is 1 when exclusive), so an unclamped rig paints e.g. a violet
 * key light over every material in the machine shop and eight albedos collapse into
 * one wash. Capping saturation and flooring lightness keeps the hue as a hint while
 * the light stays bright and near-neutral, which is what lets albedo read.
 * The twilight mood is carried by the sky and fog, not by dyeing every surface.
 */
const RIG_NEUTRALITY = Object.freeze({
  key: { saturationCap: 0.16, lightnessFloor: 0.76 },
  fill: { saturationCap: 0.24, lightnessFloor: 0.62 },
  rim: { saturationCap: 0.34, lightnessFloor: 0.68 },
});

/**
 * Station identity in the LIGHT, and why it had to be the hue and only the hue.
 *
 * The rig already composed key/fill/rim from the docked station's authored
 * lighting, so on paper the light was never a constant. Measured, it may as well
 * have been. RIG_NEUTRALITY above caps the key at saturation 0.16 and floors it
 * at lightness 0.76, and every station's authored key runs through that gate, so
 * the eight docked keys resolve to #e7e2dd, #dde2e7, #e7e3dd, #e7e2dd, #dde7e2,
 * #e7dfdd, #eae1e4, #dfdde7 -- a total channel spread of 13/255 across the whole
 * ladder, and two of the eight are BIT-IDENTICAL because observatory-plaque and
 * field-chamber-coils are authored the same #FFD9A3. Eight worlds, seven keys,
 * none of them distinguishable in a picture.
 *
 * The eight ACCENTS do span the world: 8, 43, 145, 175, 205, 228, 255 and 325
 * degrees, a 167-degree spread, all eight distinct and asserted distinct by
 * check-polar-color-continuity. So identity is taken from the accent rather than
 * from the authored key, and taken as HUE ONLY -- setHSL with the rig's own s
 * and l -- which is what makes it free of the neutrality gate rather than
 * fighting it. Saturation is untouched, so the cap has nothing to claw back, and
 * HSL lightness is untouched, so the term cannot open an exposure hole: measured
 * over all eight stations the worst luma excursion a rotation of this size
 * produces is +0.024 on a key already at 0.85, and five of the eight move by
 * under 0.002. The result is eight DISTINCT key hues spanning 177 degrees where
 * there were seven spanning nothing the eye could separate. The neutrality cap
 * still owns the amplitude -- 13/255 of channel spread -- which is the deal: the
 * hue is the station's, the value is Antarctica's.
 *
 * The fill takes the COMPLEMENT of the same hue, which is the whole point of
 * splitting them: a frame gets a key and a fill that disagree in a direction the
 * station chose, instead of eight frames whose key and fill disagree the same
 * way. Bounded at IDENTITY_HUE_LERP and scaled by the dock weight, so the open
 * field between stations keeps the neutral polar rig it is authored to have.
 */
const IDENTITY_HUE_LERP = 0.18;
// ~2s to settle, which is what a dock change should feel like against the
// 0.185s the rest of the rig runs at: the mood turns, it does not cut. 3 time
// constants at 1.5/s is 2.0s to 95%. Pinned to 1 under reduced motion, where an
// animated hue sweep is exactly the kind of unrequested motion that setting
// exists to remove.
const IDENTITY_TRANSITION_RATE = 1.5;

const rigHslScratch = { h: 0, s: 0, l: 0 };
const identityHslScratch = { h: 0, s: 0, l: 0 };

/**
 * Rotate a rig colour toward a hue, keeping its saturation and lightness. The
 * offset is in turns: 0 takes the identity hue, 0.5 takes its complement.
 */
function tintRigHue(color, identity, amount, hueOffsetTurns) {
  if (!(amount > 0)) return color;
  identity.getHSL(identityHslScratch);
  color.getHSL(rigHslScratch);
  // Shortest arc, or a station whose accent sits just across the 0/1 seam sweeps
  // the long way round the wheel and passes through every hue it is not.
  let hueDelta = ((identityHslScratch.h + hueOffsetTurns) % 1) - rigHslScratch.h;
  if (hueDelta > 0.5) hueDelta -= 1;
  else if (hueDelta < -0.5) hueDelta += 1;
  return color.setHSL(
    (rigHslScratch.h + hueDelta * amount + 1) % 1,
    rigHslScratch.s,
    rigHslScratch.l,
  );
}

function neutralizeRigColor(color, { saturationCap, lightnessFloor }) {
  color.getHSL(rigHslScratch);
  if (rigHslScratch.s <= saturationCap && rigHslScratch.l >= lightnessFloor) return color;
  return color.setHSL(
    rigHslScratch.h,
    Math.min(rigHslScratch.s, saturationCap),
    Math.max(rigHslScratch.l, lightnessFloor),
  );
}

function addBiomeRole(geometry, role) {
  const roles = new Float32Array(geometry.getAttribute("position").count);
  roles.fill(role);
  geometry.setAttribute("aBiomeRole", new THREE.BufferAttribute(roles, 1));
  return geometry;
}

function makeTerrainGeometry(policy) {
  const geometry = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    policy.terrainSegments,
    policy.terrainSegments,
  );
  geometry.rotateX(-Math.PI / 2);
  addBiomeRole(geometry, 0);
  geometry.computeBoundingSphere();
  return geometry;
}

function makeSkyGeometry(policy) {
  const geometry = new THREE.SphereGeometry(
    SKY_RADIUS,
    policy.skySegments[0],
    policy.skySegments[1],
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.62,
  );
  addBiomeRole(geometry, 1);
  return geometry;
}

function finishGeographyGeometry(geometry) {
  geometry.computeVertexNormals();
  addBiomeRole(geometry, 2);
  return geometry;
}

function makeGeographyGeometryBank() {
  const plaque = new THREE.CapsuleGeometry(0.17, 0.72, 3, 8);
  plaque.rotateZ(Math.PI / 2);
  const plaquePosition = plaque.getAttribute("position");
  for (let index = 0; index < plaquePosition.count; index += 1) {
    const x = plaquePosition.getX(index);
    const envelope = 0.54 + 0.46 * Math.max(0, 1 - Math.abs(x) / 0.55);
    plaquePosition.setY(
      index,
      plaquePosition.getY(index) * envelope + 0.045 * (envelope - 0.54),
    );
    plaquePosition.setZ(index, plaquePosition.getZ(index) * envelope);
  }
  plaquePosition.needsUpdate = true;

  const upstream = new THREE.CapsuleGeometry(0.13, 0.68, 2, 6);
  upstream.rotateZ(Math.PI / 2);
  const assembly = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  const assemblyPosition = assembly.getAttribute("position");
  for (let index = 0; index < assemblyPosition.count; index += 1) {
    if (assemblyPosition.getY(index) > 0) {
      assemblyPosition.setX(index, assemblyPosition.getX(index) * 0.76 + 0.08);
      assemblyPosition.setZ(index, assemblyPosition.getZ(index) * 0.82);
    }
  }
  assemblyPosition.needsUpdate = true;

  return [
    finishGeographyGeometry(plaque),
    finishGeographyGeometry(new THREE.DodecahedronGeometry(0.58, 0)),
    finishGeographyGeometry(new THREE.TorusGeometry(0.42, 0.072, 5, 14, Math.PI * 1.38)),
    finishGeographyGeometry(new THREE.CylinderGeometry(0.52, 0.57, 1, 6, 1)),
    finishGeographyGeometry(new THREE.CylinderGeometry(0.54, 0.5, 1, 10, 1)),
    finishGeographyGeometry(upstream),
    finishGeographyGeometry(new THREE.BoxGeometry(1, 1, 1, 1, 1, 1)),
    finishGeographyGeometry(assembly),
  ];
}

function seeded(index, salt) {
  const value = Math.sin((index + 1) * (12.9898 + salt * 37.719)) * 43758.5453123;
  return value - Math.floor(value);
}

function rotateLocalToWorld(localX, localZ, angleRadians) {
  const cosine = Math.cos(-angleRadians);
  const sine = Math.sin(-angleRadians);
  return [localX * cosine - localZ * sine, localX * sine + localZ * cosine];
}

/**
 * How deep a body may bed into the snow, as a share of its own half-height.
 *
 * The eight layouts each carry an authored bed depth in world units, and five of
 * them are deeper than the body is tall: measured instance by instance against
 * the geometry bank's own bounding boxes, observatory-plaque, field-chamber-coils,
 * upstream-radio-mast and assembly-tool-locker put every one of their 74 props
 * entirely under the surface — not because the ground rose, but because the
 * depth was authored past the top of the body. Those stations were drawing an
 * instanced mesh that could not produce a pixel.
 *
 * 0.70 is taken from the two layouts that already read: s2-kernel-core beds its
 * deepest stone at 0.71 of half-height and its shallowest at ~0, and
 * topology-archive-wall sits proud throughout. It is a floor, never a lift — a
 * layout that already clears the snow is untouched.
 */
const MAX_GEOGRAPHY_BED_FRACTION = 0.7;

/**
 * How far a prop's contact skirt reaches, in footprints. Deliberately the same
 * number the facility casters use (POLAR_CONTACT_RADIUS_SCALE in
 * lib/polar-ground.js), so a boulder and the building behind it bed into the
 * snow by the same law; check-polar-biome-world asserts the two agree rather
 * than importing it here, because this whole block is evaluated by that
 * contract with THREE and polarGroundHeight and nothing else in scope.
 */
const PROP_CONTACT_RADIUS_SCALE = 1.35;

/**
 * One low-poly prism vocabulary produces eight layouts. Field shaders provide
 * their surface identities; transforms provide the physical geography identity.
 * This runs only when the nearest biome changes, never continuously per frame.
 *
 * `contacts` is the terrain's uPropContacts uniform, filled in place with each
 * body's world XZ and squared skirt radius; the return value is the squared
 * radius of the circle that bounds every skirt, which gates the ground shader's
 * whole prop loop. Both are optional — the placement is what this function is
 * for, and check-polar-biome-world exercises it without a shader.
 */
export function populateGeographyInstances(mesh, profile, instanceCount, contacts = null) {
  if (!mesh || !profile || instanceCount <= 0) return 0;
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const bodyHalfHeight = mesh.geometry.boundingBox.max.y;
  const bodyHalfWidth = mesh.geometry.boundingBox.max.x;
  const bodyHalfDepth = mesh.geometry.boundingBox.max.z;
  let fieldRadius = 0;
  const transform = new THREE.Object3D();
  const angle = profile.angleDegrees * DEG_TO_RAD;
  const kind = profile.fieldKind;
  const plaqueInstanceCount = Math.min(instanceCount, instanceCount >= 32 ? 16 : 12);
  const aetherInstanceCount = Math.max(6, Math.round(instanceCount * 0.25));
  const upstreamInstanceCount = instanceCount >= 32 ? 14 : 10;
  const topologyInstanceCount = instanceCount >= 32 ? 14 : 10;
  const assemblyInstanceCount = instanceCount >= 32 ? 12 : 9;
  let activeInstanceCount = instanceCount;
  if (kind === 0) activeInstanceCount = plaqueInstanceCount;
  else if (kind === 2) activeInstanceCount = aetherInstanceCount;
  else if (kind === 5) activeInstanceCount = upstreamInstanceCount;
  else if (kind === 6) activeInstanceCount = topologyInstanceCount;
  else if (kind === 7) activeInstanceCount = assemblyInstanceCount;

  for (let index = 0; index < activeInstanceCount; index += 1) {
    const progress = activeInstanceCount <= 1 ? 0 : index / (activeInstanceCount - 1);
    const seedA = seeded(index, kind + 0.17);
    const seedB = seeded(index, kind + 0.61);
    let localX = 0;
    let localZ = 0;
    let yaw = -angle;
    let scaleX = 1;
    let scaleY = 0.1;
    let scaleZ = 0.2;
    let positionY = -0.14;
    let roll = 0;
    let pitch = 0;

    if (kind === 0) {
      const theta = progress * Math.PI * 2 + (seedA - 0.5) * 0.18;
      const radius = 5.8 + (index % 3) * 1.24 + seedB * 0.58;
      localX = Math.cos(theta) * radius;
      localZ = Math.sin(theta) * radius * 0.72;
      yaw = -angle - theta + Math.PI / 2;
      scaleX = 0.70 + seedA * 0.45;
      scaleY = 0.50 + seedB * 0.25;
      scaleZ = 0.60 + seedA * 0.35;
      positionY = -0.105 + seedB * 0.018;
    } else if (kind === 1) {
      // The boulder ring read as 32 copies of one stone, and the transforms say
      // why: rotation only about Y, which a near-spherical solid's silhouette
      // barely notices, so the dodecahedron's crest facet pointed up on every
      // instance; and scaleX and scaleZ both driven by seedA, which kept the
      // footprint a single family however the sizes moved. Two more seeds tumble
      // each stone about all three axes and give the three scale axes their own
      // seeds. Still a pure function of the instance index — nothing here is
      // random, so a capture of this ring is the same capture next week.
      const seedC = seeded(index, kind + 0.29);
      const seedD = seeded(index, kind + 0.83);
      const theta = progress * Math.PI * 2 + seedA * 0.18;
      const radius = 4.1 + seedB * 2.2;
      localX = Math.cos(theta) * radius;
      localZ = Math.sin(theta) * radius;
      yaw = -angle - theta + (seedC - 0.5) * 3.0;
      scaleX = 0.54 + seedA * 0.58;
      scaleY = 0.30 + seedD * 0.50;
      scaleZ = 0.44 + seedB * 0.52;
      pitch = (seedC - 0.5) * 1.9;
      roll = (seedD - 0.5) * 1.9;
      positionY = -0.12 + scaleY * 0.16;
    } else if (kind === 2) {
      localX = -5.4 + progress * 10.8;
      localZ = 0.54 * Math.sin(localX * 0.24) + (index % 2 === 0 ? -1.16 : 1.16);
      yaw = -angle - Math.atan(0.1296 * Math.cos(localX * 0.24));
      scaleX = 0.36 + seedA * 0.44;
      scaleY = 0.16 + seedB * 0.38;
      scaleZ = 0.10 + seedA * 0.10;
      positionY = -0.12 + seedB * 0.05;
    } else if (kind === 3) {
      const columns = 6;
      const row = Math.floor(index / columns);
      const column = index % columns;
      // Salt-crust ridges, not a tiled floor: a regular 6-column grid of flat
      // 1.1-wide hexagons is paving, whatever colour it is. Jittered off the grid,
      // elongated along the wind, given real thickness and a heave tilt, the same
      // instances read as wind-broken crust shoved out of the pan.
      localX = (column - 2.5) * 1.75 + (row % 2) * 0.84 + (seedA - 0.5) * 1.15;
      localZ = (row - 1.5) * 1.62 + (seedB - 0.5) * 1.05;
      yaw = -angle + (seedA - 0.5) * 0.9;
      scaleX = 0.52 + seedA * 0.86;
      scaleY = 0.24 + seedB * 0.30;
      scaleZ = 0.26 + seedB * 0.32;
      positionY = -0.24;
      roll = (seedA - 0.5) * 0.34;
    } else if (kind === 4) {
      localX = -7.2 + progress * 14.4;
      const leadAxis = 0.24 * Math.sin(localX * 0.31);
      localZ = leadAxis + (index % 2 === 0 ? -0.88 : 0.88) + (seedB - 0.5) * 0.28;
      yaw = -angle + (seedA - 0.5) * 0.42;
      // Floe blocks either side of the lead. Same pad problem, same fix: the slab
      // gets thickness and a heave tilt so it reads as ice shoved out of a crack.
      scaleX = 0.54 + seedA * 0.78;
      scaleY = 0.32 + seedB * 0.40;
      scaleZ = 0.30 + seedB * 0.46;
      positionY = -0.17;
      roll = (seedB - 0.5) * 0.44;
    } else if (kind === 5) {
      const lane = index % 3;
      localX = -4.8 + progress * 9.6;
      localZ = -2.2 + lane * 2.2 + Math.sin(localX * 0.24) * 0.28;
      scaleX = 0.34 + seedA * 0.34;
      scaleY = 0.28 + seedB * 0.26;
      scaleZ = 0.22 + seedA * 0.20;
      positionY = -0.14 + seedB * 0.02;
    } else if (kind === 6) {
      const row = index % 7;
      localX = -4.6 + seedA * 9.2;
      localZ = -2.55 + row * 0.85 + (seedB - 0.5) * 0.18;
      yaw = -angle + (seedA - 0.5) * 0.2;
      scaleX = 0.22 + seedB * 0.45;
      scaleY = 0.35 + (row % 3) * 0.25 + seedA * 0.3;
      scaleZ = 0.08 + seedA * 0.09;
      positionY = -0.14 + scaleY * 0.5;
    } else {
      const side = index % 2 === 0 ? -1 : 1;
      localX = -4.6 + progress * 9.2;
      localZ = side * (1.35 + (index % 3) * 0.42);
      scaleX = 0.50 + seedA * 0.65;
      scaleY = 0.045 + seedB * 0.055;
      scaleZ = 0.09 + seedA * 0.09;
      positionY = -0.15;
    }

    const [worldOffsetX, worldOffsetZ] = rotateLocalToWorld(localX, localZ, angle);
    const worldX = profile.centerXZ[0] + worldOffsetX;
    const worldZ = profile.centerXZ[1] + worldOffsetZ;
    // Authored positionY is how deep the body beds INTO the snow, not an
    // absolute world Y. Every layout above was tuned against a flat plane, and
    // the sheet has not been flat since it gained the dune field and the 0.38
    // drift bank each station stands in the middle of: measured against
    // polarGroundHeight at each instance's own XZ, 117 of the 160 props across
    // the eight stations had their highest point BELOW the snow, and at
    // s2-kernel-core it was 28 of 32. What still cleared the surface was the top
    // facet alone, which is why a ring of half-metre boulders read as flat pale
    // pentagons lying on the plate. The world dressing hit exactly this and
    // fixed it the same way (buildBand in lib/polar-world-cadence.js); this
    // caller was missed. Runs on biome change only, never per frame.
    //
    // Turned and scaled first, because how high the body reaches depends on how
    // it is turned: the bed clamp was bodyHalfHeight * scaleY, which is the top
    // of an UPRIGHT body, and the boulder ring above now tumbles about all three
    // axes. |matrix.Y row| . halfExtents is that same top for a body at any
    // orientation, and reduces to bodyHalfHeight * scaleY when it stands up.
    transform.rotation.set(pitch, yaw, kind === 2 ? (seedA - 0.5) * 0.16 : roll);
    transform.scale.set(scaleX, scaleY, scaleZ);
    transform.updateMatrix();
    const elements = transform.matrix.elements;
    const reach = (row) =>
      Math.abs(elements[row]) * bodyHalfWidth +
      Math.abs(elements[row + 4]) * bodyHalfHeight +
      Math.abs(elements[row + 8]) * bodyHalfDepth;
    const topReach = reach(1);
    transform.position.set(
      worldX,
      Math.max(positionY, -topReach * MAX_GEOGRAPHY_BED_FRACTION) +
        polarGroundHeight(worldX, worldZ),
      worldZ,
    );
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);

    if (contacts) {
      // The wider of the two horizontal reaches of the TURNED body, by the same
      // rotated-AABB argument as topReach. Taken from scaleX and scaleZ alone
      // this was 0.55 against a 0.70 body at s2-kernel-core: a stone tipped on
      // its side puts its vertical extent into the footprint, and a skirt
      // narrower than the body it belongs to leaves visible exactly the pasted-on
      // edge the skirt exists to remove.
      const contactRadius = Math.max(reach(0), reach(2)) * PROP_CONTACT_RADIUS_SCALE;
      contacts[index * 3] = worldX;
      contacts[index * 3 + 1] = worldZ;
      contacts[index * 3 + 2] = contactRadius * contactRadius;
      fieldRadius = Math.max(
        fieldRadius,
        Math.hypot(worldX - profile.centerXZ[0], worldZ - profile.centerXZ[1]) + contactRadius,
      );
    }
  }

  if (contacts) {
    // A layout that places fewer bodies than the tier's budget leaves stale
    // skirts behind otherwise. Radius 0 is the shader's own "not a prop".
    contacts.fill(0, activeInstanceCount * 3);
  }
  mesh.count = activeInstanceCount;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return fieldRadius * fieldRadius;
}

function makeUniforms(shaderDetail, geographyAbsent = 0) {
  return {
    uTime: { value: 0 },
    uShaderDetail: { value: shaderDetail },
    // 1 only on the tier that draws no distant geography. The sky carries the massifs'
    // light in its horizon band when they are absent; see the GEOGRAPHY STAND-IN note
    // in lib/polar-biome-fields.js for the measurement behind it.
    uGeographyAbsent: { value: geographyAbsent },
    uPrimaryFieldKind: { value: 0 },
    uSecondaryFieldKind: { value: 1 },
    uPrimaryAngle: { value: 0 },
    uSecondaryAngle: { value: 0 },
    uPrimaryWeight: { value: 0 },
    uSecondaryWeight: { value: 0 },
    uPrimaryProximity: { value: 0 },
    uSecondaryProximity: { value: 0 },
    uPrimaryRadius: { value: 10.5 },
    uSecondaryRadius: { value: 8.5 },
    uPrimaryFalloff: { value: 0.62 },
    uSecondaryFalloff: { value: 0.62 },
    uPrimaryFogDensity: { value: 0.012 },
    uSecondaryFogDensity: { value: 0.01 },
    uPrimaryFogHeightFalloff: { value: 0.42 },
    uSecondaryFogHeightFalloff: { value: 0.36 },
    uWeatherFieldKind: { value: -1 },
    uWeatherStrength: { value: 0 },
    uWeatherSpeed: { value: 0 },
    uPrimaryAtmosphereStrength: { value: 1 },
    uWeatherDirection: { value: new THREE.Vector2(1, 0) },
    // Contact skirts for the docked station's local geography props, refilled on
    // biome change by populateGeographyInstances. uPropField.z is the squared
    // radius that gates the terrain's whole prop loop, and 0 here is what keeps
    // the low tier — which draws no props at all — paying one reject and nothing
    // else. See POLAR_PROP_CONTACT_COUNT in lib/polar-ground.js for the fill
    // measurement behind that shape.
    uPropField: { value: new THREE.Vector3(0, 0, 0) },
    uPropContacts: { value: new Float32Array(POLAR_PROP_CONTACT_COUNT * 3) },
    uPrimaryCenterXZ: { value: new THREE.Vector2() },
    uSecondaryCenterXZ: { value: new THREE.Vector2() },
    uTravelerXZ: { value: new THREE.Vector2() },
    // Heading the seal is actually travelling, so its ground shadow can carry
    // the body's 2:1 axial-to-lateral shape instead of a circle. Held through a
    // stop rather than snapping to zero.
    uTravelerDir: { value: new THREE.Vector2(1, 0) },
    uPrimaryLightDirection: { value: new THREE.Vector3(-0.42, 0.84, 0.34) },
    uSecondaryLightDirection: { value: new THREE.Vector3(-0.42, 0.84, 0.34) },
    uPrimaryBaseColor: { value: new THREE.Color("#C9D5D9") },
    uPrimarySecondaryColor: { value: new THREE.Color("#A9C9C4") },
    uPrimaryAccentColor: { value: new THREE.Color("#5CC9C2") },
    uPrimaryGlowColor: { value: new THREE.Color("#F2B96B") },
    uPrimaryFogColor: { value: new THREE.Color("#3C5B60") },
    uPrimaryInkColor: { value: new THREE.Color("#232E52") },
    uPrimaryShadowColor: { value: new THREE.Color("#33475E") },
    uPrimaryAtmosphereColor: { value: new THREE.Color("#22354F") },
    uPrimaryAtmosphereGlow: { value: new THREE.Color("#5A93A8") },
    uSecondaryBaseColor: { value: new THREE.Color("#B4C7D4") },
    uSecondarySecondaryColor: { value: new THREE.Color("#8CA6BB") },
    uSecondaryAccentColor: { value: new THREE.Color("#5573E0") },
    uSecondaryGlowColor: { value: new THREE.Color("#A5E9FF") },
    uSecondaryFogColor: { value: new THREE.Color("#364F5E") },
    uSecondaryInkColor: { value: new THREE.Color("#232E52") },
    uSecondaryShadowColor: { value: new THREE.Color("#3A5570") },
    uSecondaryAtmosphereColor: { value: new THREE.Color("#1E3252") },
    uSecondaryAtmosphereGlow: { value: new THREE.Color("#5573E0") },
  };
}

function makeMaterial(uniforms, role) {
  const sky = role === "sky";
  const material = new THREE.ShaderMaterial({
    // The sky dome and the ground sheet share one authored shader but not one
    // program: the role used to be a per-vertex attribute branched at runtime,
    // which meant both programs handed ANGLE all 60k characters and each paid
    // ~4.2s translating the other role's half on a cold visit. As a define, the
    // preprocessor drops the unused half before the translator ever sees it.
    // The ground program keeps its own runtime test between terrain and local
    // geography, which do share a draw.
    defines: sky ? { BIOME_ROLE_SKY: "" } : {},
    depthTest: true,
    depthWrite: !sky,
    fragmentShader: POLAR_BIOME_FRAGMENT_SHADER,
    side: sky ? THREE.BackSide : THREE.FrontSide,
    toneMapped: false,
    uniforms,
    vertexShader: POLAR_BIOME_VERTEX_SHADER,
  });
  material.name = `polar-biome-world-${role}`;
  material.customProgramCacheKey = () => `polar-biome-world:${role}`;
  return material;
}

function setLightDirection(target, light) {
  const azimuth = light.azimuth * DEG_TO_RAD;
  const elevation = light.elevation * DEG_TO_RAD;
  const horizontal = Math.cos(elevation);
  return target.set(
    Math.sin(azimuth) * horizontal,
    Math.sin(elevation),
    Math.cos(azimuth) * horizontal,
  );
}

function applyProfileUniforms(uniforms, prefix, entry) {
  const profile = entry.profile;
  uniforms[`u${prefix}FieldKind`].value = profile.fieldKind;
  uniforms[`u${prefix}Angle`].value = profile.angleDegrees * DEG_TO_RAD;
  uniforms[`u${prefix}Weight`].value = entry.weight;
  uniforms[`u${prefix}Proximity`].value = entry.proximity;
  uniforms[`u${prefix}Radius`].value = profile.radius;
  uniforms[`u${prefix}Falloff`].value = profile.falloff;
  uniforms[`u${prefix}FogDensity`].value = profile.fog.density;
  uniforms[`u${prefix}FogHeightFalloff`].value = profile.fog.heightFalloff;
  uniforms[`u${prefix}CenterXZ`].value.set(profile.centerXZ[0], profile.centerXZ[1]);
  setLightDirection(uniforms[`u${prefix}LightDirection`].value, profile.light);
  uniforms[`u${prefix}BaseColor`].value.set(profile.colors.base);
  uniforms[`u${prefix}SecondaryColor`].value.set(profile.colors.secondary);
  uniforms[`u${prefix}AccentColor`].value.set(profile.accent);
  uniforms[`u${prefix}GlowColor`].value.set(profile.colors.glow);
  uniforms[`u${prefix}FogColor`].value.set(profile.colors.fog);
  uniforms[`u${prefix}InkColor`].value.set(profile.colors.ink);
  uniforms[`u${prefix}ShadowColor`].value.set(profile.shadow);
  uniforms[`u${prefix}AtmosphereColor`].value.set(profile.atmosphere.colors[0]);
  uniforms[`u${prefix}AtmosphereGlow`].value.set(profile.atmosphere.colors[1]);
  if (prefix === "Primary") {
    uniforms.uPrimaryAtmosphereStrength.value = profile.atmosphere.particleStrength;
  }
}

function syncUniforms(uniformSets, blend, weather, time, shaderDetail, travelerXZ, travelerDir) {
  for (const uniforms of uniformSets) {
    uniforms.uTime.value = time;
    uniforms.uShaderDetail.value = shaderDetail;
    applyProfileUniforms(uniforms, "Primary", blend.primary);
    applyProfileUniforms(uniforms, "Secondary", blend.secondary);
    uniforms.uTravelerXZ.value.set(travelerXZ[0], travelerXZ[1]);
    if (travelerDir) uniforms.uTravelerDir.value.set(travelerDir[0], travelerDir[1]);
    if (weather) {
      uniforms.uWeatherFieldKind.value = weather.fieldKind;
      uniforms.uWeatherStrength.value = weather.opacity * weather.influence;
      uniforms.uWeatherSpeed.value = weather.speed;
      uniforms.uWeatherDirection.value.set(
        weather.weatherVector[0],
        weather.weatherVector[1],
      );
    } else {
      uniforms.uWeatherFieldKind.value = -1;
      uniforms.uWeatherStrength.value = 0;
      uniforms.uWeatherSpeed.value = 0;
    }
  }
}

function PolarBiomeWorldStage({
  axisX,
  depthZ,
  exclusiveStationId,
  onBiomeChange,
  quality,
  reducedMotion,
  safeMode,
  simulationPaused,
  // Ablation only. The sky dome and the ground sheet share one authored shader
  // and one component, so qa-no-terrain removes both and cannot say which of
  // the two owns the frame time it saves.
  skyVisible = true,
  terrainVisible = true,
  travelerRef,
}) {
  const skyRef = useRef(null);
  const keyLightRef = useRef(null);
  const fillLightRef = useRef(null);
  const simulationTime = useRef(0);
  const telemetryElapsed = useRef(0);
  const primaryBiomeId = useRef(undefined);
  const positionScratch = useRef([0, 0]);
  // Last non-zero travel heading, so a stopped seal keeps the shadow it had
  // rather than snapping its long axis to +x.
  const headingScratch = useRef([1, 0]);
  const ownershipScratch = useRef({
    blend: { entries: [{}, {}], primary: null, secondary: null },
    visibleStationIds: [],
  });
  const weatherScratch = useRef({});
  const weatherOptions = useRef({
    quality,
    reducedMotion,
    safeMode,
    target: weatherScratch.current,
  });
  const qualityPolicy = POLAR_BIOME_QUALITY[quality] || POLAR_BIOME_QUALITY.medium;
  const keyLightTarget = useMemo(() => new THREE.Object3D(), []);
  const fillLightTarget = useMemo(() => new THREE.Object3D(), []);
  const environmentScratch = useMemo(
    () => ({
      primaryColor: new THREE.Color(),
      secondaryColor: new THREE.Color(),
      fogColor: new THREE.Color(),
      keyColor: new THREE.Color(),
      fillColor: new THREE.Color(),
      rimColor: new THREE.Color(),
      // The docked station's accent, settled on its own slow clock so a dock
      // change turns the rig's hue over ~2s instead of cutting to it.
      identityAccent: new THREE.Color(NEUTRAL_KEY_COLOR),
      primaryDirection: new THREE.Vector3(),
      secondaryDirection: new THREE.Vector3(),
      blendedDirection: new THREE.Vector3(),
      desiredKeyPosition: new THREE.Vector3(),
      desiredFillPosition: new THREE.Vector3(),
    }),
    [],
  );
  const terrainGeometry = useMemo(() => makeTerrainGeometry(qualityPolicy), [qualityPolicy]);
  const skyGeometry = useMemo(() => makeSkyGeometry(qualityPolicy), [qualityPolicy]);
  const geographyGeometryBank = useMemo(
    () => (qualityPolicy.geographyInstances > 0 ? makeGeographyGeometryBank() : null),
    [qualityPolicy.geographyInstances],
  );
  const geographyAbsent = qualityPolicy.geographyInstances > 0 ? 0 : 1;
  const solidUniforms = useMemo(
    () => makeUniforms(qualityPolicy.shaderDetail, geographyAbsent),
    [qualityPolicy.shaderDetail, geographyAbsent],
  );
  const skyUniforms = useMemo(
    () => makeUniforms(qualityPolicy.shaderDetail, geographyAbsent),
    [qualityPolicy.shaderDetail, geographyAbsent],
  );
  const solidMaterial = useMemo(() => makeMaterial(solidUniforms, "solid"), [solidUniforms]);
  const skyMaterial = useMemo(() => makeMaterial(skyUniforms, "sky"), [skyUniforms]);
  const terrainMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(terrainGeometry, solidMaterial, 1);
    const identity = new THREE.Matrix4();
    mesh.setMatrixAt(0, identity);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = "polar-biome-recyclable-terrain";
    // NO receiveShadow, deliberately, and the flag is absent rather than false
    // because setting it true here is what made a reader conclude the scene's
    // shadow map was rendered for nobody.
    //
    // It is not. IglooScene mounts the Canvas with `shadows` and sets
    // gl.shadowMap.enabled, and the key light below is the scene's only
    // shadow-casting light; the station mechanisms, the observatory dome, the
    // seal avatar and the mascot are all receiveShadow meshes on
    // MeshStandardMaterial, so the depth pass reaches the picture on every lit
    // body in the world. Ablating it (qa-no-shadows) moves those bodies. What it
    // never reached is THIS mesh, because the ground is drawn by a hand-written
    // ShaderMaterial carrying its own lighting -- so `receiveShadow` on it was
    // inert, and the honest way to say that is not to claim it.
    //
    // Wiring the shadow chunks in was measured against the contracts rather than
    // guessed at, and it loses on all three: a shadow map is a sampler bind, and
    // POLAR_BIOME_SHADER_POLICY.textures is 0; reading it needs `lights: true`,
    // which injects the renderer's light-count defines into both biome programs
    // and makes the point-light COUNT this world pins a recompile trigger for the
    // largest shader in the frame; and PCFSoft is a per-fragment tap cluster on
    // the biggest surface on a GPU that already spends ~13.9 ms/Mpx here.
    //
    // It would also buy nothing new. lib/polar-ground.js already solves the same
    // darkening in closed form -- eight station envelopes, the traveler and the
    // 32 local-geography props, each behind a cheap XZ reject -- and it solves
    // the half a depth map CANNOT: contact occlusion is a sky term, and a polar
    // key throws its shadow out of frame at five of the eight docked bearings.
    mesh.frustumCulled = false;
    mesh.renderOrder = -20;
    return mesh;
  }, [solidMaterial, terrainGeometry]);
  const geographyMesh = useMemo(() => {
    if (!geographyGeometryBank || qualityPolicy.geographyInstances <= 0) return null;
    const mesh = new THREE.InstancedMesh(
      geographyGeometryBank[0],
      solidMaterial,
      qualityPolicy.geographyInstances,
    );
    mesh.name = "polar-biome-nearest-local-geography";
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Same shader as the terrain, so the same two flags would be the same two
    // no-ops; see the note on the terrain mesh above. The props are darkened by
    // polarPropContact instead, which is what puts a skirt on the snow under
    // them rather than a shadow on them.
    mesh.castShadow = false;
    mesh.frustumCulled = false;
    mesh.count = 0;
    return mesh;
  }, [geographyGeometryBank, qualityPolicy.geographyInstances, solidMaterial]);
  const uniformSets = useMemo(() => [solidUniforms, skyUniforms], [skyUniforms, solidUniforms]);

  // A quality change rebuilds the geography mesh and the uniform set, and both
  // come back empty — count 0, and a prop-skirt gate of 0. The biome has NOT
  // changed, and the id that decides that is a ref which survives the rebuild,
  // so nothing refilled either one until the player happened to walk to a
  // different station: every switch out of low and back dropped the local props
  // on the floor. Forgetting the id is what makes the next frame refill them.
  useEffect(() => {
    primaryBiomeId.current = undefined;
  }, [geographyMesh, solidUniforms]);

  useEffect(
    () => () => {
      terrainGeometry.dispose();
      skyGeometry.dispose();
      geographyGeometryBank?.forEach((geometry) => geometry.dispose());
      solidMaterial.dispose();
      skyMaterial.dispose();
    },
    [geographyGeometryBank, skyGeometry, skyMaterial, solidMaterial, terrainGeometry],
  );

  useFrame(({ gl, scene }, delta) => {
    const refPose = travelerRef?.current;
    const x = Number.isFinite(refPose?.x) ? refPose.x : axisX;
    const z = Number.isFinite(refPose?.z) ? refPose.z : depthZ;
    positionScratch.current[0] = Number.isFinite(x) ? x : 0;
    positionScratch.current[1] = Number.isFinite(z) ? z : 0;
    const travelX = Number.isFinite(refPose?.vx) ? refPose.vx : 0;
    const travelZ = Number.isFinite(refPose?.vz) ? refPose.vz : 0;
    const travelSpeed = Math.hypot(travelX, travelZ);
    if (travelSpeed > 0.05) {
      headingScratch.current[0] = travelX / travelSpeed;
      headingScratch.current[1] = travelZ / travelSpeed;
    }
    const ownership = resolveLocalWorldOwnership(
      positionScratch.current,
      ownershipScratch.current,
      { exclusiveStationId },
    );
    const blend = ownership.blend;
    weatherOptions.current.quality = quality;
    weatherOptions.current.reducedMotion = reducedMotion;
    weatherOptions.current.safeMode = safeMode;
    const weather = resolveNearestWeather(blend, weatherOptions.current);
    const currentBiomeId = ownership.current?.id || null;
    const biomeChanged = primaryBiomeId.current !== currentBiomeId;
    telemetryElapsed.current += Math.min(Math.max(delta, 0), 0.05);
    if (biomeChanged || telemetryElapsed.current >= 0.25) {
      telemetryElapsed.current = 0;
      const canvasData = gl.domElement.dataset;
      canvasData.biomeDrawBudget = String(qualityPolicy.drawCalls);
      canvasData.biomeProgramBudget = String(POLAR_BIOME_SHADER_POLICY.maxCompiledPrograms);
      canvasData.biomeTextureBudget = String(POLAR_BIOME_SHADER_POLICY.textures);
      canvasData.biomePrimary = currentBiomeId || "";
      canvasData.biomeFramedNeighbor = ownership.framedNeighbor?.id || "";
      canvasData.biomePrimaryWeight = blend.primary.weight.toFixed(4);
      canvasData.biomeSecondaryWeight = blend.secondary.weight.toFixed(4);
      // The settled rig, published so "does the station hue reach the light"
      // can be answered from a running page rather than by re-deriving the
      // composition offline. Both are already-lerped THREE.Colors; this is the
      // only place they are readable from outside the frame loop.
      if (keyLightRef.current && fillLightRef.current) {
        canvasData.biomeKeyColor = `#${keyLightRef.current.color.getHexString()}`;
        canvasData.biomeFillColor = `#${fillLightRef.current.color.getHexString()}`;
      }
    }

    if (!simulationPaused && !reducedMotion) {
      simulationTime.current += Math.min(Math.max(delta, 0), 0.05);
    }
    const shaderTime = reducedMotion ? 0 : simulationTime.current;
    syncUniforms(
      uniformSets,
      blend,
      weather,
      shaderTime,
      qualityPolicy.shaderDetail,
      positionScratch.current,
      headingScratch.current,
    );

    const environmentAlpha = reducedMotion
      ? 1
      : 1 - Math.exp(-Math.min(Math.max(delta, 0), 0.05) * 5.4);
    const primaryProfile = blend.primary.profile;
    const secondaryProfile = blend.secondary.profile;
    const primaryWeight = blend.primary.weight;
    const secondaryWeight = blend.secondary.weight;
    const environmentCap = exclusiveStationId ? 1 : LOCAL_ENVIRONMENT_CAP;
    const primaryEnvironmentWeight = primaryWeight * environmentCap;
    const secondaryEnvironmentWeight = secondaryWeight * environmentCap;
    const neutralEnvironmentWeight =
      1 - primaryEnvironmentWeight - secondaryEnvironmentWeight;
    environmentScratch.fogColor
      .set(NEUTRAL_FOG_COLOR)
      .multiplyScalar(neutralEnvironmentWeight)
      .add(
        environmentScratch.primaryColor
          .set(primaryProfile.fog.color)
          .multiplyScalar(primaryEnvironmentWeight),
      )
      .add(
        environmentScratch.secondaryColor
          .set(secondaryProfile.fog.color)
          .multiplyScalar(secondaryEnvironmentWeight),
      );
    if (scene.fog?.isFogExp2) {
      scene.fog.color.lerp(environmentScratch.fogColor, environmentAlpha);
      const fogDensity =
        (NEUTRAL_FOG_DENSITY * neutralEnvironmentWeight +
          primaryProfile.fog.density * primaryEnvironmentWeight +
          secondaryProfile.fog.density * secondaryEnvironmentWeight) *
        0.68;
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, fogDensity, environmentAlpha);
    }

    if (keyLightRef.current && fillLightRef.current) {
      environmentScratch.keyColor
        .set(NEUTRAL_KEY_COLOR)
        .multiplyScalar(neutralEnvironmentWeight)
        .add(
          environmentScratch.primaryColor
            .set(primaryProfile.light.key)
            .multiplyScalar(primaryEnvironmentWeight),
        )
        .add(
          environmentScratch.secondaryColor
            .set(secondaryProfile.light.key)
            .multiplyScalar(secondaryEnvironmentWeight),
        );
      environmentScratch.fillColor
        .set(NEUTRAL_FILL_COLOR)
        .multiplyScalar(neutralEnvironmentWeight)
        .add(
          environmentScratch.primaryColor
            .set(primaryProfile.light.fill)
            .multiplyScalar(primaryEnvironmentWeight),
        )
        .add(
          environmentScratch.secondaryColor
            .set(secondaryProfile.light.fill)
            .multiplyScalar(secondaryEnvironmentWeight),
        );
      environmentScratch.rimColor
        .set(NEUTRAL_RIM_COLOR)
        .multiplyScalar(neutralEnvironmentWeight)
        .add(
          environmentScratch.primaryColor
            .set(primaryProfile.light.rim)
            .multiplyScalar(primaryEnvironmentWeight),
        )
        .add(
          environmentScratch.secondaryColor
            .set(secondaryProfile.light.rim)
            .multiplyScalar(secondaryEnvironmentWeight),
        );
      // Station hue, settled on its own clock and weighted by how docked we are,
      // so the open field keeps the neutral polar rig. See IDENTITY_HUE_LERP.
      const identityAlpha = reducedMotion
        ? 1
        : 1 - Math.exp(-Math.min(Math.max(delta, 0), 0.05) * IDENTITY_TRANSITION_RATE);
      environmentScratch.identityAccent.lerp(
        environmentScratch.primaryColor.set(primaryProfile.accent),
        identityAlpha,
      );
      const identityHueWeight =
        (primaryEnvironmentWeight + secondaryEnvironmentWeight) * IDENTITY_HUE_LERP;
      tintRigHue(
        environmentScratch.keyColor,
        environmentScratch.identityAccent,
        identityHueWeight,
        0,
      );
      neutralizeRigColor(environmentScratch.keyColor, RIG_NEUTRALITY.key);
      neutralizeRigColor(environmentScratch.rimColor, RIG_NEUTRALITY.rim);
      environmentScratch.fillColor.lerp(environmentScratch.rimColor, 0.32);
      // The fill takes the complement, which is what makes the key/fill split
      // itself carry the station rather than both ends drifting together.
      tintRigHue(
        environmentScratch.fillColor,
        environmentScratch.identityAccent,
        identityHueWeight,
        0.5,
      );
      neutralizeRigColor(environmentScratch.fillColor, RIG_NEUTRALITY.fill);
      keyLightRef.current.color.lerp(environmentScratch.keyColor, environmentAlpha);
      fillLightRef.current.color.lerp(environmentScratch.fillColor, environmentAlpha);

      setLightDirection(environmentScratch.primaryDirection, primaryProfile.light);
      setLightDirection(environmentScratch.secondaryDirection, secondaryProfile.light);
      environmentScratch.blendedDirection
        .set(-0.42, 0.84, 0.34)
        .normalize()
        .multiplyScalar(neutralEnvironmentWeight)
        .addScaledVector(
          environmentScratch.primaryDirection,
          primaryEnvironmentWeight,
        )
        .addScaledVector(
          environmentScratch.secondaryDirection,
          secondaryEnvironmentWeight,
        )
        .normalize();
      environmentScratch.desiredKeyPosition
        .set(positionScratch.current[0], 0, positionScratch.current[1])
        .addScaledVector(environmentScratch.blendedDirection, 11.5);
      environmentScratch.desiredFillPosition
        .set(positionScratch.current[0], 0.8, positionScratch.current[1])
        .addScaledVector(environmentScratch.blendedDirection, -7.5);
      keyLightRef.current.position.lerp(environmentScratch.desiredKeyPosition, environmentAlpha);
      fillLightRef.current.position.lerp(environmentScratch.desiredFillPosition, environmentAlpha);
      keyLightTarget.position.lerp(
        environmentScratch.desiredFillPosition.set(
          positionScratch.current[0],
          0.15,
          positionScratch.current[1],
        ),
        environmentAlpha,
      );
      fillLightTarget.position.copy(keyLightTarget.position);

      const approachEnergy = 0.12 * blend.totalInfluence;
      const keyIntensity = Math.min(1.84, 1.68 + approachEnergy);
      const fillIntensity =
        0.72 +
        primaryProfile.light.fillStrength * primaryEnvironmentWeight +
        secondaryProfile.light.fillStrength * secondaryEnvironmentWeight;
      keyLightRef.current.intensity = THREE.MathUtils.lerp(
        keyLightRef.current.intensity,
        keyIntensity,
        environmentAlpha,
      );
      fillLightRef.current.intensity = THREE.MathUtils.lerp(
        fillLightRef.current.intensity,
        fillIntensity,
        environmentAlpha,
      );
    }

    terrainMesh.position.set(
      Math.round(positionScratch.current[0] / TERRAIN_RECENTER_STEP) * TERRAIN_RECENTER_STEP,
      -0.22,
      Math.round(positionScratch.current[1] / TERRAIN_RECENTER_STEP) * TERRAIN_RECENTER_STEP,
    );
    if (skyRef.current) {
      skyRef.current.position.set(positionScratch.current[0], -0.3, positionScratch.current[1]);
    }

    if (biomeChanged) {
      primaryBiomeId.current = currentBiomeId;
      if (geographyMesh) {
        if (ownership.current) {
          geographyMesh.geometry =
            geographyGeometryBank[ownership.current.profile.fieldKind];
          const ownerProfile = POLAR_BIOME_PROFILES[ownership.current.id];
          const fieldRadiusSquared = populateGeographyInstances(
            geographyMesh,
            ownerProfile,
            qualityPolicy.geographyInstances,
            solidUniforms.uPropContacts.value,
          );
          solidUniforms.uPropField.value.set(
            ownerProfile.centerXZ[0],
            ownerProfile.centerXZ[1],
            fieldRadiusSquared,
          );
        } else {
          geographyMesh.count = 0;
          geographyMesh.instanceMatrix.needsUpdate = true;
          // No props drawn, no skirts on the snow, and the ground's prop loop
          // closes at its single field reject.
          solidUniforms.uPropField.value.z = 0;
        }
      }
      onBiomeChange?.({
        id: currentBiomeId,
        proximity: ownership.current?.proximity || 0,
        secondaryId: ownership.framedNeighbor?.id || null,
      });
    }
  });

  return (
    <group name={POLAR_BIOME_WORLD_PROFILE}>
      <primitive object={keyLightTarget} />
      <primitive object={fillLightTarget} />
      <directionalLight
        castShadow
        color={NEUTRAL_KEY_COLOR}
        intensity={1.68}
        name="polar-biome-key-light"
        ref={keyLightRef}
        shadow-bias={-0.00018}
        shadow-camera-bottom={-6}
        shadow-camera-far={24}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-mapSize={[1024, 1024]}
        target={keyLightTarget}
      />
      <directionalLight
        color={NEUTRAL_FILL_COLOR}
        intensity={0.7}
        name="polar-biome-fill-rim-light"
        ref={fillLightRef}
        target={fillLightTarget}
      />
      {/* Ablation only, alongside skyVisible. qa-no-terrain unmounts this whole
          component, which also takes the scene's two directional lights with
          it, so it was never measuring the ground sheet on its own. */}
      <primitive dispose={null} object={terrainMesh} visible={terrainVisible} />
      {/* Early-z fill guard: the sky dome is opaque, depth-tested, and never
          writes depth, so drawing it AFTER the terrain (-19 vs -20) lets the
          depth buffer reject every heavy sky fragment the terrain already
          covers. Both meshes are opaque, so the final image is identical to
          the old sky-first order — only the overdraw is gone. */}
      <mesh
        frustumCulled={false}
        geometry={skyGeometry}
        material={skyMaterial}
        name="polar-biome-authored-sky"
        ref={skyRef}
        renderOrder={-19}
        visible={skyVisible}
      />
      {geographyMesh ? <primitive dispose={null} object={geographyMesh} /> : null}
    </group>
  );
}

export default function PolarBiomeWorld({
  axisX = 0,
  depthZ = 0,
  exclusiveStationId = null,
  onBiomeChange = null,
  quality = "medium",
  reducedMotion = false,
  skyVisible = true,
  terrainVisible = true,
  safeMode = false,
  simulationPaused = false,
  travelerRef = null,
  visible = true,
}) {
  if (!visible || safeMode) return null;
  return (
    <PolarBiomeWorldStage
      axisX={axisX}
      depthZ={depthZ}
      exclusiveStationId={exclusiveStationId}
      onBiomeChange={onBiomeChange}
      quality={quality}
      reducedMotion={reducedMotion}
      safeMode={safeMode}
      simulationPaused={simulationPaused}
      skyVisible={skyVisible}
      terrainVisible={terrainVisible}
      travelerRef={travelerRef}
    />
  );
}
