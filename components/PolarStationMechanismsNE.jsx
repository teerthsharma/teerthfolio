import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  NE_MECHANISM_BUDGET,
  NE_MECHANISM_IDS,
  NE_MECHANISM_PROFILES,
  NE_MONUMENT_CONTRACTS,
  QPU_MANIFOLD_LAYOUT,
  advanceNortheastMechanisms,
  createNortheastMechanismSystem,
  resolveQpuConstructionStep,
  resolveNortheastMechanismInputs,
  resolveNortheastStationReveal,
  sampleQpuManifoldPoint,
} from "../lib/polar-station-mechanisms";

export const NORTHEAST_MECHANISM_RENDER_PROFILE =
  "four authored northeast monuments; three bounded architectural instance pools each; shared wrapped-light program; zero textures";
export const S2_CRYOGENIC_LAB_PROFILE =
  "long cobalt/CERN Penning-trap cryogenic laboratory chamber: cobalt shell, machined pale metal, bright cyan diagnostics and diagnostic rails, coils, calibration collars, and cobalt/cyan axial halo";
export const AETHER_ABYSS_PROFILE =
  "abyss-blue primordial sanctuary: readable deep-ocean holder, one golden seed, golden deterministic motes, and restrained caustic arcs";
export const FIELD_THERMAL_FORGE_PROFILE =
  "graphite thermal land with copper opposed coils and a large orange-white plasma heater below it, contained plasma, and a living heat shimmer";
export const QPU_ALIEN_COHERENCE_PROFILE =
  "continuous sampled Riemann-manifold ice pavilion: alien jade dock band, iridescent cyan contiguous floor shell and ribs, slender abutments, and a coherence verification beam";

const TWO_PI = Math.PI * 2;
const S2_KERNEL_SHELL_GAP = 0.25;
const S2_DIAGNOSTIC_HALF_SPAN = 1.72;
const AETHER_DOMINANT_SEED_RADIUS = 0.34;
const FIELD_HEATER_HALF_LENGTH = 0.92;
const QPU_BRIDGE_HALF_SPAN = QPU_MANIFOLD_LAYOUT.halfSpan;
const QPU_ABUTMENT_RADIUS = 0.09;
const QPU_ABUTMENT_HEIGHT = 0.52;
const QPU_MANIFOLD_SLICE_COUNT = QPU_MANIFOLD_LAYOUT.sliceCount;
const QPU_SIGNAL_BASE_LENGTH = 0.43;
const QPU_INVERSE_BRIDGE_LIFT = 0.58;
const REDUCED_MOTION_SHADER_TIME = 0.75;
const EMPTY_RENDER_RESOURCES = Object.freeze({
  geometries: Object.freeze({}),
  materialList: Object.freeze([]),
  materials: Object.freeze({}),
});

const STATION_TRANSFORMS = Object.freeze(
  Object.fromEntries(
    NE_MECHANISM_IDS.map((id) => {
      const profile = NE_MECHANISM_PROFILES[id];
      return [
        id,
        Object.freeze({
          position: Object.freeze([profile.centerXZ[0], profile.y, profile.centerXZ[1]]),
          rotation: Object.freeze([0, THREE.MathUtils.degToRad(profile.angleDegrees), 0]),
        }),
      ];
    }),
  ),
);

const QUALITY_GEOMETRY = Object.freeze({
  high: Object.freeze({ bevel: 3, cap: 8, curve: 96, radial: 10, round: 32 }),
  medium: Object.freeze({ bevel: 2, cap: 6, curve: 68, radial: 8, round: 24 }),
  low: Object.freeze({ bevel: 1, cap: 4, curve: 36, radial: 6, round: 14 }),
});

function geometryPolicy(quality) {
  return QUALITY_GEOMETRY[quality] || QUALITY_GEOMETRY.medium;
}

function bakeGeometry(
  geometry,
  {
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
  } = {},
) {
  let baked = geometry;
  if (geometry.index) {
    baked = geometry.toNonIndexed();
    geometry.dispose();
  }
  for (const attribute of Object.keys(baked.attributes)) {
    if (attribute !== "position" && attribute !== "normal") {
      baked.deleteAttribute(attribute);
    }
  }
  if (!baked.getAttribute("normal")) baked.computeVertexNormals();
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  );
  baked.applyMatrix4(matrix);
  return baked;
}

function mergeParts(parts, name) {
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error(`Unable to merge northeast monument geometry: ${name}`);
  geometry.name = name;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function roundedPart(policy, size, position, rotation = [0, 0, 0], radius = 0.06) {
  return bakeGeometry(
    new RoundedBoxGeometry(
      size[0],
      size[1],
      size[2],
      policy.bevel,
      Math.min(radius, Math.min(...size) * 0.46),
    ),
    { position, rotation },
  );
}

function cylinderPart(
  policy,
  radiusTop,
  radiusBottom,
  height,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
) {
  return bakeGeometry(
    new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      policy.round,
      1,
      false,
    ),
    { position, rotation, scale },
  );
}

function torusPart(
  policy,
  radius,
  tube,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  arc = TWO_PI,
) {
  return bakeGeometry(
    new THREE.TorusGeometry(
      radius,
      tube,
      policy.radial,
      policy.curve,
      arc,
    ),
    { position, rotation, scale },
  );
}

function tubePart(policy, curve, radius, name, closed = false) {
  const geometry = bakeGeometry(
    new THREE.TubeGeometry(
      curve,
      policy.curve,
      radius,
      policy.radial,
      closed,
    ),
  );
  geometry.name = name;
  return geometry;
}

function createS2AntimatterCryostatGeometry(quality) {
  const policy = geometryPolicy(quality);
  const parts = [
    cylinderPart(policy, 1.46, 1.62, 0.22, [0, -0.58, 0], [0, 0, 0], [1.28, 1, 0.74]),
    cylinderPart(policy, 1.18, 1.3, 0.1, [0, -0.43, 0], [0, 0, 0], [1.32, 1, 0.72]),
    torusPart(policy, 1.14, 0.065, [0, -0.36, 0], [Math.PI / 2, 0, 0], [1.32, 1, 0.72]),
    cylinderPart(policy, 0.3, 0.36, 2.9, [0, 0.08, 0], [0, 0, Math.PI / 2]),
    cylinderPart(policy, 0.44, 0.44, 0.24, [-1.54, 0.08, 0], [0, 0, Math.PI / 2]),
    cylinderPart(policy, 0.44, 0.44, 0.24, [1.54, 0.08, 0], [0, 0, Math.PI / 2]),
    roundedPart(policy, [3.42, 0.12, 0.2], [0, -0.33, 0.5], [0, 0, 0], 0.045),
    roundedPart(policy, [3.42, 0.12, 0.2], [0, -0.33, -0.5], [0, 0, 0], 0.045),
  ];
  for (const x of [-1.5, 1.5]) {
    for (const z of [-0.5, 0.5]) {
      parts.push(
        roundedPart(policy, [0.18, 0.78, 0.22], [x, -0.02, z], [0, 0, x * -0.035], 0.05),
        cylinderPart(policy, 0.105, 0.125, 0.18, [x, 0.42, z]),
      );
    }
  }
  const axialRails = [
    roundedPart(policy, [3.68, 0.055, 0.075], [0, -0.5, 0.31], [0, 0, 0], 0.02),
    roundedPart(policy, [3.68, 0.055, 0.075], [0, -0.5, -0.31], [0, 0, 0], 0.02),
  ];
  for (const rail of axialRails) rail.name = "s2-machined-axial-rails";
  parts.push(...axialRails);
  const calibrationCollars = [-1.44, -0.96, -0.48, 0, 0.48, 0.96, 1.44].map((x) => {
    const collar = torusPart(
      policy,
      0.34,
      0.014,
      [x, 0.08, 0],
      [0, Math.PI / 2, 0],
      [1, 1.06, 1],
    );
    collar.name = "s2-calibration-collars";
    return collar;
  });
  parts.push(...calibrationCollars);
  return mergeParts(parts, "s2-cern-antimatter-cryostat");
}

