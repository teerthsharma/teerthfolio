"use client";

// THE FIELD CAMP (lib/world/hut.js): a red dome hut, a yellow tent, a sledge, a 4.2 m mast and five route flags.
// The fixed pieces are one vertex-coloured mesh; only the anemometer spins and the beacon blinks.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FLAGS, MAST, SITE, SLEDGE, TENT } from "../../../lib/world/hut";
import { heightAt } from "../../../lib/world/terrain";
import { live } from "../../../lib/world/store";
import { C, glow, lamp, mat } from "../palette";

const WIND = [0.8, 0.6];
const FLAG_HEX = ["#ff4d6a", "#27a6b8"];

const painted = (geo, hex) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const c = new Color(hex);
  g.setAttribute("color", new Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3));
  return g;
};
const soup = (tris, hex) => {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(tris.flat(2), 3));
  return painted(g, hex);
};

// A white snow wedge from a standing object's lee edge, `len` m downwind, tapering to the ground.
function tail(x, z, h, reach, len, wide) {
  const [wx, wz] = WIND;
  const bx = x + wx * reach;
  const bz = z + wz * reach;
  const L = [bx - (wz * wide) / 2, h + 0.25, bz + (wx * wide) / 2];
  const R = [bx + (wz * wide) / 2, h + 0.25, bz - (wx * wide) / 2];
  const P = [bx + wx * len, h + 0.02, bz + wz * len];
  return soup([[L, R, P], [R, L, P]], "#f5f9fd");
}

function fixed() {
  const parts = [];
  const h = heightAt(SITE.x, SITE.z) - 0.05;
  parts.push(painted(new SphereGeometry(1.5, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.25, 1).translate(SITE.x, h, SITE.z), "#e8584a"));
  parts.push(painted(new CylinderGeometry(1.36, 1.36, 0.16, 8).translate(SITE.x, h + 0.9, SITE.z), C.warmWhite));
  parts.push(painted(new BoxGeometry(0.5, 0.8, 0.12).translate(SITE.x, h + 0.4, SITE.z + 1.49), C.charcoal));
  parts.push(painted(new CircleGeometry(0.2, 10).translate(SITE.x + 0.62, h + 1.02, SITE.z + 1.11), C.lamp));
  parts.push(tail(SITE.x, SITE.z, h, 1.5, 3, 2.4));

  const th = heightAt(TENT.x, TENT.z);
  parts.push(painted(new ConeGeometry(1.2, 2.2, 4).rotateY(Math.PI / 4).translate(TENT.x, th + 1.1, TENT.z), "#f2c230"));
  parts.push(tail(TENT.x, TENT.z, th, 1.2, 3, 1.6));

  const sh = heightAt(SLEDGE.x, SLEDGE.z);
  const yaw = -Math.atan2(WIND[1], WIND[0]);
  for (const s of [-0.3, 0.3]) parts.push(painted(new BoxGeometry(1.8, 0.08, 0.08).translate(0, 0, s).rotateY(yaw).translate(SLEDGE.x, sh + 0.1, SLEDGE.z), C.wood));
  for (const s of [-0.5, 0, 0.5]) parts.push(painted(new BoxGeometry(0.5, 0.35, 0.5).translate(s, 0, 0).rotateY(yaw).translate(SLEDGE.x, sh + 0.3, SLEDGE.z), "#8d929c"));

  const mh = heightAt(MAST.x, MAST.z);
  parts.push(painted(new CylinderGeometry(0.05, 0.05, 4.2, 5).translate(MAST.x, mh + 2.1, MAST.z), C.metal));

  FLAGS.forEach((f, i) => {
    const fh = heightAt(f.x, f.z);
    parts.push(painted(new CylinderGeometry(0.03, 0.03, 1.6, 4).translate(f.x, fh + 0.8, f.z), C.charcoal));
    const top = [f.x, fh + 1.6, f.z];
    const low = [f.x, fh + 1.22, f.z];
    const tip = [f.x + WIND[0] * 0.5, fh + 1.42, f.z + WIND[1] * 0.5];
    parts.push(soup([[top, low, tip], [tip, low, top]], FLAG_HEX[i % 2]));
  });

  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

function anemometer() {
  const parts = [painted(new CylinderGeometry(0.06, 0.06, 0.2, 6), C.metal)];
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3;
    const x = 0.5 * Math.cos(a);
    const z = 0.5 * Math.sin(a);
    parts.push(painted(new BoxGeometry(0.5, 0.03, 0.03).rotateY(-a).translate(x / 2, 0, z / 2), C.metal));
    parts.push(painted(new CylinderGeometry(0.1, 0.07, 0.16, 6, 1, true).translate(x, 0.08, z), C.metal));
  }
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

const BEACON = new SphereGeometry(0.09, 8, 6);
const HALO = new SphereGeometry(0.22, 10, 8);

export default function Hut() {
  const stat = useMemo(fixed, []);
  const cups = useMemo(anemometer, []);
  const top = useMemo(() => heightAt(MAST.x, MAST.z) + 4.2, []);
  const spin = useRef(null);
  const beacon = useRef(null);
  const skin = mat("#ffffff", { vertexColors: true, roughness: 0.7 });
  const steel = mat("#ffffff", { vertexColors: true, roughness: 0.4, metalness: 0.6 });
  const red = lamp("#ff4d6a", 2);
  const halo = glow("#ff4d6a", 0.35);

  useFrame(({ clock }) => {
    if (Math.hypot(live.seal.x - SITE.x, live.seal.z - SITE.z) > 60) return;
    const t = clock.elapsedTime;
    if (spin.current) spin.current.rotation.y = t * 6;
    if (beacon.current) beacon.current.visible = t % 2 < 0.25;
  });

  return (
    <>
      <mesh geometry={stat} material={skin} castShadow receiveShadow />
      <group ref={spin} position={[MAST.x, top, MAST.z]}>
        <mesh geometry={cups} material={steel} castShadow receiveShadow />
      </group>
      <group ref={beacon} position={[MAST.x, top + 0.35, MAST.z]}>
        <mesh geometry={BEACON} material={red} />
        <mesh geometry={HALO} material={halo} />
      </group>
    </>
  );
}
