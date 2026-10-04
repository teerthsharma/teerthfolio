// The Topological ML Toolkit: The Matrix. The place speaks ("There is no
// spoon."): a low-poly spoon turns centre frame and bends at the handle until
// it folds away in a burst. Then BULLET TIME: the pup leans back, flippers
// out, a ripple opens from its chest and thin streaks flying across the frame
// slow to a dead stop all round it. As the pup answers, a persistence barcode
// draws itself bar by bar, a cut sweeps, and the short bars grey out: the
// long ones are the Betti curve's shape. Instanced bars, instanced bullets,
// one spoon, one ripple; the lean is the pup's own root tipped back.
// Card: lib/world/cutscene/cards/p-topological-ml-toolkit.js.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, RingGeometry, ShaderMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Stage, onTwos, smooth, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Rig, glow, useInk } from "./g4/parts";

const BARS = 18;
const BULLETS = 26;
const BAR_AT = [-0.3, 1.1, -2.2]; // the barcode's lower-left corner, in the pup's frame
const BAR_W = 3.8;
const ROW = 0.13;
const GREY = new Color("#6c6680");
const CREAM = new Color("#f3ecd9");

// A spoon standing on its handle: a flattened bowl on a thin stem.
function spoonGeometry() {
  const bowl = new IcosahedronGeometry(1, 2).scale(0.3, 0.44, 0.07).translate(0, 0.55, 0);
  const stem = new CylinderGeometry(0.035, 0.05, 1.7, 6, 8).translate(0, -0.45, 0);
  return mergeGeometries([bowl.toNonIndexed(), stem.toNonIndexed()]);
}

// Flat cream with a lighter edge, and a bend about the stem that folds the handle away.
function spoonMaterial(p) {
  return new ShaderMaterial({
    uniforms: { uBend: { value: 0 }, uBase: { value: new Color("#e9f0f6") }, uRim: { value: new Color(p.rim) } },
    vertexShader: /* glsl */ `
      uniform float uBend;
      varying vec3 vN;
      void main() {
        vec3 q = position;
        float d = max(0.0, 0.05 - q.y);
        q.z += uBend * d * d * 1.4;
        q.x += uBend * d * d * 0.55;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uRim;
      varying vec3 vN;
      void main() {
        float f = pow(1.0 - abs(normalize(vN).z), 1.8);
        gl_FragColor = vec4(pow(mix(uBase * (0.85 + 0.15 * vN.y), uRim, f), vec3(2.2)), 1.0);
      }`,
  });
}

const seeded = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