function createS2PenningTrapCoilGeometry(quality) {
  const policy = geometryPolicy(quality);
  const parts = [];
  for (const x of [-0.13, 0.13]) {
    parts.push(
      torusPart(policy, 0.43, 0.07, [x, 0, 0], [0, Math.PI / 2, 0], [1, 1.08, 1]),
    );
  }
  parts.push(
    roundedPart(policy, [0.38, 0.08, 1.02], [0, 0.5, 0], [0, 0, 0], 0.03),
    roundedPart(policy, [0.38, 0.08, 1.02], [0, -0.5, 0], [0, 0, 0], 0.03),
  );
  return mergeParts(parts, "s2-penning-trap-superconducting-coil-rings");
}

function createS2DiagnosticBeamlineGeometry(quality) {
  const policy = geometryPolicy(quality);
  return mergeParts(
    [
      bakeGeometry(new THREE.CapsuleGeometry(0.038, 0.4, policy.cap, policy.radial), {
        rotation: [0, 0, Math.PI / 2],
      }),
      bakeGeometry(new THREE.IcosahedronGeometry(0.085, quality === "high" ? 2 : 1)),
      torusPart(policy, 0.13, 0.012, [0, 0, 0], [Math.PI / 2, 0, 0]),
    ],
    "s2-vacuum-throat diagnostic-beamline s2-proof-bit",
  );
}

function createAetherPrimordialSanctuaryGeometry(quality) {
  const policy = geometryPolicy(quality);
  const parts = [
    cylinderPart(policy, 1.2, 1.32, 0.18, [0, -0.57, 0]),
    cylinderPart(policy, 0.88, 1.02, 0.11, [0, -0.42, 0]),
    torusPart(policy, 0.92, 0.06, [0, -0.35, 0], [Math.PI / 2, 0, 0]),
    cylinderPart(policy, 0.29, 0.38, 0.22, [0, -0.24, 0]),
  ];
  for (const [x, z, height] of [
    [-0.72, -0.42, 0.92],
    [0.72, -0.42, 0.92],
    [-0.72, 0.42, 0.72],
    [0.72, 0.42, 0.72],
  ]) {
    parts.push(
      cylinderPart(policy, 0.035, 0.09, height, [x, -0.2 + height * 0.5, z]),
    );
  }
  return mergeParts(parts, "aether-primordial-first-energy-sanctuary");
}

function createAetherShieldHemisphereGeometry(quality) {
  const policy = geometryPolicy(quality);
  const hemisphere = bakeGeometry(
    new THREE.SphereGeometry(
      0.62,
      policy.round,
      Math.max(10, Math.round(policy.round * 0.55)),
      -Math.PI / 2,
      Math.PI,
      0.12,
      Math.PI - 0.24,
    ),
    { scale: [0.72, 1.04, 0.9] },
  );
  return mergeParts(
    [
      hemisphere,
      torusPart(policy, 0.49, 0.026, [0, -0.05, 0], [0, 0, 0], [0.78, 1, 0.94], Math.PI),
    ],
    "aether-two-separated-shield-hemispheres",
  );
}

function createAetherCausticArcGeometry(quality) {
  const policy = geometryPolicy(quality);
  const arcs = [];
  for (const [z, height, radius] of [
    [-0.23, 0.64, 0.018],
    [0, 0.83, 0.024],
    [0.23, 0.64, 0.018],
  ]) {
    arcs.push(
      tubePart(
        policy,
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-0.5, 0.08, z),
          new THREE.Vector3(0, height, z * 0.35),
          new THREE.Vector3(0.5, 0.08, z),
        ),
        radius,
        "aether-abyss-blue-caustic-arc",
      ),
    );
  }
  return mergeParts(arcs, "aether-abyss-blue-caustic-arc");
}

function createAetherFirstEnergySeedGeometry(quality) {
  const policy = geometryPolicy(quality);
  return mergeParts(
    [
      bakeGeometry(
        new THREE.SphereGeometry(
          AETHER_DOMINANT_SEED_RADIUS,
          policy.round,
          Math.max(12, Math.round(policy.round * 0.65)),
        ),
        { scale: [0.94, 1.06, 0.94] },
      ),
      torusPart(policy, 0.46, 0.018, [0, 0, 0], [Math.PI / 2, 0, 0]),
      torusPart(policy, 0.41, 0.012, [0, 0, 0], [0.34, 0.15, Math.PI / 2]),
      cylinderPart(policy, 0.012, 0.04, 0.78, [0, 0.55, 0]),
      cylinderPart(policy, 0.008, 0.025, 0.58, [-0.18, 0.43, 0.04], [0, 0, -0.13]),
      cylinderPart(policy, 0.008, 0.025, 0.58, [0.18, 0.43, -0.04], [0, 0, 0.13]),
      createAetherCausticArcGeometry(quality),
    ],
    "aether-one-golden-energy-seed holy-upward-rays persistent-cycle aether-abyss-blue-caustic-arc",
  );
}

function createFieldContainmentFrameGeometry(quality) {
  const policy = geometryPolicy(quality);
  const parts = [
    cylinderPart(policy, 1.2, 1.32, 0.18, [0, -0.55, 0], [0, 0, 0], [1.52, 1, 0.78]),
    cylinderPart(policy, 0.42, 0.5, 0.24, [0, -0.34, 0], [0, 0, 0], [1.42, 1, 0.8]),
    torusPart(policy, 0.9, 0.052, [0, -0.41, 0], [Math.PI / 2, 0, 0], [1.52, 1, 0.72]),
    torusPart(policy, 0.68, 0.046, [0, 0.68, 0], [Math.PI / 2, 0, 0], [1.42, 1, 0.72]),
    cylinderPart(policy, 0.22, 0.28, 0.12, [0, 0.73, 0], [0, 0, 0], [1.1, 1, 0.8]),
  ];
  for (const [x, z] of [
    [-1.28, -0.43],
    [-1.28, 0.43],
    [1.28, -0.43],
    [1.28, 0.43],
  ]) {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, -0.4, z),
      new THREE.Vector3(x * 1.12, 0.22, z * 1.1),
      new THREE.Vector3(x * 0.7, 0.69, z * 0.7),
    );
    parts.push(tubePart(policy, curve, 0.052, "field-bowed-containment-rib"));
  }
  return mergeParts(parts, "field-graphite-copper-contained-thermal-chamber");
}

class FieldHelixCurve extends THREE.Curve {
  getPoint(t, target = new THREE.Vector3()) {
    const angle = t * TWO_PI * 4.25;
    return target.set(
      (t - 0.5) * FIELD_HEATER_HALF_LENGTH * 2,
      Math.cos(angle) * 0.3,
      Math.sin(angle) * 0.3,
    );
  }
}

function createFieldHelixGeometry(quality) {
  const policy = geometryPolicy(quality);
  const helix = bakeGeometry(
    new THREE.TubeGeometry(
      new FieldHelixCurve(),
      Math.max(48, policy.curve),
      quality === "low" ? 0.028 : 0.034,
      policy.radial,
      false,
    ),
  );
  return mergeParts(
    [
      helix,
      torusPart(policy, 0.3, 0.025, [0, -0.42, 0], [Math.PI / 2, 0, 0]),
      torusPart(policy, 0.3, 0.025, [0, 0.42, 0], [Math.PI / 2, 0, 0]),
    ],
    "field-compressing-helical-coils",
  );
}

function createFieldFluxPacketGeometry(quality) {
  const policy = geometryPolicy(quality);
  return mergeParts(
    [
      bakeGeometry(new THREE.IcosahedronGeometry(0.07, quality === "high" ? 2 : 1), {
        scale: [1.25, 0.82, 0.82],
      }),
      bakeGeometry(
        new THREE.CapsuleGeometry(0.022, 0.11, policy.cap, policy.radial),
        { position: [-0.1, 0, 0], rotation: [0, 0, Math.PI / 2] },
      ),
      createFieldPlasmaCoreGeometry(quality),
    ],
    "field-charge-packets flux-skin field-graphite-copper-orange-white-plasma",
  );
}

