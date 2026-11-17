// The three carved MujoRush faces: each keeps its brows, lids and whisker pads, falls with its own skin, and its eyes bloom ember as they open.
import { BoxGeometry, Color, Group, InstancedBufferAttribute, InstancedMesh, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry } from "three";
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

export function buildFaces(k) {
  const group = new Group();
  const pieceMat = charcoal({ tone: 0.9, vertexColors: true, edge: 0.8 });
  const pivots = FACES.map((f, i) => {
    const { at, geometry } = carvedPieces(f);
    const pivot = new Group();
    pivot.position.set(...at);
    const mesh = new Mesh(geometry, pieceMat);
    mesh.renderOrder = ORDER.set;
    mesh.frustumCulled = false;
    pivot.add(mesh);
    k.faces[i].add(pivot);
    return pivot;
  });

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
        pivots[i].position.y = FACE_Y - drop;
        pivots[i].rotation.z = d > 0 ? -Math.sign(f.x) * Math.min(d, 1.6) * 1.5 : 0;
        pivots[i].visible = FACE_Y - drop > 0.3;
      });
      eyes.forEach((_, j) => {
        const i = j >> 1;
        aOpen[j] = smooth(SPLIT[i] + 0.1, SPLIT[i] + 0.4, s) * (0.85 + 0.15 * Math.sin(s * 9 + i));
      });
      openAttr.needsUpdate = true;
    },
    dispose() {
      for (const p of pivots) {
        p.removeFromParent();
        p.children[0].geometry.dispose();
      }
      pieceMat.dispose();
      geo.dispose();
      halo.material.dispose();
      group.removeFromParent();
    },
  };
}
