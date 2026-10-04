"use client";

// TNT crates and the Bruno-style toys: a pyramid of cubes, a bowling lane, a
// row of cones. The rules are in lib/world/toys.js (tickToys); every toy is a
// prop in live.props, so lib/world/motion.js already shoves it. This file seeds
// them, ticks them, and draws each kind as one InstancedMesh (5 draw calls).
// The blast's smoke, confetti and scorch are drawn by Blast.jsx.

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, LatheGeometry, Object3D, Quaternion, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { tickToys } from "../../lib/world/toys";
import { live } from "../../lib/world/store";
import { WORLD } from "./Controller";
import { solidProps, buildToys } from "./life/toys-seed";
import { easeOutBack } from "./life/util";

// ---- geometry, built once ---------------------------------------------------

function paint(geometry, color) {
  const c = new Color(color);
  const n = geometry.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return geometry;
}

const box = (w, h, d, x, y, z, color, rotZ = 0) => {
  const g = new BoxGeometry(w, h, d).toNonIndexed();
  if (rotZ) g.rotateZ(rotZ);
  g.translate(x, y, z);
  return paint(g, color);
};

const PINK = "#f4707f";
const PINK_DARK = "#e2546a";
const CREAM = "#fff2df";

// T N T in dark pink bars on the cream band, one set per face.
function letters() {
  const parts = [];
  const bar = (x, y, w, h, rot = 0) => parts.push(box(w, h, 0.02, x, y, 0.457, PINK_DARK, rot));
  const T = (x) => {
    bar(x, 0.5, 0.17, 0.045);
    bar(x, 0.42, 0.045, 0.2);
  };
  T(-0.3);
  bar(-0.075, 0.42, 0.045, 0.2); // N: two stems and a slash
  bar(0.075, 0.42, 0.045, 0.2);
  bar(0, 0.42, 0.045, 0.23, -0.55);
  T(0.3);
  return parts;
}

function buildTnt() {
  const parts = [box(0.86, 0.8, 0.86, 0, 0.4, 0, PINK), box(0.92, 0.1, 0.92, 0, 0.85, 0, PINK_DARK), box(0.9, 0.3, 0.9, 0, 0.42, 0, CREAM)];
  const face = letters();
  for (let side = 0; side < 4; side++) {
    for (const g of face) {
      const copy = g.clone();
      copy.rotateY((side * Math.PI) / 2);
      parts.push(copy);
    }
  }
  // The fuse: a short curled stub with a cream tip.
  const stem = new CylinderGeometry(0.035, 0.045, 0.2, 6).toNonIndexed();
  stem.translate(0, 1.0, 0);
  parts.push(paint(stem, "#5a4a52"));
  const tip = new CylinderGeometry(0.05, 0.05, 0.05, 6).toNonIndexed();
  tip.translate(0, 1.125, 0);
  parts.push(paint(tip, CREAM));
  return mergeGeometries(parts, false);
}

function buildPin() {
  const profile = [[0.001, 0], [0.1, 0], [0.12, 0.03], [0.13, 0.17], [0.11, 0.3], [0.07, 0.42], [0.06, 0.5], [0.09, 0.56], [0.095, 0.62], [0.07, 0.68], [0.001, 0.7]].map(([x, y]) => new Vector2(x, y));
  const g = new LatheGeometry(profile, 8).toNonIndexed();
  const cream = new Color(CREAM);
  const red = new Color(PINK_DARK);
  const pos = g.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const c = y > 0.36 && y < 0.46 ? red : cream;
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return g;
}

function buildCone() {
  const body = new CylinderGeometry(0.05, 0.22, 0.6, 8).toNonIndexed();
  body.translate(0, 0.35, 0);
  const stripe = new CylinderGeometry(0.125, 0.155, 0.1, 8).toNonIndexed();
  stripe.translate(0, 0.35, 0);
  return mergeGeometries([box(0.56, 0.05, 0.56, 0, 0.025, 0, "#f08a5c"), paint(body, "#ff9d6e"), paint(stripe, CREAM)], false);
}

const TNT_GEO = buildTnt();
const CUBE_GEO = new BoxGeometry(0.52, 0.52, 0.52).translate(0, 0.26, 0);
const PIN_GEO = buildPin();
const BALL_GEO = new IcosahedronGeometry(1, 1);
const CONE_GEO = buildCone();
const CUBE_COLORS = ["#ffc2d1", "#bfe3f5", "#ffe7a8", "#cdeed7", "#dccbf5", "#ffd2b0"].map((c) => new Color(c));
const WHITE = new Color(1, 1, 1);
const HOT = new Color(1.9, 1.35, 1.25);

const dummy = new Object3D();
const axis = new Vector3();
const spin = new Quaternion();

