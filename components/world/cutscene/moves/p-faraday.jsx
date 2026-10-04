// Faraday: Fusion dance. The guest is a second pup, an ink silhouette with a
// violet rim (H); the real pup carries a blue rim (E). On "Fusion." they run
// the fusion dance at each other, three side-steps with the near flipper out,
// a jump and a crash, one flash, and what stands there is one pup with an
// amber rim. The amber coupling then rises along two wires (blue and violet
// helices) out of the floor to an amber orb above its head. Original bodies:
// round heads, no ears, no faces. One merged silhouette, two hulls, two tubes.
// Card: lib/world/cutscene/cards/p-faraday.js.

import { useMemo, useRef } from "react";
import { CatmullRomCurve3, CircleGeometry, Color, ConeGeometry, IcosahedronGeometry, MeshBasicMaterial, ShaderMaterial, TubeGeometry, Vector3, AdditiveBlending, BackSide } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Stage, onTwos, smooth, useCutFrame } from "../kit";
import { figureAt } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Rig, glow, useInk } from "./g4/parts";

const BLUE = "#4aa3ff";
const VIOLET = "#a37bff";
const AMBER = "#ffe08a";
const MEET = [0.85, 0, -0.35]; // where the guest crashes in, beside the pup
const WIRE = 72;

// A pup, reduced to a silhouette: round body, round head, two flippers, a tail.
function pupGeometry() {
  const body = new IcosahedronGeometry(1, 1).scale(0.5, 0.44, 0.95).translate(0, 0.45, -0.05);
  const head = new IcosahedronGeometry(0.34, 1).translate(0, 0.92, 0.72);
  const nose = new IcosahedronGeometry(0.12, 0).translate(0, 0.84, 1.0);
  const fl = (s) => new ConeGeometry(0.1, 0.55, 5).rotateZ(s * 1.9).rotateX(0.2).translate(s * 0.5, 0.35, 0.3);
  const tail = new ConeGeometry(0.16, 0.5, 5).rotateX(-Math.PI / 2 - 0.2).translate(0, 0.3, -1.1);
  return mergeGeometries([body, head, nose, fl(1), fl(-1), tail].map((g) => g.toNonIndexed()));
}

