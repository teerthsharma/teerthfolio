"use client";

// Seal variant A: the old harp-seal pup, ported. One deformed-sphere body
// (A-body.js) painted and skinned in its shader (A-skin.js), plus a real face
// glued to it: glossy eyes with catchlights, lids that blink, ^^ when happy,
// a charcoal nose, and a mouth that opens when it is happy.
//
// The shader bends the body (head about the neck, flippers about the
// shoulders, tail, the travelling hump, the turn); the head groups below
// repeat the same head transform on the CPU, in the same order (lift, bend,
// neck rotation), so everything in them stays on the face.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import Outfit, { HEAD_RADIUS } from "../Outfit";
import { buildSealBody } from "./A-body";
import { makeSkin, PALETTE } from "./A-skin";

const TAU = Math.PI * 2;
const EYE_R = 0.1;
const EYE_DEPTH = 0.5;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const Z = new Vector3(0, 0, 1);

function sphereAt(r, [x, y, z], scale = [1, 1, 1], ws = 16, hs = 12) {
  const g = new SphereGeometry(r, ws, hs);
  g.scale(...scale);
  g.translate(x, y, z);
  return g;
}

function paint(g, hex) {
  const c = new Color(hex);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new Float32BufferAttribute(a, 3));
  return g;
}

function buildKit() {
  const { geometry, anchors: a } = buildSealBody();
  const { skin, depth, uniforms } = makeSkin(a);
  const S = a.skull;
  const local = (p) => p.map((v, i) => v - S[i]);

  // Eyes: glossy lenses set into the skin. A full ball stuck out past the
  // snout from the side, so each eye is a sphere squashed along its gaze to
  // EYE_DEPTH and sunk a little: it bulges ~3.5 cm, the old pup's set-in look.
  const eyes = a.eyes.map((e) => {
    const c = local(e.at).map((v, i) => v - e.n[i] * 0.015);
    const n = new Vector3(...e.n);
    const frame = new Matrix4().compose(new Vector3(...c), new Quaternion().setFromUnitVectors(Z, n), new Vector3(1, 1, EYE_DEPTH));
    return { c, n, frame };
  });
  const eyeGeo = mergeGeometries(eyes.map((e) => new SphereGeometry(EYE_R, 20, 14).applyMatrix4(e.frame)));
  // Catchlights: the sun is front-left, so both sit upper-left from the lens,
  // on the lens surface (unit-sphere offsets through the same squash).
  const glint = (e, [x, y], r) => {
    const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    const p = new Vector3(x * EYE_R, y * EYE_R, z * EYE_R).applyMatrix4(e.frame);
    return sphereAt(r, [p.x, p.y, p.z], [1, 1, 1], 10, 8);
  };
  const catchGeo = mergeGeometries(eyes.flatMap((e) => [glint(e, [-0.34, 0.4], 0.032), glint(e, [0.38, -0.34], 0.014)]));

  // Lids: one hemisphere shell (pole +y) per eye, turned about the eye's own
  // x axis from tucked in the head (open) down over the lens (shut).
  const lidGeo = new SphereGeometry(EYE_R * 1.08, 24, 8, 0, TAU, 0, Math.PI / 2);
  // Happy ^^: a charcoal arch per eye, drawn on the skin in place of the eye.
  const arcGeo = mergeGeometries(
    eyes.map((e) => {
      const at = e.c.map((v, i) => v + e.n.getComponent(i) * 0.03);
      const m = new Matrix4().compose(new Vector3(...at), new Quaternion().setFromUnitVectors(Z, e.n), new Vector3(1, 1, 0.35));
      return new TorusGeometry(0.066, 0.02, 8, 20, Math.PI).applyMatrix4(m);
    }),
  );

  // Nose: a rounded triangle, wider on top, on the snout tip.
  const noseGeo = new SphereGeometry(1, 16, 12);
  const np = noseGeo.attributes.position;
  for (let i = 0; i < np.count; i++) {
    const y = np.getY(i);
    np.setXYZ(i, np.getX(i) * 0.074 * (0.74 + 0.3 * y), y * 0.048, np.getZ(i) * 0.042);
  }
  noseGeo.computeVertexNormals();
  noseGeo.applyQuaternion(new Quaternion().setFromUnitVectors(Z, new Vector3(...a.nose.n)));
  noseGeo.translate(...local(a.nose.at).map((v, i) => v + a.nose.n[i] * 0.02));

  // Open mouth: a dark-rose oval with a tongue, scaled open by `happy`.
  const mouthGeo = mergeGeometries([
    paint(sphereAt(1, [0, 0, 0], [0.062, 0.05, 0.03]), "#9c4150"),
    paint(sphereAt(1, [0, -0.02, 0.012], [0.04, 0.024, 0.022]), "#e0707e"),
  ]);
  mouthGeo.applyQuaternion(new Quaternion().setFromUnitVectors(Z, new Vector3(...a.mouth.n)));
  const mouthAt = local(a.mouth.at).map((v, i) => v + a.mouth.n[i] * 0.004);

  const mats = {
    eye: new MeshPhysicalMaterial({ color: "#111318", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 }),
    catch: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    lid: new MeshPhysicalMaterial({ color: PALETTE.flank, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.22 }),
    nose: new MeshPhysicalMaterial({ color: PALETTE.ink, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
    mouth: new MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
  };
  const lids = new InstancedMesh(lidGeo, mats.lid, 2);

  const geos = [geometry, eyeGeo, catchGeo, lidGeo, arcGeo, noseGeo, mouthGeo];
  const dispose = () => {
    geos.forEach((g) => g.dispose());
    Object.values(mats).forEach((m) => m.dispose());
    skin.dispose();
    depth.dispose();
    lids.dispose();
  };
  return { a, geometry, skin, depth, uniforms, eyes, eyeGeo, catchGeo, lids, arcGeo, noseGeo, mouthGeo, mouthAt, mats, dispose };
}

// Scratch for the lid matrices: no allocation per frame. A lid is the eye's
// frame (position, gaze, squash) times its own turn about the eye's x axis,
// so the shell stays hugging the squashed lens at every angle.
const rot = new Matrix4();
const m4 = new Matrix4();

export default function SealA({ near, drive, headRef }) {
  const kit = useMemo(buildKit, []);
  useEffect(() => kit.dispose, [kit]);
  const body = useRef();
  const lift = useRef();
  const bend = useRef();
  const neck = useRef();
  const mouth = useRef();
  const glints = useRef();
  const eyes = useRef();
  const arcs = useRef();
  const { a } = kit;

  useFrame(() => {
    const d = drive;
    const u = kit.uniforms;
    const t = d.t;
    const phase = TAU * d.stride;
    const chest = Math.max(0, Math.sin(phase));
    const walk = d.stepping * (1 - d.boost);

    // Galumph hump (shader), and the head riding it.
    const hump = 0.12 * d.stepping * (1 - 0.6 * d.boost);
    u.uPhase.value = phase;
    u.uLift.value = hump;
    lift.current.position.y = hump * chest;

    // Turn bend.
    const b = clamp(d.turn * 0.08, -0.25, 0.25);
    u.uBend.value = b;
    bend.current.rotation.y = b;

    // Head: where drive looks, dipped by a bump.
    const yaw = clamp(d.lookYaw, -1.1, 1.1);
    const pitch = d.lookPitch - Math.max(0, d.squash) * 0.35;
    u.uLook.value.set(yaw, pitch);
    neck.current.rotation.set(-pitch, yaw, 0, "YXZ");

    // Fore-flippers: paddle back on each landing, swept flat for boost, and
    // one lifts to wave.
    let sweep = 0.1 + walk * (0.28 + 0.3 * Math.sin(phase - 0.9));
    let raise = walk * 0.12 * chest;
    sweep = sweep * (1 - d.boost) + 1.2 * d.boost;
    raise = raise * (1 - d.boost) + 0.4 * d.boost;
    const wl = d.waveSide > 0 ? d.wave : 0;
    const wr = d.waveSide < 0 ? d.wave : 0;
    const waggle = Math.sin(t * 16) * 0.35;
    u.uFlip.value.set(raise + wl * 1.22, sweep + waggle * wl, raise + wr * 1.22, sweep + waggle * wr);

    // Tail: the old incommensurate sway, a wag when happy, a flick now and then.
    const sway = (Math.sin(t * 7.54) * 0.7 + Math.sin(t * 4.93 + 1.3) * 0.3) * (0.03 + 0.085 * d.gait) + Math.sin(t * 18) * 0.1 * d.happy;
    const flick = 0.08 * Math.max(0, Math.sin(t * 0.83)) ** 16 * (1 - d.gait);
    u.uTail.value.set(sway, flick);

    // Whole body: lean, happy wiggle, breath, bump squash about the ground,
    // stretch on the lift and squash on landing, toboggan stretch.
    const landing = Math.max(0, -Math.sin(phase)) * walk;
    const sq = d.squash;
    const breath = 1 + Math.sin(t * 2.4) * 0.015;
    const sb = body.current;
    sb.rotation.z = d.lean + Math.sin(t * 18) * 0.14 * d.happy;
    sb.scale.set(
      1 + 0.15 * sq,
      (1 - 0.3 * sq) * (1 - 0.06 * landing - 0.06 * d.boost) * breath,
      (1 + 0.15 * sq) * (1 + 0.06 * chest * walk + 0.08 * d.boost),
    );

    // Eyes: lids blink and squeeze shut on a bump; ^^ arches while happy.
    const shut = Math.max(d.blink, smooth(0.3, 0.5, sq));
    rot.makeRotationX(-1.9 + 3.35 * shut);
    for (let i = 0; i < 2; i++) kit.lids.setMatrixAt(i, m4.multiplyMatrices(kit.eyes[i].frame, rot));
    kit.lids.instanceMatrix.needsUpdate = true;
    const beaming = d.happy > 0.3;
    eyes.current.visible = !beaming;
    kit.lids.visible = !beaming;
    arcs.current.visible = beaming;
    glints.current.visible = !beaming && shut < 0.5;

    // Mouth opens into a smile when happy.
    const open = smooth(0.2, 0.55, d.happy);
    mouth.current.visible = open > 0.01;
    mouth.current.scale.set(0.6 + 0.4 * open, open, 1);
  });

  const skullOffset = a.skull.map((v, i) => v - a.neck[i]);
  return (
    <group ref={body}>
      <mesh geometry={kit.geometry} material={kit.skin} customDepthMaterial={kit.depth} castShadow receiveShadow frustumCulled={false} />
      <group ref={lift}>
        <group ref={bend}>
          <group ref={neck} position={a.neck}>
            <group position={skullOffset}>
              <mesh ref={eyes} geometry={kit.eyeGeo} material={kit.mats.eye} />
              <mesh ref={arcs} geometry={kit.arcGeo} material={kit.mats.nose} visible={false} />
              <mesh ref={glints} geometry={kit.catchGeo} material={kit.mats.catch} />
              <primitive object={kit.lids} />
              <mesh geometry={kit.noseGeo} material={kit.mats.nose} />
              <mesh ref={mouth} geometry={kit.mouthGeo} material={kit.mats.mouth} position={kit.mouthAt} />
              <group ref={headRef} scale={a.skullR / HEAD_RADIUS}>
                <Outfit placeId={near} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
