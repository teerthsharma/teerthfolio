// The three carved MujoRush faces: each keeps its brows, lids and whisker pads, falls with its own skin, and its eyes bloom ember as they open.
// The three faces are one mesh: each vertex carries its face, and the face's drop and roll are set per face in the vertex shader.
import { BoxGeometry, BufferAttribute, Color, Group, InstancedBufferAttribute, InstancedMesh, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { INK, U } from "../ink.js";
import { TONE } from "../tone.js";
import { smooth, T } from "../clock.js";
import { charcoal } from "../live/charcoal.js";
import { FACES, FACE_Y, hash, zF } from "../live/world.js";
import { ORDER, merge, part } from "./spec.js";

const SPLIT = [T.split[1], T.split[0], T.split[2]]; // FACES order: horned, crowned, capped
const EYE = { dx: 1.27, y: 15.2, dz: -0.9 };

function carvedPieces(f) {
  const { x, look } = f;
  const cz = zF(x) + 0.2;
  const parts = [];
  for (const s of [-1, 1]) {
    const px = x + s * 0.85, py = FACE_Y - 1.3, pz = cz + 1.55;
    for (let k = 0; k < 7; k++) {
      const a = (k - 3) * 0.3;
      const ox = s * (0.25 + 0.5 * Math.cos(a)), oy = 0.5 * Math.sin(a);
      parts.push(part(new SphereGeometry(0.11, 6, 4).translate(px + ox, py + oy, pz + 0.7 * Math.sqrt(1 - ox * ox - (oy / 0.8) ** 2) + 0.04), 0.18));
    }
    parts.push(part(new BoxGeometry(1.4, 0.3, 0.45).translate(x + s * 1.75, FACE_Y + 0.68, cz + 1.7), 0.22));
  }
  if (look === "evil") for (const s of [-1, 1]) parts.push(part(new BoxGeometry(1.6, 0.35, 0.5).rotateZ(s * 0.35).translate(x + s * 0.85, FACE_Y + 0.85, cz + 1.75), 0.95));
  else parts.push(part(new BoxGeometry(3.2, 0.35, 0.5).translate(x, FACE_Y + 0.85, cz + 1.75), 0.95));
  return { at: [x, FACE_Y, cz], geometry: merge(parts).translate(-x, -FACE_Y, -cz) };
}

function haloMaterial() {
  return new ShaderMaterial({
    uniforms: { ...U, uSize: { value: 2.6 }, uAlpha: { value: 0.5 }, uTint: { value: new Color("#ff9f3a").convertLinearToSRGB() } },
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
    vertexShader: /* glsl */ `
      attribute vec4 aC;
      attribute float aOpen;
      uniform float uSize;
      varying vec2 vUv;
      varying float vA;
      varying float vSeed;
      void main() {
        vUv = uv;
        vA = aOpen;
        vSeed = aC.w;
        vec4 mv = viewMatrix * modelMatrix * vec4(aC.xyz, 1.0);
        mv.xy += position.xy * uSize;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAlpha;
      uniform vec3 uTint;
      varying vec2 vUv;
      varying float vA;
      varying float vSeed;
      ${INK}
      ${TONE}
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p) + (iNoise(p * 2.5 + vSeed * 13.0) - 0.5) * 0.45;
        float a = (1.0 - smoothstep(0.35, 1.0, r)) * vA;
        if (a < 0.01) discard;
        vec4 o = outColor(uTint, a * uAlpha);
        gl_FragColor = vec4(siteTone(o.rgb) * o.a, o.a);
      }`,
  });
}

const tagFace = (g, i) => g.setAttribute("aFace", new BufferAttribute(new Float32Array(g.attributes.position.count).fill(i), 1));

// the same charcoal as the kit's carved pieces; each vertex is moved to its face's pivot: rolled by the face's tilt, dropped by its fall
function pieceMaterial(extra) {
  const m = charcoal({ tone: 0.9, vertexColors: true, edge: 0.8, extra });
  const V1 = "uniform float uStep, uBreak;", V2 = "vec3 p = position;", V3 = "vec3 nn = normal;", V4 = "gl_Position = projectionMatrix * viewMatrix * w;";
  if ([V1, V2, V3, V4].some((s) => m.vertexShader.split(s).length !== 2)) throw new Error("faces: charcoal vertex shader changed");
  m.vertexShader = m.vertexShader
    .replace(V1, `${V1}\n      attribute float aFace;\n      uniform vec3 uAt[3];\n      uniform float uDrop[3], uTilt[3], uOn[3];`)
    .replace(V2, `int fi = int(aFace + 0.5);\n        mat3 rz = mat3(cos(uTilt[fi]), sin(uTilt[fi]), 0.0, -sin(uTilt[fi]), cos(uTilt[fi]), 0.0, 0.0, 0.0, 1.0);\n        vec3 p = rz * position + vec3(uAt[fi].x, uAt[fi].y - uDrop[fi], uAt[fi].z);`)
    .replace(V3, "vec3 nn = rz * normal;")
    .replace(V4, `${V4}\n        if (uOn[fi] < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);`);
  m.needsUpdate = true;
  return m;
}

export function buildFaces() {
  const group = new Group();
  const pieces = FACES.map((f, i) => {
    const { at, geometry } = carvedPieces(f);
    return { at, geometry: tagFace(geometry, i) };
  });
  const uAt = { value: pieces.map(({ at }) => new Vector3(...at)) };
  const uDrop = { value: [0, 0, 0] }, uTilt = { value: [0, 0, 0] }, uOn = { value: [1, 1, 1] };
  const pieceMat = pieceMaterial({ uAt, uDrop, uTilt, uOn });
  const body = new Mesh(merge(pieces.map((p) => p.geometry)), pieceMat);
  body.renderOrder = ORDER.set;
  body.frustumCulled = false;
  group.add(body);

  const eyes = FACES.flatMap((f) => [-1, 1].map((s) => [f.x + s * EYE.dx, EYE.y, zF(f.x) + EYE.dz]));
  const aC = new Float32Array(eyes.length * 4), aOpen = new Float32Array(eyes.length);
  eyes.forEach(([x, y, z], j) => aC.set([x, y, z, hash(j, 13)], j * 4));
  const geo = new PlaneGeometry(1, 1);
  const openAttr = new InstancedBufferAttribute(aOpen, 1);
  geo.setAttribute("aC", new InstancedBufferAttribute(aC, 4));
  geo.setAttribute("aOpen", openAttr);
  const halo = new InstancedMesh(geo, haloMaterial(), eyes.length);
  halo.frustumCulled = false;
  halo.renderOrder = ORDER.smoke;
  group.add(halo);

  return {
    group,
    update(t, s) {
      FACES.forEach((f, i) => {
        const d = s - SPLIT[i], drop = d > 0 ? 4.9 * d * d : 0;
        uDrop.value[i] = drop;
        uTilt.value[i] = d > 0 ? -Math.sign(f.x) * Math.min(d, 1.6) * 1.5 : 0;
        uOn.value[i] = FACE_Y - drop > 0.3 ? 1 : 0;
      });
      eyes.forEach((_, j) => {
        const i = j >> 1;
        aOpen[j] = smooth(SPLIT[i] + 0.1, SPLIT[i] + 0.4, s) * (0.85 + 0.15 * Math.sin(s * 9 + i));
      });
      openAttr.needsUpdate = true;
    },
    dispose() {
      body.geometry.dispose();
      pieceMat.dispose();
      geo.dispose();
      halo.material.dispose();
      group.removeFromParent();
    },
  };
}
