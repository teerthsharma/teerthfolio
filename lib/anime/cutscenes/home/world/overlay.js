// The home set's translucent pieces, as components/world/cutscene/moves/home.jsx and _g1.jsx draw them: the golden Vinland strip, the
// eleven beacon flames, the smoke and steam, the orca's wake, the rings and the rain, and the cream motes. Premultiplied, on layer 1.
import { Color, Group, IcosahedronGeometry, Mesh, Object3D, OctahedronGeometry, PlaneGeometry, Vector3 } from "three";
import { WATER_Y, vinlandGeometry, vinlandMaterial } from "../live/land.js";
import { IGLOO, SMOKE_AT, beaconSpots, flameMaterial } from "../live/farm.js";
import { rainGeometry, rainMaterial, ringGeometry, ringMaterial } from "../live/beings.js";
import { hash, hide, inst, put } from "../live/parts.js";
import { merge, wash } from "../live/paper.js";
import { INTO, LINE, ON, T, lerp, orcaAt, run, smooth, within } from "../clock.js";

const NSMOKE = 5 * 6, NSTEAM = 8, NRING = 36, NRAIN = 240, NMOTE = 70;
const ORCA = { x: 0, y: -3, z: 0, yaw: 0, pitch: 0, vis: 0, surf: 0 };
const ORCA2 = { x: 0, y: -3, z: 0, yaw: 0, pitch: 0, vis: 0, surf: 0 };
const D = new Object3D(), V = new Vector3(), COL = new Color();

const fjord = (t) => t >= INTO - 0.04 && t < LINE.collapse[0];
const arm = (s) => new PlaneGeometry(0.34, 3.0, 1, 1).translate(0, -1.5, 0).rotateX(Math.PI / 2).rotateY(s * 0.42);