function createFieldPlasmaCoreGeometry(quality) {
  const policy = geometryPolicy(quality);
  return mergeParts(
    [
      bakeGeometry(new THREE.IcosahedronGeometry(0.19, quality === "high" ? 3 : 2), {
        scale: [0.78, 1.32, 0.78],
      }),
      torusPart(policy, 0.25, 0.022, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 0.82, 1]),
      torusPart(policy, 0.21, 0.014, [0, 0, 0], [0.32, 0.18, Math.PI / 2], [1, 0.86, 1]),
    ],
    "field-graphite-copper-orange-white-plasma",
  );
}

function createQpuStableDockBandGeometry(quality) {
  const policy = geometryPolicy(quality);
  const parts = [
    roundedPart(policy, [2.88, 0.1, 0.24], [0, -0.43, -0.52], [0, 0, 0], 0.045),
    roundedPart(policy, [2.72, 0.075, 0.84], [0, -0.46, 0], [0, 0, 0], 0.035),
  ];
  for (const x of [-1.58, 1.58]) {
    parts.push(
      cylinderPart(
        policy,
        QPU_ABUTMENT_RADIUS * 0.78,
        QPU_ABUTMENT_RADIUS,
        QPU_ABUTMENT_HEIGHT,
        [x, -0.18, 0],
      ),
    );
  }
  return mergeParts(
    parts,
    "qpu-jade-cyan-coherence-causeway qpu-stable-visitor-dock-band-and-slender-abutments",
  );
}

function createQpuContinuousManifoldGeometry(quality) {
  const uSegments = quality === "high" ? 48 : quality === "medium" ? 32 : 20;
  const vSegments = quality === "high" ? 16 : quality === "medium" ? 12 : 8;
  const positions = [];
  const bandIndices = Array.from({ length: uSegments }, () => []);
  const rowLength = vSegments + 1;

  for (let surface = 0; surface < 2; surface += 1) {
    for (let uIndex = 0; uIndex <= uSegments; uIndex += 1) {
      const x = -QPU_MANIFOLD_LAYOUT.halfSpan +
        (uIndex / uSegments) * QPU_MANIFOLD_LAYOUT.halfSpan * 2;
      for (let vIndex = 0; vIndex <= vSegments; vIndex += 1) {
        const z = -QPU_MANIFOLD_LAYOUT.halfDepth +
          (vIndex / vSegments) * QPU_MANIFOLD_LAYOUT.halfDepth * 2;
        const point = sampleQpuManifoldPoint(x, z);
        positions.push(
          point.x,
          point.y - surface * QPU_MANIFOLD_LAYOUT.floorThickness,
          point.z,
        );
      }
    }
  }

  const surfaceStride = (uSegments + 1) * rowLength;
  for (let uIndex = 0; uIndex < uSegments; uIndex += 1) {
    const indices = bandIndices[uIndex];
    for (let surface = 0; surface < 2; surface += 1) {
      const offset = surface * surfaceStride;
      for (let vIndex = 0; vIndex < vSegments; vIndex += 1) {
        const a = offset + uIndex * rowLength + vIndex;
        const b = a + rowLength;
        if (surface === 0) indices.push(a, b, a + 1, b, b + 1, a + 1);
        else indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    for (const vIndex of [0, vSegments]) {
      const topA = uIndex * rowLength + vIndex;
      const topB = (uIndex + 1) * rowLength + vIndex;
      const floorA = surfaceStride + topA;
      const floorB = surfaceStride + topB;
      indices.push(topA, floorA, topB, topB, floorA, floorB);
    }
    if (uIndex === 0 || uIndex === uSegments - 1) {
      const endpointU = uIndex === 0 ? 0 : uSegments;
      for (let vIndex = 0; vIndex < vSegments; vIndex += 1) {
        const topA = endpointU * rowLength + vIndex;
        const topB = topA + 1;
        const floorA = surfaceStride + topA;
        const floorB = surfaceStride + topB;
        indices.push(topA, topB, floorA, topB, floorB, floorA);
      }
    }
  }

  const orderedIndices = [];
  const constructionStepEndVertexCounts = [];
  for (let step = 0; step < Math.ceil(uSegments / 2); step += 1) {
    const leftBand = step;
    const rightBand = uSegments - 1 - step;
    orderedIndices.push(...bandIndices[leftBand]);
    if (rightBand !== leftBand) orderedIndices.push(...bandIndices[rightBand]);
    constructionStepEndVertexCounts.push(orderedIndices.length);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(orderedIndices);
  geometry.computeVertexNormals();
  geometry.name = "qpu-one-piece-global-sampled-double-curved-riemann-floor-and-shell";
  const baked = bakeGeometry(geometry);
  baked.userData.constructionStepEndVertexCounts = constructionStepEndVertexCounts;
  return baked;
}

function createQpuManifoldRibGeometry(quality) {
  const policy = geometryPolicy(quality);
  return tubePart(
    policy,
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0.02, -QPU_MANIFOLD_LAYOUT.halfDepth),
      new THREE.Vector3(0, 0.24, 0),
      new THREE.Vector3(0, 0.02, QPU_MANIFOLD_LAYOUT.halfDepth),
    ),
    0.024,
    "qpu-endpoint-to-center-reconstruction-rib",
  );
}

function createQpuCausewayFrameGeometry(quality) {
  const stableGeometry = createQpuStableDockBandGeometry(quality);
  const constructionGeometry = createQpuContinuousManifoldGeometry(quality);
  const stableVertexCount = stableGeometry.getAttribute("position").count;
  const constructionVertexCount = constructionGeometry.getAttribute("position").count;
  const constructionStepEndVertexCounts = [
    ...constructionGeometry.userData.constructionStepEndVertexCounts,
  ];
  const geometry = mergeParts(
    [stableGeometry, constructionGeometry],
    "qpu-jade-cyan-coherence-causeway qpu-continuous-global-riemann-manifold qpu-contiguous-floor-shell-and-ribs",
  );
  geometry.userData.stableVertexCount = stableVertexCount;
  geometry.userData.constructionVertexCount = constructionVertexCount;
  geometry.userData.constructionStepEndVertexCounts = constructionStepEndVertexCounts;
  return geometry;
}

function createQpuCoherencePlateGeometry(quality) {
  return mergeParts(
    [
      createQpuManifoldRibGeometry(quality),
      tubePart(
        geometryPolicy(quality),
        new THREE.LineCurve3(
          new THREE.Vector3(-0.08, 0, 0),
          new THREE.Vector3(0.08, 0, 0),
        ),
        0.018,
        "qpu-rib-edge-lock",
      ),
    ],
    "qpu-manifold-reconstruction-ribs qpu-alien-iridescent-interference-fins",
  );
}

function createQpuSignalGeometry(quality) {
  const policy = geometryPolicy(quality);
  return bakeGeometry(
    new THREE.CapsuleGeometry(0.045, 0.34, policy.cap, policy.radial),
    { rotation: [0, 0, Math.PI / 2] },
  );
}

function patchAwardSurface(
  material,
  {
    effectMode = 0,
    effectStrength = 0,
    macroStrength,
    phaseColor,
    rimColor,
    rimStrength,
  },
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uAwardMacroStrength = { value: macroStrength };
    shader.uniforms.uAwardRimColor = { value: new THREE.Color(rimColor) };
    shader.uniforms.uAwardRimStrength = { value: rimStrength };
    shader.uniforms.uAwardEffectMode = { value: effectMode };
    shader.uniforms.uAwardEffectStrength = { value: effectStrength };
    shader.uniforms.uAwardActivity = { value: 0 };
    shader.uniforms.uAwardPhaseColor = { value: new THREE.Color(phaseColor || rimColor) };
    shader.uniforms.uAwardTime = { value: 0 };
    material.userData.awardUniforms = shader.uniforms;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vAwardWorldPosition;
uniform float uAwardActivity;
uniform float uAwardEffectMode;
uniform float uAwardTime;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float awardFieldMask = step(2.5, uAwardEffectMode) * (1.0 - step(3.5, uAwardEffectMode));
float awardQpuMask = step(3.5, uAwardEffectMode);
float awardThermalBand = sin(position.y * 17.0 + position.x * 3.0 - uAwardTime * 3.2);
float awardNormalFacing = dot(objectNormal, vec3(0.0, 1.0, 0.0));
float awardMotionActivity = uAwardActivity;
const float FIELD_VERTEX_DISPLACEMENT_LIMIT = 0.042;
float awardFieldOffset = clamp(
  awardThermalBand * (0.72 + abs(awardNormalFacing) * 0.28) * awardMotionActivity * 0.042,
  -FIELD_VERTEX_DISPLACEMENT_LIMIT,
  FIELD_VERTEX_DISPLACEMENT_LIMIT
);
transformed += objectNormal * awardFieldOffset * awardFieldMask;

float awardQpuFold = sin(position.y * 8.0 + position.z * 13.0 + uAwardTime * 1.25)
  * cos(position.x * 9.0 - uAwardTime * 0.85)
  * awardMotionActivity;
transformed.x += awardQpuFold * 0.032 * awardQpuMask;
transformed.z -= awardQpuFold * 0.024 * awardQpuMask;
const float QPU_VERTEX_FOLD_LIMIT = 0.036;
transformed.x = position.x + clamp(
  transformed.x - position.x,
  -QPU_VERTEX_FOLD_LIMIT,
  QPU_VERTEX_FOLD_LIMIT
);
transformed.z = position.z + clamp(
  transformed.z - position.z,
  -QPU_VERTEX_FOLD_LIMIT,
  QPU_VERTEX_FOLD_LIMIT
);`,
      )
      .replace(
        "#include <fog_vertex>",
        `#include <fog_vertex>\nvAwardWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vAwardWorldPosition;
uniform vec3 uAwardRimColor;
uniform vec3 uAwardPhaseColor;
uniform float uAwardRimStrength;
uniform float uAwardMacroStrength;
uniform float uAwardEffectMode;
uniform float uAwardEffectStrength;
uniform float uAwardTime;

float awardSignal(vec3 p) {
  return sin(p.x + sin(p.z * 1.37)) * cos(p.y * 0.83 + p.z * 0.41);
}

float awardLowPass(vec3 p) {
  float value = 0.0;
  float amplitude = 1.0;
  float frequency = 1.0;
  for (int octave = 0; octave < 3; octave++) {
    value += amplitude * awardSignal(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.35;
  }
  return value;
}

float awardStationField(vec3 p) {
  float axial = 0.5 + 0.5 * sin(p.x * 11.0 - uAwardTime * 1.7);
  float caustic = pow(0.5 + 0.5 * sin((p.x + p.z) * 8.0 + sin(p.y * 5.0) - uAwardTime), 4.0);
  float thermal = pow(0.5 + 0.5 * sin(p.y * 13.0 - uAwardTime * 3.2 + p.x * 2.0), 3.0);
  float interference = 0.5 + 0.5 * cos(length(p.xz) * 18.0 - p.y * 7.0 + uAwardTime * 1.3);
  float s2Mask = 1.0 - step(1.5, uAwardEffectMode);
  float aetherMask = step(1.5, uAwardEffectMode) * (1.0 - step(2.5, uAwardEffectMode));
  float fieldMask = step(2.5, uAwardEffectMode) * (1.0 - step(3.5, uAwardEffectMode));
  float qpuMask = step(3.5, uAwardEffectMode);
  return axial * s2Mask + caustic * aetherMask + thermal * fieldMask + interference * qpuMask;
}`,
      )
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
// Donor-inspired low-pass macro structure, wrapped diffuse, and Fresnel containment.
float awardMacro = awardLowPass(vAwardWorldPosition * 0.72);
float awardFacing = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
float awardFresnel = pow(1.0 - awardFacing, 3.0);
float awardWrappedDiffuse = clamp(normal.y * 0.5 + 0.5, 0.0, 1.0);
float awardStationSignal = awardStationField(vAwardWorldPosition);
reflectedLight.indirectDiffuse += diffuseColor.rgb * (0.045 + awardWrappedDiffuse * 0.075);
reflectedLight.indirectDiffuse *= 1.0 + awardMacro * uAwardMacroStrength;
reflectedLight.indirectDiffuse += uAwardPhaseColor * awardStationSignal * uAwardEffectStrength;
reflectedLight.indirectSpecular += uAwardRimColor * awardFresnel * uAwardRimStrength;`,
      );
  };
  material.customProgramCacheKey = () => "polar-ne-award-surface-v3";
  material.userData.surfaceMath =
    "gain 0.35 low-pass macro / wrapped diffuse / Fresnel containment / authored station field";
  return material;
}

