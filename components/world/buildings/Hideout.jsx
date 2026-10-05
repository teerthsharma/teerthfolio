"use client";

// THE AKATSUKI HIDEOUT (place p-epsilon-hollow, issue 10 W3): a building the seal goes inside. The hill, the hall,
// the corridor and the walls the seal is held by are lib/world/hideout.js (terrain + hideoutBlocked); this draws:
//   - the dressed face round an open doorway (one merged mesh), dark jambs and lintel (one merged mesh), a cloud banner
//   - the vault over the hall's back half (the camera side stays open), the floor with the red cloud in a fragment
//   - THE RING: eleven seal statues in Akatsuki cloaks (black, red clouds with white rims) and forehead protectors,
//     one per member, each a THEOREM the owner's work leans on, ranked by use; the most used stands in Pain's place
//     at the head of the ring (north). Stone bodies share one written statue shader; bodies, cloaks and protectors
//     are three InstancedMeshes; the eleven plaques are one merged mesh on one canvas atlas.
//   - red paper lanterns, outside along the walk and inside round the wall: two InstancedMeshes
// While the seal is indoors the face fades so the follow camera sees the pup. Every written material merges
// UniformsLib.fog. Local origin: the place centre [48, 68] on the snow.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide, FrontSide, MeshStandardMaterial, Object3D,
  PlaneGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, TorusGeometry, UniformsLib, UniformsUtils,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HIDEOUT, STATUES } from "../../../lib/world/hideout";
import { live } from "../../../lib/world/store";
import { mat } from "../palette";

const STONE = "#1c1824";
const CLOUD = "#b3122a";
const EMBER = "#e0559b";
const DOOR = { w: 3.1, h: 4.2 };
const O = [48, 68]; // the place centre: everything below is drawn relative to it
const rel = (x, z) => [x - O[0], z - O[1]];

// The eleven, ranked by how much of the owner's work stands on them (data/showcase.json: the lab projects and the
// landed PRs). [member, theorem, formula]. 1 takes Pain's place.
export const THEOREMS = [
  ["Pain", "Stability of persistence", "dB(Dgm f, Dgm g) ≤ ‖f − g‖∞"], // topological-ml-toolkit, caustic, monodromy, nerve
  ["Konan", "Gauss linking number", "Lk = (1/4π) ∮∮ (r₁−r₂)·(dr₁×dr₂) / |r₁−r₂|³"], // tangle
  ["Itachi", "Green's theorem", "A = ½ ∮ (x dy − y dx)"], // planimeter
  ["Kisame", "Banach fixed point", "‖Tx − Ty‖ ≤ q‖x − y‖, q < 1"], // aether-lang: loops stop when the shape stops changing
  ["Deidara", "Neumann series", "(I − αA)⁻¹ = Σ αᵏ Aᵏ"], // resolvent: attention and Markov paths
  ["Sasori", "Faraday's law", "dF = 0"], // faraday
  ["Hidan", "Nerve lemma", "N(\u{1D4B0}) ≃ ⋃ \u{1D4B0}"], // nerve
  ["Kakuzu", "Monodromy theorem", "homotopic paths, one continuation"], // monodromy
  ["Tobi", "Stable manifold theorem", "Wˢ is tangent to Eˢ"], // separatrix
  ["Zetsu", "Euler–Poincaré", "χ = Σ (−1)ᵏ βₖ"], // caustic, the Betti numbers
  ["Orochimaru", "Hopf fibration", "S³ → S², every fibre linked once"], // epsilon-hollow: the sphere
];

// The ring (lib/world/hideout.js STATUES): the head, Pain's place, due north.
const RING = STATUES.map(([x, z, face], i) => {
  const [lx, lz] = rel(x, z);
  return { x: lx, z: lz, face, head: i === 0 };
});

const CLOUD_SDF = /* glsl */ `
  float cloudSd(vec2 p) {
    float d = length(p - vec2(-0.52, -0.05)) - 0.34;
    d = min(d, length(p - vec2(0.0, 0.12)) - 0.46);
    d = min(d, length(p - vec2(0.55, -0.02)) - 0.36);
    d = min(d, length(p - vec2(0.86, -0.16)) - 0.2);
    vec2 q = abs(p - vec2(0.12, -0.22)) - vec2(0.82, 0.14);
    return min(d, length(max(q, 0.0)) + min(max(q.x, q.y), 0.0));
  }
  vec3 cloudPaint(vec2 p, vec3 stone, vec3 red) {
    float d = cloudSd(p);
    vec3 c = mix(vec3(0.95, 0.93, 0.92), stone, smoothstep(0.0, 0.025, d));
    return mix(red, c, smoothstep(-0.1, -0.075, d));
  }`;

