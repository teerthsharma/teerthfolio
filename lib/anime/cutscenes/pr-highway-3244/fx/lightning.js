// Lightning of pr-highway-3244: the live mint slice, trail and bolts in the track frame, and the 24 fps boost (ufoBolt on the war-cry forks, hwHoofCrawl on the hooves).
import { AdditiveBlending, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { loadPack } from "../../../tools/packs.js";
import { BETA, CAR_S, heroState, swordTip } from "../race.js";
import { C, DOCK, TURN, W, rotY, smooth, warp } from "../clock.js";
import { CH_R, CH_WX, CH_WZ, HOOVES } from "../live/car.js";
import { PASS, RIVALS, START, T, heroDist, heroSpeed, heroZ, rivalX, rivalZ } from "../live/path.js";
import { ribbons } from "../live/fx.js";
import { hash } from "../live/shade.js";

await loadPack("ufotable");
await loadPack("cuts");
const BOLT = glslFor(["ufoBolt", "hwHoofCrawl"]);
const VS = "void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }";
const FS = /* glsl */ `
  uniform vec2 uRes; uniform float uTb; uniform float uBoltA; uniform float uHoofA; uniform float uHoofOn; uniform float uCrawl;
  uniform vec4 uBA[3]; uniform vec4 uBB[3]; uniform vec2 uHoof[8];
  ${BOLT}
  void main() {
    vec2 P = hwU(gl_FragCoord.xy / uRes);
    vec3 col = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      if (uBA[i].z < 0.5) continue;
      vec4 b = ufoBolt(P, uBA[i].xy, uBB[i].xy, uTb);
      col += pow(mix(vec3(0.2196, 0.6275, 1.0), vec3(1.0), smoothstep(0.55, 0.95, dot(b.rgb, vec3(0.333)))), vec3(2.2)) * b.a * uBoltA;
    }
    if (uHoofOn > 0.5) {
      float s = hwFr(uTb, 12.0) * 5.17 + uHwSeed * 0.01;
      for (int k = 0; k < 8; k++) {
        vec2 site = hwU(uHoof[k]);
        if (length(P - site) > 0.22) continue;
        float d = 1e3;
        for (int j = 0; j < 4; j++) {
          float fj = float(j);
          vec2 a = hwU(uHoof[k] + vec2(fj * 0.045 + floor(fj * 0.5) * 0.03, 0.0));
          float len = mix(0.05, 0.12, cH21(vec2(fj, s + float(k))));
          vec2 dv = mix(vec2(0.0, -1.0), vec2(mod(fj, 2.0) * 2.0 - 1.0, -0.12), uCrawl);
          d = min(d, hwBoltD(P, a, a + normalize(dv) * len, s + fj * 2.3, 0.35));
        }
        col += hwBoltPaint(vec3(0.0), d, 0.7) * uHoofA;
      }
    }
    gl_FragColor = vec4(col, 0.0);
  }`;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const NR = RIVALS.length;
const raceAt = (t) => {
  const v = heroSpeed(t), vz = (heroZ(t + 0.03) - heroZ(t - 0.03)) / 0.06;
  return { lx: START[0] - heroDist(t), lz: heroZ(t), d: v > 1 ? clamp(2.8 * Math.atan2(vz, v + 4), -0.85, 0.85) : 0 };
};

export default function buildLightning(ctx) {
  const group = new Group(), track = new Group(), V = new Vector3();
  track.rotation.y = BETA;
  const clean = ribbons(80, "#5dffc2", { additive: true });
  const trail = ribbons(40, "#8fd8ff", { additive: true });
  const bolts = ribbons(200, "#38a0ff", { additive: true });
  track.add(clean.mesh, trail.mesh, bolts.mesh);
  const res = ctx.engine?.shared?.uRes ?? { value: new Vector2(1280, 720) };
  const uniforms = {
    ...uniformsFor(["ufoBolt", "hwHoofCrawl"]), uRes: res, uHwAsp: { value: 1.78 }, uTb: { value: 0 }, uBoltA: { value: 0 }, uHoofA: { value: 1 }, uHoofOn: { value: 0 }, uCrawl: { value: 0 },
    uBA: { value: Array.from({ length: 3 }, () => new Vector4()) }, uBB: { value: Array.from({ length: 3 }, () => new Vector4()) }, uHoof: { value: Array.from({ length: 8 }, () => new Vector2()) },
  };
  const boost = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: FS, transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending, premultipliedAlpha: true }));
  boost.frustumCulled = false;
  boost.renderOrder = 5;
  boost.visible = false;
  group.add(track, boost);

  let h = null, cam = null;
  const toRig = (p) => { const r = rotY(BETA, p); return [r[0] + h.trackX, r[1] + h.trackY, r[2] + h.trackZ]; };
  const toTrack = (p) => { const r = rotY(-BETA, [p[0] - h.trackX, p[1] - h.trackY, p[2] - h.trackZ]); return r; };
  const screen = (p) => { const w = W(toRig(p)); V.set(w[0], w[1], w[2]).project(cam); return [V.x * 0.5 + 0.5, V.y * 0.5 + 0.5]; };

  return {
    group,
    update(tc, camera) {
      cam = camera;
      h = heroState(tc);
      const t = warp(tc), back = t >= T.swap, H = raceAt(t), A = cam.aspect;
      track.position.set(h.trackX, h.trackY, h.trackZ);
      const cr = rotY(-TURN, [cam.position.x - DOCK[0], cam.position.y - DOCK[1], cam.position.z - DOCK[2]]);
      const ct = rotY(-BETA, [cr[0] - h.trackX, cr[1] - h.trackY, cr[2] - h.trackZ]);
      const sg = (rb, ax, ay, az, bx, by, bz, w, a) => rb.seg(ax, ay, az, bx, by, bz, w, a, ct[0], ct[1], ct[2]);

      clean.begin();
      const sliceK = smooth(T.go - 0.9, T.go - 0.4, t) * (1 - smooth(T.cover[0] - 0.12, T.cover[0], t)) * (back ? 0 : 1);
      if (sliceK > 0.01) {
        const x0 = H.lx - 2.2, x1 = H.lx - 15, za = H.lz - 1.7, zb = H.lz + 1.7;
        sg(clean, x0, 0.08, za, x1, 0.08, za, 0.22, 0.9 * sliceK);
        sg(clean, x0, 0.08, zb, x1, 0.08, zb, 0.22, 0.9 * sliceK);
        sg(clean, x1, 0.08, za, x1, 0.08, zb, 0.22, 0.9 * sliceK);
        sg(clean, x0, 0.08, za, x0, 0.08, zb, 0.22, 0.9 * sliceK);
        let ahead = -1, gap0 = 1e9;
        for (let i = 0; i < NR; i++) {
          const g = H.lx - rivalX(i, t);
          if (g > 1.6 && Math.abs(rivalZ(i, t) - H.lz) < 5.5 && g < gap0) { gap0 = g; ahead = i; }
        }
        const nx = H.lx - 2.1 * Math.cos(H.d) * CAR_S, nz = H.lz + 2.1 * Math.sin(H.d) * CAR_S;
        const tx = ahead >= 0 ? rivalX(ahead, t) + 0.6 : H.lx - 15, ty = ahead >= 0 ? 1.55 : 0.8, tz = ahead >= 0 ? rivalZ(ahead, t) : H.lz;
        let px = nx, py = 0.62, pz = nz;
        for (let k = 1; k <= 10; k++) {
          const u = k / 10, qx = nx + (tx - nx) * u, qy = 0.62 + (ty - 0.62) * u + 0.05 * Math.sin(u * 20 - t * 18), qz = nz + (tz - nz) * u;
          sg(clean, px, py, pz, qx, qy, qz, 0.32 * (1 + 0.15 * Math.sin(t * 22)), sliceK);
          px = qx; py = qy; pz = qz;
        }
      }
      clean.end();

      trail.begin();
      const trK = back ? 0 : smooth(T.kachow - 1.0, T.kachow - 0.5, t) * (1 - smooth(T.kachow + 0.5, T.kachow + 1.0, t));
      if (trK > 0.01) {
        let px = H.lx + 1.9 * CAR_S, pz = H.lz;
        for (let k = 1; k <= 14; k++) {
          const R = raceAt(t - 0.035 * k), qx = R.lx + 1.9 * CAR_S;
          sg(trail, px, 0.5, pz, qx, 0.5, R.lz, 0.34 * (1 - k / 15), trK * (1 - k / 15));
          px = qx; pz = R.lz;
        }
      }
      trail.end();

      bolts.begin();
      const live = t > 1.5 && t < T.leave + 1.1 && !back;
      const cs = Math.cos(H.d), sn = Math.sin(H.d), fk = Math.floor(t * 24);
      const loc = (lx, ly, lz) => [H.lx - (lx * cs + lz * sn) * CAR_S, ly * CAR_S + 0.02, H.lz - (-lx * sn + lz * cs) * CAR_S];
      const ck = t - T.cry, inCry = ck > -0.1 && ck < 0.9, a0 = inCry ? Math.min(1, (ck + 0.1) / 0.1) * (1 - Math.max(0, ck - 0.4) / 0.5) : 0;
      const pairs = [];
      if (live) {
        const cryK = Math.exp(-(((t - T.cry) / 0.45) ** 2));
        const boostK = 0.75 + 0.25 * smooth(T.go - 0.2, T.go + 0.4, t) + 0.8 * cryK + 0.5 * Math.exp(-(((t - T.kachow) / 0.5) ** 2));
        const fork = (p, top, n, w, seed) => {
          let [px, py, pz] = p;
          for (let k = 1; k <= n; k++) {
            const u = k / n;
            const qx = p[0] + (top[0] - p[0]) * u + (k < n ? (hash(fk + k, seed) - 0.5) * 1.6 : 0);
            const qy = p[1] + (top[1] - p[1]) * u;
            const qz = p[2] + (top[2] - p[2]) * u + (k < n ? (hash(fk + k, seed + 1) - 0.5) * 1.6 : 0);
            sg(bolts, px, py, pz, qx, qy, qz, w, a0);
            px = qx; py = qy; pz = qz;
          }
        };
        if (inCry) {
          const tr = swordTip(tc);
          const tip = toTrack(tr);
          const sky = [tip[0] - 3, tip[1] + 22, tip[2] - 2];
          fork(tip, sky, 9, 0.32, 31);
          pairs.push([tip, sky]);
          for (const b of [-1, 1]) {
            const hb = loc(1.95, 1.6, 0.62 * b), top = [hb[0] + 2 * b, hb[1] + 24, hb[2] - 3];
            fork(top, hb, 9, 0.28, 41 + b);
            pairs.push([top, hb]);
          }
        }
        const pts = [...HOOVES, [CH_WX, CH_R, CH_WZ + 0.55], [CH_WX, CH_R, -CH_WZ - 0.55], [CH_WX, CH_R, CH_WZ], [CH_WX, CH_R, -CH_WZ]];
        for (let i = 0; i < NR; i++) {
          const fl = PASS[i] > 0 ? t - PASS[i] : -1;
          if (fl < 0 || fl > 0.45) continue;
          const bx = rivalX(i, PASS[i]), bz = rivalZ(i, PASS[i]);
          for (let k = 0; k < 5; k++) {
            const a = hash(fk + i * 5 + k, 21) * 6.28, rr = 1 + 2.4 * fl * (0.5 + hash(fk + k, 22));
            sg(bolts, bx, 0.6, bz, bx + Math.cos(a) * rr, 0.6 + 1.2 * hash(fk + k, 23), bz + Math.sin(a) * rr, 0.09, 1 - fl / 0.45);
          }
        }
        pts.forEach((o, i) => {
          let [px, py, pz] = loc(o[0], o[1], o[2]);
          const reach = i < 4 ? 0.7 : 1.1, dx = (hash(fk + i * 7, 11) - 0.5) * 2, dz = (hash(fk + i * 7, 12) - 0.5) * 2;
          for (let k = 1; k <= 3; k++) {
            const qx = px + (dx * 0.5 + (hash(fk + i * 7 + k, 13) - 0.5) * 0.8) * reach * CAR_S;
            const qy = py + (0.15 + 0.35 * hash(fk + i * 7 + k, 14)) * reach * CAR_S;
            const qz = pz + (dz * 0.5 + (hash(fk + i * 7 + k, 15) - 0.5) * 0.8) * reach * CAR_S;
            sg(bolts, px, py, pz, qx, qy, qz, 0.05 * CAR_S * 1.4, Math.min(1, boostK * (1 - (k - 1) * 0.22)));
            px = qx; py = qy; pz = qz;
          }
        });
      }
      bolts.end();

      const hoofOn = tc >= C.go && tc <= C.go + 0.626 && live;
      const bolting = inCry && live;
      boost.visible = (ctx.atTier?.(2) ?? true) && (bolting || hoofOn);
      uniforms.uTb.value = tc;
      uniforms.uHwAsp.value = A;
      uniforms.uBoltA.value = a0;
      uniforms.uHoofOn.value = hoofOn ? 1 : 0;
      uniforms.uCrawl.value = smooth(C.go, C.go + 0.6, tc);
      for (let i = 0; i < 3; i++) {
        const on = bolting && i < pairs.length;
        uniforms.uBA.value[i].set(0, 0, on ? 1 : 0, 0);
        uniforms.uBB.value[i].set(0, 0, 0, 0);
        if (on) {
          const a = screen(pairs[i][0]), b = screen(pairs[i][1]);
          uniforms.uBA.value[i].set(a[0] * A, a[1], 1, 0);
          uniforms.uBB.value[i].set(b[0] * A, b[1], 0, 0);
        }
      }
      if (hoofOn) HOOVES.forEach((o, k) => { const s = screen(loc(o[0], o[1], o[2])); uniforms.uHoof.value[k].set(s[0], s[1]); });
    },
    dispose() {
      for (const r of [clean, trail, bolts]) { r.geometry.dispose(); r.material.dispose(); }
      boost.geometry.dispose();
      boost.material.dispose();
    },
  };
}