function makeArchitecturalSurface({
  color,
  effectMode = 0,
  effectStrength = 0,
  emissive,
  emissiveIntensity,
  macroStrength = 0.022,
  metalness,
  opacity = 0.96,
  phaseColor,
  rimColor,
  rimStrength = 0.18,
  roughness,
}) {
  const material = patchAwardSurface(
    new THREE.MeshStandardMaterial({
      color,
      dithering: true,
      emissive,
      emissiveIntensity,
      metalness,
      opacity,
      roughness,
      transparent: true,
    }),
    { effectMode, effectStrength, macroStrength, phaseColor, rimColor, rimStrength },
  );
  material.userData.stationBaseOpacity = opacity;
  return material;
}

function createRenderResources(quality, detailed) {
  const geometries = {
    aetherFrame: createAetherPrimordialSanctuaryGeometry(quality),
    fieldFrame: createFieldContainmentFrameGeometry(quality),
    qpuFrame: createQpuCausewayFrameGeometry(quality),
    s2Frame: createS2AntimatterCryostatGeometry(quality),
  };
  if (detailed) {
    Object.assign(geometries, {
      aetherBead: createAetherFirstEnergySeedGeometry(quality),
      aetherRibbon: createAetherShieldHemisphereGeometry(quality),
      fieldCoil: createFieldHelixGeometry(quality),
      fieldPacket: createFieldFluxPacketGeometry(quality),
      qpuPlate: createQpuCoherencePlateGeometry(quality),
      qpuSignal: createQpuSignalGeometry(quality),
      s2Shell: createS2PenningTrapCoilGeometry(quality),
      s2Signal: createS2DiagnosticBeamlineGeometry(quality),
    });
  }
  const materials = {
    aetherBead: makeArchitecturalSurface({
      color: "#FFE8A3",
      effectMode: 2,
      effectStrength: 0.18,
      emissive: "#FFB31A",
      emissiveIntensity: 1.42,
      macroStrength: 0.012,
      metalness: 0.02,
      opacity: 0.96,
      phaseColor: "#FFF3B8",
      rimColor: "#FFF8D8",
      rimStrength: 0.42,
      roughness: 0.1,
    }),
    aetherFrame: makeArchitecturalSurface({
      color: "#103D78",
      effectMode: 2,
      effectStrength: 0.1,
      emissive: "#081C3D",
      emissiveIntensity: 0.42,
      metalness: 0.68,
      opacity: 0.98,
      phaseColor: "#FFD05A",
      rimColor: "#2E83C4",
      rimStrength: 0.42,
      roughness: 0.24,
    }),
    aetherRibbon: makeArchitecturalSurface({
      color: "#16437A",
      effectMode: 2,
      effectStrength: 0.13,
      emissive: "#0B2A56",
      emissiveIntensity: 0.48,
      macroStrength: 0.016,
      metalness: 0.5,
      opacity: 0.94,
      phaseColor: "#FFD05A",
      rimColor: "#6BB9EB",
      rimStrength: 0.5,
      roughness: 0.18,
    }),
    fieldCoil: makeArchitecturalSurface({
      color: "#B85D2A",
      effectMode: 3,
      effectStrength: 0.18,
      emissive: "#FF5A1F",
      emissiveIntensity: 0.7,
      metalness: 0.66,
      phaseColor: "#FFF0B0",
      rimColor: "#FFF1A8",
      rimStrength: 0.34,
      roughness: 0.23,
    }),
    fieldFrame: makeArchitecturalSurface({
      color: "#24262D",
      effectMode: 3,
      effectStrength: 0.07,
      emissive: "#2C160F",
      emissiveIntensity: 0.32,
      metalness: 0.74,
      opacity: 0.98,
      phaseColor: "#F29C46",
      rimColor: "#B66A3F",
      rimStrength: 0.38,
      roughness: 0.32,
    }),
    fieldPacket: makeArchitecturalSurface({
      color: "#FFF5D5",
      effectMode: 3,
      effectStrength: 0.26,
      emissive: "#FF6B21",
      emissiveIntensity: 1.42,
      macroStrength: 0.01,
      metalness: 0.02,
      phaseColor: "#FFF8E7",
      rimColor: "#FFFFFF",
      rimStrength: 0.24,
      roughness: 0.12,
    }),
    qpuFrame: makeArchitecturalSurface({
      color: "#29A99D",
      effectMode: 4,
      effectStrength: 0.12,
      emissive: "#0B756A",
      emissiveIntensity: 0.68,
      metalness: 0.58,
      opacity: 0.96,
      phaseColor: "#36D8FF",
      rimColor: "#9EF9DA",
      rimStrength: 0.28,
      roughness: 0.24,
    }),
    qpuPlate: makeArchitecturalSurface({
      color: "#68EBC8",
      effectMode: 0,
      effectStrength: 0,
      emissive: "#1AB6B2",
      emissiveIntensity: 0.5,
      metalness: 0.16,
      opacity: 0.93,
      phaseColor: "#65D6FF",
      rimColor: "#D8FFF4",
      rimStrength: 0.34,
      roughness: 0.2,
    }),
    qpuSignal: makeArchitecturalSurface({
      color: "#D8FFF4",
      effectMode: 4,
      effectStrength: 0.28,
      emissive: "#31DCEC",
      emissiveIntensity: 1.25,
      macroStrength: 0.008,
      metalness: 0,
      opacity: 0.96,
      phaseColor: "#B17BFF",
      rimColor: "#FFF0A6",
      rimStrength: 0.32,
      roughness: 0.1,
    }),
    s2Frame: makeArchitecturalSurface({
      color: "#4C8EF0",
      effectMode: 1,
      effectStrength: 0.08,
      emissive: "#245FC2",
      emissiveIntensity: 0.72,
      metalness: 0.78,
      opacity: 0.97,
      phaseColor: "#56D7FF",
      rimColor: "#9FDFFF",
      rimStrength: 0.3,
      roughness: 0.23,
    }),
    s2Shell: makeArchitecturalSurface({
      color: "#BCD8E4",
      effectMode: 1,
      effectStrength: 0.1,
      emissive: "#357A9A",
      emissiveIntensity: 0.42,
      metalness: 0.54,
      opacity: 0.96,
      phaseColor: "#55CFFF",
      rimColor: "#E8FCFF",
      rimStrength: 0.42,
      roughness: 0.2,
    }),
    s2Signal: makeArchitecturalSurface({
      color: "#E5FAFF",
      effectMode: 1,
      effectStrength: 0.18,
      emissive: "#56D7FF",
      emissiveIntensity: 1.12,
      macroStrength: 0.008,
      metalness: 0,
      opacity: 0.97,
      phaseColor: "#36D8FF",
      rimColor: "#FFFFFF",
      rimStrength: 0.24,
      roughness: 0.1,
    }),
  };
  return { geometries, materialList: Object.values(materials), materials };
}