export function buildOverlay(ctx) {
  const root = new Group(), fj = new Group(), motes = new Group();
  root.userData.layer = 1;
  root.userData.plateDepth = true;
  root.add(fj, motes);

  const vinM = vinlandMaterial();
  const vin = new Mesh(vinlandGeometry(), vinM);
  vin.renderOrder = 6;
  vin.position.y = 0.4;
  vin.frustumCulled = false;

  const beacons = beaconSpots();
  const flames = inst(new PlaneGeometry(1, 3.2).translate(0, 1.4, 0), flameMaterial(), beacons.length);
  flames.renderOrder = 3;
  for (let i = 0; i < beacons.length; i++) hide(flames, i);

  const smokeM = wash({ vertexColors: false, transparent: true, depthWrite: false, paper: 0.8, edge: 0, rim: 0.2, albedo: "return vec3(0.84, 0.82, 0.86);", alpha: "vC.r * 0.6 * pow(max(dot(N, V), 0.0), 1.1)" });
  const smoke = inst(new IcosahedronGeometry(1, 1), smokeM, NSMOKE + NSTEAM);
  smoke.renderOrder = 3;
  for (let i = 0; i < NSMOKE + NSTEAM; i++) smoke.setColorAt(i, COL.setRGB(0, 0, 0));

  const wakeM = wash({ vertexColors: false, transparent: true, depthWrite: false, paper: 1, edge: 0, rim: 0, albedo: "return vec3(0.95, 0.96, 0.96);", alpha: "0.8 * vUv.y * smoothstep(0.0, 0.2, 1.0 - vUv.y)" });
  const wake = new Mesh(merge([arm(1), arm(-1)]), wakeM);
  wake.renderOrder = 3;
  wake.frustumCulled = false;

  const rings = inst(ringGeometry(), ringMaterial(), NRING);
  rings.renderOrder = 4;
  for (let i = 0; i < NRING; i++) {
    rings.setColorAt(i, COL.setRGB(0, 0, 0));
    hide(rings, i);
  }

  const rainU = { value: 0 };
  const rain = inst(rainGeometry(), rainMaterial(rainU), NRAIN);
  rain.renderOrder = 5;
  for (let i = 0; i < NRAIN; i++) put(rain, i, lerp(-16, 12, hash(i, 1)), 26, lerp(-14, 9, hash(i, 2)), 1);
  rain.instanceMatrix.needsUpdate = true;

  fj.add(vin, flames, smoke, wake, rings, rain);

  const moteM = wash({ vertexColors: false, transparent: true, depthWrite: false, paper: 0, edge: 0, rim: 0, haze: 0, albedo: "return vc;", alpha: "0.9" });
  const moteMesh = inst(new OctahedronGeometry(1, 0), moteM, NMOTE);
  for (let i = 0; i < NMOTE; i++) moteMesh.setColorAt(i, new Color(i % 2 ? "#ffe9cc" : "#fffaf2").convertLinearToSRGB());
  motes.add(moteMesh);

  const cam = () => ctx.player?.camera;

  function update(t) {
    const on = fjord(t);
    fj.visible = on;
    const k = 1 - Math.min(1, Math.max(0, (t - LINE.collapse[0]) / (LINE.collapse[1] - LINE.collapse[0])));
    for (let i = 0; i < NMOTE; i++) {
      const u = (hash(i) + (t * 0.05) / 16 + 100) % 1;
      const v = (hash(i, 1) + (t * 0.05) / 5 + 100) % 1;
      const w = (hash(i, 2) + 100) % 1;
      const x = -1 + (u - 0.5) * 16 + 0.3 * Math.sin(t * 1.3 + i);
      const y = 0.3 + v * 5;
      const z = -2 + (w - 0.5) * 10;
      const sz = 0.04 * (0.5 + hash(i, 3)) * k * Math.min(1, Math.min(v, 1 - v) * 6);
      D.position.set(x, y, z);
      D.rotation.set(0, 0, 0.3 * Math.sin(i));
      D.scale.setScalar(Math.max(sz, 0.0001));
      D.updateMatrix();
      moteMesh.setMatrixAt(i, D.matrix);
    }
    moteMesh.instanceMatrix.needsUpdate = true;
    if (!on) return;

    vinM.uniforms.uVin.value = smooth(LINE.B, LINE.B + 1.2, t);
    const bare = run(t) < 0.9;
    flames.visible = within(ON.flames, t) && bare;
    smoke.visible = within(ON.smoke, t) && bare;
    rings.visible = within(ON.ring, t) && bare;
    rain.visible = within(ON.rain, t) && bare;

    const c = cam();
    root.updateWorldMatrix(true, false);
    for (let i = 0; i < beacons.length; i++) {
      const [bx, by, bz] = beacons[i];
      const elapsed = t - (T.beacon + i * T.step);
      V.set(bx, by + 0.9, bz);
      const dist = c ? root.localToWorld(V.clone()).distanceTo(c.position) : Math.hypot(bx, bz);
      const size = elapsed > 0 ? (1 + 0.9 * Math.max(0, 1 - elapsed / 0.25)) * Math.min(1, elapsed / 0.12 + 0.2) * (0.5 + 0.045 * dist) : 0.0001;
      put(flames, i, bx, by + 0.9, bz, size);
    }
    flames.instanceMatrix.needsUpdate = true;

    for (let h = 0; h < SMOKE_AT.length; h++) {
      const [px, py, pz] = SMOKE_AT[h];
      for (let i = 0; i < 6; i++) {
        const life = (t * 0.17 + hash(h * 7 + i, 3) + h * 0.13) % 1;
        put(smoke, h * 6 + i, px + life * life * 3.2 + 0.25 * Math.sin(life * 7 + i), py + life * 3.6, pz + 0.2 * Math.cos(life * 5 + i * 2), 0.28 + 0.9 * life);
        smoke.instanceColor.setXYZ(h * 6 + i, Math.sin(life * Math.PI) * 0.6, 0, 0);
      }
    }
    for (let i = 0; i < NSTEAM; i++) {
      const life = (t * 0.2 + hash(i)) % 1;
      put(smoke, NSMOKE + i, IGLOO.x + 0.35 * Math.sin(life * 5 + i) + life * 1.2, 8.1 + life * 3.2, IGLOO.z + 0.2 * Math.cos(life * 4 + i), 0.35 + 0.8 * life);
      smoke.instanceColor.setXYZ(NSMOKE + i, Math.sin(life * Math.PI) * 0.55, 0, 0);
    }
    smoke.instanceMatrix.needsUpdate = true;
    smoke.instanceColor.needsUpdate = true;

    const o = orcaAt(t, ORCA);
    const wv = o.surf * (1 - smooth(T.circle[1], T.circle[1] + 0.3, t));
    wake.position.set(o.x + Math.sin(o.yaw) * 1.3, WATER_Y + 0.03, o.z + Math.cos(o.yaw) * 1.3);
    wake.rotation.set(0, o.yaw, 0);
    wake.scale.setScalar(Math.max(wv, 0.001));
    wake.visible = wv > 0.05 && within(ON.wake, t) && bare;

    rainU.value = t >= T.end ? 0 : smooth(T.rain[0], T.rain[1], t);
    let ri = 0;
    const tick = Math.floor(t / 0.42);
    for (let j = 0; j < 6; j++) {
      const born = (tick - j) * 0.42;
      const age = (t - born) / 2.4;
      const ob = orcaAt(born, ORCA2);
      const live = ob.vis > 0 && ob.y > -1.5 && born < T.circle[1] + 0.3 && age > 0 && age < 1 ? 1 : 0;
      put(rings, ri, ob.x, WATER_Y + 0.04, ob.z, live ? 0.35 + 1.9 * age : 0.0001);
      rings.instanceColor.setXYZ(ri, live * (1 - age) * 0.55, 0, 0);
      ri++;
    }
    for (let j = 0; j < 3; j++) {
      const age = (t - (T.bloop + 0.26 * j)) / 1.7;
      const live = age > 0 && age < 1;
      put(rings, ri, 3.55, WATER_Y + 0.05, 0.55, live ? 0.25 + 1.8 * age : 0.0001);
      rings.instanceColor.setXYZ(ri, live ? (1 - age) * 0.7 : 0, 0, 0);
      ri++;
    }
    for (let j = ri; j < NRING; j++) {
      const q = j - ri;
      const ph = (t * 0.9 + hash(q, 7)) % 1;
      const seed = q + 40 * Math.floor(t * 0.9 + hash(q, 7));
      const x = lerp(-4.5, 12, hash(seed, 1));
      const z = lerp(-6, 9, hash(seed, 2));
      const live = rainU.value > 0.02 && !(x < 2.0 && Math.abs(z) < 1.2) ? 1 : 0;
      put(rings, j, x, WATER_Y + 0.04, z, live ? 0.12 + 0.55 * ph : 0.0001);
      rings.instanceColor.setXYZ(j, live * (1 - ph) * 0.6 * rainU.value, 0, 0);
    }
    rings.instanceMatrix.needsUpdate = true;
    rings.instanceColor.needsUpdate = true;
  }

  function dispose() {
    root.traverse((x) => {
      x.geometry?.dispose();
      if (x.material) x.material.dispose();
    });
  }

  return { group: root, update, dispose };
}
