// The home set's opaque pieces, as components/world/cutscene/moves/home.jsx builds and animates them (buildWorld, useCutFrame).
// Frame: the pup at the origin, as the live rig is; the composer places the group at DOCK. Translucent pieces are in ./overlay.js.
import { Color, Group, IcosahedronGeometry, Mesh, Object3D, Quaternion, Vector2, Vector3 } from "three";
import { faceMesh } from "../../../../../components/world/cutscene/cel.js";
import { H, WATER_Y, floeGeometry, floeMaterial, landGeometry, landMaterial, skyShell, waterMaterial } from "../live/land.js";
import { IGLOO, SHIELD_COLS, SHIP, beaconSpots, cairnGeometry, houseGeometry, iglooGeometry, jettyGeometry, scopeGeometry, shieldGeometry, shieldSpots, shipGeometry } from "../live/farm.js";
import { gullBodyGeometry, gullWingGeometry, inkMaterial, orcaGeometry, penguinGeometry, thorsGeometry } from "../live/beings.js";
import { U, wash } from "../live/paper.js";
import { hash, hide, inst, put } from "../live/parts.js";
import { HIT, INTO, LINE, ON, OC, T, THORS_AT, lerp, onTwos, orcaAt, run, smooth, within } from "../clock.js";

const NFLOE = 26, NSHARD = 12, NPENG = 2, CORE_Y = 0.9, CATCH = 0.035, BLOOP_AT = [3.55, 0.55];
const ORCA = { x: 0, y: -3, z: 0, yaw: 0, pitch: 0, vis: 0, surf: 0 };
const V2 = new Vector2(), LOCAL = new Vector3();
const Dt = new Object3D(), QYaw = new Quaternion(), QTilt = new Quaternion(), AXIS = new Vector3(), UP = new Vector3(0, 1, 0);
const putTilted = (m, i, x, y, z, s, yaw, ax, az, tilt) => {
  QYaw.setFromAxisAngle(UP, yaw);
  QTilt.setFromAxisAngle(AXIS.set(ax, 0, az), tilt);
  Dt.position.set(x, y, z);
  Dt.quaternion.copy(QTilt).multiply(QYaw);
  Dt.scale.setScalar(s);
  Dt.updateMatrix();
  m.setMatrixAt(i, Dt.matrix);
};

const fjord = (t) => t >= INTO - 0.04 && t < LINE.collapse[0];
const jolt = (t, t0) => {
  const f = Math.floor((t - t0) * 12 + 1e-6);
  return f >= 0 && f < 6 ? Math.sin((Math.PI * (f + 0.5)) / 6) : 0;
};
const SHIELD_ALBEDO = "vec2 q = vUv - 0.5; float r = length(q) * 2.0; vec3 c = vc; c = mix(c, vec3(0.93, 0.88, 0.78), step(r, 0.2)); c = mix(c, c * 0.72, smoothstep(0.8, 0.96, r)); return c;";

