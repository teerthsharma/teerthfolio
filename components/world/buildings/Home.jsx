"use client";

// Building for PLACE_BY_ID["home"] in lib/world/places.js: the igloo the
// seal lives in, overlooking every other place on the island.
//
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius (4.2 m).
//
// Shape: a tall faceted catenary dome built as 7 stacked "block courses"
// (a LatheGeometry per course, each with a small outward lip so the seams
// read as laid snow blocks, alternating courses staggered by half a
// segment), an arched entrance tunnel standing proud of the dome, and a
// sky-blue telescope on a turret that slowly pans around the horizon to
// each other place in turn, then turns to face the dock and dips its tube
// when the seal is close.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  CircleGeometry,
  CylinderGeometry,
  LatheGeometry,
  MathUtils,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PLACES } from "../../../lib/world/places";
import { useUi } from "../../../lib/world/store";
import { C, lamp, mat } from "../palette";

// ---- silhouette: the catenary profile (radius m, height m), base to pole --
const PROFILE = [
  [2.7, 0],
  [2.68, 0.75],
  [2.58, 1.5],
  [2.38, 2.25],
  [2.06, 2.95],
  [1.62, 3.6],
  [1.05, 4.15],
  [0.45, 4.5],
  [0, 4.6],
];
const LATHE_SEGMENTS = 16;
const LIP_OUT = 0.06; // each course's bottom-edge overhang
const STAGGER = Math.PI / LATHE_SEGMENTS; // half a segment: seams stagger like laid blocks

// One course band: base point, a small outward lip just above it, then a
// straight taper up to the point(s) that follow (the last course carries two
// extra points so it tapers all the way to the pole, which LatheGeometry
// caps automatically at r = 0).
function course([r0, y0], [r1, y1], ...tail) {
  const pts = [
    [r0, y0],
    [r0 + LIP_OUT, y0 + 0.02],
    [r0 + LIP_OUT * 0.5, y0 + 0.06],
    [r1, y1],
    ...tail,
  ];
  return new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), LATHE_SEGMENTS);
}

// A half-cylinder with its axis along world z, arc opening upward (flat
// edge on the snow): CylinderGeometry's y-axis is its length and its
// (x, z) cross-section sweeps the +z half-circle for thetaStart 0, length
// PI; rotateX(-PI/2) carries that half-circle from (x, z>=0) to (x, y>=0)
// and the old length axis onto +z.
function halfPipe(radius, length, segments = LATHE_SEGMENTS) {
  return new CylinderGeometry(radius, radius, length, segments, 1, false, 0, Math.PI).rotateX(-Math.PI / 2);
}

// A piece whose natural face/axis already points along local +z (a ring
// built by halfPipeRing, or a disc, whose geometry starts flat against XY):
// push it out to the mount radius, spin it to the wall angle, then lift it
// to its height. Matches the atan2(dx, dz) convention rotation.y uses
// everywhere else in this scene: theta 0 is dead ahead (+z).
function mountOnWall(geometry, theta, y, outRadius) {
  return geometry
    .translate(0, 0, outRadius)
    .rotateY(theta)
    .translate(0, y, 0);
}

function ring(radius, height, segments = LATHE_SEGMENTS) {
  return new CylinderGeometry(radius, radius, height, segments, 1, false, 0, Math.PI * 2).rotateX(Math.PI / 2);
}

// Telescope tube / lens-ring pieces: natural axis along y, base (small end)
// at the turret, tip (wide end) poking out. rotateX(PI/2) carries the base
// to local z 0 and the tip to local z = length (see halfPipe's derivation).
function outwardCylinder(rBase, rTip, length, segments = LATHE_SEGMENTS) {
  return new CylinderGeometry(rTip, rBase, length, segments).rotateX(Math.PI / 2).translate(0, 0, length / 2);
}

const COURSE3_MID = { r: (PROFILE[2][0] + PROFILE[3][0]) / 2, y: (PROFILE[2][1] + PROFILE[3][1]) / 2 };
const PORTHOLE_ANGLES = [(-40 * Math.PI) / 180, (40 * Math.PI) / 180, (90 * Math.PI) / 180];

const TUNNEL_R = 1;
const TUNNEL_Z0 = 2.2;
const TUNNEL_Z1 = 3.9;
const TUNNEL_LEN = TUNNEL_Z1 - TUNNEL_Z0;
const TUNNEL_MID = (TUNNEL_Z0 + TUNNEL_Z1) / 2;