// A written material: a painted light ramp (bands, not albedo * 0.2), a rim, fog from the island, instancing if used.
function written(body, side = FrontSide) {
  return new ShaderMaterial({
    fog: true,
    side,
    uniforms: UniformsUtils.merge([UniformsLib.fog, { uTime: { value: 0 }, uStone: { value: new Color(STONE) }, uCloud: { value: new Color(CLOUD) }, uEmber: { value: new Color(EMBER) } }]),
    vertexShader: /* glsl */ `
      varying vec3 vObj;
      varying vec3 vN;
      varying vec3 vView;
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vObj = position;
        vUv = uv;
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = modelMatrix * instanceMatrix;
        #endif
        vec4 w = m * vec4(position, 1.0);
        vN = normalize(mat3(m) * normal);
        vView = normalize(cameraPosition - w.xyz);
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uStone;
      uniform vec3 uCloud;
      uniform vec3 uEmber;
      varying vec3 vObj;
      varying vec3 vN;
      varying vec3 vView;
      varying vec2 vUv;
      #include <fog_pars_fragment>
      ${CLOUD_SDF}
      float ramp(vec3 n) {
        float l = dot(normalize(n), normalize(vec3(0.3, 1.0, 0.45)));
        return l > 0.35 ? 1.0 : l > -0.1 ? 0.66 : 0.42;
      }
      float rim(vec3 n) { return pow(1.0 - abs(dot(normalize(n), vView)), 3.0); }
      void main() {
        vec3 col;
        ${body}
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

const statueMaterial = () => written(/* glsl */ `
  float grain = fract(sin(dot(floor(vObj * 18.0), vec3(12.9, 78.2, 37.7))) * 43758.5);
  col = vec3(0.56, 0.53, 0.58) * ramp(vN) * (0.9 + 0.12 * grain) + rim(vN) * vec3(0.45, 0.3, 0.4);`);
const cloakMaterial = () => written(/* glsl */ `
  float a = atan(vObj.z, vObj.x);
  vec2 p = vec2(mod(a * 1.3 + 0.4, 2.1) - 1.05, vObj.y * 4.2 - 2.4) / 0.5;
  col = cloudPaint(p, vec3(0.05, 0.04, 0.06), uCloud * 1.2) * ramp(vN) + rim(vN) * uEmber * 0.5;`, DoubleSide);
const floorMaterial = () => written(/* glsl */ `
  vec2 blk = vObj.xy / 0.9;
  blk.x += floor(blk.y) * 0.5;
  float seam = min(abs(fract(blk.x) - 0.5), abs(fract(blk.y) - 0.5));
  vec3 stone = uStone * (1.6 + 0.3 * fract(sin(dot(floor(blk), vec2(12.9, 78.2))) * 43758.5)) * mix(0.6, 1.0, smoothstep(0.42, 0.46, 0.5 - seam + 0.45));
  col = cloudPaint(vec2(vObj.x, -vObj.y) / 2.4, stone, uCloud);`);
const vaultMaterial = () => written(/* glsl */ `col = vec3(0.23, 0.2, 0.16) * ramp(vN) * (0.75 + 0.35 * fract(sin(dot(floor(vObj * 2.0), vec3(1.7, 9.2, 3.3))) * 43758.5));`, DoubleSide); // the hill's rock #3a3228, banded
const bannerMaterial = () => written(/* glsl */ `col = cloudPaint((vUv - 0.5) * vec2(2.6, 1.4) / 0.92, uStone, uCloud);`, DoubleSide);

const merged = (parts) => mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));

// The face round the doorway (two cheeks and the head over the door) and the dark trim.
function faceGeometry() {
  const side = (4.3 - DOOR.w / 2) / 2;
  return merged([
    new BoxGeometry(side * 2, 6.8, 1.4).translate(-(DOOR.w / 2 + side), 3.4, -0.75),
    new BoxGeometry(side * 2, 6.8, 1.4).translate(DOOR.w / 2 + side, 3.4, -0.75),
    new BoxGeometry(DOOR.w, 6.8 - DOOR.h, 1.4).translate(0, DOOR.h + (6.8 - DOOR.h) / 2, -0.75),
  ]);
}
function trimGeometry() {
  return merged([
    new BoxGeometry(0.95, 4.6, 1.0).translate(-(DOOR.w / 2 + 0.47), 2.3, 0.0),
    new BoxGeometry(0.95, 4.6, 1.0).translate(DOOR.w / 2 + 0.47, 2.3, 0.0),
    new BoxGeometry(DOOR.w + 2.6, 0.75, 1.2).translate(0, DOOR.h + 0.55, 0.05),
  ]);
}
// A seal sitting up: body, head, muzzle, two fore-flippers; one geometry, instanced.
function sealGeometry() {
  return merged([
    new SphereGeometry(0.62, 14, 10).scale(1, 1.25, 0.9).translate(0, 0.78, 0),
    new SphereGeometry(0.46, 14, 10).translate(0, 1.82, 0.08),
    new SphereGeometry(0.13, 8, 6).scale(1, 0.8, 1.2).translate(0, 1.72, 0.52),
    new SphereGeometry(0.2, 8, 6).scale(0.5, 1.4, 0.9).rotateZ(0.5).translate(-0.6, 0.7, 0.2),
    new SphereGeometry(0.2, 8, 6).scale(0.5, 1.4, 0.9).rotateZ(-0.5).translate(0.6, 0.7, 0.2),
  ]);
}

// Eleven plaques on one canvas atlas: row i is THEOREMS[i]; each plaque's quad samples its row.
function plaques() {
  const W = 512;
  const H = 128;
  let map = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H * THEOREMS.length;
    const g = canvas.getContext("2d");
    THEOREMS.forEach(([who, name, formula], i) => {
      const y = i * H;
      g.fillStyle = "#8f877f";
      g.fillRect(0, y, W, H);
      g.strokeStyle = "#4a433d";
      g.lineWidth = 6;
      g.strokeRect(6, y + 6, W - 12, H - 12);
      g.fillStyle = "#1c1824";
      g.textAlign = "center";
      g.font = "bold 40px Georgia, serif";
      g.fillText(name.toUpperCase(), W / 2, y + 52, W - 40);
      g.font = "26px Georgia, serif";
      g.fillText(formula, W / 2, y + 88, W - 40);
      g.fillStyle = "#b3122a";
      g.font = "italic 18px Georgia, serif";
      g.fillText(`${i + 1} · ${who}`, W / 2, y + 114);
    });
    map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
  }
  const quads = RING.map(({ x, z, face }, i) => {
    const q = new PlaneGeometry(1.2, 0.3);
    const uv = q.attributes.uv;
    for (let n = 0; n < uv.count; n++) uv.setY(n, 1 - (i + 1 - uv.getY(n)) / THEOREMS.length);
    return q.rotateX(-0.35).translate(0, 0.32, 1.09).rotateY(face).translate(x, 0, z);
  });
  const stands = RING.map(({ x, z, face }) => new BoxGeometry(1.3, 0.42, 0.32).translate(0, 0.21, 0.92).rotateY(face).translate(x, 0, z));
  return { plaque: merged(quads), stands: merged(stands), map };
}

// Lanterns: outside along the walk to the door, inside round the hall's wall.
const LANTERNS = [
  ...[1.9, 3.9, 5.9].flatMap((dz) => [rel(HIDEOUT.mouth.x - 2.4, HIDEOUT.mouth.z + dz), rel(HIDEOUT.mouth.x + 2.4, HIDEOUT.mouth.z + dz)]),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = Math.PI * (0.72 + i * 0.223); // round the wall from south-west to south-east, clear of the door (south)
    return rel(HIDEOUT.hall.x + Math.cos(a) * (HIDEOUT.hall.r - 0.35), HIDEOUT.hall.z + Math.sin(a) * (HIDEOUT.hall.r - 0.35));
  }),
];

export default function Hideout() {
  const { mouth, hall } = HIDEOUT;
  const at = rel(mouth.x, mouth.z);
  const hc = rel(hall.x, hall.z);
  const k = useMemo(() => {
    const p = plaques();
    return {
      face: faceGeometry(),
      trim: trimGeometry(),
      faceMat: new MeshStandardMaterial({ color: HIDEOUT.rock, roughness: 0.95, flatShading: true, transparent: true }),
      trimMat: new MeshStandardMaterial({ color: STONE, roughness: 0.85, flatShading: true, transparent: true }),
      banner: new PlaneGeometry(2.4, 1.3),
      vault: new SphereGeometry(hall.r + 0.4, 28, 10, Math.PI, Math.PI, 0, Math.PI / 2).scale(1, 1.3, 1),
      floor: new CircleGeometry(hall.r + 0.2, 40).rotateX(-Math.PI / 2),
      seal: sealGeometry(),
      cloak: new CylinderGeometry(0.5, 0.95, 1.5, 18, 1, true).translate(0, 0.8, 0),
      band: new TorusGeometry(0.44, 0.06, 6, 20).rotateX(Math.PI / 2).translate(0, 1.98, 0.06),
      post: new CylinderGeometry(0.07, 0.09, 1.7, 6).translate(0, 0.85, 0),
      lantern: new CylinderGeometry(0.26, 0.26, 0.62, 10),
      terrace: new CylinderGeometry(2.4, 2.6, 0.12, 20).translate(0, 0.06, 0),
      ...p,
      plaqueMat: p.map ? new MeshStandardMaterial({ map: p.map, roughness: 0.9 }) : mat("#8f877f"),
      statue: statueMaterial(),
      cloth: cloakMaterial(),
      flagstones: floorMaterial(),
      vaultMat: vaultMaterial(),
      bannerMat: bannerMaterial(),
    };
  }, [hall.r]);
  const seals = useRef();
  const cloaks = useRef();
  const bands = useRef();
  const posts = useRef();
  const lamps = useRef();
  useLayoutEffect(() => {
    const o = new Object3D();
    const put = (mesh, i, x, y, z, ry = 0, s = 1) => {
      o.position.set(x, y, z);
      o.rotation.set(0, ry, 0);
      o.scale.setScalar(s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    };
    RING.forEach(({ x, z, face, head }, i) => {
      const s = head ? 1.35 : 1; // Pain's place stands taller at the head of the ring
      for (const r of [seals, cloaks, bands]) put(r.current, i, x, 0, z, face, s);
    });
    LANTERNS.forEach(([x, z], i) => {
      put(posts.current, i, x, 0, z);
      put(lamps.current, i, x, 1.95, z);
    });
    for (const r of [seals, cloaks, bands, posts, lamps]) r.current.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    for (const m of [k.statue, k.cloth, k.flagstones, k.vaultMat, k.bannerMat]) m.uniforms.uTime.value = t;
    // indoors (the hall or the corridor): the face fades so the follow camera sees the pup through it
    const s = live.seal;
    const inside = Math.hypot(s.x - hall.x, s.z - hall.z) < hall.r + 0.5 || (Math.abs(s.x - mouth.x) < HIDEOUT.door + 0.2 && s.z < mouth.z + 0.4 && s.z > hall.z);
    const o = k.faceMat.opacity + ((inside ? 0.18 : 1) - k.faceMat.opacity) * Math.min(1, dt * 6);
    k.faceMat.opacity = k.trimMat.opacity = o;
    k.faceMat.depthWrite = k.trimMat.depthWrite = o > 0.95;
  });
  return (
    <group name="hideout">
      <mesh geometry={k.terrace} material={mat(HIDEOUT.edge, { roughness: 0.9 })} receiveShadow />
      <group position={[at[0], 0, at[1]]}>
        <mesh geometry={k.face} material={k.faceMat} castShadow receiveShadow />
        <mesh geometry={k.trim} material={k.trimMat} castShadow />
        <mesh geometry={k.banner} material={k.bannerMat} position={[0, DOOR.h + 1.75, 0.05]} />
      </group>
      <group position={[hc[0], 0, hc[1]]}>
        <mesh geometry={k.floor} material={k.flagstones} position={[0, 0.03, 0]} receiveShadow />
        <mesh geometry={k.vault} material={k.vaultMat} />
      </group>
      <instancedMesh ref={seals} args={[k.seal, k.statue, RING.length]} castShadow />
      <instancedMesh ref={cloaks} args={[k.cloak, k.cloth, RING.length]} castShadow />
      <instancedMesh ref={bands} args={[k.band, mat("#9aa3ad", { metalness: 0.6, roughness: 0.35 }), RING.length]} />
      <mesh geometry={k.plaque} material={k.plaqueMat} />
      <mesh geometry={k.stands} material={mat("#6a625c", { roughness: 0.9 })} castShadow />
      <instancedMesh ref={posts} args={[k.post, mat(STONE, { roughness: 0.8 }), LANTERNS.length]} castShadow />
      <instancedMesh ref={lamps} args={[k.lantern, mat(CLOUD, { emissive: CLOUD, emissiveIntensity: 2.4, roughness: 0.6 }), LANTERNS.length]} />
    </group>
  );
}