function disposeRenderResources(resources) {
  for (const geometry of Object.values(resources.geometries)) geometry.dispose();
  for (const material of resources.materialList) material.dispose();
}

function updateAwardSurfaceTime(resources, elapsed, reducedMotion) {
  const authoredTime = reducedMotion ? REDUCED_MOTION_SHADER_TIME : elapsed;
  for (const material of resources.materialList) {
    const uniforms = material.userData.awardUniforms;
    if (uniforms?.uAwardTime) uniforms.uAwardTime.value = authoredTime;
  }
}

function setAwardSurfaceActivity(material, activity) {
  const uniform = material?.userData.awardUniforms?.uAwardActivity;
  if (uniform) uniform.value = THREE.MathUtils.clamp(activity, 0, 1);
}

function preparePool(mesh, count) {
  if (!mesh) return;
  mesh.count = count;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
}

function setInstance(
  mesh,
  index,
  scratch,
  positionX,
  positionY,
  positionZ,
  rotationX,
  rotationY,
  rotationZ,
  scaleX,
  scaleY,
  scaleZ,
) {
  if (!mesh) return;
  scratch.position.set(positionX, positionY, positionZ);
  scratch.rotation.set(rotationX, rotationY, rotationZ);
  scratch.scale.set(scaleX, scaleY, scaleZ);
  scratch.updateMatrix();
  mesh.setMatrixAt(index, scratch.matrix);
}

function setIdentityInstance(mesh, scratch) {
  setInstance(mesh, 0, scratch, 0, 0, 0, 0, 0, 0, 1, 1, 1);
}

function commitPool(mesh) {
  if (mesh) mesh.instanceMatrix.needsUpdate = true;
}

function updateQpuFrameDrawRange(frame, buildProgress) {
  const geometry = frame?.geometry;
  const stableVertexCount = geometry?.userData?.stableVertexCount;
  const constructionStepEndVertexCounts = geometry?.userData?.constructionStepEndVertexCounts;
  if (!geometry || !Number.isFinite(stableVertexCount) || !constructionStepEndVertexCounts?.length) return;
  const constructionStep = resolveQpuConstructionStep(
    buildProgress,
    constructionStepEndVertexCounts.length,
  );
  const constructionVertexCount = constructionStep > 0
    ? constructionStepEndVertexCounts[constructionStep - 1]
    : 0;
  const visibleVertexCount = stableVertexCount + constructionVertexCount;
  geometry.setDrawRange(0, visibleVertexCount);
}

