"use client";

// THE AKATSUKI HIDEOUT (place p-epsilon-hollow, issue 10 W3): the mouth carved into the hill on the south-east rim.
// The hill is terrain (lib/world/hideout.js, one heightfield bump); this is the dressed part only:
//   - a rock face set in the hill's notch; jambs, lintel and sill in dark stone (one merged mesh)
//   - the hall behind the door: NOT geometry. One plane in the doorway runs an interior-mapping fragment (a ray
//     into a 4.5 m stone room): walls #1c1824, the red cloud #b3122a with its white rim on the back wall, an ember
//     pit #e0559b breathing on the floor. The shader names the place; no white plaza, no statue, no slime.
//   - a cloud banner over the lintel (the same cloud SDF), and paper lanterns lining the walk from the dock:
//     two InstancedMeshes (posts, lanterns), not a loop of meshes.
// Every written material merges UniformsLib.fog, so the island's fog band reaches the mouth.
// Local origin: the place centre [48, 68] on the snow; the mouth is at [44, 66], turned to face the dock.
// Draws: face 1, trim 1, hall 1, banner 1, posts 1, lanterns 1, terrace 1 = 7.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, CylinderGeometry, DoubleSide, Object3D, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HIDEOUT } from "../../../lib/world/hideout";
import { mat } from "../palette";

const STONE = "#1c1824";
const CLOUD = "#b3122a";
const EMBER = "#e0559b";
const DOOR = { w: 3.1, h: 4.2, depth: 4.5 };

// The cloud: three puffs and a flat belly, as a signed distance (p in cloud units, ~[-1, 1] wide).
const CLOUD_SDF = /* glsl */ `
  float cloudSd(vec2 p) {
    float d = length(p - vec2(-0.52, -0.05)) - 0.34;
    d = min(d, length(p - vec2(0.0, 0.12)) - 0.46);
    d = min(d, length(p - vec2(0.55, -0.02)) - 0.36);
    d = min(d, length(p - vec2(0.86, -0.16)) - 0.2);
    vec2 q = abs(p - vec2(0.12, -0.22)) - vec2(0.82, 0.14);
    return min(d, length(max(q, 0.0)) + min(max(q.x, q.y), 0.0));
  }
  // the red cloud with its white rim over the stone, k: 1 cloud, 0 stone
  vec3 cloudPaint(vec2 p, vec3 stone, vec3 red) {
    float d = cloudSd(p);
    float aa = 0.025;
    vec3 c = mix(vec3(0.95, 0.93, 0.92), stone, smoothstep(0.0, aa, d));
    return mix(red, c, smoothstep(-0.075 - aa, -0.075, d));
  }`;

const FOG_V = /* glsl */ `#include <fog_pars_vertex>`;
const FOG_F = /* glsl */ `#include <fog_pars_fragment>`;

