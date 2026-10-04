"use client";

// Tangle: JoJo. THE PUP IS JOTARO and walks at Dio, one step a syllable, ゴゴゴ
// rising down both edges. Dio (the kit's tall figure, swept head, hip out and
// one arm up, with a coat hem and a pocket watch swinging on its chain) holds
// his pose and never stops posing; the stage slides him in toward the pup on
// each step (dust puffs, speed lines streaming on the floor) until they stand
// nose to nose. Then an ink ring draws round the pup and a grey ring round
// Dio, they fly in and LINK between the two at chest height with a DON!, the
// two crossings light blue, the gantry's clamp pulls, the rings stretch and
// catch and hold (GIIIN). The certificate plate ejects from the gantry's head
// housing and spins down into the credit card. Eight costume pups on the
// bottom edge each strike a different JoJo pose, on twos. Shape, colour and
// pose only. Card: cards/p-tangle.js.
// Cost: about 34 draws, ~3.6k triangles, no post.

import { useEffect, useMemo, useRef } from "react";
import { BackSide, BoxGeometry, CanvasTexture, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Euler, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, Quaternion, SRGBColorSpace, ShaderMaterial, TorusGeometry, Vector3 } from "three";
import { Speaker, Stage, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { paletteFor } from "../../../../lib/world/cutscene/look";
import { figureScale } from "../../../../lib/world/cutscene/timeline";
import { START, WALK } from "../../../../lib/world/cutscene/cards/p-tangle.js";
import { additive, crowdFrame, disposeCrowd, disposeLetter, figureFrame, flat, hudAt, letterMesh, makeCrowd, outK, placeLetter, popAt, ramp, rand, twos, useCredit, useLineSwitch, useShake, useStageGroup } from "./g5/fx";

const GREEN = "#22c55e";
const BLUE = "#6fb7ff";
const INK = "#1c1630";
const GREY = "#9aa3b0";
const STEPS = [3.4, 4.9]; // eight steps, one a syllable
const N_STEPS = 8;
const DRAW = [4.95, 5.2];
const LINK = 5.3;
const PULL = [5.36, 5.56];
const CATCH = 5.6;
const PLATE = [5.7, 8.3];
const END = [1.5, 0, -0.4]; // where Dio ends: nose to nose
const R = 0.5; // a ring's radius
const TUBE = 0.06;
const PAIR_E = new Euler(0, 0.6, 0.8);
const GLYPHS = 14;
const PUFFS = 16;
const V = new Vector3();
const M = new Vector3();
const DIO = new Vector3();
const P0 = new Vector3();
const Q = new Quaternion();
const QF = new Quaternion();
const QY = new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0));
const QP = new Quaternion().setFromEuler(PAIR_E);

// ゴ, drawn bold with an ink outline in white (tinted by the instance); Latin GO where the font has none
function glyphTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = "900 104px 'Yu Gothic', 'Hiragino Sans', 'Noto Sans JP', 'Meiryo', sans-serif";
  const word = x.measureText("ゴ").width === x.measureText("�").width ? "GO" : "ゴ";
  x.lineJoin = "round";
  x.lineWidth = 20;
  x.strokeStyle = "#0a0614";
  x.strokeText(word, 64, 70);
  x.fillStyle = "#ffffff";
  x.fillText(word, 64, 70);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