function applyS2Instances(state, pools, scratch) {
  const brownian = state.brownianCoordinates;
  const brownianBlend = state.brownianBlend || 0;
  const coreX = (brownian?.[4] || 0) * brownianBlend;
  const coreZ = (brownian?.[5] || 0) * brownianBlend;
  setInstance(pools.frame, 0, scratch, coreX, 0, coreZ, 0, 0, 0, 1, 1, 1);
  const closure = state.shellClosure || 0;
  const gap = S2_KERNEL_SHELL_GAP + (1 - closure) * 0.17;
  const firstAngle = state.ringAngles[0];
  const secondAngle = state.ringAngles[1];
  setInstance(
    pools.shells,
    0,
    scratch,
    -gap + (brownian?.[0] || 0) * brownianBlend,
    0.04 + (brownian?.[1] || 0) * brownianBlend,
    -0.03 + coreZ * 0.35,
    Math.sin(firstAngle) * 0.025,
    firstAngle * 0.035,
    -0.025 - closure * 0.018,
    1,
    1.02,
    0.96,
  );
  setInstance(
    pools.shells,
    1,
    scratch,
    gap + (brownian?.[2] || 0) * brownianBlend,
    0.04 + (brownian?.[3] || 0) * brownianBlend,
    0.03 - coreZ * 0.35,
    Math.sin(secondAngle) * -0.025,
    Math.PI + secondAngle * 0.035,
    0.025 + closure * 0.018,
    1,
    1.02,
    0.96,
  );

  setInstance(pools.signals, 0, scratch, -0.84 + coreX, 0.2, coreZ, 0, 0, -0.16, 1.05, 1.05, 1.05);
  setInstance(pools.signals, 1, scratch, 0.84 + coreX, 0.2, coreZ, 0, 0, 0.16, 1.05, 1.05, 1.05);
  const bitPhase = state.proofBitPhase;
  const s2AxialTravel = (bitPhase + Math.PI) / TWO_PI;
  const bitScale = state.capExchange ? 1.22 : 0.56;
  setInstance(
    pools.signals,
    2,
    scratch,
    -S2_DIAGNOSTIC_HALF_SPAN + s2AxialTravel * S2_DIAGNOSTIC_HALF_SPAN * 2,
    0.2 + Math.sin(bitPhase * 2) * 0.08 + (brownian?.[4] || 0) * brownianBlend,
    Math.sin(bitPhase) * 0.08 + (brownian?.[5] || 0) * brownianBlend,
    bitPhase,
    0,
    bitPhase * 0.5,
    bitScale,
    bitScale,
    bitScale,
  );
  if (pools.shells?.material) {
    pools.shells.material.emissiveIntensity = 0.3 + closure * 0.34;
  }
  if (pools.frame?.material) {
    pools.frame.material.emissiveIntensity = 0.58 + closure * 0.38;
  }
  setAwardSurfaceActivity(pools.frame?.material, closure);
  setAwardSurfaceActivity(pools.shells?.material, closure);
  setAwardSurfaceActivity(pools.signals?.material, state.capExchange ? 1 : closure * 0.5);
  commitPool(pools.frame);
  commitPool(pools.shells);
  commitPool(pools.signals);
}

function applyAetherInstances(state, pools, scratch) {
  setIdentityInstance(pools.frame, scratch);
  const bloom = state.sanctuaryBloom || 0;
  const cradleOpening = 0.31 + bloom * 0.13;
  const shieldScale = 0.9 + bloom * 0.08;
  setInstance(
    pools.ribbons,
    0,
    scratch,
    -cradleOpening,
    0.12,
    0,
    0,
    -0.12 - bloom * 0.08,
    -0.04,
    shieldScale,
    shieldScale,
    shieldScale,
  );
  setInstance(
    pools.ribbons,
    1,
    scratch,
    cradleOpening,
    0.12,
    0,
    0,
    Math.PI + 0.12 + bloom * 0.08,
    0.04,
    shieldScale,
    shieldScale,
    shieldScale,
  );
  setInstance(pools.ribbons, 2, scratch, 0, -2, 0, 0, 0, 0, 0.001, 0.001, 0.001);

  const seedScale = 1.02 + bloom * 0.38;
  setInstance(
    pools.beads,
    0,
    scratch,
    0,
    0.32,
    0,
    0,
    state.circulationPhase * 0.18,
    0,
    seedScale,
    seedScale,
    seedScale,
  );
  for (let index = 1; index < state.beadVisibility.length; index += 1) {
    const phase = state.circulationPhase * 0.38 + ((index - 1) / 6) * TWO_PI;
    const visibility = 0.42 + state.beadVisibility[index] * 0.58;
    const moteScale = (0.08 + bloom * 0.025) * visibility;
    setInstance(
      pools.beads,
      index,
      scratch,
      Math.cos(phase) * 0.88,
      0.32 + Math.sin(phase * 2) * 0.3,
      Math.sin(phase) * 0.62,
      phase * 0.21,
      -phase,
      phase * 0.13,
      moteScale,
      moteScale,
      moteScale,
    );
  }
  if (pools.ribbons?.material) {
    pools.ribbons.material.emissiveIntensity = 0.3 + bloom * 0.34;
  }
  if (pools.frame?.material) {
    pools.frame.material.emissiveIntensity = 0.24 + bloom * 0.24;
  }
  if (pools.beads?.material) {
    pools.beads.material.emissiveIntensity = 1.12 + bloom * 0.72;
  }
  setAwardSurfaceActivity(pools.frame?.material, bloom);
  setAwardSurfaceActivity(pools.ribbons?.material, bloom);
  setAwardSurfaceActivity(pools.beads?.material, bloom);
  commitPool(pools.frame);
  commitPool(pools.ribbons);
  commitPool(pools.beads);
}

function applyFieldInstances(state, pools, scratch) {
  setIdentityInstance(pools.frame, scratch);
  const compression = state.compression || 0;
  const firstTilt = THREE.MathUtils.degToRad(state.coilTiltsDegrees[0]);
  const secondTilt = THREE.MathUtils.degToRad(state.coilTiltsDegrees[1]);
  const separation = 0.54 - compression * 0.12;
  setInstance(
    pools.coils,
    0,
    scratch,
    0,
    0.13,
    -separation,
    firstTilt,
    0,
    -0.08 - compression * 0.08,
    0.96 + compression * 0.08,
    1 + compression * 0.06,
    0.96 + compression * 0.08,
  );
  setInstance(
    pools.coils,
    1,
    scratch,
    0,
    0.13,
    separation,
    secondTilt,
    0,
    0.08 + compression * 0.08,
    0.96 + compression * 0.08,
    1 + compression * 0.06,
    0.96 + compression * 0.08,
  );
  for (let index = 0; index < state.packetPhases.length; index += 1) {
    if (index === 0) {
      const coreScale = 0.82 + compression * 0.72 + Math.abs(state.current) * 0.18;
      setInstance(
        pools.packets,
        index,
        scratch,
        0,
        0.12,
        0,
        compression * 0.08,
        state.packetPhases[index] * TWO_PI * 0.18,
        -compression * 0.06,
        coreScale,
        coreScale * 1.08,
        coreScale,
      );
      continue;
    }
    const phase = state.packetPhases[index] * TWO_PI;
    const packetScale = 0.36 + Math.abs(state.current) * 0.42;
    setInstance(
      pools.packets,
      index,
      scratch,
      Math.cos(phase) * (0.76 - compression * 0.1),
      0.2 + Math.sin(phase * 2) * 0.16,
      Math.sin(phase) * 0.44,
      0,
      -phase,
      Math.sin(phase) * 0.28,
      packetScale,
      packetScale,
      packetScale,
    );
  }
  if (pools.coils?.material) {
    pools.coils.material.emissiveIntensity = 0.56 + compression * 0.8;
  }
  if (pools.frame?.material) {
    pools.frame.material.emissiveIntensity = 0.22 + state.fluxSkin * 0.34;
  }
  if (pools.packets?.material) {
    pools.packets.material.emissiveIntensity = 1.16 + compression * 0.78;
  }
  setAwardSurfaceActivity(pools.frame?.material, state.fluxSkin);
  setAwardSurfaceActivity(pools.coils?.material, compression);
  setAwardSurfaceActivity(pools.packets?.material, Math.max(compression, state.fluxSkin));
  commitPool(pools.frame);
  commitPool(pools.coils);
  commitPool(pools.packets);
}