export function buildSet(ctx) {
  const fj = new Group();
  const L = landGeometry(), shell = skyShell();
  const shellM = new Mesh(shell.g, shell.m);
  shellM.position.set(0, CORE_Y, 0);
  shellM.scale.setScalar(140);
  shellM.renderOrder = -3;
  shellM.frustumCulled = false;
  shell.m.uniforms.uInside.value = 1;
  shell.m.transparent = false;

  const landM = landMaterial(), waterM = waterMaterial();
  const land = new Mesh(L.land, landM), water = new Mesh(L.water, waterM);
  water.renderOrder = 1;
  land.frustumCulled = water.frustumCulled = false;

  const floeG = floeGeometry(), floeM = floeMaterial(), floes = inst(floeG, floeM, NFLOE + NSHARD);
  const floe = Array.from({ length: NFLOE }, (_, i) => {
    let x, z, tries = 0;
    do {
      x = lerp(-3.5, 12.5, hash(i + tries * 31, 1));
      z = lerp(-75, 9, hash(i + tries * 31, 2) ** 1.3);
      tries++;
    } while (tries < 8 && (Math.hypot(x - OC.cx, z - OC.cz) < 4.6 || (x < 2.8 && Math.abs(z) < 2.6)));
    return { x, z, s: (0.45 + 1.7 * hash(i, 3) ** 1.5) * (1 + -z * 0.012), ph: hash(i, 4) * 6.3, rot: hash(i, 5) * 6.3 };
  });
  const nearest = (score, n) => floe.map((f, i) => [score(f), i]).sort((a, b) => a[0] - b[0]).slice(0, n).map(([, i]) => i);
  const riseScore = (f) => Math.abs(Math.hypot((f.x - OC.cx) / OC.rx, (f.z - OC.cz) / OC.rz) - 1);
  const bloopScore = (f) => Math.hypot(f.x - BLOOP_AT[0], f.z - BLOOP_AT[1]);
  const riseIdx = new Set(nearest(riseScore, 3));
  const bloopIdx = new Set(nearest(bloopScore, 3));
  for (let i = 0; i < NFLOE + NSHARD; i++) hide(floes, i);
  const riseHit = orcaAt(HIT.rise, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vis: 0, surf: 0 });
  const cracks = [], crackOf = new Map();
  for (const [score, t0, px, pz] of [[riseScore, HIT.rise, riseHit.x, riseHit.z], [bloopScore, HIT.bloop, BLOOP_AT[0], BLOOP_AT[1]]]) {
    let taken = 0;
    for (const i of nearest(score, NFLOE)) {
      if (taken === NSHARD / 4 || crackOf.has(i)) continue;
      const f = floe[i], d = Math.hypot(f.x - px, f.z - pz), near = d > 1e-6;
      crackOf.set(i, cracks.length);
      cracks.push({ i, t0, dx: near ? (f.x - px) / d : 1, dz: near ? (f.z - pz) / d : 0 });
      taken++;
    }
  }

  const houses = new Mesh(houseGeometry(), wash({ paper: 0.5, edge: 0.34, rim: 0.4 }));
  const iglooM = wash({ paper: 0.85, edge: 0.3, rim: 0.45 });
  const igloo = new Group(), turret = new Group(), scope = new Mesh(scopeGeometry(), iglooM);
  igloo.position.set(IGLOO.x, H(IGLOO.x, IGLOO.z) - 0.05, IGLOO.z);
  igloo.rotation.set(0, IGLOO.ry, 0);
  igloo.scale.setScalar(IGLOO.s);
  turret.position.set(0, 4.55, 0);
  turret.add(scope);
  igloo.add(new Mesh(iglooGeometry(), iglooM), turret);

  const jetty = new Mesh(jettyGeometry(), wash({ paper: 0.3, edge: 0.3, rim: 0.4, flat: true }));

  const shipM = wash({ paper: 0.35, edge: 0.34, rim: 0.4 }), ship = new Group();
  ship.position.set(SHIP.x, H(SHIP.x, SHIP.z) + 0.05, SHIP.z);
  ship.rotation.set(0, SHIP.ry, -0.07);
  const shieldM = wash({ vertexColors: false, paper: 0.4, edge: 0.34, rim: 0.4, albedo: SHIELD_ALBEDO });
  const spots = shieldSpots(), shields = inst(shieldGeometry(), shieldM, spots.length);
  spots.forEach(([x, y, z], i) => {
    put(shields, i, x, y, z, 1);
    shields.setColorAt(i, new Color(SHIELD_COLS[i % 4]).convertLinearToSRGB());
  });
  ship.add(new Mesh(shipGeometry(), shipM), shields);

  const beacons = beaconSpots(), cairnM = wash({ paper: 0.4, edge: 0.3, rim: 0.4, flat: true });
  const cairns = new Mesh(cairnGeometry(beacons), cairnM);

  const orcaM = wash({ paper: 0.8, edge: 0.3, rim: 0.8 }), orcaGeo = orcaGeometry();
  const orcaG = new Group(), calf = new Group();
  calf.position.set(2.0, -0.45, -1.3);
  calf.rotation.set(0, -0.25, 0);
  calf.scale.setScalar(0.42);
  calf.add(new Mesh(orcaGeo, orcaM));
  orcaG.add(new Mesh(orcaGeo, orcaM), calf);
  const catchM = wash({ vertexColors: false, paper: 1, edge: 0, rim: 0, albedo: "return vec3(1.0, 0.976, 0.922);" });
  const catches = [1, -1].map((s) => {
    const m = new Mesh(new IcosahedronGeometry(CATCH, 1), catchM);
    m.position.set(s * 0.955, 0.13, 1.66);
    m.visible = false;
    orcaG.add(m);
    return m;
  });

  const th = thorsGeometry(), thorsBodyM = inkMaterial(false), thorsCloakM = inkMaterial(true);
  const thorsBody = new Mesh(th.body, thorsBodyM), thorsCloak = new Mesh(th.cloak, thorsCloakM);
  thorsBody.add(faceMesh({ eyes: { shape: "hooded", iris: "#3a5a8a", sclera: "#f2ead8" }, brow: { tilt: -0.12, color: "#3a2a1a", thick: 0.12 }, mouth: null }, [0, 2.1, 0.03], 0.32, 0.8));
  const thors = new Group();
  thors.position.set(THORS_AT[0], 0, THORS_AT[2]);
  thors.add(thorsBody, thorsCloak);

  const pengM = wash({ paper: 0.5, edge: 0.3, rim: 0.4 }), peng = inst(penguinGeometry(), pengM, NPENG);
  const gullM = wash({ paper: 0.9, edge: 0.3, rim: 0.4 }), gull = new Group(), gullBody = new Mesh(gullBodyGeometry(), gullM);
  const wingG = gullWingGeometry(), wingL = new Group(), wingR = new Group();
  const wl = new Group(), wr = new Group();
  wl.position.set(0, 0.04, 0.1);
  wl.add(wingL);
  wingL.add(new Mesh(wingG, gullM));
  wr.position.set(0, 0.04, -0.1);
  wr.scale.set(1, 1, -1);
  wr.add(wingR);
  wingR.add(new Mesh(wingG, gullM));
  gull.add(gullBody, wl, wr);

  fj.add(shellM, land, water, floes, houses, igloo, jetty, ship, cairns, orcaG, thors, peng, gull);

  const bearing = (j) => Math.atan2(beacons[j][0] - IGLOO.x, beacons[j][2] - IGLOO.z);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  function update(t) {
    U.uTime.value = t;
    U.uRun.value = smooth(T.run[0], T.run[1], t);
    const renderer = ctx.engine?.renderer;
    if (renderer) {
      renderer.getDrawingBufferSize(V2);
      U.uRes.value.copy(V2);
      U.uPx.value = renderer.getPixelRatio();
    }
    fj.visible = fjord(t);
    if (!fj.visible) return;
    const tt = onTwos(t);

    const o = orcaAt(t, ORCA);
    orcaG.visible = o.vis > 0 && o.y > -3.6;
    orcaG.position.set(o.x, o.y, o.z);
    orcaG.rotation.set(-o.pitch, o.yaw, 0.06 * Math.sin(t * 2.2), "YXZ");
    const catchOn = t >= 10.0 && t < 11.3;
    orcaG.updateWorldMatrix(true, false);
    const cam = ctx.player?.camera;
    const side = cam && catchOn && orcaG.worldToLocal(LOCAL.copy(cam.position)).x < 0 ? 1 : 0;
    catches.forEach((m, k) => {
      m.visible = catchOn && k === side;
    });

    const enter = smooth(LINE.enter, LINE.enter + 0.5, t);
    const ts = enter * (1 + 0.05 * Math.sin(Math.PI * enter));
    thors.visible = enter > 0.01 && run(t) < 0.97;
    thors.scale.set(ts, ts * (0.5 + 0.5 * enter), ts);
    thors.rotation.y = 0.9 + 0.02 * Math.sin(tt * 0.9);

    for (let i = 0; i < NFLOE; i++) {
      const f = floe[i];
      const k = crackOf.get(i);
      if (k !== undefined && tt >= cracks[k].t0) {
        hide(floes, i);
        continue;
      }
      const e = Math.max(riseIdx.has(i) ? jolt(t, T.rise[0]) : 0, bloopIdx.has(i) ? jolt(t, T.bloop) : 0);
      put(floes, i, f.x + 0.12 * Math.sin(t * 0.3 + f.ph), WATER_Y + 0.02 + 0.045 * Math.sin(t * 0.9 + f.ph) + 0.15 * e, f.z, f.s, f.s, f.s, 0.03 * Math.sin(t * 0.7 + f.ph) + 0.06 * e, f.rot + 0.03 * t, 0.03 * Math.cos(t * 0.8 + f.ph));
    }
    cracks.forEach((c, k) => {
      const f = floe[c.i], u = smooth(0, 1, (tt - c.t0) / 1.5);
      for (let s = 0; s < 2; s++) {
        const idx = NFLOE + 2 * k + s;
        if (tt < c.t0) {
          hide(floes, idx);
          continue;
        }
        const sg = s ? -1 : 1, off = (0.35 + 0.9 * u) * f.s;
        putTilted(floes, idx, f.x + sg * off * c.dx, WATER_Y + 0.02 + 0.045 * Math.sin(t * 0.9 + f.ph) + 0.18 * Math.sin(Math.PI * u), f.z + sg * off * c.dz, 0.62 * f.s, f.rot + 0.5 * sg, -c.dz, c.dx, 0.35 * sg * u);
      }
    });
    floes.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < NPENG; i++) {
      const u = (t - 2.4 - i * 0.95) / 6.8;
      const on = u > 0 && u < 1 ? 1.45 : 0.0001;
      const x = lerp(-5.4, 3.2, Math.min(1, Math.max(0, u)));
      const z = -3.75 - 0.35 * i;
      put(peng, i, x, H(x, z) + 0.03 + Math.abs(Math.sin(t * 8 + i)) * 0.03, z, on, on, on, 0, Math.PI / 2 - 0.2, 0.15 * Math.sin(t * 8 + i));
    }
    peng.instanceMatrix.needsUpdate = true;
    peng.visible = within(ON.peng, t);

    const idx = Math.min(beacons.length - 1, Math.max(0, Math.floor((t - T.beacon) / T.step)));
    const idle = 0.5 + 0.9 * Math.sin(t * 0.42);
    let az = idle;
    if (t > T.beacon - 0.5) {
      const from = idx > 0 ? bearing(idx - 1) : idle;
      const k = smooth(T.beacon + idx * T.step, T.beacon + idx * T.step + 0.16, t);
      az = from + wrap(bearing(idx) - from) * k;
      if (t < T.beacon) az = lerp(idle, az, smooth(T.beacon - 0.5, T.beacon, t));
    }
    turret.rotation.y = az - IGLOO.ry;
    scope.rotation.x = -0.36 - 0.1 * Math.sin(t * 0.8);

    const gu = smooth(T.gull, T.gull + 1.1, t);
    const cs = Math.cos(IGLOO.ry), sn = Math.sin(IGLOO.ry), fall = (1 - gu) * (1 - gu);
    const gl = [1.05, 3.84, 1.15];
    gull.position.set(IGLOO.x + (cs * gl[0] + sn * gl[2]) * IGLOO.s + 5 * fall, IGLOO.s * gl[1] + 0.3 + 4.5 * fall, IGLOO.z + (cs * gl[2] - sn * gl[0]) * IGLOO.s);
    gull.rotation.y = lerp(0.6, 1.3, gu);
    gull.scale.setScalar(IGLOO.s * 0.95);
    gull.visible = within(ON.gull, t);
    const flap = 0.2 + (1 - gu) * Math.sin(t * 18) * 0.9;
    wingL.rotation.set(-flap, -1.3 * gu, 0);
    wingR.rotation.set(-flap, -1.3 * gu, 0);
  }

  function dispose() {
    fj.traverse((x) => {
      x.geometry?.dispose();
      const list = Array.isArray(x.material) ? x.material : x.material ? [x.material] : [];
      for (const m of list) m.dispose();
    });
  }

  return { group: fj, parts: { landM, waterM, floeM, shell: shellM }, update, dispose };
}