// A soft rim round the pup: the back of a hull, bright where it grazes the silhouette.
function rimMaterial() {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color() }, uK: { value: 0 } },
    side: BackSide,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      void main() {
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uK;
      varying vec3 vN;
      void main() {
        float f = pow(1.0 - clamp(abs(vN.z), 0.0, 1.0), 4.0);
        gl_FragColor = vec4(pow(uColor, vec3(2.2)) * f * uK * 1.6, 1.0);
      }`,
  });
}

// A helix of radius r about the vertical axis from y 0 to h, phase a0.
const helix = (r, h, a0) => new TubeGeometry(new CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => { const u = i / 39; const a = a0 + u * Math.PI * 4.5; return new Vector3(Math.cos(a) * r * (1 - 0.35 * u), 0.05 + u * h, Math.sin(a) * r * (1 - 0.35 * u)); })), WIRE, 0.035, 5);
const draw = (g, frac) => g.setDrawRange(0, Math.round(Math.max(0, Math.min(1, frac)) * WIRE) * 5 * 6);

export default function Move(cut) {
  const { card, tl, mode } = cut;
  const { ink } = useInk(card);
  const pup = useMemo(pupGeometry, []);
  const hullGeo = useMemo(() => new IcosahedronGeometry(1, 2), []);
  const flashGeo = useMemo(() => new CircleGeometry(1, 32), []);
  const orbGeo = useMemo(() => new IcosahedronGeometry(0.2, 1), []);
  const wireE = useMemo(() => helix(0.62, 1.9, 0), []);
  const wireH = useMemo(() => helix(0.62, 1.9, Math.PI), []);
  const mats = useMemo(
    () => ({
      guestRim: new MeshBasicMaterial({ color: new Color(VIOLET), side: BackSide, toneMapped: false, fog: false }),
      pupRim: rimMaterial(),
      flash: glow("#ffffff"),
      wireE: glow(BLUE),
      wireH: glow(VIOLET),
      orb: new MeshBasicMaterial({ color: new Color(AMBER), toneMapped: false, fog: false }),
      halo: glow(AMBER),
    }),
    [],
  );
  const guest = useRef();
  const hull = useRef();
  const flash = useRef();
  const orb = useRef();
  const halo = useRef();
  const guestAt = figureAt(card);
  const yaw = -1.2; // nearly in profile, facing the pup: a seal reads best side-on

  useCutFrame((t, state) => {
    const still = mode !== "full";
    const fade = 1 - smooth(tl.collapse[0], tl.collapse[1], t);
    const dance0 = tl.move[0] - 0.45; // the three steps begin as line A ends
    const crash = tl.move[1];
    const stepT = (t - dance0) / (crash - 0.15 - dance0); // 0..1 over the steps and the jump
    const s = Math.min(1, Math.max(0, stepT));
    const hop = Math.min(2.999, Math.floor(s * 3)); // which of the three steps
    const phase = s * 3 - hop; // 0..1 within a step
    const hopY = (s < 1 ? Math.sin(Math.PI * phase) : 0) * 0.28 + (stepT > 1 ? 0 : 0);
    const jump = smooth(crash - 0.4, crash - 0.2, t) * (1 - smooth(crash - 0.2, crash, t));
    const arrive = smooth(0, 1, onTwos(s)); // the guest closes on the pup, by steps
    const gone = t >= crash;

    // the guest steps in on twos (squash, stretch, settle), dances in, and is gone at the crash
    const g = guest.current;
    const enter = smooth(tl.enter, tl.enter + 0.35, t);
    const x = guestAt[0] + (MEET[0] - guestAt[0]) * arrive;
    const z = guestAt[2] + (MEET[2] - guestAt[2]) * arrive;
    g.position.set(x, hopY + jump * 0.5, z);
    g.rotation.set(0, yaw + 0.4 * Math.sin(onTwos(t) * 5) * (s > 0 && s < 1 ? 1 : 0), 0);
    const k = 0.72;
    const pop = still ? 1 : onTwos(enter) * (1 + 0.18 * Math.sin(enter * Math.PI));
    g.scale.set(k * pop, k * pop * (1 + 0.1 * Math.sin(enter * Math.PI)), k * pop);
    g.visible = (still || (t > tl.enter && !gone)) && fade > 0;
    if (still) return;

    // the real pup: near flipper out on each step, a jump, the crash
    live.pose.point = phase > 0.15 && phase < 0.85 && s > 0 && s < 1 ? 1 : 0;
    live.pose.raise = jump;
    live.pose.crouch = smooth(crash - 0.55, crash - 0.4, t) * (1 - smooth(crash - 0.4, crash - 0.3, t)) * 0.8;
    live.seal.air = 0.1 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - (crash - 0.4)) / 0.4))) * 2;

    // blue rim on the pup until the flash, amber after; the guest's violet hull is its own mesh
    const h = hull.current;
    h.position.set(0, 0.62, 0);
    h.scale.set(0.52, 0.56, 0.72);
    const blue = smooth(tl.enter, tl.enter + 0.4, t) * (1 - smooth(crash - 0.05, crash, t));
    const amber = smooth(crash, crash + 0.35, t);
    mats.pupRim.uniforms.uColor.value.set(blue > 0 && amber < 1 ? (amber > 0.5 ? AMBER : BLUE) : AMBER);
    mats.pupRim.uniforms.uK.value = (blue + amber) * fade;
    h.visible = blue + amber > 0.01;

    // one flash at the crash: a disc of light on the pair, gone in half a second
    const f = flash.current;
    const e = Math.max(0, t - crash);
    f.position.set(MEET[0] * 0.5, 0.9, 0.1);
    f.lookAt(state.camera.position);
    f.translateZ(0.6);
    f.scale.setScalar(0.4 + onTwos(Math.min(1, e / 0.4)) * 1.1);
    mats.flash.opacity = e > 0 ? Math.max(0, 1 - e / 0.3) : 0;

    // the amber coupling rises out of the floor along the two wires to an orb above the pup
    const up = smooth(crash + 0.3, crash + 1.5, t) * fade;
    draw(wireE, up);
    draw(wireH, up);
    mats.wireE.opacity = mats.wireH.opacity = 0.95 * (up > 0 ? 1 : 0) * fade;
    const o = orb.current;
    o.visible = true;
    o.position.set(0, 0.05 + 1.9 * up, 0);
    o.scale.setScalar(Math.max(0.001, onTwos(smooth(crash + 1.2, crash + 1.7, t)) * (1 + 0.1 * Math.sin(t * 9)) * fade));
    const hl = halo.current;
    hl.position.copy(o.position);
    hl.lookAt(state.camera.position);
    hl.scale.setScalar(Math.max(0.001, o.scale.x * 0.5));
    mats.halo.opacity = 0.3 * (o.scale.x > 0.01 ? 1 : 0);
  });

  return (
    <>
      <Stage {...cut} />
      <Rig cut={cut} still>
        <group ref={guest}>
          <mesh geometry={pup} material={ink} />
          <mesh geometry={pup} material={mats.guestRim} scale={1.09} />
        </group>
        <mesh ref={hull} geometry={hullGeo} material={mats.pupRim} visible={false} />
        <mesh ref={flash} geometry={flashGeo} material={mats.flash} />
        <mesh geometry={wireE} material={mats.wireE} />
        <mesh geometry={wireH} material={mats.wireH} />
        <mesh ref={orb} geometry={orbGeo} material={mats.orb} visible={false} />
        <mesh ref={halo} geometry={flashGeo} material={mats.halo} />
      </Rig>
    </>
  );
}