function applyQpuInstances(state, pools, scratch) {
  updateQpuFrameDrawRange(pools.frame, state.manifoldBuild);
  setInstance(
    pools.frame,
    0,
    scratch,
    0,
    QPU_INVERSE_BRIDGE_LIFT,
    0,
    0,
    0,
    0,
    1.08,
    1.08,
    1.08,
  );
  const lastSlice = state.manifoldSliceBuild.length - 1;
  const sliceSpacing = (QPU_BRIDGE_HALF_SPAN * 2) / lastSlice;
  for (let index = 0; index < state.manifoldSliceBuild.length; index += 1) {
    const build = state.manifoldSliceBuild[index];
    const normalizedX = index / lastSlice * 2 - 1;
    const x = -QPU_BRIDGE_HALF_SPAN + index * sliceSpacing;
    const arch = 0.34 * (1 - normalizedX * normalizedX);
    const reweave = Math.sin(state.reweavePhase + index * 0.42) * 0.012 * state.manifoldBuild;
    setInstance(
      pools.plates,
      index,
      scratch,
      x,
      QPU_INVERSE_BRIDGE_LIFT + arch + reweave,
      0,
      0,
      0,
      normalizedX * -0.21 + reweave * 0.8,
      1.04,
      0.045 + build * 0.955,
      1,
    );
  }
  for (let index = 0; index < 5; index += 1) {
    const signalProgress = index / 4;
    const normalizedX = signalProgress * 2 - 1;
    const x = -QPU_BRIDGE_HALF_SPAN + signalProgress * QPU_BRIDGE_HALF_SPAN * 2;
    const arch = 0.34 * (1 - normalizedX * normalizedX);
    const signalScale = 0.3 + state.manifoldBuild * 0.24;
    setInstance(
      pools.signals,
      index,
      scratch,
      x,
      QPU_INVERSE_BRIDGE_LIFT + arch + 0.2,
      0.34,
      0,
      normalizedX * 0.16,
      0,
      signalScale,
      signalScale,
      signalScale,
    );
  }
  const progress = state.verificationBeamProgress;
  const coherenceSpan = 0.2 + Math.max(state.coherence, progress) * 0.8;
  const beamLength = QPU_BRIDGE_HALF_SPAN * 2 * coherenceSpan;
  setInstance(
    pools.signals,
    5,
    scratch,
    -QPU_BRIDGE_HALF_SPAN + beamLength * 0.5,
    QPU_INVERSE_BRIDGE_LIFT + 0.72,
    0,
    0,
    0,
    0,
    Math.max(0.05, beamLength / QPU_SIGNAL_BASE_LENGTH),
    0.78 + progress * 0.52,
    0.78 + progress * 0.52,
  );
  if (pools.plates?.material) {
    pools.plates.material.emissiveIntensity = 0.28 + state.sanctumPulse * 0.38;
  }
  if (pools.signals?.material) {
    pools.signals.material.emissiveIntensity = 0.88 + Math.max(state.coherence, progress) * 0.86;
  }
  if (pools.frame?.material) {
    pools.frame.material.emissiveIntensity = 0.54 + state.sanctumPulse * 0.4;
  }
  const qpuActivity = Math.max(state.coherence, progress, state.sanctumPulse);
  setAwardSurfaceActivity(pools.frame?.material, qpuActivity);
  setAwardSurfaceActivity(pools.plates?.material, qpuActivity);
  setAwardSurfaceActivity(pools.signals?.material, qpuActivity);
  commitPool(pools.frame);
  commitPool(pools.plates);
  commitPool(pools.signals);
}

function applyStationRootReveal(root, stationId, alpha, familyAlpha, isPromise, isDocked) {
  if (!root) return;
  root.visible = alpha > 0.005 && familyAlpha > 0.005;
  if (!root.visible) return;
  const heroScale = NE_MONUMENT_CONTRACTS[stationId]?.heroScale ?? 1;
  root.scale.setScalar(isPromise ? 0.88 : isDocked ? heroScale : 1);
  root.traverse((object) => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const baseOpacity = material.userData.stationBaseOpacity ?? 1;
      material.opacity = baseOpacity * familyAlpha * (isPromise ? alpha : 1);
    }
  });
}