export default function Move(cut) {
  const { card, tl, mode } = cut;
  const { p } = useInk(card);
  const spoonGeo = useMemo(spoonGeometry, []);
  const spoonMat = useMemo(() => spoonMaterial(p), [p]);
  const rippleGeo = useMemo(() => new RingGeometry(0.92, 1, 40), []);
  const burstGeo = useMemo(() => new RingGeometry(0.85, 1, 24), []);
  const mats = useMemo(
    () => ({
      ripple: glow(p.accent),
      burst: glow("#ffffff"),
      bullet: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false, fog: false }),
      bar: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false, fog: false }),
      cut: glow(p.accent),
    }),
    [p],
  );
  const shots = useMemo(() => {
    const r = seeded(3);
    // each streak: where it freezes, how long it is, how far it ran, which way
    return Array.from({ length: BULLETS }, (_, i) => {
      const a = (i / BULLETS) * Math.PI * 2 + r() * 0.4;
      const ring = 1.6 + 2.2 * r();
      return { x: Math.cos(a) * ring * 1.35 + 0.6, y: 1.1 + Math.sin(a) * ring * 0.62, z: -1.4 + (r() - 0.5) * 3.2, len: 0.9 + 1.4 * r(), run: 7 + 6 * r(), dir: i % 2 ? 1 : -1, late: r() * 0.25 };
    }).filter((s) => !(Math.abs(s.x) < 0.7 && s.y < 1.9 && s.z > -0.8)); // never through the pup
  }, []);
  const bullets = useMemo(() => {
    const m = new InstancedMesh(new CylinderGeometry(0.018, 0.018, 1, 5).rotateZ(Math.PI / 2), mats.bullet, shots.length);
    m.frustumCulled = false;
    for (let i = 0; i < shots.length; i++) m.setColorAt(i, new Color(p.star[1 + (i % 2)]));
    return m;
  }, [mats, p, shots]);
  const bars = useMemo(() => {
    const m = new InstancedMesh(new BoxGeometry(1, 1, 1).translate(0.5, 0, 0), mats.bar, BARS);
    m.frustumCulled = false;
    for (let i = 0; i < BARS; i++) m.setColorAt(i, CREAM);
    return m;
  }, [mats]);
  const spans = useMemo(() => {
    const r = seeded(19);
    // sorted by birth; three long bars (the features) among many short ones (the noise)
    return Array.from({ length: BARS }, (_, i) => {
      const long = i === 1 || i === 5 || i === 11;
      const b = (i / BARS) * 0.55;
      return { b, d: long ? Math.min(1, b + 0.55 + 0.2 * r()) : b + 0.04 + 0.12 * r() };
    });
  }, []);
  const spoon = useRef();
  const ripple = useRef();
  const burst = useRef();
  const sweep = useRef();
  const o = useMemo(() => new Object3D(), []);
  const c = useMemo(() => new Color(), []);

  // the lean: the pup's root tipped back about its own right axis, only inside the scene
  const root = useRef(null);
  useFrame((state) => {
    const s = (root.current ??= state.scene.getObjectByName("seal"));
    if (!s) return;
    const a = live.arrival;
    if (a.id && mode === "full") {
      const t = state.clock.elapsedTime - a.start;
      s.rotation.order = "YXZ";
      s.rotation.x = -0.42 * smooth(tl.move[0] - 0.1, tl.move[0] + 0.4, t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    } else if (s.rotation.order !== "XYZ") {
      s.rotation.x = 0;
      s.rotation.order = "XYZ";
    }
  }, 0.1);
  useEffect(
    () => () => {
      const s = root.current;
      if (s) {
        s.rotation.x = 0;
        s.rotation.order = "XYZ";
      }
    },
    [],
  );

  useCutFrame((t, state) => {
    if (mode !== "full") return;
    const fade = 1 - smooth(tl.collapse[0], tl.collapse[1], t);
    live.pose.point = smooth(tl.enter, tl.enter + 0.4, t) * (1 - smooth(tl.move[0] - 0.2, tl.move[0] + 0.2, t));
    live.pose.raise = smooth(tl.move[0], tl.move[0] + 0.5, t) * fade;

    // the spoon: turns on twos, bends through line A, folds away in a burst
    const sp = spoon.current;
    const popAt = tl.lineA + 2.0;
    sp.visible = t > tl.enter && t < popAt;
    sp.position.set(1.0, 1.25 + 0.1 * Math.sin(onTwos(t) * 1.4), -1.5);
    sp.scale.setScalar(1.5);
    sp.rotation.set(0, onTwos(t) * 0.7, 0.18);
    spoonMat.uniforms.uBend.value = smooth(tl.lineA + 0.9, popAt, t) * 2.2;
    const b = Math.max(0, t - popAt);
    const bs = burst.current;
    bs.position.set(1.0, 1.5, -1.5);
    bs.lookAt(state.camera.position);
    bs.scale.setScalar(Math.max(0.001, onTwos(Math.min(1, b / 0.45)) * 1.8));
    mats.burst.opacity = b > 0 ? 0.9 * Math.max(0, 1 - b / 0.45) : 0;

    // bullet time: streaks cross the frame and slow to a stop, a ripple opens from the pup's chest
    const slow = smooth(tl.move[0] - 0.7, tl.move[1] + 0.3, t);
    shots.forEach((s, i) => {
      const u = Math.min(1, Math.max(0, (slow - s.late) / (1 - s.late)));
      const ease = 1 - (1 - u) ** 3;
      o.position.set(s.x - s.dir * s.run * (1 - ease), s.y, s.z);
      o.rotation.set(0, 0, 0);
      const on = slow > 0 && fade > 0;
      o.scale.set(on ? s.len * (1.8 - 0.8 * u) : 0.0001, on ? 1 : 0.0001, on ? 1 : 0.0001);
      o.updateMatrix();
      bullets.setMatrixAt(i, o.matrix);
    });
    bullets.instanceMatrix.needsUpdate = true;
    const rp = Math.max(0, t - (tl.move[1] - 0.15));
    const rr = ripple.current;
    rr.position.set(0, 1.0, 0.2);
    rr.lookAt(state.camera.position);
    rr.scale.setScalar(Math.max(0.001, onTwos(Math.min(1, rp / 0.9)) * 3.2));
    mats.ripple.opacity = rp > 0 ? 0.8 * Math.max(0, 1 - rp / 0.9) * fade : 0;

    // the barcode draws itself bar by bar after the move; the cut sweeps and greys the short ones
    const draw0 = tl.lineB - 0.1;
    const swept = smooth(tl.lineB + 1.0, tl.lineB + 2.0, t);
    spans.forEach((s, i) => {
      const k = smooth(draw0 + i * 0.045, draw0 + i * 0.045 + 0.45, t);
      const x = BAR_W * s.b;
      o.position.set(BAR_AT[0] + x, BAR_AT[1] + i * ROW, BAR_AT[2]);
      o.rotation.set(0, 0, 0);
      o.scale.set(Math.max(0.0001, BAR_W * (s.d - s.b) * onTwos(k) * fade), 0.07, 0.05);
      o.updateMatrix();
      bars.setMatrixAt(i, o.matrix);
      const gray = s.d - s.b < 0.3 && swept * BAR_W * 0.9 > x ? 1 : 0;
      bars.setColorAt(i, c.copy(CREAM).lerp(GREY, gray));
    });
    bars.instanceMatrix.needsUpdate = true;
    bars.instanceColor.needsUpdate = true;
    sweep.current.position.set(BAR_AT[0] + swept * BAR_W * 0.9, BAR_AT[1] + (BARS * ROW) / 2, BAR_AT[2] + 0.05);
    mats.cut.opacity = 0.85 * smooth(tl.lineB + 0.9, tl.lineB + 1.1, t) * (1 - smooth(tl.lineB + 2.0, tl.lineB + 2.4, t)) * fade;
  });

  return (
    <>
      <Stage {...cut} />
      <Rig cut={cut}>
        <mesh ref={spoon} geometry={spoonGeo} material={spoonMat} visible={false} />
        <mesh ref={burst} geometry={burstGeo} material={mats.burst} />
        <mesh ref={ripple} geometry={rippleGeo} material={mats.ripple} />
        <primitive object={bullets} />
        <primitive object={bars} />
        <mesh ref={sweep} material={mats.cut}>
          <boxGeometry args={[0.05, BARS * ROW + 0.3, 0.03]} />
        </mesh>
      </Rig>
    </>
  );
}
