"use client";

// Planimeter: The Empire Strikes Back. THE PUP IS THE SMALL MASTER: hunched
// on a root in a misty amber bog with a tiny gnarled cane (no ears: the read
// is the cane, the hunch and the sentence). Luke, an ink silhouette with an
// unlit hilt on his belt, is the witness. Eyes closed, the pup raises one
// flipper and the bog lifts: closed polygons rise dripping out of the water,
// fill amber, and the booth's stamp arm punches EXACT on each. Over the open
// polygon in the water the flipper hovers, two big sweat drops fall, and it
// pulls back: the gap stays amber, pulsing at both ends (HMM.), the boom
// barrier drops. 495 stamps rain, large, and land with a visible EXACT print;
// the 33 open ones land amber, in a cluster of their own. Across the bog the
// rival's sheet rises all at once, snapped shut by guessing, and a wave turns
// most of it coral: it sinks with a plop. Five costume pups lean in, then
// cover their eyes. Shape, colour and pose only. Card: cards/p-planimeter.js.
// Cost: about 38 draws, ~4k triangles, no post.

import { useEffect, useMemo, useRef } from "react";
import { BackSide, BoxGeometry, CanvasTexture, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, RingGeometry, SRGBColorSpace, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Speaker, Stage, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { paletteFor } from "../../../../lib/world/cutscene/look";
import { figureAt } from "../../../../lib/world/cutscene/timeline";
import { LUKE } from "../../../../lib/world/cutscene/cards/p-planimeter.js";
import { additive, crowdFrame, disposeCrowd, disposeLetter, figureFrame, flat, flipperTip, glowMat, letterMesh, makeCrowd, outK, placeLetter, popAt, ramp, rand, sealRig, twos, useCredit, useLineSwitch, useShake, useStageGroup } from "./g5/fx";

const AMBER = "#ffb43a";
const AMBER_HI = "#ffd98a";
const CORAL = "#ff6b5a";
const CREAM = "#faf7ef";
const MINT = "#6fe0b4";
const INK = "#1c1630";
const RISE = 3.4; // the first polygon leaves the water
const POLYS = 12;
const PULL = [4.25, 4.6]; // the flipper draws back
const RAIN = 4.5;
const SHEET = 4.9; // the rival's sheet rises all at once
const WAVE = 5.9; // and the wave goes through it
const SINK = [6.3, 6.9];
const CLOSED = 96;
const OPEN = 33;
const RIVAL = 72;
const BAD = 46; // 336 of 528, of 72
const V = new Vector3();
const C = new Vector3();
const C0 = new Color(AMBER);
const C1 = new Color(CORAL);
const COL = new Color();

const strip = (g) => {
  const t = g.index ? g.toNonIndexed() : g;
  t.deleteAttribute("uv");
  t.deleteAttribute("normal");
  return t;
};

// a stamp: a cream card with a coloured border and the word on it (what lands in the pile)
function stampTexture(word, color, open) {
  const c = document.createElement("canvas");
  c.width = 192;
  c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = CREAM;
  x.fillRect(0, 0, 192, 128);
  x.strokeStyle = color;
  x.lineWidth = 14;
  x.strokeRect(7, 7, 178, 114);
  x.strokeStyle = INK;
  x.lineWidth = 3;
  x.strokeRect(1.5, 1.5, 189, 125);
  x.fillStyle = INK;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = "800 40px 'Shantell Sans', 'Segoe Print', cursive";
  x.fillText(word, 96, open ? 84 : 66);
  if (open) {
    x.strokeStyle = color;
    x.lineWidth = 8;
    x.lineCap = "round";
    x.beginPath();
    x.arc(96, 38, 17, 0.5, Math.PI * 2 - 0.3 + 0.0);
    x.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
function exactTexture() {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 64;
  const x = c.getContext("2d");
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = "800 40px 'Shantell Sans', 'Segoe Print', cursive";
  x.lineWidth = 9;
  x.strokeStyle = INK;
  x.strokeText("EXACT", 80, 34);
  x.fillStyle = CREAM;
  x.fillText("EXACT", 80, 34);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export default function Planimeter(cut) {
  const { card, tl, mode } = cut;
  const p = paletteFor(card);
  const refs = useRef({});
  const k = useMemo(() => {
    const r = rand(77);
    // the polygons that rise: where each ends up, hanging in the fog
    const polys = Array.from({ length: POLYS }, (_, j) => {
      const u = j / (POLYS - 1);
      return { fx: -2.5 + u * 3.8 + (r() - 0.5) * 0.3, fy: 1.35 + 0.8 * Math.sin(u * 3.3) + (r() - 0.5) * 0.3, fz: -1.4 - 0.5 * Math.sin(u * 5) + (r() - 0.5) * 0.4, at: RISE + j * 0.07, sz: 0.3 + r() * 0.12, ph: r() * 6 };
    });
    const closedPile = Array.from({ length: CLOSED }, () => ({ x: -3.0 + r() * 3.6, z: -1.1 - r() * 2.4, at: RAIN + r() * 0.9, tilt: (r() - 0.5) * 0.5, s: 0.9 + r() * 0.25 }));
    const openPile = Array.from({ length: OPEN }, () => ({ x: 1.9 + (r() + r() - 1) * 0.8 + 0.6, z: -0.9 - (r() + r() - 1) * 0.55 - 0.3, at: RAIN + 0.1 + r() * 0.9, tilt: (r() - 0.5) * 0.5, s: 1 + r() * 0.2 }));
    const order = Array.from({ length: RIVAL }, (_, i) => i).sort(() => r() - 0.5);
    const rival = Array.from({ length: RIVAL }, (_, i) => ({ x: 1.9 + (i % 12) * 0.2 + (Math.floor(i / 12) % 2) * 0.1, row: Math.floor(i / 12), bad: order.indexOf(i) < BAD, ph: r() * 6 })); // 46 of 72: 336 of 528
    // open polygons in the water: the one under the flipper first
    const openPoly = [[1.15, 0.5, 0.42], [2.4, 0.2, 0.28], [3.2, -0.3, 0.22], [2.1, -0.5, 0.25]];
    const mk = (geo, mat, n) => {
      const m = new InstancedMesh(geo, mat, n);
      m.frustumCulled = false;
      return m;
    };
    const stampMat = (tex) => new MeshBasicMaterial({ map: tex, toneMapped: false, fog: false, side: DoubleSide });
    const polyRing = new RingGeometry(0.86, 1, 8).rotateZ(0.2);
    const ringMat = flat("#ffffff"); // instance colours carry the amber and the coral
    const rivalRings = mk(polyRing, ringMat, RIVAL);
    for (let i = 0; i < RIVAL; i++) rivalRings.setColorAt(i, C0);
    const caneGeo = mergeGeometries([
      strip(new CylinderGeometry(0.022, 0.034, 0.92, 6).translate(0.0, 0.46, 0)),
      strip(new TorusGeometry(0.09, 0.025, 5, 8, Math.PI).rotateZ(0).translate(-0.09, 0.92, 0)),
      strip(new SphereGeometry(0.045, 6, 4).translate(0.015, 0.34, 0)),
    ]);
    const treeGeo = mergeGeometries([
      strip(new CylinderGeometry(0.12, 0.26, 1.2, 6).translate(0, 0.6, 0)),
      strip(new CylinderGeometry(0.08, 0.13, 0.9, 6).rotateZ(0.5).translate(0.28, 1.45, 0)),
      strip(new CylinderGeometry(0.06, 0.09, 0.8, 6).rotateZ(-0.7).translate(-0.3, 1.5, 0)),
      strip(new CylinderGeometry(0.04, 0.07, 0.6, 5).rotateZ(1.2).translate(0.7, 1.85, 0)),
    ]);
    return {
      polys,
      closedPile,
      openPile,
      rival,
      openPoly,
      ink: flat(INK),
      inkRim: flat(p.rim, { side: BackSide }),
      cream: flat(CREAM),
      cane: caneGeo,
      caneMat: flat("#e8dcc0"),
      treeGeo,
      // the bog: pale teal water with rings drifting out, fog cards in amber light
      water: new ShaderMaterial({
        uniforms: { uC: { value: new Vector3() }, uT: { value: 0 } },
        transparent: true,
        depthWrite: false,
        vertexShader: "varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
        fragmentShader: "uniform vec3 uC;uniform float uT;varying vec3 vW;void main(){vec2 d=vW.xz-uC.xz;float r=length(d)/8.;float rip=0.5+0.5*sin(length(d)*4.-uT*1.3+sin(d.x*1.6+uT*0.4)*0.9);vec3 col=mix(vec3(0.10,0.24,0.26),vec3(0.28,0.52,0.50),rip*0.55);col+=vec3(0.18,0.1,0.02)*(1.-r);gl_FragColor=vec4(pow(col,vec3(2.2)),(1.-smoothstep(0.3,0.95,r))*0.96);}",
      }),
      waterGeo: new CircleGeometry(8, 48).rotateX(-Math.PI / 2),
      fogGeo: new PlaneGeometry(1, 1),
      fog: glowMat(AMBER, 0.7),
      lantern: glowMat(AMBER_HI, 1.6),
      glowGeo: new CircleGeometry(0.5, 20),
      // the polygons that rise, their fills, their EXACT stamps and the ripples they leave
      ringsUp: mk(polyRing, flat(AMBER), POLYS),
      fills: mk(new CircleGeometry(0.86, 8).rotateZ(0.2), additive(AMBER, { opacity: 0.4 }), POLYS),
      stamps: mk(new PlaneGeometry(0.5, 0.2), stampMat(exactTexture()), POLYS),
      ripples: mk(new RingGeometry(0.82, 1, 24).rotateX(-Math.PI / 2), additive(AMBER_HI, { opacity: 0.6 }), POLYS),
      // the open ones: gap and endpoints
      openRings: mk(new RingGeometry(0.86, 1, 8, 1, 0, 5.55).rotateX(-Math.PI / 2), flat(AMBER), 4),
      ends: mk(new CircleGeometry(0.16, 10), additive(AMBER_HI), 8),
      // 495 and 33
      closedCards: mk(new PlaneGeometry(0.4, 0.27), stampMat(stampTexture("EXACT", MINT, false)), CLOSED),
      openCards: mk(new PlaneGeometry(0.4, 0.27), stampMat(stampTexture("OPEN", AMBER, true)), OPEN),
      rivalRings,
      rivalFills: mk(new CircleGeometry(0.86, 8).rotateZ(0.2), additive(AMBER, { opacity: 0.3 }), RIVAL),
      // the booth: ink box, roof, lantern, the stamp arm and the boom barrier
      booth: new BoxGeometry(1.3, 1.4, 0.9).translate(0, 0.7, 0),
      roof: new ConeGeometry(0.98, 0.5, 4).rotateY(Math.PI / 4).scale(1, 1, 0.72).translate(0, 1.65, 0),
      arm: new BoxGeometry(0.1, 0.1, 0.8).translate(0, 0, 0.4),
      head: new BoxGeometry(0.34, 0.14, 0.3),
      bar: new BoxGeometry(1.2, 0.07, 0.07).translate(0.6, 0, 0),
      sweat: new IcosahedronGeometry(0.1, 1).scale(0.75, 1.35, 0.75),
      sweatMat: flat("#a8dcff"),
      sweatTip: new ConeGeometry(0.07, 0.16, 6).translate(0, 0.16, 0),
      rootGeo: new SphereGeometry(1, 8, 5),
      hilt: mergeGeometries([strip(new CylinderGeometry(0.03, 0.03, 0.2, 8).translate(0, 0, 0)), strip(new CylinderGeometry(0.04, 0.04, 0.03, 8).translate(0, 0.1, 0))]),
      dummy: new Object3D(),
    };
  }, [p]);
  const tex = useMemo(() => [k.stamps.material.map, k.closedCards.material.map, k.openCards.material.map], [k]);

  const letters = useMemo(
    () => ({
      vwoom: letterMesh("VWOOOOM", AMBER, 120),
      hmm: letterMesh("HMM.", AMBER, 120),
      plop: [0, 1, 2].map(() => letterMesh("plop", AMBER, 120)),
    }),
    [],
  );
  const crowd = useMemo(() => makeCrowd(5, p.ink, ["#22c55e", "#1ec8f0", "#84cc16", "#ff8f00", "#e94bff"]), [p]);
  const spots = useMemo(() => [-0.93, -0.8, 0.68, 0.81, 0.94].map((x) => [x, -0.8]), []);
  useEffect(
    () => () => {
      tex.forEach((t) => t.dispose());
      [letters.vwoom, letters.hmm, ...letters.plop].forEach(disposeLetter);
      disposeCrowd(crowd);
    },
    [tex, letters, crowd],
  );

  useShake(cut, [SINK[0]], 0.06);
  useCredit(cut, "teerthsharma/planimeter", "Python", "495 exact · 33 refused · 0 wrong · shapely.polygonize_full: 336 wrong, 0 refused");
  useLineSwitch(card, tl, LUKE);

  // the pup: sits hunched on its root, eyes closed; one flipper rises, hovers, draws back; at the flex it points the cane
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = outK(tl, t);
    const sit = ramp(1.7, 2.1, t) * (1 - ramp(5.5, 5.8, t));
    live.pose.sit = 0.75 * sit * o; // sitting up closes its eyes
    live.pose.crouch = 0.3 * sit * o + 0.35 * ramp(PULL[0], PULL[1], t) * (1 - ramp(5.3, 5.6, t)) * o;
    live.pose.fist = ramp(3.2, 3.9, t) * (1 - ramp(PULL[0], PULL[1], t)) * o;
    live.pose.point = ramp(5.6, 5.9, t) * o;
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
      const rig = sealRig(state.scene);
      const tip = rig ? flipperTip(rig) : null;
      const cam = state.camera;
      k.water.uniforms.uC.value.set(seal.x, 0, seal.z);
      k.water.uniforms.uT.value = tt;
      const bog = ramp(2.2, 2.6, t);
      r.bog.visible = bog > 0;
      r.bog.scale.setScalar(Math.max(bog * (0.2 + 0.8 * o), 0.001));

      // --- Luke's hilt rides the figure (his belt), unlit
      const ff = figureFrame(t, tl, mode);
      r.fig.visible = Boolean(ff);
      if (ff) {
        const at = figureAt(card);
        r.fig.position.set(seal.x + at[0], at[1], seal.z + at[2]);
        r.fig.scale.set(1.12 * ff[0], 1.12 * ff[1], 1.12 * ff[0]);
        r.fig.rotation.y = -0.42;
      }
      // --- fog cards drift
      r.fogs.forEach((f, i) => {
        f.position.set(-0.6 + Math.sin(tt * 0.35 + i * 2) * 0.6 + i * 0.5, 1.3 + i * 0.2, -2.4 - i * 1.4);
        f.quaternion.copy(cam.quaternion);
        f.scale.set(7 + i, 2.4, 1);
      });
      k.fog.uniforms.uA.value = 0.5 * bog;
      k.lantern.uniforms.uA.value = (0.9 + 0.1 * Math.sin(tt * 7)) * bog;

      // --- the cane in the flipper: planted, trembling while the flipper is up, tapping once on line A
      const tap = t > 2.65 && t < 2.8 ? Math.sin(((t - 2.65) / 0.15) * Math.PI) * 0.07 : 0;
      const trem = t > 3.4 && t < PULL[0] ? Math.sin(tt * 120) * 0.015 : 0;
      r.cane.visible = Boolean(tip) && t > 1.9 && o > 0.1;
      if (tip) {
        r.cane.position.set(tip.x - seal.x + 0.04 + trem, tap, tip.z - seal.z + 0.12);
        r.cane.rotation.z = 0.06 + trem * 3;
      }

      // --- the polygons rise dripping, fill amber, take a stamp, ripple the water
      const rising = t >= RISE;
      for (const m of [k.ringsUp, k.fills, k.stamps, k.ripples]) m.visible = rising;
      k.polys.forEach((q, j) => {
        const u = ramp(0, 0.7, t - q.at);
        const sc = Math.max(q.sz * ramp(0, 0.25, t - q.at) * o, 0.0001);
        const y = -0.3 + (q.fy + 0.3) * u + (q.fy > 0 ? 0.04 * Math.sin(tt * 2.1 + q.ph) * u : 0);
        D.position.set(q.fx, y, q.fz);
        D.quaternion.copy(cam.quaternion);
        D.rotateX(-1.3 * (1 - u));
        D.rotateZ(0.12 * Math.sin(tt * 1.3 + q.ph) * u + (1 - u) * 0.5);
        D.scale.setScalar(sc);
        D.updateMatrix();
        k.ringsUp.setMatrixAt(j, D.matrix);
        D.scale.setScalar(sc * 0.97);
        D.updateMatrix();
        k.fills.setMatrixAt(j, D.matrix);
        // EXACT, punched on its own beat: a pop, then held on its face
        const sa = t - q.at - 0.35;
        D.position.set(q.fx, y, q.fz + 0.02);
        D.quaternion.copy(cam.quaternion);
        D.scale.setScalar(Math.max(sa >= 0 ? popAt(sa) * q.sz * 1.7 * o : 0.0001, 0.0001));
        D.updateMatrix();
        k.stamps.setMatrixAt(j, D.matrix);
        // the drip: a ring on the water under it, going out while it rises
        const ra = t - q.at;
        D.position.set(q.fx, 0.03, q.fz);
        D.quaternion.set(0, 0, 0, 1);
        D.scale.setScalar(ra > 0 && ra < 0.9 ? (0.1 + 0.55 * ramp(0, 0.9, ra)) * (1 - ramp(0.55, 0.9, ra)) + 0.0001 : 0.0001);
        D.updateMatrix();
        k.ripples.setMatrixAt(j, D.matrix);
      });
      for (const m of [k.ringsUp, k.fills, k.stamps, k.ripples]) m.instanceMatrix.needsUpdate = true;
      // the booth's arm punches on each stamp, then recoils
      let punch = 0;
      for (const q of k.polys) {
        const a = t - q.at - 0.35;
        if (a > 0 && a < 0.18) punch = Math.max(punch, Math.sin((a / 0.18) * Math.PI));
      }
      r.arm.rotation.x = -0.35 + 0.55 * punch;
      r.barrier.rotation.z = (1 - ramp(PULL[1] - 0.1, PULL[1] + 0.2, t)) * 1.1; // up, then it drops over the open ones

      // --- the open ones: flat in the water, gap amber, ends pulsing, never meeting
      const openOn = ramp(RISE + 0.3, RISE + 0.7, t);
      k.openRings.visible = k.ends.visible = openOn > 0;
      k.openPoly.forEach(([x, z, s], i) => {
        D.position.set(x, 0.05, z);
        D.quaternion.set(0, 0, 0, 1);
        D.rotation.set(0, 0.3 * i, 0);
        D.scale.setScalar(Math.max(s * openOn * o, 0.0001));
        D.updateMatrix();
        k.openRings.setMatrixAt(i, D.matrix);
        for (let e = 0; e < 2; e++) {
          const g = e ? 5.55 : 0; // the ring's two ends, as angles round it
          const pulse = 1 + 0.35 * Math.sin(tt * 10 + e * 3.1 + i) * (t > PULL[0] ? 1.4 : 0.5);
          D.position.set(x + s * Math.cos(g + 0.3 * i), 0.07, z - s * Math.sin(g + 0.3 * i));
          D.quaternion.copy(cam.quaternion);
          D.scale.setScalar(Math.max(s * 0.55 * pulse * openOn * o, 0.0001));
          D.updateMatrix();
          k.ends.setMatrixAt(i * 2 + e, D.matrix);
        }
      });
      k.openRings.instanceMatrix.needsUpdate = true;
      k.ends.instanceMatrix.needsUpdate = true;
      // HMM. at the drawn-back flipper
      const hp = tip ? C.set(tip.x, tip.y, tip.z).project(cam) : null;
      placeLetter(state, letters.hmm, hp ? Math.min(0.75, hp.x + 0.18) : 0, hp ? Math.min(0.5, hp.y + 0.2) : 0, 0.1, -0.08, t >= PULL[0] && t < PULL[0] + 1.3 ? popAt(t - PULL[0]) * o : 0);
      placeLetter(state, letters.vwoom, -0.42, -0.2, 0.1, -0.05, t >= RISE && t < RISE + 1.1 ? popAt(t - RISE) * o : 0);
      // --- two big sweat drops fall from the brow and plink into the water
      for (let i = 0; i < 2; i++) {
        const a = t - (4.0 + i * 0.18);
        const m = r.sweats[i];
        m.visible = a >= 0 && a < 0.75 && Boolean(rig);
        if (m.visible) {
          V.set(i ? 0.5 : -0.5, 0.28, 0.32).applyMatrix4(rig.head.matrixWorld);
          const fall = Math.min(1, a / 0.7);
          m.position.set(V.x - seal.x + (i ? 0.1 : -0.1), V.y - fall * fall * (V.y - 0.05), V.z - seal.z + 0.2);
          m.scale.setScalar(1.3 * (1 - 0.3 * fall) * o);
          m.quaternion.copy(cam.quaternion);
        }
      }

      // --- 495 stamps rain: big, they land with a visible EXACT print; 33 amber open ones land in a cluster of their own
      const yawTo = (x, z) => Math.atan2(cam.position.x - (x + seal.x), cam.position.z - (z + seal.z));
      for (const [m, list] of [[k.closedCards, k.closedPile], [k.openCards, k.openPile]]) {
        m.visible = t >= RAIN;
        if (t < RAIN) continue;
        list.forEach((q, i) => {
          const u = ramp(0, 0.5, t - q.at);
          const land = t - q.at - 0.5;
          const s = (t < q.at ? 0 : 1) * (land >= 0 ? 1 + 0.25 * Math.max(0, 1 - land * 8) : 1) * q.s * o;
          D.position.set(q.x, 0.16 + (1 - u) * (1 - u) * 4.2, q.z);
          D.rotation.set(0, yawTo(q.x, q.z), q.tilt + (1 - u) * 1.4, "YXZ");
          D.scale.setScalar(Math.max(s, 0.0001));
          D.updateMatrix();
          m.setMatrixAt(i, D.matrix);
        });
        m.instanceMatrix.needsUpdate = true;
      }

      // --- the rival's sheet rises all at once, snaps shut by guessing, and the wave turns most of it coral and sinks it
      const rv = ramp(SHEET, SHEET + 0.5, t);
      k.rivalRings.visible = k.rivalFills.visible = rv > 0;
      if (rv > 0) {
        k.rival.forEach((q, i) => {
          const wave = ramp(0, 0.3, t - (WAVE + (q.x - 1.9) * 0.18));
          const sink = q.bad ? ramp(SINK[0] + (i % 6) * 0.06, SINK[1], t) : 0;
          const y = -0.2 + (1.25 + q.row * 0.28) * rv - sink * 1.9;
          D.position.set(q.x + 0.25, y, -3.6 - q.row * 0.1);
          D.quaternion.copy(cam.quaternion);
          D.rotateZ(0.25 * Math.sin(tt * 1.6 + q.ph) * 0.4);
          D.scale.setScalar(Math.max(0.085 * rv * o * (1 - 0.3 * sink), 0.0001));
          D.updateMatrix();
          k.rivalRings.setMatrixAt(i, D.matrix);
          D.scale.setScalar(Math.max(0.082 * rv * o * (1 - 0.3 * sink) * (q.bad && wave > 0.5 ? 1 : 0.7), 0.0001));
          D.updateMatrix();
          k.rivalFills.setMatrixAt(i, D.matrix);
          k.rivalRings.setColorAt(i, COL.copy(C0).lerp(C1, q.bad ? wave : 0));
        });
        k.rivalRings.instanceMatrix.needsUpdate = true;
        k.rivalFills.instanceMatrix.needsUpdate = true;
        k.rivalRings.instanceColor.needsUpdate = true;
      }
      letters.plop.forEach((m, i) => {
        const a = t - (SINK[0] + 0.15 + i * 0.22);
        placeLetter(state, m, 0.45 + i * 0.22 - 0.1, 0.18 + (i % 2) * 0.12, 0.06, i % 2 ? 0.1 : -0.1, a >= 0 && a < 0.9 ? popAt(a) * o : 0);
      });

      // --- the crowd leans in as the shapes rise, then covers its eyes as the coral sinks
      const lean = ramp(RISE, RISE + 0.5, t) * (1 - ramp(WAVE, WAVE + 0.3, t));
      const cover = ramp(SINK[0] - 0.1, SINK[0] + 0.1, t);
      crowdFrame(
        crowd,
        state,
        t > 2.5 && o > 0.02,
        spots.map(([x, y], i) => [x, y - (1 - ramp(2.5 + i * 0.05, 2.8 + i * 0.05, t)) * 0.4]),
        (i) => (i === 2 || i === 0 ? 0.13 : 0.115) * (0.3 + 0.7 * o),
        (i, q) => {
          q.hop = (Math.sin(tt * 9 + i * 1.3) > 0.2 ? 1 : 0) * 0.5 * (1 - cover);
          q.pitch = 0.35 * lean;
          q.l = q.r = cover;
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
      <group ref={set("fig")} visible={false}>
        <mesh geometry={k.hilt} material={k.cream} position={[0.22, 0.98, 0.16]} rotation={[0.1, 0, 0.35]} />
      </group>
      <Speaker {...cut} />
      <group ref={root} visible={false}>
        <group ref={set("bog")}>
          <mesh geometry={k.waterGeo} material={k.water} position={[0, 0.004, 0]} renderOrder={-0.5} />
          {[0, 1, 2].map((i) => (
            <mesh key={i} ref={(m) => ((refs.current.fogs ??= [])[i] = m)} geometry={k.fogGeo} material={k.fog} />
          ))}
          <group position={[-2.5, 0, -2.4]}>
            <mesh geometry={k.treeGeo} material={k.inkRim} scale={1.06} />
            <mesh geometry={k.treeGeo} material={k.ink} />
          </group>
          <group position={[-0.9, 0, -3.9]}>
            <mesh geometry={k.booth} material={k.ink} />
            <mesh geometry={k.booth} material={k.inkRim} scale={1.03} />
            <mesh geometry={k.roof} material={k.ink} />
            <mesh geometry={k.glowGeo} material={k.lantern} position={[0.4, 1.0, 0.5]} scale={1.3} />
            <group ref={set("arm")} position={[0.9, 1.05, 0.2]}>
              <mesh geometry={k.arm} material={k.ink} />
              <mesh geometry={k.head} material={k.cream} position={[0, -0.05, 0.8]} />
            </group>
            <group ref={set("barrier")} position={[0.75, 0.62, 0.62]}>
              <mesh geometry={k.bar} material={k.cream} />
            </group>
          </group>
          <mesh geometry={k.rootGeo} material={k.ink} position={[0, 0.0, -0.15]} scale={[0.85, 0.16, 0.75]} />
        </group>
        <mesh ref={set("cane")} geometry={k.cane} material={k.caneMat} visible={false} />
        <primitive object={k.ringsUp} />
        <primitive object={k.fills} />
        <primitive object={k.stamps} />
        <primitive object={k.ripples} />
        <primitive object={k.openRings} />
        <primitive object={k.ends} />
        <primitive object={k.closedCards} />
        <primitive object={k.openCards} />
        <primitive object={k.rivalRings} />
        <primitive object={k.rivalFills} />
        {[0, 1].map((i) => (
          <group key={i} ref={(m) => ((refs.current.sweats ??= [])[i] = m)} visible={false}>
            <mesh geometry={k.sweat} material={k.sweatMat} />
            <mesh geometry={k.sweatTip} material={k.sweatMat} position={[0, 0.06, 0]} />
          </group>
        ))}
        <primitive object={letters.vwoom} />
        <primitive object={letters.hmm} />
        {letters.plop.map((m, i) => (
          <primitive key={i} object={m} />
        ))}
        {crowd.g.map((m, i) => (
          <primitive key={i} object={m} />
        ))}
      </group>
    </>
  );
}

