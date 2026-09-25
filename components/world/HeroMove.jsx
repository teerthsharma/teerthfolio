"use client";

// The effects of the showcase's hero move (lib/world/heroMoves.js), in the
// place's radiation colour: the smash's shockwave, the hollow purple's
// orbs and sphere, the beam and its charge, the orbit's glowing trail. A handful of
// meshes built once, shown only during a showcase; nothing allocates per
// frame.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, Color, CylinderGeometry, MeshBasicMaterial, RingGeometry, SphereGeometry, TorusGeometry } from "three";
import { aimFor, heroMoveFor, heroPose } from "../../lib/world/heroMoves";
import { ARRIVAL } from "../../lib/world/moments";
import { PLACE_BY_ID } from "../../lib/world/places";
import { live } from "../../lib/world/store";

const glowMat = () => new MeshBasicMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
const pose = {};
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function HeroMove() {
  const parts = useMemo(() => {
    const ringMat = glowMat();
    const rimMat = glowMat();
    const beamMat = glowMat();
    const trailMat = glowMat();
    const voidMat = new MeshBasicMaterial({ color: "#140b26", transparent: true, depthWrite: false, side: BackSide, toneMapped: false });
    return {
      ringMat, rimMat, beamMat, trailMat, voidMat,
      ring: new RingGeometry(0.8, 1, 64).rotateX(-Math.PI / 2),
      rim: new TorusGeometry(1, 0.035, 8, 64).rotateX(-Math.PI / 2),
      sphere: new SphereGeometry(1, 32, 16),
      ball: new SphereGeometry(1, 16, 12),
      beam: new CylinderGeometry(1, 1, 1, 12, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5),
      trail: new TorusGeometry(1, 0.06, 6, 96).rotateX(-Math.PI / 2),
      redMat: new MeshBasicMaterial({ color: "#ff2b3a", toneMapped: false }),
      blueMat: new MeshBasicMaterial({ color: "#2f7dff", toneMapped: false }),
      color: new Color(),
    };
  }, []);
  const ring = useRef();
  const voidRef = useRef();
  const rim = useRef();
  const ball = useRef();
  const beam = useRef();
  const trail = useRef();
  const red = useRef();
  const blue = useRef();
  const last = useRef(null);

  useFrame((state) => {
    const all = [ring.current, voidRef.current, rim.current, ball.current, beam.current, trail.current, red.current, blue.current];
    for (const m of all) if (m) m.visible = false;
    const arrival = live.arrival;
    const place = arrival.id ? PLACE_BY_ID[arrival.id] : null;
    if (!place || !ring.current) return;
    const u = (state.clock.elapsedTime - arrival.start) / ARRIVAL.duration;
    if (u < 0 || u >= 1) return;
    const move = heroMoveFor(place);
    if (last.current !== place.id) {
      last.current = place.id;
      parts.color.set(place.radiation ?? place.color ?? "#ffffff");
      for (const m of [parts.ringMat, parts.rimMat, parts.beamMat, parts.trailMat]) m.color.copy(parts.color);
      if (move === "purple") {
        parts.beamMat.color.set("#a63bff");
        parts.rimMat.color.set("#e2b8ff");
      }
    }
    const s = live.seal;
    heroPose(move, u, place, s.x, s.z, pose);

    if (move === "smash" && u >= 0.6) {
      const w = (u - 0.6) / 0.3; // the shockwave rolls out over 0.3 of the scene
      if (w < 1) {
        ring.current.visible = true;
        ring.current.position.set(pose.x, 0.06, pose.z);
        ring.current.scale.setScalar(0.5 + 8 * smooth(0, 1, w));
        parts.ringMat.opacity = 0.9 * (1 - w);
      }
    } else if (move === "purple") {
      // red on its left, blue on its right, drawn together in front of it,
      // merging into purple, then the purple fires through the building
      const fx = Math.sin(pose.yaw ?? 0);
      const fz = Math.cos(pose.yaw ?? 0);
      const form = smooth(0.18, 0.4, u);
      const meet = smooth(0.42, 0.58, u);
      const y = pose.y + 0.8;
      if (form > 0.01 && meet < 1) {
        const side = 1.4 * (1 - meet);
        const ahead = 0.4 + 0.8 * meet;
        red.current.visible = blue.current.visible = true;
        red.current.position.set(pose.x + fz * side + fx * ahead, y, pose.z - fx * side + fz * ahead);
        blue.current.position.set(pose.x - fz * side + fx * ahead, y, pose.z + fx * side + fz * ahead);
        const r = 0.5 * form + 0.05 * Math.sin(u * 90);
        red.current.scale.setScalar(r);
        blue.current.scale.setScalar(r);
      }
      const fly = smooth(0.62, 0.86, u);
      const grow = smooth(0.56, 0.64, u) * (1 - smooth(0.9, 0.97, u));
      if (grow > 0.01) {
        const toX = place.x - pose.x;
        const toZ = place.z - pose.z;
        const dist = Math.hypot(toX, toZ) + place.radius + 4; // it passes through and beyond
        ball.current.visible = rim.current.visible = true;
        const px = pose.x + fx * 1.2 + (toX / Math.max(0.1, Math.hypot(toX, toZ))) * dist * fly;
        const pz = pose.z + fz * 1.2 + (toZ / Math.max(0.1, Math.hypot(toX, toZ))) * dist * fly;
        ball.current.position.set(px, y + 0.4 * fly, pz);
        ball.current.scale.setScalar((0.5 + 1.4 * fly) * grow);
        rim.current.position.copy(ball.current.position);
        rim.current.scale.setScalar((0.8 + 2.2 * fly) * grow);
        rim.current.rotation.set(u * 12, u * 9, 0);
        parts.beamMat.opacity = 0.95 * grow;
        parts.rimMat.opacity = 0.8 * grow;
      }
    } else if (move === "beam") {
      const charge = smooth(0.2, 0.45, u) * (1 - smooth(0.45, 0.5, u));
      const fire = smooth(0.45, 0.5, u) * (1 - smooth(0.75, 0.85, u));
      const aim = aimFor(place);
      const toX = aim.x - pose.x;
      const toZ = aim.z - pose.z;
      const dist = Math.max(0.1, Math.hypot(toX, toZ) - aim.r * 0.6);
      if (charge > 0.01 || fire > 0.01) {
        ball.current.visible = true;
        ball.current.position.set(pose.x + (toX / dist) * 0.9, 0.7, pose.z + (toZ / dist) * 0.9);
        ball.current.scale.setScalar(0.15 + 0.45 * Math.max(charge, fire) + 0.05 * Math.sin(u * 80));
      }
      if (fire > 0.01) {
        beam.current.visible = true;
        beam.current.position.set(pose.x, 0.8, pose.z);
        beam.current.rotation.set(0, Math.atan2(toX, toZ), 0);
        const width = 0.35 * fire * (1 + 0.15 * Math.sin(u * 120));
        beam.current.scale.set(width, width, dist);
        parts.beamMat.opacity = 0.9 * fire;
      }
    } else if (move === "orbit" && pose.k > 0.01) {
      trail.current.visible = true;
      trail.current.position.set(place.x, 0.1, place.z);
      trail.current.scale.setScalar(place.radius + 2.6);
      trail.current.rotation.y = u * 6;
      parts.trailMat.opacity = 0.75 * pose.k;
    }
  });

  return (
    <group>
      <mesh ref={ring} geometry={parts.ring} material={parts.ringMat} visible={false} frustumCulled={false} />
      <mesh ref={voidRef} geometry={parts.sphere} material={parts.voidMat} visible={false} frustumCulled={false} />
      <mesh ref={rim} geometry={parts.rim} material={parts.rimMat} visible={false} frustumCulled={false} />
      <mesh ref={ball} geometry={parts.ball} material={parts.beamMat} visible={false} frustumCulled={false} />
      <mesh ref={beam} geometry={parts.beam} material={parts.beamMat} visible={false} frustumCulled={false} />
      <mesh ref={trail} geometry={parts.trail} material={parts.trailMat} visible={false} frustumCulled={false} />
      <mesh ref={red} geometry={parts.ball} material={parts.redMat} visible={false} frustumCulled={false} />
      <mesh ref={blue} geometry={parts.ball} material={parts.blueMat} visible={false} frustumCulled={false} />
    </group>
  );
}
