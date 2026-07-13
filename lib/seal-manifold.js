import * as THREE from "three";

export const SEAL_MANIFOLD_BASELINE = "46-mesh primitive assembly";
export const SEAL_MANIFOLD_FORMULA =
  "M={(x,y,z)=D(-cos(theta),sin(theta)cos(phi),sin(theta)sin(phi))}";
export const SEAL_MANIFOLD_MAPPING =
  "stable object-space triplanar zones over canonical manifold coordinates";

export const SEAL_MANIFOLD_INVARIANT = Object.freeze({
  connectedComponents: 1,
  beta0: 1,
  beta1: 0,
  beta2: 1,
  eulerCharacteristic: 2,
  orientable: true,
  closed: true,
});

export const SEAL_MANIFOLD_QUALITY = Object.freeze({
  low: Object.freeze({
    longitudeSegments: 48,
    latitudeSegments: 32,
    triangleBudget: 5000,
  }),
  medium: Object.freeze({
    longitudeSegments: 64,
    latitudeSegments: 48,
    triangleBudget: 8000,
  }),
  high: Object.freeze({
    longitudeSegments: 80,
    latitudeSegments: 64,
    triangleBudget: 12000,
  }),
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function gaussian(value, center, width) {
  const normalized = (value - center) / width;
  return Math.exp(-normalized * normalized);
}

/** A deterministic smooth signal used as the inexpensive simplex-noise analogue. */
function smoothNoise3(x, y, z) {
  return (
    Math.sin(x * 1.71 + z * 0.93) * 0.46 +
    Math.sin(y * 1.13 - z * 1.47 + 0.8) * 0.31 +
    Math.sin((x + y) * 0.67 + z * 0.41 + 1.9) * 0.23
  );
}

/** Four-octave low-pass fBm with the requested aggressive 0.35 spectral roll-off. */
function lowpassFbm3(x, y, z) {
  let amplitude = 1;
  let frequency = 1;
  let value = 0;
  let normalization = 0;

  for (let octave = 0; octave < 4; octave += 1) {
    value += amplitude * smoothNoise3(x * frequency, y * frequency, z * frequency);
    normalization += amplitude;
    frequency *= 2;
    amplitude *= 0.35;
  }

  return value / normalization;
}

function resolveQuality(quality) {
  return SEAL_MANIFOLD_QUALITY[quality] || SEAL_MANIFOLD_QUALITY.medium;
}

function deformCanonicalSeal(axial, radial, phi) {
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const head = gaussian(axial, 0.7, 0.29);
  const neck = gaussian(axial, 0.34, 0.18);
  const torso = gaussian(axial, -0.08, 0.72);
  const tail = smoothstep(0.42, 0.98, -axial);
  const lateral = Math.abs(sinPhi);
  const foreFlipper =
    gaussian(axial, 0.02, 0.24) * Math.pow(lateral, 10) * smoothstep(0.2, 0.82, radial);

  let x = axial * 1.01 + head * 0.055;
  let y = radial * cosPhi * (0.36 + torso * 0.035 + head * 0.092);
  let z = radial * sinPhi * (0.45 + torso * 0.032 + head * 0.065);

  y *= 1 - neck * 0.15;
  z *= 1 - neck * 0.12;

  // The tail stays part of the same sphere-topology surface. Its side lobes
  // extend aft while the central pole moves forward to read as a fork.
  x += tail * (0.085 * (1 - lateral) - 0.13 * lateral);
  z *= 1 + foreFlipper * 0.54;
  y -= foreFlipper * 0.46;
  y += smoothstep(0.18, 0.88, axial) * 0.205;

  if (y < 0) y *= 0.84;

  const macro = lowpassFbm3(axial * 1.5, radial * cosPhi * 1.5, radial * sinPhi * 1.5);
  const micro = smoothNoise3(axial * 15, radial * cosPhi * 15, radial * sinPhi * 15);
  const displacement = macro * 0.018 + micro * 0.0035;
  const outwardLength = Math.hypot(axial, radial * cosPhi, radial * sinPhi) || 1;

  x += (axial / outwardLength) * displacement;
  y += ((radial * cosPhi) / outwardLength) * displacement;
  z += ((radial * sinPhi) / outwardLength) * displacement;

  return [x, y, z];
}

function appendVertex(positions, canonicals, axial, radial, phi) {
  const canonicalY = radial * Math.cos(phi);
  const canonicalZ = radial * Math.sin(phi);
  const [x, y, z] = deformCanonicalSeal(axial, radial, phi);
  positions.push(x, y, z);
  canonicals.push(axial, canonicalY, canonicalZ);
}

export function expectedSealTriangleCount(quality = "medium") {
  const { latitudeSegments, longitudeSegments } = resolveQuality(quality);
  return 2 * longitudeSegments * (latitudeSegments - 1);
}

/**
 * Build one welded, closed sphere-topology seal mesh. Geometry is constructed
 * once; motion only changes the owning root transform and shader uniforms.
 */
export function createSealManifoldGeometry({ quality = "medium" } = {}) {
  const profile = resolveQuality(quality);
  const longitudeSegments = profile.longitudeSegments;
  const latitudeSegments = profile.latitudeSegments;
  const positions = [];
  const canonicals = [];
  const indices = [];

  appendVertex(positions, canonicals, -1, 0, 0);

  for (let latitude = 1; latitude < latitudeSegments; latitude += 1) {
    const theta = (latitude / latitudeSegments) * Math.PI;
    const axial = -Math.cos(theta);
    const radial = Math.sin(theta);

    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const phi = (longitude / longitudeSegments) * Math.PI * 2;
      appendVertex(positions, canonicals, axial, radial, phi);
    }
  }

  const headIndex = positions.length / 3;
  appendVertex(positions, canonicals, 1, 0, 0);
  const firstRingStart = 1;

  for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
    const current = firstRingStart + longitude;
    const next = firstRingStart + ((longitude + 1) % longitudeSegments);
    indices.push(0, next, current);
  }

  for (let latitude = 0; latitude < latitudeSegments - 2; latitude += 1) {
    const currentRing = firstRingStart + latitude * longitudeSegments;
    const nextRing = currentRing + longitudeSegments;

    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const nextLongitude = (longitude + 1) % longitudeSegments;
      const a = currentRing + longitude;
      const b = nextRing + longitude;
      const c = nextRing + nextLongitude;
      const d = currentRing + nextLongitude;
      indices.push(a, d, b, d, c, b);
    }
  }

  const lastRingStart = headIndex - longitudeSegments;
  for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
    const current = lastRingStart + longitude;
    const next = lastRingStart + ((longitude + 1) % longitudeSegments);
    indices.push(headIndex, current, next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.name = `TopologicalSealManifold ${quality}`;
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("canonical", new THREE.Float32BufferAttribute(canonicals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData = {
    quality,
    triangleBudget: profile.triangleBudget,
    topology: SEAL_MANIFOLD_INVARIANT,
    formula: SEAL_MANIFOLD_FORMULA,
    mapping: SEAL_MANIFOLD_MAPPING,
    displacement: "four low-pass octaves at gain 0.35 plus 0.0035 micro grain",
  };
  return geometry;
}

function edgeKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function inspectSealManifold(geometry) {
  const position = geometry.getAttribute("position");
  const index = geometry.index?.array;
  if (!position || !index) throw new Error("seal manifold inspection requires indexed positions");

  const parents = new Uint32Array(position.count);
  for (let vertex = 0; vertex < parents.length; vertex += 1) parents[vertex] = vertex;

  const find = (vertex) => {
    let root = vertex;
    while (parents[root] !== root) root = parents[root];
    while (parents[vertex] !== vertex) {
      const next = parents[vertex];
      parents[vertex] = root;
      vertex = next;
    }
    return root;
  };
  const join = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parents[rootB] = rootA;
  };

  const edgeDegrees = new Map();
  for (let cursor = 0; cursor < index.length; cursor += 3) {
    const a = index[cursor];
    const b = index[cursor + 1];
    const c = index[cursor + 2];
    join(a, b);
    join(b, c);
    join(c, a);
    for (const key of [edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)]) {
      edgeDegrees.set(key, (edgeDegrees.get(key) || 0) + 1);
    }
  }

  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  for (const degree of edgeDegrees.values()) {
    if (degree === 1) boundaryEdges += 1;
    if (degree !== 2) nonManifoldEdges += 1;
  }

  const connectedComponents = new Set(
    Array.from({ length: position.count }, (_, vertex) => find(vertex)),
  ).size;
  const triangles = index.length / 3;
  const eulerCharacteristic = position.count - edgeDegrees.size + triangles;
  const closed = boundaryEdges === 0 && nonManifoldEdges === 0;
  const genus = closed ? Math.max(0, (2 * connectedComponents - eulerCharacteristic) / 2) : null;
  geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);

  return {
    vertices: position.count,
    edges: edgeDegrees.size,
    triangles,
    connectedComponents,
    boundaryEdges,
    nonManifoldEdges,
    eulerCharacteristic,
    beta0: connectedComponents,
    beta1: genus === null ? null : genus * 2,
    beta2: closed ? connectedComponents : 0,
    bounds: { x: size.x, y: size.y, z: size.z },
  };
}
