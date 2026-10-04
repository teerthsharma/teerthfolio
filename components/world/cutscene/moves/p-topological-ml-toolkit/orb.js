// THE TRICK, AND THE WAY HOME. The pup seizes the wind's vectors: ribbons of
// air (each with a small arrow) spiral in on a point over its head and
// compress into a white-hot plasma orb. The orb resolves into a soap-bubble
// round a neat grid of glowing feature vectors (a vector field with a loop in
// it: the shape of the data, made ordinary). The pup lets it go upward; it
// pops like a soap bubble in film shards and two shock rings, and that is what
// folds the city shut (the move does the folding). All closed forms of the
// clock; instanced pools; nothing allocates per frame.

import { AdditiveBlending, BackSide, BoxGeometry, CircleGeometry, Color, DoubleSide, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, RingGeometry, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { smooth } from "../../kit";
import { hash } from "./city";
import { INK, NOISE } from "./shade";
import { ORB_AT, ORB_R, POP_AT, T } from "./timing";

export const WIND_N = 72;
export const GRID_AT = 56; // the grid's first arrow in the pool
const WIND_ARROWS = 14;
const WIND_AT = 40;
const SHARDS = 56;
const SP = 0.3; // grid spacing (m)
const GRID_R = 1.38;

const M = new Matrix4();
const O = new Object3D();
const X = new Vector3();
const Y = new Vector3();
const Zv = new Vector3();
const Y2 = new Vector3();
const P = new Vector3();
const P2 = new Vector3();
const C = new Vector3();

// where wind ribbon i is at phase u (0 far, 1 in the orb), into out
function windAt(i, u, out) {
  const r0 = 4 + 9 * hash(i, 1);
  const th0 = hash(i, 2) * Math.PI * 2;
  const z0 = ORB_AT[2] + (hash(i, 3) - 0.5) * 10;
  const k = 1 - u;
  const r = 0.55 + r0 * k * k * (0.4 + 0.6 * k);
  const a = th0 + u * (2.6 + 1.6 * hash(i, 4));
  out.set(ORB_AT[0] + Math.cos(a) * r, Math.max(0.25, ORB_AT[1] + Math.sin(a) * r * 0.85), ORB_AT[2] + (z0 - ORB_AT[2]) * k);
  return out;
}

export function createOrb(arrows) {
  const group = new Group();

  // ---- the wind: ribbons, white cored with a blue edge
  const ribbonMat = new ShaderMaterial({
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        float c = abs(vUv.x * 2.0 - 1.0);
        vec3 col = mix(vec3(0.97, 0.99, 1.0), vec3(0.16, 0.38, 0.9), smoothstep(0.38, 0.72, c));
        float a = (1.0 - smoothstep(0.88, 1.0, c)) * smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y) * 0.6);
        gl_FragColor = vec4(pow(col, vec3(2.2)), a);
      }`,
  });
  const ribbonG = new PlaneGeometry(0.1, 1).translate(0, 0.5, 0);
  const ribbons = new InstancedMesh(ribbonG, ribbonMat, WIND_N);
  ribbons.frustumCulled = false;
  ribbons.renderOrder = 4;
  group.add(ribbons);

  // ---- the orb: plasma, then soap film; an ink hull; a glow
  const orbG = new IcosahedronGeometry(1, 4);
  const orbMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMode: { value: 0 }, uFlash: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vO;
      void main() {
        vO = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * position);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uMode, uFlash;
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vO;
      ${NOISE}
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        float f = 1.0 - max(dot(n, v), 0.0);
        // plasma: a white core, a cyan body, a blue rim, hot veins crawling on the rim
        float s1 = fbm(vO.xy * 2.4 + vec2(uTime * 0.9, -uTime * 0.6) + fbm(vO.yz * 3.0 - uTime) * 1.3);
        float veins = 1.0 - smoothstep(0.0, 0.06, abs(s1 - 0.5));
        vec3 pl = mix(vec3(1.0), vec3(0.5, 0.86, 1.0), smoothstep(0.1, 0.7, f));
        pl = mix(pl, vec3(0.16, 0.42, 1.0), smoothstep(0.6, 0.97, f));
        pl += veins * vec3(0.9, 0.96, 1.0) * smoothstep(0.15, 0.7, f) * 0.9;
        pl = floor(pl * 6.0 + 0.5) / 6.0 * 0.5 + pl * 0.5; // a little posterising: cel bands in the plasma
        pl += uFlash;
        // soap film: thin-film colours drifting over a clear body, a bright rim, a window reflection
        float th = f * 1.5 + fbm(vO.xy * 1.2 + uTime * 0.18) * 0.9;
        vec3 film = 0.62 + 0.38 * cos(6.2831853 * (vec3(0.0, 0.33, 0.67) + th));
        film = mix(film, vec3(0.88, 0.95, 1.0), 0.25);
        float spec = smoothstep(0.93, 0.96, dot(n, normalize(vec3(-0.5, 0.6, 0.62))));
        float fa = 0.12 + 0.55 * pow(f, 2.3) + spec * 0.8;
        vec3 sc = mix(film, vec3(1.0), spec);
        vec3 col = mix(pl, sc, uMode);
        float alpha = mix(1.0, fa, uMode);
        gl_FragColor = vec4(pow(clamp(col, 0.0, 1.5), vec3(2.2)), alpha);
      }`,
  });
  const orb = new Mesh(orbG, orbMat);
  orb.renderOrder = 7;
  orb.frustumCulled = false;
  const hullMat = new MeshBasicMaterial({ color: INK, toneMapped: false, fog: false, side: BackSide, transparent: true });
  const hull = new Mesh(orbG, hullMat);
  hull.renderOrder = 6;
  hull.frustumCulled = false;
  const glowMat = new ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * position);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uK;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        float f = max(dot(normalize(vN), normalize(cameraPosition - vW)), 0.0);
        float g = pow(f, 3.0);
        gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * g * uK, 1.0);
      }`,
  });
  const glow = new Mesh(orbG, glowMat);
  glow.renderOrder = 3;
  glow.frustumCulled = false;
  group.add(glow, hull, orb);

  // ---- the lattice inside the bubble: thin bars, clipped to the circle
  const lat = [];
  for (let k = -5; k <= 5; k++) {
    const x = k * SP;
    const h = Math.sqrt(Math.max(0.0001, GRID_R * GRID_R - x * x));
    lat.push(new BoxGeometry(0.016, h * 2, 0.012).translate(x, 0, -0.04));
    lat.push(new BoxGeometry(h * 2, 0.016, 0.012).translate(0, x, -0.04));
  }
  const latG = mergeGeometries(lat);
  const latMat = new MeshBasicMaterial({ color: "#d7ecff", toneMapped: false, fog: false });
  const lattice = new Mesh(latG, latMat);
  lattice.frustumCulled = false;
  lattice.renderOrder = 5;
  group.add(lattice);
  // the grid's cells: those inside the circle, each a feature vector (a flow round a loop, drifting right)
  const cells = [];
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) if (Math.hypot(i * SP, j * SP) < GRID_R - 0.1) cells.push([i * SP, j * SP]);
  const cellData = cells.map(([x, y], n) => {
    const r = Math.hypot(x, y);
    const a = Math.atan2(y, x) + Math.PI / 2; // circulation round the centre
    const d = new Vector3(Math.cos(a) * Math.min(1, r * 1.4) + 0.35, Math.sin(a) * Math.min(1, r * 1.4), 0).normalize();
    return { x, y, d, len: 0.17 + 0.1 * (0.5 + 0.5 * Math.sin(r * 4.2 + n)), at: T.grid + r * 0.2 + hash(n, 1) * 0.1 };
  });

  // ---- the pop: film shards and two shock rings
  const shardG = new CircleGeometry(1, 3);
  const shardMat = new MeshBasicMaterial({ color: "#ffffff", toneMapped: false, fog: false, side: DoubleSide, transparent: true, opacity: 0.85 });
  const shards = new InstancedMesh(shardG, shardMat, SHARDS);
  shards.frustumCulled = false;
  shards.renderOrder = 8;
  const hues = [new Color("#a8f0ff"), new Color("#ffb3f0"), new Color("#fff2a8"), new Color("#b9c8ff")];
  const sd = new Float32Array(SHARDS * 5);
  for (let i = 0; i < SHARDS; i++) {
    shards.setColorAt(i, hues[i % hues.length]);
    X.set(hash(i, 41) - 0.5, hash(i, 42) - 0.5, hash(i, 43) - 0.5).normalize();
    sd.set([X.x, X.y, X.z, 3 + 6 * hash(i, 44), 0.18 + 0.3 * hash(i, 45)], i * 5);
  }
  group.add(shards);
  const ringW = new Mesh(new RingGeometry(0.9, 1.0, 64), new MeshBasicMaterial({ color: "#f6fbff", toneMapped: false, fog: false, side: DoubleSide }));
  const ringI = new Mesh(new RingGeometry(1.0, 1.1, 64), new MeshBasicMaterial({ color: INK, toneMapped: false, fog: false, side: DoubleSide }));
  const ring2W = new Mesh(ringW.geometry, ringW.material);
  const ring2I = new Mesh(ringI.geometry, ringI.material);
  for (const r of [ringW, ringI, ring2W, ring2I]) {
    r.frustumCulled = false;
    r.renderOrder = 9;
    r.visible = false;
    group.add(r);
  }

  const center = new Vector3();
  // the bubble's centre and radius at time t, written into center; returns the radius (0: not there)
  const bubble = (t) => {
    if (t < T.orb[0] || t >= T.pop) return 0;
    const grow = smooth(T.orb[0], T.orb[1], t);
    const swell = 1 + 0.12 * smooth(T.resolve[0], T.resolve[1], t) + 0.2 * smooth(T.release, T.pop, t);
    const pulse = 1 + 0.035 * Math.sin(t * 13) * (1 - smooth(T.resolve[0], T.resolve[1], t));
    const wob = t > T.resolve[0] ? 0.03 * Math.sin(t * 7) : 0;
    const rise = smooth(T.release, T.pop, t);
    center.set(ORB_AT[0] + (POP_AT[0] - ORB_AT[0]) * rise + wob * 2, ORB_AT[1] + (POP_AT[1] - ORB_AT[1]) * rise + (t > T.resolve[0] ? 0.05 * Math.sin(t * 3.1) : 0), ORB_AT[2]);
    return ORB_R * (0.04 + 0.96 * (1 - (1 - grow) * (1 - grow))) * swell * pulse;
  };

  return {
    group,
    bubble,
    center,
    update(t, cam, camQ) {
      const r = bubble(t);
      const k = smooth(T.resolve[0], T.resolve[1], t);
      // the orb
      const show = r > 0.001;
      orb.visible = hull.visible = glow.visible = show;
      if (show) {
        orb.position.copy(center);
        orb.scale.setScalar(r);
        hull.position.copy(center);
        hull.scale.setScalar(r * 1.075);
        glow.position.copy(center);
        glow.scale.setScalar(r * 1.38);
        orbMat.uniforms.uTime.value = t;
        orbMat.uniforms.uMode.value = k;
        orbMat.uniforms.uFlash.value = 0.5 * Math.max(0, 1 - Math.abs(t - T.resolve[0] - 0.05) / 0.12);
        hullMat.opacity = 1 - 0.8 * k;
        glowMat.uniforms.uK.value = (1 - k) * (0.9 + 0.3 * Math.sin(t * 17));
      }
      // the wind: each ribbon runs in on its spiral and loops while the window is open
      const wgate = smooth(T.wind[0], T.wind[0] + 0.4, t) * (1 - smooth(T.wind[1] - 0.5, T.wind[1], t));
      for (let i = 0; i < WIND_N; i++) {
        const u = (hash(i, 5) + (t - T.wind[0]) * (0.34 + 0.2 * hash(i, 6))) % 1;
        const fade = wgate * smooth(0.0, 0.12, u) * (1 - smooth(0.9, 1.0, u));
        windAt(i, u, P);
        windAt(i, Math.min(1, u + 0.03), P2);
        const vis = fade > 0.01 && show;
        if (!vis) {
          O.position.set(0, -90, 0);
          O.scale.setScalar(0.0001);
          O.quaternion.identity();
          O.updateMatrix();
          ribbons.setMatrixAt(i, O.matrix);
          if (i < WIND_ARROWS) arrows.hide(WIND_AT + i);
          continue;
        }
        // the flow runs in toward the orb's current centre
        Y.subVectors(P2, P).normalize();
        Zv.subVectors(cam, P);
        X.crossVectors(Y, Zv).normalize();
        Zv.crossVectors(X, Y).normalize();
        const len = (1.4 + 3.2 * (1 - u)) * fade;
        M.makeBasis(X, Y2.copy(Y).multiplyScalar(len), Zv);
        M.setPosition(P);
        ribbons.setMatrixAt(i, M);
        if (i < WIND_ARROWS) arrows.set(WIND_AT + i, P.x, P.y, P.z, Y.x, Y.y, Y.z, 1.1 * fade, 0.045 * fade);
      }
      ribbons.instanceMatrix.needsUpdate = true;
      // the grid of feature vectors, riding the bubble
      const gridOn = t >= T.grid && t < T.pop && show;
      lattice.visible = gridOn;
      if (gridOn) {
        lattice.position.copy(center);
        lattice.quaternion.copy(camQ);
        const s = r / ORB_R;
        lattice.scale.setScalar(s);
        // the lattice draws in with the first cells
        lattice.scale.multiplyScalar(smooth(T.grid, T.grid + 0.35, t));
      }
      for (let n = 0; n < cellData.length; n++) {
        const c = cellData[n];
        const pop = gridOn ? smooth(c.at, c.at + 0.14, t) : 0;
        if (pop <= 0.001) {
          arrows.hide(GRID_AT + n);
          continue;
        }
        const s = r / ORB_R;
        // the cell's place in the camera's plane, scaled with the bubble
        P.set(c.x * s, c.y * s, 0).applyQuaternion(camQ).add(center);
        C.copy(c.d).applyQuaternion(camQ);
        arrows.set(GRID_AT + n, P.x - C.x * c.len * 0.5 * s * pop, P.y - C.y * c.len * 0.5 * s * pop, P.z - C.z * c.len * 0.5 * s * pop, C.x, C.y, C.z, c.len * s * pop * 1.15, 0.02 * s * (0.4 + 0.6 * pop));
      }
      // the pop
      const age = t - T.pop;
      const popped = age >= 0 && age < 1.1;
      for (let i = 0; i < SHARDS; i++) {
        if (!popped) {
          O.position.set(0, -90, 0);
          O.scale.setScalar(0.0001);
          O.updateMatrix();
          shards.setMatrixAt(i, O.matrix);
          continue;
        }
        const o = i * 5;
        O.position.set(POP_AT[0] + sd[o] * sd[o + 3] * age * (1 + 0.2 * ORB_R), POP_AT[1] + sd[o + 1] * sd[o + 3] * age - 1.2 * age * age, POP_AT[2] + sd[o + 2] * sd[o + 3] * age);
        O.quaternion.setFromAxisAngle(P.set(sd[o + 1], sd[o + 2], sd[o]).normalize(), age * 6 * (1 + sd[o + 4]));
        O.scale.setScalar(sd[o + 4] * (1 - smooth(0.5, 1.1, age)) * 1.4);
        O.updateMatrix();
        shards.setMatrixAt(i, O.matrix);
      }
      shards.instanceMatrix.needsUpdate = true;
      if (shards.instanceColor) shards.instanceColor.needsUpdate = true;
      // two shock rings, flat to the lens, widening past the frame
      for (const [w, ink, d] of [[ringW, ringI, 0], [ring2W, ring2I, 0.14]]) {
        const a = age - d;
        const on = a >= 0 && a < 1.0;
        w.visible = ink.visible = on;
        if (!on) continue;
        const sc = 0.3 + 22 * (a < 0.6 ? 1 - (1 - a / 0.6) * (1 - a / 0.6) : 1) * (0.5 + 0.5 * (1 - d));
        w.position.set(POP_AT[0], POP_AT[1], POP_AT[2]);
        w.quaternion.copy(camQ);
        w.scale.setScalar(sc);
        ink.position.copy(w.position);
        ink.quaternion.copy(camQ);
        ink.scale.setScalar(sc);
      }
    },
    dispose() {
      for (const g of [ribbonG, orbG, latG, shardG, ringW.geometry, ringI.geometry]) g.dispose();
      for (const m of [ribbonMat, orbMat, hullMat, glowMat, latMat, shardMat, ringW.material, ringI.material]) m.dispose();
      ribbons.dispose();
      shards.dispose();
    },
  };
}