function hallMaterial() {
  return new ShaderMaterial({
    fog: true,
    uniforms: UniformsUtils.merge([UniformsLib.fog, {
      uTime: { value: 0 },
      uStone: { value: new Color(STONE) },
      uCloud: { value: new Color(CLOUD) },
      uEmber: { value: new Color(EMBER) },
      uRoom: { value: [DOOR.w, DOOR.h, DOOR.depth] },
    }]),
    vertexShader: /* glsl */ `
      varying vec3 vObj;
      varying vec3 vCam;
      ${FOG_V}
      void main() {
        vObj = position;
        vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uStone;
      uniform vec3 uCloud;
      uniform vec3 uEmber;
      uniform vec3 uRoom;
      varying vec3 vObj;
      varying vec3 vCam;
      ${FOG_F}
      ${CLOUD_SDF}
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        // a ray from the eye through the doorway into a box room: x in +-w/2, y in 0..h, z in -depth..0
        vec3 dir = normalize(vObj - vCam);
        if (dir.z > -0.001) dir.z = -0.001;
        vec3 hw = vec3(uRoom.x * 0.5, uRoom.y, uRoom.z);
        float tx = ((dir.x > 0.0 ? hw.x : -hw.x) - vObj.x) / dir.x;
        float ty = ((dir.y > 0.0 ? hw.y : 0.0) - vObj.y) / dir.y;
        float tz = (-hw.z - vObj.z) / dir.z;
        float t = min(min(tx, ty), tz);
        vec3 h = vObj + dir * t;
        vec3 ember = vec3(0.0, 0.0, -uRoom.z * 0.55);
        float breathe = 0.82 + 0.18 * sin(uTime * 1.7) + 0.06 * sin(uTime * 7.3);
        vec3 col = uStone;
        // block courses on every wall: the hall is cut stone
        vec2 wallUv = t == tz ? h.xy : t == tx ? h.zy : h.xz;
        vec2 blk = wallUv / vec2(1.1, 0.55);
        blk.x += floor(blk.y) * 0.5;
        float seam = min(abs(fract(blk.x) - 0.5), abs(fract(blk.y) - 0.5));
        col *= 0.78 + 0.3 * hash(floor(blk)) ;
        col *= mix(0.55, 1.0, smoothstep(0.42, 0.47, 0.5 - seam + 0.45));
        if (t == tz) {
          // the back wall: the cloud, big, over the ember
          col = cloudPaint((h.xy - vec2(0.0, uRoom.y * 0.6)) / 1.3, col, uCloud * 1.3);
        } else if (t == tx) {
          // the side walls: a small cloud every 2.4 m
          vec2 p = vec2(mod(h.z, 2.4) - 1.2, h.y - 2.6) / 0.42;
          col = cloudPaint(p, col, uCloud * 0.8);
        } else if (dir.y < 0.0) {
          // the floor: the ember pit
          float r = length(h.xz - ember.xz);
          col = mix(col, uEmber * 1.6, (1.0 - smoothstep(0.0, 0.7, r)) * breathe);
        }
        // the ember's light, falling off with distance, and the dark of depth
        float lit = 1.0 / (1.0 + 1.6 * dot(h - ember - vec3(0.0, 0.4, 0.0), h - ember - vec3(0.0, 0.4, 0.0)));
        col += uEmber * lit * 0.5 * breathe;
        col *= mix(1.0, 0.45, clamp(-h.z / uRoom.z, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

function bannerMaterial() {
  return new ShaderMaterial({
    fog: true,
    side: DoubleSide,
    uniforms: UniformsUtils.merge([UniformsLib.fog, { uStone: { value: new Color(STONE) }, uCloud: { value: new Color(CLOUD) }, uTime: { value: 0 } }]),
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      ${FOG_V}
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += 0.06 * sin(uTime * 1.3 + uv.x * 5.0) * (1.0 - uv.y); // the cloth stirs, the top rail holds
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uStone;
      uniform vec3 uCloud;
      varying vec2 vUv;
      ${FOG_F}
      ${CLOUD_SDF}
      void main() {
        vec2 p = (vUv - 0.5) * vec2(2.4, 1.3);
        vec3 col = cloudPaint(p / 0.92, uStone, uCloud);
        col *= 0.85 + 0.15 * smoothstep(0.0, 0.08, min(vUv.y, 1.0 - vUv.y));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

// The dressed stone: the rock face set in the notch (one mesh), and the jambs, lintel and sill in dark #1c1824 (one merged mesh).
function trimGeometry() {
  const parts = [
    new BoxGeometry(0.95, 4.6, 1.0).translate(-(DOOR.w / 2 + 0.47), 2.3, 0.0), // west jamb
    new BoxGeometry(0.95, 4.6, 1.0).translate(DOOR.w / 2 + 0.47, 2.3, 0.0), // east jamb
    new BoxGeometry(DOOR.w + 2.6, 0.75, 1.2).translate(0, DOOR.h + 0.55, 0.05), // the lintel
    new BoxGeometry(DOOR.w + 2.6, 0.22, 1.6).translate(0, 0.11, 0.6), // the sill step
  ];
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  for (const p of parts) p.dispose();
  return g;
}

// Lanterns down both sides of the walk from the mouth toward the dock (local to the mouth: +z out).
const LANTERNS = [1.9, 3.9, 5.9].flatMap((z) => [[-2.4, z], [2.4, z]]);

export default function Hideout() {
  const { mouth, yaw } = HIDEOUT;
  const at = [mouth.x - 48, 0, mouth.z - 68];
  const k = useMemo(() => ({
    face: new BoxGeometry(8.6, 6.8, 1.4).translate(0, 3.4, -0.75), // the face, its front at z = -0.05
    trim: trimGeometry(),
    door: new PlaneGeometry(DOOR.w, DOOR.h).translate(0, DOOR.h / 2, 0),
    banner: new PlaneGeometry(2.4, 1.3, 12, 4),
    post: new CylinderGeometry(0.07, 0.09, 1.7, 6).translate(0, 0.85, 0),
    lantern: new CylinderGeometry(0.26, 0.26, 0.62, 10).translate(0, 0, 0),
    terrace: new CylinderGeometry(2.4, 2.6, 0.12, 20).translate(0, 0.06, 0),
    hall: hallMaterial(),
    cloth: bannerMaterial(),
  }), []);
  const posts = useRef();
  const lamps = useRef();
  useLayoutEffect(() => {
    const o = new Object3D();
    LANTERNS.forEach(([x, z], i) => {
      o.position.set(x, 0, z);
      o.updateMatrix();
      posts.current.setMatrixAt(i, o.matrix);
      o.position.set(x, 1.95, z);
      o.updateMatrix();
      lamps.current.setMatrixAt(i, o.matrix);
    });
    posts.current.instanceMatrix.needsUpdate = true;
    lamps.current.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    k.hall.uniforms.uTime.value = t;
    k.cloth.uniforms.uTime.value = t;
  });
  return (
    <group name="hideout">
      <mesh geometry={k.terrace} material={mat(HIDEOUT.edge, { roughness: 0.9 })} receiveShadow />
      <group position={at} rotation={[0, yaw, 0]}>
        <mesh geometry={k.face} material={mat(HIDEOUT.rock, { roughness: 0.95 })} castShadow receiveShadow />
        <mesh geometry={k.trim} material={mat(STONE, { roughness: 0.85 })} castShadow receiveShadow />
        <mesh geometry={k.door} material={k.hall} position={[0, 0.22, 0.02]} />
        <mesh geometry={k.banner} material={k.cloth} position={[0, DOOR.h + 1.75, 0.05]} />
        <instancedMesh ref={posts} args={[k.post, mat(STONE, { roughness: 0.8 }), LANTERNS.length]} castShadow />
        <instancedMesh ref={lamps} args={[k.lantern, mat(CLOUD, { emissive: CLOUD, emissiveIntensity: 2.4, roughness: 0.6 }), LANTERNS.length]} />
      </group>
    </group>
  );
}
