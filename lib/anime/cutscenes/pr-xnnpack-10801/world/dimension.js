// THE DIMENSION (layer 0) of pr-xnnpack-10801: Las Noches in the live's ink. The shapes, the shards and the hull lines are ../live/
// (verbatim ports). This file is the live's buildWorld and the world part of its useCutFrame, in the rig frame (the seal at the origin,
// the throne seat at SEAT), driven by tt = warp(t) through env(tt). The seal is the cast's, the lettering and the flash are the fx's,
// the island is ./island.js.
import { AdditiveBlending, DoubleSide, Group, Mesh, PlaneGeometry, Quaternion, RingGeometry, Shape, ShaderMaterial, ShapeGeometry, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { hullMaterial, INK, PAPER, paperMaterial, sharedUniforms, silhouetteMaterial } from "../live/ink.js";
import { aizen, colonyPup, gin, ichigo, urahara } from "../live/shapes.js";
import { desert, groundHeight, moon, palace, skyShell, throne, throneInk, trees } from "../live/world.js";
import { hide, inst, mat, put, shardify } from "../live/parts.js";
import { solid } from "../live/geo.js";
import { tone } from "../tone.js";
import { buildDrift, buildFar } from "./far.js";
import { AIZEN_AT, CORE_Y, CRACK1, GIN, ICHIGO, MOON_R, MOON_TALL, MOON_WIDE, PUPS_Z, RADIUS, SEAT, SLASH_AT, THRONE_Z, URAHARA, W, env, smooth, T, warp } from "../clock.js";

const N_PUPS = 10;
const BIG = 140; // the sky shell's radius once the camera is inside it
const SLASH_VERT = "varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const ARC_HEAD = /* glsl */ `
  uniform float uK;
  varying vec2 vP;
  float arcHead(out float w, out float core) {
    float a = atan(vP.y, vP.x);
    float t = (a - 0.15) / 2.6;
    if (t < 0.0 || t > 1.0) discard;
    w = 0.012 + 0.07 * sin(3.14159 * t);
    float d = abs(length(vP) - 1.0);
    if (d > w) discard;
    core = 1.0 - smoothstep(0.0, w, d);
    return smoothstep(uK - 0.35, uK, t) * step(t, uK);
  }`;

// Ichigo's slash: a thin arc of cold light that sweeps on (uK 0..1) and fades behind its head
function slashMaterial() {
  return new ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: SLASH_VERT,
    fragmentShader: /* glsl */ `${ARC_HEAD}
      void main() {
        float w, core;
        float head = arcHead(w, core);
        vec3 c = mix(vec3(0.373, 0.714, 1.0), vec3(1.0), core * 0.8);
        gl_FragColor = vec4(pow(c, vec3(2.2)) * head * (0.4 + 0.6 * core), 0.99);
      }`,
  });
}

// the arc's ink edge: the same sweep in ink, behind the blue arc
function slashEdgeMaterial() {
  return new ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
    vertexShader: SLASH_VERT,
    fragmentShader: /* glsl */ `${ARC_HEAD}
      void main() {
        float w, core;
        float head = arcHead(w, core);
        if (head <= 0.0) discard;
        gl_FragColor = vec4(pow(vec3(0.031, 0.039, 0.059), vec3(2.2)), 0.99);
      }`,
  });
}

// the foreground dune lip: the desert's paper, heights 0.35 sin(0.9 x), 14 m wide, 3 m deep
function lipGeometry() {
  const base = new PlaneGeometry(14, 3, 24, 6).rotateX(-Math.PI / 2);
  const p = base.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, 0.35 * Math.sin(p.getX(i) * 0.9));
  return shardify(base, 0);
}

// THE CAST SHADOWS (SHEET-2 T12): one hatched decal per caster, its footprint pushed away from the moon by 1.4 x its height. The tree
// spots are live/world.js trees()'s list, copied because that module does not export it.
const TREE_SPOTS = [[-13.5, 3.5, 6.2], [14.5, 1.0, 7.4], [-20, -9, 8.8], [21, -12, 7.0], [-30, 6, 9.0], [33, 4, 8.0], [-9, -26, 8.2], [11, -30, 9.2], [-38, -20, 9.6], [40, -26, 8.6], [-24, -42, 10], [26, -46, 9.4], [-4, -58, 9.0], [-48, -50, 10.5], [52, -54, 9.8], [8, -72, 10], [-34, -70, 11], [36, -74, 10.5]];
const SHADOW_VERT = "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const SHADOW_FRAG = /* glsl */ "void main() { float h = abs(fract((gl_FragCoord.x + gl_FragCoord.y) / 5.0) - 0.5); if (h > 0.18) discard; gl_FragColor = vec4(pow(vec3(0.031, 0.039, 0.059), vec3(2.2)), 0.99); }";
const boxOf = (g, s, at) => { g.computeBoundingBox(); const b = g.boundingBox; return { b: { x0: b.min.x * s + at[0], x1: b.max.x * s + at[0], z0: b.min.z * s + at[2], z1: b.max.z * s + at[2] }, h: b.max.y * s + at[1] }; };
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function hullOf(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function shadowPoly({ b, h }, moon) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const dx = cx - moon[0], dz = cz - moon[2], l = Math.hypot(dx, dz) || 1, k = (1.4 * h) / l;
  const c = [[b.x0, b.z0], [b.x1, b.z0], [b.x1, b.z1], [b.x0, b.z1]];
  return hullOf(c.concat(c.map(([x, z]) => [x + dx * k, z + dz * k])));
}
function decalGeo(polys, yAt) {
  return mergeGeometries(polys.map((pts) => {
    const g = new ShapeGeometry(new Shape(pts.map(([x, z]) => new Vector2(x, z))));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getY(i); p.setXYZ(i, x, yAt(x, z), z); }
    return g;
  }), false);
}

export function buildDimension(ctx) {
  const shared = sharedUniforms();
  const hullPaper = hullMaterial(shared, PAPER, 1), hullInk = hullMaterial(shared, INK, 1);
  const paperG = paperMaterial(shared, 2), paperP = paperMaterial(shared, 1), paper = paperMaterial(shared, 0), sil = silhouetteMaterial(shared);
  const shell = skyShell(shared), tsuki = moon(shared), pal = palace(), tr = trees(), th = throne(), thInk = throneInk(), ground = desert();
  const az = aizen(), ic = ichigo(), gi = gin(), ur = urahara();

  const cp = colonyPup(), cpBody = solid([cp.body]), cpArms = solid([cp.arms]);
  const inkBasic = mat({ color: INK });
  const bodies = inst(cpBody.g, inkBasic, N_PUPS), arms = inst(cpArms.g, inkBasic, N_PUPS);
  const bodiesLine = inst(cpBody.hull, hullPaper, N_PUPS), armsLine = inst(cpArms.hull, hullPaper, N_PUPS);
  bodiesLine.instanceMatrix = bodies.instanceMatrix;
  armsLine.instanceMatrix = arms.instanceMatrix;
  for (const x of [bodies, arms]) for (let i = 0; i < N_PUPS; i++) hide(x, i);

  const detail = mat({ color: PAPER, side: DoubleSide });
  const gapMat = mat({ color: "#5fb6ff", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
  const gapG = new PlaneGeometry(5.2, 0.26);
  const slashG = new RingGeometry(0.85, 1.15, 48, 1, 0.1, 2.7);
  const slashMat = slashMaterial(), edgeMat = slashEdgeMaterial();
  const lipG = lipGeometry();
  const far = buildFar(shared), drift = buildDrift(shared, ctx);
  for (const m of [paperG, paperP, paper, sil, hullInk, hullPaper, shell.m, tsuki.m, slashMat, edgeMat]) tone(m);

  const mesh = (g, m, o = {}) => {
    const x = new Mesh(g, m);
    x.frustumCulled = false;
    if (o.order !== undefined) x.renderOrder = o.order;
    if (o.pos) x.position.set(...o.pos);
    if (o.scale !== undefined) x.scale.setScalar(o.scale);
    if (o.visible !== undefined) x.visible = o.visible;
    return x;
  };
  const group = new Group(), world = new Group(), dais = new Group();
  const shellM = mesh(shell.g, shell.m, { order: -3, pos: [0, CORE_Y, 0] });
  const moonM = mesh(tsuki.g, tsuki.m, { order: -2, scale: MOON_R / 1.7 });
  const groundM = mesh(ground, paperG, { order: -1 });
  const palG = new Group();
  palG.position.set(0, 0, -112);
  const palM = mesh(pal.g, paperP), palH = mesh(pal.hull, hullInk);
  palG.add(palM, palH);
  const trM = mesh(tr.g, paper), trH = mesh(tr.hull, hullInk);
  const lipM = mesh(lipG, paperG, { pos: [0, -0.2, 7.5] });

  const throneG = new Group();
  throneG.position.set(0, 0, THRONE_Z);
  const thM = mesh(th.g, paper), thH = mesh(th.hull, hullInk), thInkM = mesh(thInk, sil);
  const gapM = mesh(gapG, gapMat, { order: 5, pos: [0, 0.3, 4.08], visible: false });
  throneG.add(thM, thH, thInkM, gapM);

  const azG = new Group();
  azG.position.set(...AIZEN_AT);
  azG.scale.setScalar(1.45);
  const azBody = mesh(az.body, sil), azHull = mesh(az.hull, hullPaper);
  const bladeLow = mesh(az.bladeLow.g, sil), bladeLowH = mesh(az.bladeLow.hull, hullPaper);
  const tipG = new Group(), tipIn = new Group();
  tipIn.position.set(-az.hand[0], -az.hand[1], -az.hand[2]);
  const bladeTip = mesh(az.bladeTip.g, sil), bladeTipH = mesh(az.bladeTip.hull, hullPaper);
  tipIn.add(bladeTip, bladeTipH);
  tipG.add(tipIn);
  azG.add(azBody, azHull, bladeLow, bladeLowH, tipG);

  const ichG = new Group(), icHull = mesh(ic.hull, hullPaper);
  ichG.position.set(...ICHIGO);
  ichG.scale.setScalar(1.3);
  ichG.add(mesh(ic.g, sil), icHull);

  const ginG = new Group(), giHull = mesh(gi.hull, hullPaper), ginSmile = mesh(gi.smile, detail);
  ginG.position.set(...GIN);
  ginG.rotation.set(0, 0.12, 0);
  ginG.scale.setScalar(1.3);
  ginG.add(mesh(gi.g, sil), giHull, ginSmile);

  const urG = new Group(), urHull = mesh(ur.hull, hullPaper), urStripes = mesh(ur.stripes, detail);
  urG.position.set(...URAHARA);
  urG.rotation.set(0, -0.25, 0);
  urG.scale.setScalar(1.3);
  urG.add(mesh(ur.g, sil), urHull, urStripes);

  const colonyG = new Group();
  colonyG.add(bodies, bodiesLine, arms, armsLine);

  dais.add(throneG, azG, ichG, ginG, urG, colonyG);

  const shadowM = tone(new ShaderMaterial({ vertexShader: SHADOW_VERT, fragmentShader: SHADOW_FRAG, side: DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const worldPolys = [boxOf(pal.g, 1, [0, 0, -112]), ...TREE_SPOTS.map(([x, z, h]) => ({ b: { x0: x - 0.3 * h, x1: x + 0.3 * h, z0: z - 0.3 * h, z1: z + 0.3 * h }, h }))].map((c) => shadowPoly(c, MOON_WIDE));
  const daisPolys = [boxOf(th.g, 1, [0, 0, THRONE_Z]), boxOf(az.body, 1.45, AIZEN_AT), boxOf(ic.g, 1.3, ICHIGO), boxOf(gi.g, 1.3, GIN), boxOf(ur.g, 1.3, URAHARA)].map((c) => shadowPoly(c, MOON_WIDE));
  const shW = mesh(decalGeo(worldPolys, (x, z) => groundHeight(x, z) + 0.02), shadowM);
  const shD = mesh(decalGeo(daisPolys, () => 0.02), shadowM);
  dais.add(shD);
  const slashM = mesh(slashG, slashMat, { order: 20, pos: SLASH_AT, scale: 3.4, visible: false });
  const edgeM = mesh(slashG, edgeMat, { order: 19, pos: SLASH_AT, scale: 3.4 * 1.06, visible: false });
  world.add(moonM, groundM, far.group, palG, trM, trH, shW, lipM, dais, drift.group, slashM, edgeM);
  const hulls = [palH, trH, thH, azHull, bladeLowH, bladeTipH, icHull, giHull, urHull];
  const details = [ginSmile, urStripes];
  group.add(shellM, world);

  const V = new Vector3(), MP = new Vector3(), RES = new Vector2(), Q = new Quaternion(), P = new Vector3();
  const place = (p) => {
    const w = W(p);
    return P.set(w[0], w[1], w[2]);
  };

  return {
    group,
    shared,
    update(t) {
      const tt = warp(t), e = env(tt), cam = ctx.player?.camera;
      if (!cam) return;
      group.updateWorldMatrix(true, false);
      const broken = e.brk > 0, r = RADIUS * e.bloom;

      // THE WORLD swells out of the seal with the stage, then holds as the backdrop until it breaks
      place([0, CORE_Y, 0]);
      V.copy(P);
      const inside = r > cam.position.distanceTo(V) + 0.3;
      shellM.visible = r > 0.02 && e.brk < 1.6;
      shellM.scale.setScalar(inside || broken ? BIG : Math.max(r, 0.02));
      world.visible = (inside || broken) && e.brk < 1.6;

      shared.uTime.value = t;
      shared.uBreak.value = e.brk;
      const R = ctx.engine?.renderer;
      if (R) {
        R.getDrawingBufferSize(RES);
        shared.uRes.value.copy(RES);
        shared.uPx.value = 1.5 * R.getPixelRatio();
      }
      const wide = cam.aspect >= 1, moonP = wide ? MOON_WIDE : MOON_TALL;
      MP.fromArray(moonP);
      moonM.position.copy(MP);
      moonM.lookAt(cam.position);
      place(moonP);
      shared.uMoon.value.copy(P);

      // THE GLASS: holes where the slash cracked it, the web from the crack (then from the blade), and the hairline that regrows
      const regrow = t >= 13.93 && t <= 15.4 && e.web1 === 0 && e.web2 === 0;
      const aim = regrow || tt < T.web[0] ? CRACK1 : [AIZEN_AT[0] - 0.65, AIZEN_AT[1] + 0.9, AIZEN_AT[2] + 0.4];
      shared.uHole.value = e.hole;
      shared.uCrack.value = regrow ? 0.25 * smooth(13.93, 15.4, t) : tt >= T.web[0] ? e.web2 : e.web1;
      place(aim);
      shared.uCrackDir.value.set(P.x - cam.position.x, P.y - cam.position.y, P.z - cam.position.z).normalize();

      // THE SEAL'S THRONE rises out of the sand: the dais carries the seat, and everything on it, up with the pup
      dais.position.set(0, -(SEAT + 2) * (1 - e.rise), 0);
      const sl = smooth(T.slash[0], T.slash[1], tt);
      ichG.rotation.set(0, 0.25, -0.18 * smooth(T.slash[0], T.slash[0] + 0.15, tt) * (1 - smooth(T.slash[1] + 0.2, T.slash[1] + 0.7, tt)));
      const arcOn = tt > T.slash[0] && tt < T.slash[1] + 0.4;
      slashM.visible = edgeM.visible = arcOn;
      slashMat.uniforms.uK.value = edgeMat.uniforms.uK.value = sl * 1.4;
      slashM.quaternion.copy(Q.setFromRotationMatrix(group.matrixWorld).invert().multiply(cam.quaternion));
      slashM.rotateZ(-0.4);
      edgeM.quaternion.copy(slashM.quaternion);

      // Aizen's blade: the tip snaps off on the truth and tumbles away
      const sn = Math.max(0, tt - T.snap), hand = az.hand;
      tipG.position.set(hand[0] - 0.6 * sn, hand[1] + 1.1 * sn - 5.5 * sn * sn, hand[2] + 0.9 * sn);
      tipG.rotation.set(0, 0, -5.5 * sn);
      gapMat.opacity = e.gap;
      gapM.visible = e.gap > 0.01;

      // the colony pups pop in at the throne's foot, a pair at a time, and cheer on twos
      const f12 = Math.floor(t * 12);
      for (let i = 0; i < N_PUPS; i++) {
        const pair = i >> 1, sd = i & 1 ? 1 : -1;
        const born0 = T.hype + pair * 0.16;
        const born = smooth(born0, born0 + 0.2, tt);
        const k = 0.42 * born * (1 + 0.25 * Math.sin(Math.PI * Math.min(1, Math.max(0, tt - born0) / 0.3)));
        const up = (f12 + pair * 2 + (i & 1)) % 4 < 2;
        const x = -1.1 + pair * 1.12 + sd * 0.27, y = 0.6 + (up ? 0.14 : 0);
        put(bodies, i, x, y, PUPS_Z, k, k, k, 0, sd * -0.3, 0);
        put(arms, i, x, y, PUPS_Z, k, k * (up ? 1 : 0.4), k, 0, sd * -0.3, 0);
      }
      bodies.instanceMatrix.needsUpdate = arms.instanceMatrix.needsUpdate = true;

      // the hull lines and the details that are not shards go with the glass
      colonyG.visible = !broken;
      for (const h of hulls) h.visible = !broken;
      for (const d of details) d.visible = !broken;
      shW.visible = shD.visible = !broken;
      drift.update(t);
    },
    dispose() {
      for (const g of [ground, tsuki.g, pal.g, pal.hull, tr.g, tr.hull, th.g, th.hull, thInk, az.body, az.hull, az.bladeLow.g, az.bladeLow.hull, az.bladeTip.g, az.bladeTip.hull, ic.g, ic.hull, gi.g, gi.hull, gi.smile, ur.g, ur.hull, ur.stripes, cpBody.g, cpBody.hull, cpArms.g, cpArms.hull, gapG, slashG, lipG, shell.g]) g.dispose();
      for (const m of [shell.m, tsuki.m, paperG, paperP, paper, sil, hullInk, hullPaper, inkBasic, detail, gapMat, slashMat, edgeMat]) m.dispose();
      for (const x of [bodies, bodiesLine, arms, armsLine]) x.dispose();
      far.dispose();
      drift.dispose();
      shW.geometry.dispose();
      shD.geometry.dispose();
      shadowM.dispose();
    },
  };
}
