// THE ANSWER SHEETS: ~60 midterm sheets stand for the 528 files in the measured proportions (about 56 close exactly and 4
// are refused; under the guess about 38 of the 60 turn coral). Each carries one hand-drawn closed figure whose two ends
// nearly meet. Blank sheets drift freely; the instant one is answered it snaps square to the grid. The numbers appear only
// in the lines and the card. Instanced: paper, figure, fill, end dots, EXACT prints (five draws for any count).

import { BufferGeometry, CanvasTexture, DynamicDrawUsage, Float32BufferAttribute, InstancedMesh, Matrix4, Object3D, PlaneGeometry, Quaternion, SRGBColorSpace, ShaderMaterial, Vector3 } from "three";
import { T } from "./layout";
import { SW, swatchAttr } from "./swiss";

export const N = 60; // regular sheets
export const REFUSED = [7, 19, 33, 46]; // the four refused (planimeter)
const DESK_EXACT = 60; // the pup's own sheet, closed and stamped at the tap
const DESK_NEAR = 61; // the near-miss under the flipper
export const COUNT = N + 2;
const BAD = 38; // 336 of 528, of 60
const GAP = 0.5; // rad: the two ends nearly meet
const FIG = 2.1; // the figure is drawn about 1.3 m across on the 1.7 m sheet

const rnd = (seed) => {
  let s = (Math.imul(seed + 1, 2654435761) >>> 1) % 2147483646 + 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
};
const sm = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const twos = (t) => Math.floor(t * 12) / 12;

// the hand-drawn outline: an irregular loop, r(theta), from GAP/2 round to 2 PI - GAP/2
const radius = (a) => 0.3 * (1 + 0.16 * Math.sin(3 * a + 1) + 0.09 * Math.sin(5 * a + 2));
const pt = (a) => [Math.cos(a) * radius(a), Math.sin(a) * radius(a) * 1.15];
function figureGeometry() {
  const pos = [];
  const n = 36;
  const w = 0.035;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const a = GAP / 2 + ((Math.PI * 2 - GAP) * i) / n;
    const [x, y] = pt(a);
    const [x2, y2] = pt(a + 0.01);
    const l = Math.hypot(x2 - x, y2 - y) || 1;
    const nx = (-(y2 - y) / l) * w;
    const ny = ((x2 - x) / l) * w;
    const cur = [x + nx, y + ny, x - nx, y - ny];
    if (prev) pos.push(prev[0], prev[1], 0, prev[2], prev[3], 0, cur[0], cur[1], 0, cur[0], cur[1], 0, prev[2], prev[3], 0, cur[2], cur[3], 0);
    prev = cur;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  return g;
}
function fillGeometry() {
  const pos = [];
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a0 = GAP / 2 + ((Math.PI * 2 - GAP) * i) / n;
    const a1 = GAP / 2 + ((Math.PI * 2 - GAP) * (i + 1)) / n;
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    pos.push(0, 0, 0, x0, y0, 0, x1, y1, 0);
  }
  // close the gap between the two ends
  const [ex, ey] = pt(GAP / 2);
  const [sx, sy] = pt(Math.PI * 2 - GAP / 2);
  pos.push(0, 0, 0, sx, sy, 0, ex, ey, 0);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  return g;
}
export const END_A = pt(GAP / 2);
export const END_B = pt(Math.PI * 2 - GAP / 2);

