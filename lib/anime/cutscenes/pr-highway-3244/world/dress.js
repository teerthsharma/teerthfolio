// The island's life the return frames show: the pink railed pavilion, snowballs, pastel crates, two signposts with no words, the violet tower, contact shadows and flake motes. One merged set mesh and one motes mesh.
import { BoxGeometry, Color, CylinderGeometry, Group, InstancedMesh, Mesh, Object3D, PlaneGeometry, ShaderMaterial, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DOCK, TURN, W } from "../clock.js";
import { hash } from "../live/shade.js";
import { litMaterial, tint } from "./road.js";

const CRATES = [[-38, -12, 1.4, 1.1, "#ffd1e0"], [-40.5, -14.6, 1.0, 1.0, "#c9b8ff"], [-36.2, -10.2, 1.2, 0.9, "#b07a4a"], [-42, -18, 1.6, 1.3, "#ffd1e0"], [-19.8, -12.6, 1.1, 1.0, "#c9b8ff"], [-16.5, -16.4, 0.9, 0.9, "#b07a4a"], [-41.5, -22.5, 1.2, 1.2, "#c9b8ff"], [-18.6, -34.2, 1.3, 1.0, "#ffd1e0"],
  [-43.2, -26.0, 1.3, 1.1, "#c9b8ff"], [-41.6, -26.4, 0.9, 0.9, "#b07a4a"], [-37.0, -27.4, 1.5, 1.0, "#ffd1e0"], [-44.0, -20.6, 1.6, 1.3, "#b07a4a"], [-36.4, -19.4, 1.2, 0.9, "#c9b8ff"], [-38.8, -18.9, 0.9, 1.0, "#ffd1e0"]];
const BALLS = [[-33.5, -15.0, 0.6], [-35.2, -17.5, 0.45], [-22.5, -30.0, 0.8]];
// the two snowballs under the credit card: centres on the credit lens (rig frame), fitted to live pages 95 to 100
const EYE = [-2.446, 1.311, 7.263], FWD = [0.308, 0.061, -0.949], SIDE = [0.951, 0, 0.309];
const onLens = (a, c) => [0, 2].map((i) => EYE[i] + a * FWD[i] + c * SIDE[i]);
const RIG_BALLS = [[onLens(2.2, -0.86), 0.45], [onLens(2.4, -0.23), 0.5]];
const POSTS = [[-16.6, -25.5], [-38.5, -26.5]];
const PAV = [-37.5, -23.5];
const SHADOW = "#c4c0d8";
const MOTE_HEX = ["#8a5cff", "#4fd8e0"];
const MOTES = 60;
const FLAT_V = "varying vec3 vC; void main() { vC = instanceColor; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }";
const FLAT_F = "varying vec3 vC; void main() { gl_FragColor = vec4(vC, 0.99); }";

export default function buildIslandDress(ctx) {
  const group = new Group(), land = new Group(), made = [];
  group.rotation.y = -TURN;
  land.position.set(-DOCK[0], 0, -DOCK[2]);
  group.add(land);
  const parts = [], feet = [];
  const box = (x, y, z, w, h, d, hex) => parts.push(tint(new BoxGeometry(w, h, d).translate(x, y, z), hex));
  const ball = (x, z, r) => { parts.push(tint(new SphereGeometry(r, 16, 12).translate(x, r, z), "#f4f0f6")); feet.push([x, z, r, r]); };
  for (const [x, z, r] of BALLS) ball(x, z, r);
  for (const [x, z, w, d, hex] of CRATES) { const h = 0.8 + 0.5 * hash(x, z); box(x, h / 2, z, w, h, d, hex); feet.push([x, z, w / 2, d / 2]); }
  for (const [x, z] of POSTS) {
    parts.push(tint(new CylinderGeometry(0.08, 0.08, 2.4, 8).translate(x, 1.2, z), "#43434c"));
    parts.push(tint(new BoxGeometry(1.6, 0.4, 0.06).rotateY(0.4).translate(x, 2.1, z), "#ffc933"));
  }
  const [px, pz] = PAV;
  box(px, 0.45, pz, 5.2, 0.9, 4.2, "#d0aac8");
  box(px, 0.62, pz, 5.24, 0.14, 4.24, "#c532e8");
  for (const sx of [-2.3, 2.3]) for (const sz of [-1.8, 1.8]) box(px + sx, 2.2, pz + sz, 0.22, 3.4, 0.22, "#a948ac");
  box(px, 3.55, pz, 5.6, 0.3, 4.6, "#a35fa9");
  for (let i = 0; i < 8; i++) box(px - 2.3 + (i * 4.6) / 7, 1.35, pz + 2.1, 0.08, 0.9, 0.08, "#a948ac");
  box(-46.5, 3.5, -21.5, 2.4, 7, 2.4, "#7a3cff");
  feet.push([px, pz, 2.6, 2.1]);
  for (const [x, z, hx, hz] of feet) parts.push(tint(new PlaneGeometry(2 * hx * 1.3, 2 * hz * 1.3).rotateX(-Math.PI / 2).translate(x, 0.03, z), SHADOW));

  const set = new Mesh(mergeGeometries(parts, false), litMaterial({ gloss: 0.2 }));
  set.frustumCulled = false;
  land.add(set);
  made.push(set.geometry, set.material);

  const rig = [];
  for (const [[ax, az], r] of RIG_BALLS) {
    const [x, , z] = W([ax, 0, az]);
    rig.push(tint(new SphereGeometry(r, 16, 12).translate(x, r, z), "#f0e6e2"));
    rig.push(tint(new PlaneGeometry(2 * r * 1.3, 2 * r * 1.3).rotateX(-Math.PI / 2).translate(x, 0.03, z), SHADOW));
  }
  const balls = new Mesh(mergeGeometries(rig, false), litMaterial({ gloss: 0.2 }));
  balls.frustumCulled = false;
  land.add(balls);
  made.push(balls.geometry, balls.material);

  const motes = new InstancedMesh(new PlaneGeometry(0.22, 0.22), new ShaderMaterial({ vertexShader: FLAT_V, fragmentShader: FLAT_F, transparent: true, depthWrite: false }), MOTES);
  motes.frustumCulled = false;
  const O = new Object3D(), base = [];
  for (let i = 0; i < MOTES; i++) {
    base.push([-60 + 40 * hash(i, 1), 1 + 6 * hash(i, 2), -40 + 30 * hash(i, 3), 0.02 + 0.03 * hash(i, 4)]);
    motes.setColorAt(i, new Color(MOTE_HEX[i % 2]));
  }
  land.add(motes);
  made.push(motes.geometry, motes.material);

  const tier2 = () => (ctx?.atTier ? ctx.atTier(2) : true);
  return {
    group,
    update(tc) {
      group.visible = tc < 1.6 || tc >= 15.0;
      balls.visible = tc >= 1.6;
      motes.visible = (tc < 1.6 || tc > 15.2) && tier2();
      if (!motes.visible) return;
      base.forEach(([x, y0, z, sp], i) => {
        const y = 0.5 + ((y0 + sp * tc * 20) % 7.5);
        O.position.set(x, y, z);
        O.updateMatrix();
        motes.setMatrixAt(i, O.matrix);
      });
      motes.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const g of made) g.dispose();
    },
  };
}
