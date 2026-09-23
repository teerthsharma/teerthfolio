"use client";

// Seal variant C: one skinned plush pup. The body is a single lofted surface
// whose head grows out of the chest, with the face sculpted into it (muzzle,
// freckled pads, a "w" smile groove the sun draws as a shadow line), so the
// expression survives at game distance. Eight bones carry the galumph hump
// through the skin; the eyes (and their blink and ^^ lines), nose, mouth and
// outfit ride the head bone.
// Geometry: ./C-body.js. Props contract: ../../Seal.jsx.

import { createPortal, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Bone, Color, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Skeleton, SkinnedMesh } from "three";
import Outfit from "../Outfit";
import { BONES, buildBody, buildFace, SKULL } from "./C-body";

const TAU = Math.PI * 2;
const SIDES = [1, -1]; // left (+x), right
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function makeRig() {
  const geometry = buildBody();
  const skinMat = new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.45,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    sheen: 0.3,
    sheenColor: new Color("#ffffff"),
    sheenRoughness: 0.5,
  });
  const bones = {};
  const rest = {};
  const list = [];
  const at = Object.fromEntries(BONES.map(([name, , p]) => [name, p]));
  for (const [name, parent, p] of BONES) {
    const b = new Bone();
    b.name = name;
    const o = parent ? at[parent] : [0, 0, 0];
    b.position.set(p[0] - o[0], p[1] - o[1], p[2] - o[2]);
    rest[name] = [b.position.x, b.position.y, b.position.z];
    if (parent) bones[parent].add(b);
    bones[name] = b;
    list.push(b);
  }
  bones.neck.rotation.order = "YXZ";
  bones.head.rotation.order = "YXZ";
  bones.flipperL.rotation.order = "YZX";
  bones.flipperR.rotation.order = "YZX";

  const mesh = new SkinnedMesh(geometry, skinMat);
  mesh.add(bones.root);
  mesh.updateMatrixWorld(true);
  mesh.bind(new Skeleton(list));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;

  const face = buildFace();
  const mats = {
    skin: skinMat,
    dark: new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 }),
    glint: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    mouth: new MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
  };
  const head = at.head;
  return {
    mesh,
    bones,
    rest,
    face,
    mats,
    headOffset: [SKULL[0] - head[0], SKULL[1] - head[1], SKULL[2] - head[2]],
    dispose() {
      geometry.dispose();
      for (const k of ["lenses", "glints", "happyEyes", "shutEyes", "dark", "mouth"]) face[k].dispose();
      for (const m of Object.values(mats)) m.dispose();
    },
  };
}

// ?sealface=happy|blink holds that expression, for close-up captures.
function forcedFace() {
  return new URLSearchParams(window.location.search).get("sealface");
}