function printTexture() {
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 144;
  const g = c.getContext("2d");
  const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif";
  const draw = () => {
    g.clearRect(0, 0, c.width, c.height);
    g.strokeStyle = "#fff";
    g.fillStyle = "#fff";
    g.lineWidth = 14;
    g.strokeRect(10, 10, c.width - 20, c.height - 20);
    g.font = `800 96px ${fam}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("EXACT", c.width / 2, c.height / 2 + 6);
    t.needsUpdate = true;
  };
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  draw();
  document.fonts?.load?.(`800 96px ${fam}`).then(draw, () => {});
  return t;
}

export function makeSheets(look, plan) {
  const r = rnd(2026);
  const data = [];
  // landing spots: dart-thrown in regions of the campus, never in rows
  const regions = [
    [31, 1, 31, -11.4, 19.4], // the plaza (x0, x1 filled below)
    [8, 33, 47, -12, 4], // the avenue and its lawn
    [6, -7, -1, -12, 12], // the west lawn
    [4, 16, 28, -13.2, -12.4], // the steps
    [8, 43, 54, -48, -10], // the avenue round the east end
    [3, 29, 31, -9, 18], // plaza edge
  ];
  const spots = [];
  const near = (x, z, d) => spots.some(([a, b]) => Math.hypot(a - x, b - z) < d);
  // the refused four: a cluster of their own on the plaza, in the lens' view
  const CL = plan.cluster;
  for (let k = 0; k < 4; k++) spots.push([CL[0] + (k % 2) * 2.9 + (r() - 0.5) * 0.6, CL[1] + Math.floor(k / 2) * 3.2 + (r() - 0.5) * 0.6]);
  const quota = [26, 8, 6, 3, 8, 5];
  regions.forEach(([, a, b, z0, z1], ri) => {
    const x0 = ri === 0 ? 1.5 : a;
    const x1 = ri === 0 ? 30.5 : b;
    let made = 0;
    for (let tries = 0; made < quota[ri] && tries < 400; tries++) {
      const x = x0 + r() * (x1 - x0);
      const z = z0 + r() * (z1 - z0);
      if (near(x, z, 2.5)) continue;
      spots.push([x, z]);
      made++;
    }
  });
  // the refused sheets take the cluster's four spots; every other sheet takes the next free spot
  const chosen = new Array(N);
  let pick = 4;
  for (let i = 0; i < N; i++) {
    const k = REFUSED.indexOf(i);
    chosen[i] = k >= 0 ? spots[k] : spots[pick++ % spots.length];
  }
  // which turn coral under the guess: 38 of 60, scattered (a shuffle)
  const shuffled = Array.from({ length: N }, (_, i) => i).sort(() => r() - 0.5);
  const bad = new Set(shuffled.slice(0, BAD));
  for (let i = 0; i < N; i++) {
    const [lx, lz] = chosen[i];
    data.push({
      lx,
      lz,
      yaw: r() * Math.PI * 2,
      wx: 16.6 + r() * 7,
      wy: 7.5 + r() * 1.4,
      spawn: T.bell + r() * 0.8,
      dur: 1.5 + r() * 0.6,
      ph: r() * 6.28,
      bad: bad.has(i),
      refused: REFUSED.includes(i),
      order: r(),
    });
  }

  const paper = new InstancedMesh(new PlaneGeometry(1.7, 2.35), look.make({ grid: false, clear: false }), COUNT);
  const fig = new InstancedMesh(figureGeometry(), look.make({ grid: false, clear: false }), COUNT);
  const fill = new InstancedMesh(fillGeometry(), look.make({ grid: false, clear: false }), COUNT);
  const dots = new InstancedMesh(new PlaneGeometry(0.2, 0.2), look.make({ grid: false, clear: false }), 12);
  for (const m of [paper, fig, fill, dots]) {
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(DynamicDrawUsage);
  }
  const aPaper = swatchAttr(paper, COUNT, SW.CONCRETE);
  const aFig = swatchAttr(fig, COUNT, SW.SLATE);
  const aFill = swatchAttr(fill, COUNT, SW.PALEBLUE);
  swatchAttr(dots, 12, SW.AMBER);

  const tex = printTexture();
  const printMat = new ShaderMaterial({
    uniforms: { uMap: { value: tex }, uColor: { value: new Vector3(0.66, 0.13, 0.18) } },
    transparent: true,
    depthWrite: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform sampler2D uMap; uniform vec3 uColor; varying vec2 vUv; void main(){ float a = texture2D(uMap, vUv).a; if (a < 0.5) discard; gl_FragColor = vec4(uColor, 1.0); }",
  });
  const prints = new InstancedMesh(new PlaneGeometry(1.9, 0.72).rotateX(0), printMat, N + 1);
  prints.frustumCulled = false;
  prints.instanceMatrix.setUsage(DynamicDrawUsage);
  prints.renderOrder = 4;

  const O = new Object3D();
  const Q = new Quaternion();
  const V = new Vector3();
  const OFF = new Vector3();
  const hideAt = (mesh, i) => {
    O.position.set(0, -50, 0);
    O.scale.setScalar(0.0001);
    O.quaternion.identity();
    O.updateMatrix();
    mesh.setMatrixAt(i, O.matrix);
  };
  const dotState = new Float32Array(12);
  const WIND = new Vector3(0.82, 0, -0.38).normalize();
  const GROUND = 0.1;

  // closing instant of the exact ones: spread across the rain window
  const exactOrder = [];
  for (let i = 0; i < N; i++) if (!data[i].refused) exactOrder.push(i);
  exactOrder.sort((a, b) => data[a].order - data[b].order);
  exactOrder.forEach((i, k) => (data[i].closeT = T.rain[0] + ((T.rain[1] - T.rain[0]) * k) / exactOrder.length));

  const update = (t, k) => {
    const tt = twos(t);
    const sweepZ = k.sweepZ;
    let nd = 0;
    for (let i = 0; i < COUNT; i++) {
      let x;
      let y;
      let z;
      let yaw;
      let tx = 0;
      let tz = 0;
      let sc = 1;
      let ring = SW.SLATE;
      let fillOn = 0;
      let fillSw = SW.PALEBLUE;
      let vis = true;
      let print = 0; // 0 none, else the fall's state
      let printAt = 0;
      if (i < N) {
        const d = data[i];
        const u = (t - d.spawn) / d.dur;
        x = d.lx;
        z = d.lz;
        yaw = d.yaw;
        if (u < 0) vis = false;
        else if (u < 1) {
          // blown out of the window and drifting down: free, fluttering
          const e = u * u * (3 - 2 * u);
          x = d.wx + (d.lx - d.wx) * e + Math.sin(u * 9 + d.ph) * 1.3 * (1 - u);
          z = -14.6 + (d.lz + 14.6) * e + Math.sin(u * 7 + d.ph * 2) * 1.0 * (1 - u);
          y = d.wy * (1 - u * u) + 0.12 + 0.6 * Math.sin(u * 11 + d.ph) * (1 - u);
          tx = 0.9 * Math.sin(u * 10 + d.ph) * (1 - u);
          tz = 0.9 * Math.cos(u * 8 + d.ph) * (1 - u);
          yaw = d.yaw + u * 5;
          sc = 0.55 + 0.45 * Math.min(1, u * 4);
        } else {
          // landed: the corners lift in the wind
          tx = 0.05 * Math.sin(tt * 5 + d.ph);
          tz = 0.05 * Math.cos(tt * 4 + d.ph * 2);
        }
        if (y === undefined) y = GROUND + (Math.abs(tx) + Math.abs(tz)) * 0.9;

        if (vis) {
          // 1: the guess. Every sheet snaps shut at once, filled pale, nothing left blank, square to the grid
          const slam = T.slam + d.order * 0.28;
          const guessed = t >= slam && t < T.wind[0] + d.order * 0.5;
          if (guessed) {
            fillOn = 1;
            fillSw = SW.PALEBLUE;
            ring = SW.SLATE;
            yaw = Math.round(d.yaw / (Math.PI / 2)) * (Math.PI / 2);
            x = Math.round(d.lx * 2) / 2;
            z = Math.round(d.lz * 2) / 2;
            tx = tz = 0;
          }
          // 2: the check. The red line passes; wrong ones turn coral, crumple, and tumble away on the wind
          const hit = d.bad && t >= T.slam && sweepZ > d.lz && t < T.wind[1] + 0.6;
          if (hit && t < T.wind[0] + d.order * 0.5) {
            const pass = Math.max(0, (t - k.passAt(d.lz)) / 0.25);
            fillSw = SW.CORAL;
            ring = SW.CORAL;
            const crumple = sm(0, 1, pass);
            sc *= 1 - 0.42 * crumple;
            tx += 0.6 * crumple;
            tz += 0.5 * crumple;
            const away = Math.max(0, t - k.passAt(d.lz) - 0.95);
            if (away > 0) {
              const e = away;
              V.copy(WIND).multiplyScalar(e * 9 + e * e * 5);
              x += V.x;
              z += V.z;
              y += 1.2 * e * 6 * (1 - e * 0.45) * (e < 2.2 ? 1 : 0) + e * e * 2;
              yaw += e * 7;
              tx += e * 6;
              sc *= 1 - sm(0.8, 1.6, e);
              if (sc < 0.02) vis = false;
            }
          }
          // 3: the wind lifts the rest back to blank; the ones that tumbled blow back in
          const w = (t - T.wind[0] - d.order * 0.3) / 0.8;
          if (w > 0 && t < T.rain[0]) {
            const wu = Math.min(1, w);
            if (d.bad) {
              // blown back in from the east
              const e = 1 - sm(0, 1, wu);
              vis = wu >= 0.04;
              x = d.lx + 9 * e;
              z = d.lz - 4 * e;
              y = GROUND + 1.6 * e;
              yaw = d.yaw + 3 * e;
              tx = 0.8 * e;
            } else {
              const lift = Math.sin(Math.PI * Math.min(1, wu));
              y = GROUND + 1.8 * lift;
              tx = 0.7 * lift * Math.sin(tt * 6 + d.ph);
              tz = 0.7 * lift * Math.cos(tt * 5 + d.ph);
              yaw = d.yaw + 1.2 * lift;
            }
            fillOn = wu < 0.5 && !d.bad ? 1 : 0;
            fillSw = SW.PALEBLUE;
            ring = SW.SLATE;
            sc = 1;
            if (d.bad) {
              fillOn = 0;
              ring = SW.SLATE;
            }
          }
          // 4: exact, or refused
          if (t >= T.rain[0] - 0.01) {
            if (d.refused) {
              ring = SW.AMBER;
              fillOn = 0;
              sc = 1;
              if (t >= T.rain[0]) {
                const pulse = 0.55 + 0.45 * Math.sin(tt * 13);
                if (nd < 12) {
                  // the two ends of the open figure, pulsing
                  dotState[nd] = i;
                  dotState[nd + 1] = pulse;
                  nd += 2;
                }
              }
            } else if (t >= d.closeT) {
              fillOn = 1;
              fillSw = SW.AMBER;
              ring = SW.AMBER;
              yaw = Math.round(d.yaw / (Math.PI / 2)) * (Math.PI / 2);
              x = Math.round(d.lx * 2) / 2;
              z = Math.round(d.lz * 2) / 2;
              tx = tz = 0;
              y = GROUND;
              sc = 1;
              print = 1;
              printAt = t - d.closeT;
            } else {
              fillOn = 0;
            }
          }
        }
      } else if (i === DESK_EXACT) {
        // the pup's own sheet on its desk; at the tap it closes and takes a stamp, and Horikita lifts it
        x = plan.desk[0];
        y = plan.desk[1] + 0.06;
        z = plan.desk[2];
        yaw = 0.3;
        const lift = k.horikitaLift;
        if (t >= T.tap) {
          fillOn = 1;
          fillSw = SW.AMBER;
          ring = SW.AMBER;
          print = 1;
          printAt = t - T.tap;
        }
        if (lift > 0) {
          x += (plan.horikita[0] - 0.4 - x) * lift;
          y += 0.6 * lift;
          z += (plan.horikita[2] - 0.55 - z) * lift;
        }
        sc = 0.34;
      } else {
        // the near-miss: ends microns apart. Blank, then held open in amber at the HMM
        x = plan.desk[0] + 0.0;
        y = plan.desk[1] + 0.06;
        z = plan.desk[2] + 0.62;
        yaw = -0.2;
        sc = 0.34;
        if (t >= T.hmm) {
          ring = SW.AMBER;
          const pulse = 0.55 + 0.45 * Math.sin(tt * 13);
          if (nd < 12) {
            dotState[nd] = i;
            dotState[nd + 1] = pulse;
            nd += 2;
          }
        }
      }
      if (!vis) {
        for (const m of [paper, fig, fill]) hideAt(m, i);
        hideAt(prints, Math.min(i, N));
        continue;
      }
      O.position.set(x, y, z);
      O.rotation.set(-Math.PI / 2 + tx, yaw, tz, "YXZ");
      O.scale.setScalar(sc);
      O.updateMatrix();
      paper.setMatrixAt(i, O.matrix);
      Q.copy(O.quaternion);
      // the figure and its fill ride just above the paper, in the sheet's own plane
      OFF.set(0, 0, 0.012).applyQuaternion(Q).multiplyScalar(sc);
      O.position.set(x + OFF.x, y + OFF.y, z + OFF.z);
      O.scale.setScalar(sc * FIG);
      O.updateMatrix();
      fig.setMatrixAt(i, O.matrix);
      aFig.array[i] = ring;
      if (fillOn) {
        OFF.set(0, 0, 0.006).applyQuaternion(Q).multiplyScalar(sc);
        O.position.set(x + OFF.x, y + OFF.y, z + OFF.z);
        O.updateMatrix();
        fill.setMatrixAt(i, O.matrix);
        aFill.array[i] = fillSw;
      } else hideAt(fill, i);
      aPaper.array[i] = SW.CONCRETE;
      // the EXACT print: drops from above onto the sheet, a hard 2-frame hold, then lies on it
      const pi = Math.min(i, N);
      if (print && printAt >= 0) {
        const fall = Math.min(1, printAt / 0.34);
        const hold = printAt < 0.34 + 0.17 ? 1 : 0;
        const py = y + 0.05 + (1 - fall) * (1 - fall) * 5.5 + (hold ? 0.0 : 0);
        O.position.set(x, py, z);
        O.rotation.set(-Math.PI / 2, yaw + (i % 2 ? 0.2 : -0.18), 0, "YXZ");
        const pop = fall < 1 ? 0.8 + 0.2 * fall : 1 + 0.12 * Math.max(0, 1 - (printAt - 0.34) * 9);
        O.scale.setScalar(sc * (i === DESK_EXACT ? 0.34 : 1) * pop * 0.82);
        O.updateMatrix();
        prints.setMatrixAt(pi, O.matrix);
      } else hideAt(prints, pi);
    }
    // end dots of the refused (and the near-miss): pulse at both ends of the open figure
    for (let d = 0; d < 6; d++) {
      for (let e = 0; e < 2; e++) {
        const slot = d * 2 + e;
        if (d * 2 < nd) {
          const i = dotState[d * 2];
          const p = dotState[d * 2 + 1];
          paper.getMatrixAt(i, M1);
          M1.decompose(V, Q, SC);
          const end = e ? END_B : END_A;
          OFF.set(end[0] * FIG * SC.x, end[1] * FIG * SC.y, 0.02).applyQuaternion(Q);
          O.position.copy(V).add(OFF);
          O.quaternion.copy(Q);
          O.scale.setScalar((0.9 + 1.2 * p) * (i >= N ? 0.4 : 1));
          O.updateMatrix();
          dots.setMatrixAt(slot, O.matrix);
        } else hideAt(dots, slot);
      }
    }
    for (const m of [paper, fig, fill, dots, prints]) m.instanceMatrix.needsUpdate = true;
    aPaper.needsUpdate = aFig.needsUpdate = aFill.needsUpdate = true;
  };
  const M1 = new Matrix4();
  const SC = new Vector3();
  const objects = [paper, fig, fill, dots, prints];
  const dispose = () => {
    for (const m of objects) {
      m.geometry.dispose();
      m.material.dispose();
      m.dispose();
    }
    tex.dispose();
  };
  return { objects, update, dispose, data };
}