export default function PolarStationMechanismsNE({
  exclusiveStationId = null,
  familyVisibilityRef,
  mechanismStateRef,
  onEvidenceReady,
  quality = "medium",
  reducedMotion = false,
  ritualStateRef,
  safeMode = false,
  traversalPoseRef,
  visible = true,
}) {
  const systemRef = useRef(createNortheastMechanismSystem());
  const inputsRef = useRef({});
  const ritualOutputRef = useRef({
    evidenceReady: false,
    phase: null,
    ritual: null,
    stationId: null,
  });
  const evidenceLatchRef = useRef({
    "field-chamber-coils": false,
    "manifold-reactor": false,
    "qpu-ice-bridge": false,
    "s2-kernel-core": false,
  });
  const optionsRef = useRef({ reducedMotion, safeMode });
  const stationRootRefs = useRef({});
  const poolsRef = useRef({
    aether: { beads: null, frame: null, ribbons: null },
    field: { coils: null, frame: null, packets: null },
    qpu: { frame: null, plates: null, signals: null },
    s2: { frame: null, shells: null, signals: null },
  });
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const detailed = quality !== "low";
  const resources = useMemo(() => {
    if (safeMode || !visible) return EMPTY_RENDER_RESOURCES;
    return createRenderResources(quality, detailed);
  }, [detailed, quality, safeMode, visible]);
  const budget = safeMode
    ? NE_MECHANISM_BUDGET.safe
    : NE_MECHANISM_BUDGET[quality] || NE_MECHANISM_BUDGET.medium;

  const s2Frame = useRef(null);
  const s2Shells = useRef(null);
  const s2Signals = useRef(null);
  const aetherFrame = useRef(null);
  const aetherRibbons = useRef(null);
  const aetherBeads = useRef(null);
  const fieldFrame = useRef(null);
  const fieldCoils = useRef(null);
  const fieldPackets = useRef(null);
  const qpuFrame = useRef(null);
  const qpuPlates = useRef(null);
  const qpuSignals = useRef(null);

  useLayoutEffect(() => {
    preparePool(s2Frame.current, 1);
    preparePool(s2Shells.current, 2);
    preparePool(s2Signals.current, 3);
    preparePool(aetherFrame.current, 1);
    preparePool(aetherRibbons.current, 3);
    preparePool(aetherBeads.current, 7);
    preparePool(fieldFrame.current, 1);
    preparePool(fieldCoils.current, 2);
    preparePool(fieldPackets.current, 4);
    preparePool(qpuFrame.current, 1);
    updateQpuFrameDrawRange(
      qpuFrame.current,
      systemRef.current.states["qpu-ice-bridge"].manifoldBuild,
    );
    preparePool(qpuPlates.current, QPU_MANIFOLD_SLICE_COUNT);
    preparePool(qpuSignals.current, 6);
  }, [resources]);

  useEffect(() => () => disposeRenderResources(resources), [resources]);

  useFrame((frameState, delta) => {
    if (!visible) return;
    updateAwardSurfaceTime(resources, frameState.clock.elapsedTime, reducedMotion);
    const pose = traversalPoseRef?.current;
    const reveal = resolveNortheastStationReveal(pose, exclusiveStationId);
    const promiseId = reveal.promiseId;
    const familyAlpha = familyVisibilityRef?.current?.alpha ?? 1;
    for (const id of NE_MECHANISM_IDS) {
      applyStationRootReveal(
        stationRootRefs.current[id],
        id,
        reveal.alphas[id],
        familyAlpha,
        promiseId === id,
        exclusiveStationId === id || pose?.dockedId === id,
      );
    }
    resolveNortheastMechanismInputs(pose, inputsRef.current);
    optionsRef.current.reducedMotion = reducedMotion;
    optionsRef.current.safeMode = safeMode;
    const system = advanceNortheastMechanisms(
      systemRef.current,
      inputsRef.current,
      delta,
      optionsRef.current,
    );
    if (mechanismStateRef) mechanismStateRef.current = system;

    const selectedId = NE_MECHANISM_IDS.includes(exclusiveStationId)
      ? exclusiveStationId
      : NE_MECHANISM_IDS.includes(pose?.dockedId)
        ? pose.dockedId
        : NE_MECHANISM_IDS.includes(pose?.proximityStationId)
          ? pose.proximityStationId
          : null;
    const selectedState = selectedId ? system.states[selectedId] : null;
    const ritualOutput = ritualOutputRef.current;
    ritualOutput.stationId = selectedId;
    ritualOutput.phase = selectedState?.phase || null;
    ritualOutput.evidenceReady = Boolean(selectedState?.evidenceReady);
    ritualOutput.ritual = selectedState?.ritual || null;
    if (ritualStateRef) ritualStateRef.current = ritualOutput;

    for (const id of NE_MECHANISM_IDS) {
      const state = system.states[id];
      if (state.evidenceReady && !evidenceLatchRef.current[id]) {
        evidenceLatchRef.current[id] = true;
        onEvidenceReady?.(id, state);
      } else if (!state.evidenceReady) {
        evidenceLatchRef.current[id] = false;
      }
    }

    if (safeMode) return;
    const pools = poolsRef.current;
    pools.s2.frame = s2Frame.current;
    pools.s2.shells = s2Shells.current;
    pools.s2.signals = s2Signals.current;
    pools.aether.frame = aetherFrame.current;
    pools.aether.ribbons = aetherRibbons.current;
    pools.aether.beads = aetherBeads.current;
    pools.field.frame = fieldFrame.current;
    pools.field.coils = fieldCoils.current;
    pools.field.packets = fieldPackets.current;
    pools.qpu.frame = qpuFrame.current;
    pools.qpu.plates = qpuPlates.current;
    pools.qpu.signals = qpuSignals.current;
    applyS2Instances(system.states["s2-kernel-core"], pools.s2, scratch);
    applyAetherInstances(system.states["manifold-reactor"], pools.aether, scratch);
    applyFieldInstances(system.states["field-chamber-coils"], pools.field, scratch);
    applyQpuInstances(system.states["qpu-ice-bridge"], pools.qpu, scratch);
  });

  if (safeMode || !visible) return null;

  const s2Transform = STATION_TRANSFORMS["s2-kernel-core"];
  const aetherTransform = STATION_TRANSFORMS["manifold-reactor"];
  const fieldTransform = STATION_TRANSFORMS["field-chamber-coils"];
  const qpuTransform = STATION_TRANSFORMS["qpu-ice-bridge"];
  const castsShadow = quality !== "low";

  return (
    <group
      dispose={null}
      name={NORTHEAST_MECHANISM_RENDER_PROFILE}
      userData={{
        drawCalls: budget.drawCalls,
        programs: budget.programs,
        textures: budget.textures,
      }}
    >
      <group
        name="s2-cern-antimatter-cryostat"
        position={s2Transform.position}
        ref={(node) => {
          stationRootRefs.current["s2-kernel-core"] = node;
        }}
        rotation={s2Transform.rotation}
        userData={NE_MONUMENT_CONTRACTS["s2-kernel-core"]}
      >
        <instancedMesh
          args={[resources.geometries.s2Frame, resources.materials.s2Frame, 1]}
          castShadow={castsShadow}
          frustumCulled
          geometry={resources.geometries.s2Frame}
          material={resources.materials.s2Frame}
          name="s2-cern-antimatter-cryostat-frame"
          receiveShadow
          ref={s2Frame}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[resources.geometries.s2Shell, resources.materials.s2Shell, 2]}
              castShadow={castsShadow}
              frustumCulled
              geometry={resources.geometries.s2Shell}
              material={resources.materials.s2Shell}
              name="s2-penning-trap-superconducting-coil-rings"
              receiveShadow
              ref={s2Shells}
            />
            <instancedMesh
              args={[resources.geometries.s2Signal, resources.materials.s2Signal, 3]}
              frustumCulled
              geometry={resources.geometries.s2Signal}
              material={resources.materials.s2Signal}
              name="s2-vacuum-throat diagnostic-beamline s2-proof-bit"
              ref={s2Signals}
            />
          </>
        ) : null}
      </group>

      <group
        name="aether-primordial-first-energy-sanctuary"
        position={aetherTransform.position}
        ref={(node) => {
          stationRootRefs.current["manifold-reactor"] = node;
        }}
        rotation={aetherTransform.rotation}
        userData={NE_MONUMENT_CONTRACTS["manifold-reactor"]}
      >
        <instancedMesh
          args={[resources.geometries.aetherFrame, resources.materials.aetherFrame, 1]}
          castShadow={castsShadow}
          frustumCulled
          geometry={resources.geometries.aetherFrame}
          material={resources.materials.aetherFrame}
          name="aether-primordial-first-energy-sanctuary-frame"
          receiveShadow
          ref={aetherFrame}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[resources.geometries.aetherRibbon, resources.materials.aetherRibbon, 3]}
              castShadow={castsShadow}
              frustumCulled
              geometry={resources.geometries.aetherRibbon}
              material={resources.materials.aetherRibbon}
              name="aether-two-separated-shield-hemispheres"
              ref={aetherRibbons}
            />
            <instancedMesh
              args={[resources.geometries.aetherBead, resources.materials.aetherBead, 7]}
              frustumCulled
              geometry={resources.geometries.aetherBead}
              material={resources.materials.aetherBead}
              name="aether-one-golden-energy-seed holy-upward-rays persistent-cycle"
              ref={aetherBeads}
            />
          </>
        ) : null}
      </group>

      <group
        name="field-graphite-copper-contained-thermal-chamber"
        position={fieldTransform.position}
        ref={(node) => {
          stationRootRefs.current["field-chamber-coils"] = node;
        }}
        rotation={fieldTransform.rotation}
        userData={NE_MONUMENT_CONTRACTS["field-chamber-coils"]}
      >
        <instancedMesh
          args={[resources.geometries.fieldFrame, resources.materials.fieldFrame, 1]}
          castShadow={castsShadow}
          frustumCulled
          geometry={resources.geometries.fieldFrame}
          material={resources.materials.fieldFrame}
          name="field-graphite-copper-contained-thermal-chamber-frame"
          receiveShadow
          ref={fieldFrame}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[resources.geometries.fieldCoil, resources.materials.fieldCoil, 2]}
              castShadow={castsShadow}
              frustumCulled
              geometry={resources.geometries.fieldCoil}
              material={resources.materials.fieldCoil}
              name="field-compressing-helical-coils"
              ref={fieldCoils}
            />
            <instancedMesh
              args={[resources.geometries.fieldPacket, resources.materials.fieldPacket, 4]}
              frustumCulled
              geometry={resources.geometries.fieldPacket}
              material={resources.materials.fieldPacket}
              name="field-charge-packets flux-skin"
              ref={fieldPackets}
            />
          </>
        ) : null}
      </group>

      <group
        name="qpu-continuous-riemann-manifold-pavilion"
        position={qpuTransform.position}
        ref={(node) => {
          stationRootRefs.current["qpu-ice-bridge"] = node;
        }}
        rotation={qpuTransform.rotation}
        userData={NE_MONUMENT_CONTRACTS["qpu-ice-bridge"]}
      >
        <instancedMesh
          args={[resources.geometries.qpuFrame, resources.materials.qpuFrame, 1]}
          castShadow={castsShadow}
          frustumCulled
          geometry={resources.geometries.qpuFrame}
          material={resources.materials.qpuFrame}
          name="qpu-stable-visitor-dock-band-and-slender-abutments"
          receiveShadow
          ref={qpuFrame}
        />
        {detailed ? (
          <>
            <instancedMesh
              args={[resources.geometries.qpuPlate, resources.materials.qpuPlate, QPU_MANIFOLD_SLICE_COUNT]}
              castShadow={castsShadow}
              frustumCulled
              geometry={resources.geometries.qpuPlate}
              material={resources.materials.qpuPlate}
              name="qpu-manifold-reconstruction-ribs qpu-endpoint-to-center-build-field"
              receiveShadow
              ref={qpuPlates}
            />
            <instancedMesh
              args={[resources.geometries.qpuSignal, resources.materials.qpuSignal, 6]}
              frustumCulled={false}
              geometry={resources.geometries.qpuSignal}
              material={resources.materials.qpuSignal}
              name="qpu-manifold-verification-beam qpu-coherence-beam-path verification-beam"
              ref={qpuSignals}
            />
          </>
        ) : null}
      </group>
    </group>
  );
}