// the certificate plate: cream, ink lines, a green seal
function plateTexture() {
  const c = document.createElement("canvas");
  c.width = 192;
  c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#fbfaf7";
  x.fillRect(0, 0, 192, 128);
  x.strokeStyle = INK;
  x.lineWidth = 6;
  x.strokeRect(4, 4, 184, 120);
  x.lineWidth = 5;
  x.lineCap = "round";
  for (const y of [34, 56, 78]) {
    x.beginPath();
    x.moveTo(20, y);
    x.lineTo(112 - (y % 3) * 10, y);
    x.stroke();
  }
  x.fillStyle = GREEN;
  x.beginPath();
  x.arc(150, 80, 24, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "#fbfaf7";
  x.lineWidth = 7;
  x.beginPath();
  x.moveTo(139, 80);
  x.lineTo(148, 90);
  x.lineTo(163, 70);
  x.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

const JOJO = [
  (q) => {
    q.l = 0.15; // a hand on the hip, hip out
    q.r = 0.9;
    q.roll = 0.16;
  },
  (q) => {
    q.l = 1; // an arm over the head
    q.r = 0.35;
    q.roll = -0.12;
  },
  (q) => {
    q.l = q.r = 0.55; // the back-bend
    q.pitch = -0.5;
  },
];

export default function Tangle(cut) {
  const { card, tl, mode } = cut;
  const p = paletteFor(card);
  const refs = useRef({});
  const k = useMemo(() => {
    const r = rand(5);
    const glyphMap = glyphTexture();
    const glyphs = new InstancedMesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: glyphMap, color: p.accent, transparent: true, toneMapped: false, fog: false, side: DoubleSide, depthWrite: false, depthTest: false }), GLYPHS);
    glyphs.frustumCulled = false;
    glyphs.renderOrder = 4;
    const dust = new InstancedMesh(new IcosahedronGeometry(0.5, 0), flat("#d9e8d4", { transparent: true, opacity: 0.8 }), PUFFS);
    dust.frustumCulled = false;
    const cross = new InstancedMesh(new CircleGeometry(0.5, 14), additive(BLUE), 2);
    cross.frustumCulled = false;
    const plateMap = plateTexture();
    const jaw = new BoxGeometry(0.1, 0.42, 0.1).translate(0, -0.21, 0);
    return {
      glyphMap,
      plateMap,
      glyphs,
      dust,
      cross,
      lanes: Array.from({ length: GLYPHS }, (_, i) => ({ side: i % 2 ? 1 : -1, x: 0.8 + r() * 0.15, ph: r(), s: 0.09 + r() * 0.06, rz: (r() - 0.5) * 0.4, wob: r() * 6 })),
      ink: flat(INK),
      inkRim: flat(p.rim, { side: BackSide }),
      cream: flat("#fbfaf7"),
      floorGeo: new CircleGeometry(9, 48).rotateX(-Math.PI / 2),
      floor: new ShaderMaterial({
        uniforms: { uC: { value: new Vector3() }, uT: { value: 0 }, uS: { value: 0 } },
        transparent: true,
        depthWrite: false,
        vertexShader: "varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
        fragmentShader:
          "uniform vec3 uC;uniform float uT,uS;varying vec3 vW;void main(){vec2 d=vW.xz-uC.xz;float r=length(d)/9.;float row=floor(d.y*9.);float h=fract(sin(row*12.9898)*43758.5453);float x=fract(d.x*0.22+uT*uS*(0.5+h)*0.35+h*5.);float ln=step(0.45,h)*smoothstep(0.40,0.42,x)*(1.-smoothstep(0.50,0.52,x));vec3 col=mix(vec3(0.03,0.10,0.07),vec3(0.35,0.85,0.55),ln*(0.2+0.5*uS));gl_FragColor=vec4(pow(col,vec3(2.2)),(1.-smoothstep(0.3,0.95,r))*0.95);}",
      }),
      // Dio's hem and watch
      hem: new ConeGeometry(0.4, 0.6, 9, 1, true).translate(0, -0.3, 0),
      chain: new BoxGeometry(0.012, 0.46, 0.012).translate(0, -0.23, 0),
      watch: new CylinderGeometry(0.085, 0.085, 0.025, 14).rotateX(Math.PI / 2),
      watchFace: new CircleGeometry(0.06, 12),
      // the rings and their rims, the gantry, the clamp, the plate
      tube: new TorusGeometry(R, TUBE, 8, 40),
      rim: new TorusGeometry(R, TUBE + 0.028, 8, 40),
      grey: flat(GREY),
      legs: new BoxGeometry(0.14, 3.2, 0.14),
      beam: new BoxGeometry(1.5, 0.18, 0.2),
      housing: new BoxGeometry(0.8, 0.42, 0.5),
      slot: new BoxGeometry(0.5, 0.06, 0.52),
      slotMat: additive(GREEN),
      cable: new CylinderGeometry(0.018, 0.018, 1, 6).translate(0, 0.5, 0),
      jaw,
      head: new BoxGeometry(0.32, 0.14, 0.14),
      plateGeo: new PlaneGeometry(0.7, 0.47),
      plateMat: new MeshBasicMaterial({ map: plateMap, toneMapped: false, fog: false, side: DoubleSide }),
      dummy: new Object3D(),
    };
  }, [p]);

  const letters = useMemo(() => ({ don: letterMesh("DON!", GREEN, 120), giiin: letterMesh("GIIIN", GREEN, 120) }), []);
  const crowd = useMemo(() => makeCrowd(8, p.ink), [p]);
  const spots = useMemo(() => [-0.94, -0.81, -0.68, -0.55, 0.55, 0.68, 0.81, 0.94].map((x) => [x, -0.8]), []);
  useEffect(
    () => () => {
      k.glyphMap.dispose();
      k.plateMap.dispose();
      [letters.don, letters.giiin].forEach(disposeLetter);
      disposeCrowd(crowd);
    },
    [k, letters, crowd],
  );
  // Dio starts far off and the move walks him in; the card is a module singleton, so put him back
  useEffect(() => {
    const at = card.speaker.at;
    at[0] = START[0];
    at[1] = START[1];
    at[2] = START[2];
    return () => {
      at[0] = START[0];
      at[1] = START[1];
      at[2] = START[2];
    };
  }, [card]);

  useShake(cut, [LINK, CATCH], 0.06);
  useCredit(cut, "teerthsharma/tangle", "Python", "2,000 diagrams · 80 scenes · 247 photographs · 0 wrong certificates");
  useLineSwitch(card, tl, WALK);

  // the pup: a Jotaro stance, a bob a step, the fist set as it arrives
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = outK(tl, t);
    const walking = t >= STEPS[0] && t < STEPS[1];
    live.pose.fist = ramp(3.0, 3.4, t) * o;
    live.pose.crouch = (walking ? (Math.floor((t - STEPS[0]) / ((STEPS[1] - STEPS[0]) / N_STEPS)) % 2 ? 0.05 : 0.4) : 0.15 * ramp(STEPS[1], STEPS[1] + 0.2, t)) * o;
  });

  const hide = () => {
    if (refs.current.fig) refs.current.fig.visible = false;
  };
  const root = useStageGroup(
    cut,
    (t, state) => {
      const r = refs.current;
      const tt = twos(t);
      const o = outK(tl, t);
      const D = k.dummy;
      const seal = live.seal;
      const cam = state.camera;
      const at = card.speaker.at;
      const stepLen = (STEPS[1] - STEPS[0]) / N_STEPS;
      const walkT = Math.min(1, Math.max(0, (t - STEPS[0]) / (STEPS[1] - STEPS[0])));
      // --- Dio is slid in toward the pup a step at a time (on twos, an ease inside each step)
      const si = Math.min(N_STEPS - 1, Math.floor(walkT * N_STEPS));
      const inStep = walkT >= 1 ? 1 : ramp(0, 0.7, Math.floor((walkT * N_STEPS - si) * 6) / 6);
      const prog = walkT >= 1 ? 1 : (si + inStep) / N_STEPS;
      for (let a = 0; a < 3; a++) at[a] = START[a] + (END[a] - START[a]) * prog;
      const walking = t >= STEPS[0] && t < STEPS[1];
      k.floor.uniforms.uC.value.set(seal.x, 0, seal.z);
      k.floor.uniforms.uT.value = t;
      k.floor.uniforms.uS.value = walking ? 1 : 0.15;
      const arena = ramp(2.2, 2.6, t);
      r.arena.visible = arena > 0;

      // --- Dio's hem and watch ride the figure: they swing while he holds still
      const ff = figureFrame(t, tl, mode);
      r.fig.visible = Boolean(ff);
      if (ff) {
        const sc = figureScale(card);
        r.fig.position.set(seal.x + at[0], at[1], seal.z + at[2]);
        r.fig.scale.set(sc * ff[0], sc * ff[1], sc * ff[0]);
        r.fig.rotation.y = -0.42;
        r.hemG.rotation.z = 0.06 * Math.sin(tt * 3.1);
        r.hemG.rotation.x = 0.05 * Math.sin(tt * 2.3 + 1);
        r.pend.rotation.z = 0.5 * Math.sin(tt * 2.6);
      }
      // --- ゴゴゴ up both screen edges, on twos, the whole scene
      const gOn = ramp(tl.lineA - 0.2, tl.lineA + 0.4, t) * o;
      k.glyphs.visible = gOn > 0;
      k.lanes.forEach((g, i) => {
        const u = (tt * 0.22 + g.ph) % 1;
        const worldH = hudAt(cam, g.side * g.x, -0.85 + u * 1.6, 6, V);
        D.position.copy(V);
        D.quaternion.copy(cam.quaternion);
        D.rotateZ(g.rz + Math.sin(tt * 4 + g.wob) * 0.05);
        const s = g.s * worldH * gOn * Math.sin(u * Math.PI) ** 0.5;
        D.scale.set(s, s, 1);
        D.updateMatrix();
        k.glyphs.setMatrixAt(i, D.matrix);
      });
      k.glyphs.instanceMatrix.needsUpdate = true;

      // --- dust: two puffs at the pup's feet each step, rising and settling
      k.dust.visible = t >= STEPS[0] && t < STEPS[1] + 1.2;
      for (let i = 0; i < PUFFS; i++) {
        const step = Math.floor(i / 2);
        const a = t - (STEPS[0] + step * stepLen);
        const side = i % 2 ? 1 : -1;
        const u = ramp(0, 0.7, a);
        D.position.set(-0.45 - u * 0.35 + side * 0.18, 0.06 + 0.22 * Math.sin(u * Math.PI * 0.8), 0.15 + side * 0.1);
        D.quaternion.set(0, 0, 0, 1);
        D.scale.setScalar(a > 0 && a < 0.75 ? (0.1 + 0.2 * u) * (1 - ramp(0.4, 0.75, a)) * o + 0.0001 : 0.0001);
        D.updateMatrix();
        k.dust.setMatrixAt(i, D.matrix);
      }
      k.dust.instanceMatrix.needsUpdate = true;

      // --- the rings: drawn round the pup (ink) and round Dio (grey), flown to the middle and linked with a DON!
      const grow = ramp(DRAW[0], DRAW[1], t);
      const fly = ramp(DRAW[1] - 0.05, LINK, t);
      const dio = DIO.set(at[0], 1.15, at[2]);
      M.set((0 + dio.x) / 2, 1.15, (0.3 + dio.z) / 2);
      const tug = t >= PULL[0] && t < CATCH ? Math.sin(ramp(PULL[0], PULL[1], t) * Math.PI) * 0.26 : t >= CATCH ? Math.exp(-(t - CATCH) * 10) * Math.sin((t - CATCH) * 42) * 0.05 : 0;
      const jawK = ramp(PULL[0] - 0.06, PULL[0], t);
      const wob = t > LINK && t < PULL[0] ? Math.sin((t - LINK) * 50) * 0.02 : 0;
      for (const [ring, sd] of [[r.ringA, -1], [r.ringB, 1]]) {
        ring.visible = grow > 0;
        if (!ring.visible) continue;
        const from = sd < 0 ? P0.set(0, 0.8, 0.35) : P0.copy(dio);
        const to = W3.set(0, sd * (R / 2 + tug * 0.5 + wob), 0).applyEuler(PAIR_E).add(M);
        ring.position.copy(from).lerp(to, fly);
        QF.copy(QP);
        if (sd > 0) QF.multiply(QY);
        ring.quaternion.copy(cam.quaternion).slerp(QF, fly);
        ring.scale.setScalar(Math.max((0.35 + 0.65 * grow) * o, 0.0001));
      }
      // the two crossings, lit blue when the rings link
      k.cross.visible = t >= LINK;
      for (let i = 0; i < 2; i++) {
        V.set(0, i ? R * 0.5 : -R * 0.5, 0).applyEuler(PAIR_E).add(M);
        D.position.copy(V);
        D.quaternion.copy(cam.quaternion);
        D.scale.setScalar(t >= LINK ? (0.12 + 0.1 * Math.sin(tt * 12 + i * 2)) * popAt(t - LINK) * o + 0.0001 : 0.0001);
        D.updateMatrix();
        k.cross.setMatrixAt(i, D.matrix);
      }
      k.cross.instanceMatrix.needsUpdate = true;
      placeLetter(state, letters.don, -0.05, 0.12, 0.17, -0.1, t >= LINK && t < LINK + 0.9 ? popAt(t - LINK) * o : 0);
      placeLetter(state, letters.giiin, 0.42, 0.28, 0.14, 0.08, t >= CATCH && t < CATCH + 1.1 ? popAt(t - CATCH) * o : 0);

      // --- the gantry: a hoist at the back, its cable down to the clamp over the meeting point
      r.gantry.visible = arena > 0;
      r.gantry.scale.setScalar(Math.max(arena * (0.2 + 0.8 * o), 0.001));
      const housing = W3.set(0.6, 2.7, -5.6);
      const head = V.set(M.x, M.y + 0.95 - (tug > 0 ? tug * 0.4 : 0), M.z);
      r.cable.position.copy(head);
      r.cable.quaternion.setFromUnitVectors(UP, Q4.copy(housing).sub(head).normalize());
      r.cable.scale.set(1, housing.distanceTo(head), 1);
      r.clamp.position.copy(head);
      r.clamp.visible = arena > 0 && t > 3.0;
      r.jawL.rotation.z = 0.55 * (1 - jawK) + 0.12 * jawK;
      r.jawR.rotation.z = -0.55 * (1 - jawK) - 0.12 * jawK;
      k.slotMat.opacity = 0.5 + 0.4 * Math.sin(tt * 6) * (t > CATCH ? 1 : 0.3);

      // --- the plate ejects from the housing and spins down into the credit card
      const pu = ramp(PLATE[0], PLATE[1], t);
      r.plate.visible = t >= PLATE[0] && t < PLATE[1] + 0.15 && o > 0.1;
      if (r.plate.visible) {
        const w = hudAt(cam, 0, -0.32, 3.2, V);
        r.plate.position.set(housing.x + (V.x - housing.x) * pu, housing.y - 0.2 + (V.y - housing.y + 0.2) * pu, housing.z + (V.z - housing.z) * pu);
        r.plate.quaternion.copy(cam.quaternion).multiply(Q.setFromEuler(E2.set(0, tt * 7 * (1 - pu), 0.2 * Math.sin(tt * 2))));
        r.plate.scale.setScalar(0.45 + (w * 0.1) * pu);
      }

      // --- eight costume pups, each in a different JoJo pose, changing on twos
      crowdFrame(
        crowd,
        state,
        t > 2.5 && o > 0.02,
        spots.map(([x, y], i) => [x, y - (1 - ramp(2.5 + i * 0.04, 2.8 + i * 0.04, t)) * 0.4]),
        0.12 * (0.3 + 0.7 * o),
        (i, q) => {
          JOJO[(Math.floor(t * 3) + i) % 3](q);
          q.hop = Math.sin(tt * 9 + i) > 0.5 ? 0.5 : 0;
        },
      );
    },
    hide,
  );

  const set = (name) => (m) => {
    refs.current[name] = m;
  };
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} lean={0.06} />
      <group ref={set("fig")} visible={false}>
        <group ref={set("hemG")} position={[0, 1.02, 0]}>
          <mesh geometry={k.hem} material={k.inkRim} scale={1.07} />
          <mesh geometry={k.hem} material={k.ink} />
        </group>
        <group ref={set("pend")} position={[-0.66, 2.1, 0.36]}>
          <mesh geometry={k.chain} material={k.cream} />
          <mesh geometry={k.watch} material={k.cream} position={[0, -0.5, 0]} />
          <mesh geometry={k.watchFace} material={k.ink} position={[0, -0.5, 0.016]} />
        </group>
      </group>
      <group ref={root} visible={false}>
        <group ref={set("arena")}>
          <mesh geometry={k.floorGeo} material={k.floor} position={[0, 0.004, 0]} renderOrder={-0.5} />
        </group>
        <group ref={set("gantry")} position={[0.6, 0, -5.6]}>
          <mesh geometry={k.legs} material={k.ink} position={[-0.55, 1.4, 0]} rotation={[0, 0, -0.2]} />
          <mesh geometry={k.legs} material={k.ink} position={[0.55, 1.4, 0]} rotation={[0, 0, 0.2]} />
          <mesh geometry={k.beam} material={k.ink} position={[0, 2.4, 0]} />
          <mesh geometry={k.housing} material={k.inkRim} position={[0, 2.7, 0]} scale={1.05} />
          <mesh geometry={k.housing} material={k.ink} position={[0, 2.7, 0]} />
          <mesh geometry={k.slot} material={k.slotMat} position={[0, 2.5, 0]} />
        </group>
        <mesh ref={set("cable")} geometry={k.cable} material={k.ink} />
        <group ref={set("clamp")} visible={false}>
          <mesh geometry={k.head} material={k.ink} />
          <group ref={set("jawL")} position={[-0.12, -0.06, 0]}>
            <mesh geometry={k.jaw} material={k.ink} />
          </group>
          <group ref={set("jawR")} position={[0.12, -0.06, 0]}>
            <mesh geometry={k.jaw} material={k.ink} />
          </group>
        </group>
        <group ref={set("ringA")} visible={false}>
          <mesh geometry={k.rim} material={k.inkRim} />
          <mesh geometry={k.tube} material={k.ink} />
        </group>
        <group ref={set("ringB")} visible={false}>
          <mesh geometry={k.rim} material={k.inkRim} />
          <mesh geometry={k.tube} material={k.grey} />
        </group>
        <primitive object={k.cross} />
        <primitive object={k.dust} />
        <primitive object={k.glyphs} />
        <mesh ref={set("plate")} geometry={k.plateGeo} material={k.plateMat} visible={false} />
        <primitive object={letters.don} />
        <primitive object={letters.giiin} />
        {crowd.g.map((m, i) => (
          <primitive key={i} object={m} />
        ))}
      </group>
    </>
  );
}

const W3 = new Vector3();
const Q4 = new Vector3();
const UP = new Vector3(0, 1, 0);
const E2 = new Euler();