export default function Toys() {
  const toys = useMemo(buildToys, []);
  const cubes = useMemo(() => toys.stacks.flatMap((s) => [...s.base, ...s.riders]), [toys]);
  const tntRef = useRef();
  const cubeRef = useRef();
  const pinRef = useRef();
  const ballRef = useRef();
  const coneRef = useRef();

  useEffect(() => {
    const solid = solidProps(toys);
    live.props.push(...solid);
    return () => {
      // The riders join live.props when a stack topples, and a blown crate leaves it: take back whatever is there.
      for (const p of [...solid, ...cubes, ...toys.tnt]) {
        const i = live.props.indexOf(p);
        if (i !== -1) live.props.splice(i, 1);
      }
    };
  }, [toys, cubes]);

  useLayoutEffect(() => {
    const t = tntRef.current;
    const c = cubeRef.current;
    toys.tnt.forEach((_, i) => t.setColorAt(i, WHITE));
    cubes.forEach((_, i) => c.setColorAt(i, CUBE_COLORS[i % 6]));
    t.instanceColor.needsUpdate = true;
    c.instanceColor.needsUpdate = true;
  }, [toys, cubes]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    tickToys(toys, dt, WORLD, live);

    // TNT: spring in on respawn; once lit, wobble and flash hot pink.
    const tnt = tntRef.current;
    toys.tnt.forEach((p, i) => {
      if (p.gone) {
        dummy.scale.setScalar(0);
        dummy.position.set(p.x, -50, p.z);
      } else {
        const lit = p.fuse >= 0;
        const k = lit ? 1 + 0.06 * Math.sin(t * 38) : 1;
        const s = easeOutBack(p.pop);
        p.yaw += p.spin * dt * 0.5;
        dummy.position.set(p.x, 0, p.z);
        dummy.rotation.set(0, p.yaw + (lit ? Math.sin(t * 46) * 0.07 : 0), 0);
        dummy.scale.set(s * k, s / k, s * k);
        tnt.setColorAt(i, lit && Math.sin(t * 24) > 0 ? HOT : WHITE);
      }
      dummy.updateMatrix();
      tnt.setMatrixAt(i, dummy.matrix);
    });
    tnt.instanceMatrix.needsUpdate = true;
    tnt.instanceColor.needsUpdate = true;

    // Cubes: riders tumble while they fall.
    const cube = cubeRef.current;
    cubes.forEach((p, i) => {
      p.yaw += p.spin * dt;
      const tilt = p.tilt ?? 0;
      dummy.position.set(p.x, p.y ?? 0, p.z);
      dummy.rotation.set(tilt * 0.6 * Math.sin(p.yaw), p.yaw, tilt * 0.5 * Math.cos(p.yaw));
      dummy.scale.setScalar(easeOutBack(p.pop));
      dummy.updateMatrix();
      cube.setMatrixAt(i, dummy.matrix);
    });
    cube.instanceMatrix.needsUpdate = true;

    // Pins: stand until hit, then topple the way they were going.
    const pin = pinRef.current;
    toys.bowling.pins.forEach((p, i) => {
      p.yaw += p.spin * dt;
      dummy.position.set(p.x, p.lie * 0.11, p.z);
      dummy.rotation.set(p.lie * 1.5, p.down ? p.fallDir : p.yaw, 0, "YXZ");
      dummy.scale.setScalar(easeOutBack(p.pop));
      dummy.updateMatrix();
      pin.setMatrixAt(i, dummy.matrix);
    });
    pin.instanceMatrix.needsUpdate = true;

    // The ball rolls on its velocity (as Props.jsx rolls a snowball).
    const ball = ballRef.current;
    const b = toys.bowling.ball;
    b.q ??= new Quaternion();
    const sp = Math.hypot(b.vx, b.vz);
    if (sp > 0.01) {
      axis.set(b.vz, 0, -b.vx).divideScalar(sp);
      b.q.premultiply(spin.setFromAxisAngle(axis, (sp * dt) / b.radius));
    }
    dummy.position.set(b.x, b.radius, b.z);
    dummy.quaternion.copy(b.q);
    dummy.scale.setScalar(b.radius * easeOutBack(b.pop));
    dummy.updateMatrix();
    ball.setMatrixAt(0, dummy.matrix);
    ball.instanceMatrix.needsUpdate = true;

    // Cones: tip over and slide, then stand up again with a spring.
    const cone = coneRef.current;
    toys.cones.forEach((p, i) => {
      dummy.position.set(p.x, p.lie * 0.22, p.z);
      dummy.rotation.set(p.lie * 1.3, p.down ? p.fallDir : p.yaw, 0, "YXZ");
      dummy.scale.setScalar(easeOutBack(p.pop));
      dummy.updateMatrix();
      cone.setMatrixAt(i, dummy.matrix);
    });
    cone.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={tntRef} args={[TNT_GEO, undefined, toys.tnt.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.75} flatShading />
      </instancedMesh>
      <instancedMesh ref={cubeRef} args={[CUBE_GEO, undefined, cubes.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.7} flatShading />
      </instancedMesh>
      <instancedMesh ref={pinRef} args={[PIN_GEO, undefined, toys.bowling.pins.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.5} flatShading />
      </instancedMesh>
      <instancedMesh ref={ballRef} args={[BALL_GEO, undefined, 1]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial color="#b9d3f2" roughness={0.45} flatShading />
      </instancedMesh>
      <instancedMesh ref={coneRef} args={[CONE_GEO, undefined, toys.cones.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.6} flatShading />
      </instancedMesh>
    </>
  );
}