function buildGeometry() {
  // Shell: 7 stacked courses, every other one staggered a half-segment.
  const shellCourses = [];
  for (let i = 0; i < 6; i++) shellCourses.push(course(PROFILE[i], PROFILE[i + 1]));
  shellCourses.push(course(PROFILE[6], PROFILE[7], PROFILE[8])); // tapers to the pole
  shellCourses.forEach((g, i) => {
    if (i % 2 === 1) g.rotateY(STAGGER);
  });

  // Entrance tunnel: one arched half-pipe plus 3 course lips along its length.
  const tunnelBody = halfPipe(TUNNEL_R, TUNNEL_LEN).translate(0, 0, TUNNEL_MID);
  const tunnelLips = [0.25, 0.5, 0.75].map((f) =>
    halfPipe(TUNNEL_R + 0.05, 0.08).translate(0, 0, TUNNEL_Z0 + TUNNEL_LEN * f)
  );

  const snow = mergeGeometries([...shellCourses, tunnelBody, ...tunnelLips]);

  // Static charcoal: the doorway recess and the 3 porthole rings.
  const doorway = new CircleGeometry(0.72, LATHE_SEGMENTS, 0, Math.PI).translate(0, 0, TUNNEL_Z1 + 0.02);
  const portholeRings = PORTHOLE_ANGLES.map((theta) =>
    mountOnWall(ring(0.32, 0.12), theta, COURSE3_MID.y, COURSE3_MID.r + 0.02)
  );
  const charcoal = mergeGeometries([doorway, ...portholeRings]);

  // Static warm glass: the 3 porthole lenses (their disc already faces +z).
  const portholeLenses = mergeGeometries(
    PORTHOLE_ANGLES.map((theta) => mountOnWall(new CircleGeometry(0.22, LATHE_SEGMENTS), theta, COURSE3_MID.y, COURSE3_MID.r + 0.09))
  );

  const skylight = new CylinderGeometry(0.7, 0.95, 0.3, LATHE_SEGMENTS);
  const doorArch = new TorusGeometry(0.86, 0.14, 6, LATHE_SEGMENTS, Math.PI);
  const hearth = new PlaneGeometry(1.2, 1.1);
  const skirt = new SphereGeometry(3.3, LATHE_SEGMENTS, 10);

  // Turret pieces, local to the turret pivot (0, 4.55, 0).
  const turretDrum = new CylinderGeometry(0.55, 0.55, 0.35, LATHE_SEGMENTS);
  const tube = outwardCylinder(0.24, 0.3, 1.6);
  const lensRing = ring(0.34, 0.14).translate(0, 0, 1.6);
  const lensDisc = new CircleGeometry(0.28, LATHE_SEGMENTS).translate(0, 0, 1.67);

  return { snow, charcoal, portholeLenses, skylight, doorArch, hearth, skirt, turretDrum, tube, lensRing, lensDisc };
}

const DWELL = 2; // s spent facing each place
const TURN = 1.5; // s eased turn between places
const BASE_ELEV = MathUtils.degToRad(25);
const NEAR_ELEV = MathUtils.degToRad(-5);

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const angleLerp = (a, b, t) => a + wrap(b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);

export default function Home({ place }) {
  const near = useUi((s) => s.near === place.id);
  const geo = useMemo(() => buildGeometry(), []);
  const hearthMat = useMemo(() => lamp(C.lamp, 0.9).clone(), []);

  // The other places, sorted by their bearing from home: what the turret
  // cycles through while nobody is visiting.
  const bearings = useMemo(
    () =>
      PLACES.filter((p) => p.id !== place.id).map((p) => Math.atan2(p.x - place.x, p.z - place.z)).sort((a, b) => a - b),
    [place]
  );

  const k = useRef(0);
  const turret = useRef(null);
  const tubePivot = useRef(null);
  const cycle = useRef({ ready: false, index: 0, phase: "dwell", t: 0, from: 0, to: 0, angle: 0 });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    k.current += (((near ? 1 : 0) - k.current) * (1 - Math.exp(-4 * dt))) || 0;
    const kv = k.current;

    if (bearings.length) {
      const c = cycle.current;
      if (!c.ready) {
        c.ready = true;
        c.angle = bearings[0];
        c.from = bearings[0];
        c.to = bearings[0];
      }
      c.t += dt;
      if (c.phase === "dwell") {
        if (c.t >= DWELL) {
          c.index = (c.index + 1) % bearings.length;
          c.from = c.angle;
          c.to = bearings[c.index];
          c.phase = "turn";
          c.t = 0;
        }
      } else {
        const t = Math.min(1, c.t / TURN);
        c.angle = angleLerp(c.from, c.to, smoothstep(t));
        if (t >= 1) {
          c.phase = "dwell";
          c.t = 0;
        }
      }

      const azimuth = angleLerp(c.angle, 0, kv);
      if (turret.current) turret.current.rotation.y = azimuth;
    }

    const elevation = MathUtils.lerp(BASE_ELEV, NEAR_ELEV, kv);
    if (tubePivot.current) tubePivot.current.rotation.x = -elevation;
    hearthMat.emissiveIntensity = MathUtils.lerp(0.9, 1.6, kv);
  });

  const A = place.color;

  return (
    <group>
      <mesh castShadow receiveShadow geometry={geo.snow} material={mat(C.snow, { roughness: 0.85 })} />
      <mesh castShadow receiveShadow geometry={geo.charcoal} material={mat(C.charcoal)} />
      <mesh geometry={geo.portholeLenses} material={lamp(C.lamp, 1)} />
      <mesh castShadow receiveShadow geometry={geo.skylight} position={[0, 4.3, 0]} material={mat(A, { roughness: 0.35 })} />
      <mesh castShadow receiveShadow geometry={geo.doorArch} position={[0, 0, 3.95]} material={mat(A)} />
      <mesh geometry={geo.hearth} position={[0, 0.55, 3.7]} material={hearthMat} />
      <mesh receiveShadow geometry={geo.skirt} scale={[1, 0.25, 1]} position={[0, -0.1, 0]} material={mat(C.snow, { flat: false, roughness: 0.85 })} />

      <group ref={turret} position={[0, 4.55, 0]}>
        <mesh castShadow receiveShadow geometry={geo.turretDrum} material={mat(C.charcoal)} />
        <group ref={tubePivot}>
          <mesh castShadow geometry={geo.tube} material={mat(A)} />
          <mesh castShadow geometry={geo.lensRing} material={mat(C.charcoal)} />
          <mesh geometry={geo.lensDisc} material={lamp(A, 0.6)} />
        </group>
      </group>
    </group>
  );
}