export default function SealC({ near, drive, headRef }) {
  const rig = useMemo(makeRig, []);
  const force = useMemo(forcedFace, []);
  useEffect(() => () => rig.dispose(), [rig]);
  const eyes = useRef();
  const happyEyes = useRef();
  const shutEyes = useRef();
  const mouth = useRef();

  useFrame(() => {
    const d = drive;
    const { bones: b, rest } = rig;
    const t = d.t;

    // Galumph: the chest lifts first, the hips follow 0.28 of a cycle later,
    // so the hump travels nose to tail through the skin.
    const P = TAU * d.stride;
    const amp = d.stepping * (1 - 0.45 * d.boost);
    const chest = Math.max(0, Math.sin(P)) * amp;
    const hips = Math.max(0, Math.sin(P - TAU * 0.28)) * amp;
    const land = Math.max(0, -Math.sin(P)) * amp;
    const sq = d.squash;
    const bend = clamp(d.turn * 0.08, -0.3, 0.3);
    const wiggle = Math.sin(t * 18) * d.happy;

    // Whole body about the ground point: lean, happy wiggle, bump squash,
    // stretch on the lift, flatten on landing, toboggan on boost.
    b.root.rotation.z = d.lean + wiggle * 0.14;
    b.root.scale.set(
      1 + 0.15 * sq,
      1 - 0.3 * sq - 0.05 * land - 0.06 * d.boost,
      1 + 0.15 * sq + 0.06 * chest + 0.08 * d.boost,
    );

    b.hips.position.y = rest.hips[1] + 0.07 * hips;
    b.hips.rotation.set(0.1 * hips - 0.03 * chest, -bend, 0);
    b.chest.position.y = rest.chest[1] + 0.12 * chest;
    b.chest.rotation.set(-0.14 * chest, bend + d.lookYaw * 0.15, 0);
    b.chest.scale.y = 1 + Math.sin(t * 2.4) * 0.015; // breath

    // Look: the chest takes 15% of the turn, the neck 35%, the head the rest
    // (spread so a full glance bends the plush instead of folding it); the neck
    // counter-pitches the chest so the eyes stay level; a bump dips the head.
    // Looking up is exaggerated x1.5 (capped, or a glance up shows the chin):
    // the camera sits 50 degrees up, and only
    // a face tipped toward it shows the pads and the smile.
    const pitch = d.lookPitch > 0 ? Math.min(d.lookPitch * 1.5, 0.55) : d.lookPitch;
    b.neck.rotation.set(-pitch * 0.35 + 0.11 * chest + 0.3 * Math.max(0, sq), d.lookYaw * 0.35, 0);
    b.head.rotation.set(-pitch * 0.65 + 0.03 * chest, d.lookYaw * 0.5, 0);

    // Tail: lifts with the hips, wags when happy, flicks now and then.
    const flick = Math.max(0, Math.sin(t * 0.83)) ** 40 * (1 - amp);
    b.tail.rotation.set(0.35 * hips + 0.3 * flick, Math.sin(t * 18) * 0.45 * d.happy - bend, 0);

    // Fore-flippers: reach forward as the chest lifts, push back on landing,
    // sweep along the flanks for the toboggan, and one waves.
    const paddle = -0.35 * amp * Math.sin(P + 0.9);
    for (const side of SIDES) {
      const f = side > 0 ? b.flipperL : b.flipperR;
      const waving = d.waveSide === side ? d.wave : 0;
      const sweep = paddle + 1.05 * d.boost - 0.35 * waving + Math.sin(t * 16) * 0.35 * waving;
      const lift = -0.3 * chest + 0.3 * d.boost + 1.22 * waving;
      f.rotation.set(0, side * sweep, side * lift);
    }

    // Face: a blink (and a hard bump) squashes the eyes, then swaps them for
    // a closed curve; arriving squints them into ^^ arches and opens the smile.
    const shut = force === "blink" ? 1 : Math.max(d.blink, smooth(0.4, 0.6, sq));
    const squint = force === "happy" ? 1 : smooth(0.3, 0.55, d.happy);
    const happy = squint > 0.5;
    const closed = !happy && shut > 0.55;
    eyes.current.scale.y = (1 - 0.7 * shut) * (1 - squint);
    eyes.current.visible = !happy && !closed;
    shutEyes.current.visible = closed;
    happyEyes.current.visible = happy;
    mouth.current.visible = squint > 0.01;
    mouth.current.scale.setScalar(Math.max(squint, 0.01));
  });

  const { face, mats } = rig;
  return (
    <>
      <primitive object={rig.mesh} />
      {createPortal(
        <group ref={headRef} position={rig.headOffset}>
          <group ref={eyes} position={face.eyePivot}>
            <mesh geometry={face.lenses} material={mats.dark} />
            <mesh geometry={face.glints} material={mats.glint} />
          </group>
          <mesh ref={happyEyes} geometry={face.happyEyes} material={mats.dark} visible={false} />
          <mesh ref={shutEyes} geometry={face.shutEyes} material={mats.dark} visible={false} />
          <mesh geometry={face.dark} material={mats.dark} />
          <mesh ref={mouth} geometry={face.mouth} material={mats.mouth} position={face.mouthAt} visible={false} />
          <Outfit placeId={near} />
        </group>,
        rig.bones.head,
      )}
    </>
  );
}
