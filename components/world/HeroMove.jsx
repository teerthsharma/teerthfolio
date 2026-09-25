"use client";

// The effects of the showcase's hero move (lib/world/heroMoves.js), in the
// place's radiation colour: the smash's shockwave, the domain's void and
// rim, the beam and its charge, the orbit's glowing trail. A handful of
// meshes built once, shown only during a showcase; nothing allocates per
// frame.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, Color, CylinderGeometry, MeshBasicMaterial, RingGeometry, SphereGeometry, TorusGeometry } from "three";
import { heroMoveFor, heroPose } from "../../lib/world/heroMoves";
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
      color: new Color(),
    };
  }, []);
  const ring = useRef();
  const voidRef = useRef();
  const rim = useRef();
  const ball = useRef();
  const beam = useRef();
  const trail = useRef();
  const last = useRef(null);

  useFrame((state) => {
    const all = [ring.current, voidRef.current, rim.current, ball.current, beam.current, trail.current];
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
    } else if (move === "domain") {
      const k = smooth(0.18, 0.4, u) * (1 - smooth(0.82, 0.97, u));
      if (k > 0.01) {
        const r = 1 + 5.5 * k;
        voidRef.current.visible = rim.current.visible = true;
        voidRef.current.position.set(pose.x, pose.y + 0.6, pose.z);
        voidRef.current.scale.setScalar(r);
        parts.voidMat.opacity = 0.55 * k;
        rim.current.position.set(pose.x, pose.y + 0.6, pose.z);
        rim.current.scale.setScalar(r);
        rim.current.rotation.set(0.35 * Math.sin(u * 9), u * 8, 0.3);
        parts.rimMat.opacity = k;
      }
    } else if (move === "beam") {
      const charge = smooth(0.2, 0.45, u) * (1 - smooth(0.45, 0.5, u));
      const fire = smooth(0.45, 0.5, u) * (1 - smooth(0.75, 0.85, u));
      const toX = place.x - pose.x;
      const toZ = place.z - pose.z;
      const dist = Math.max(0.1, Math.hypot(toX, toZ) - place.radius * 0.5);
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
    </group>
  );
}
