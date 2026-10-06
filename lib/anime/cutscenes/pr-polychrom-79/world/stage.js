// pr-polychrom-79 / world: the set. The plateau is the Fountain's island seen under the open Gate: a stone disc with a dark
// rubble underbelly, the basin (4 m, the pocket anchor), a ruined colonnade on the back arc (z < 0 only, so nothing ever
// stands between a lens and the seal), the vault gate Bab-ilu, the sixteen blade hilts on the rim (easter egg 4), the Holy
// Grail over the dome (egg 1), Enkidu's chains (egg 2) and, after the shatter, snow with gold motes.
// Static art goes to layer 0 (baked per shot); everything that moves or fades is layer 1.
//
// Stone = engine.prop with uStone (mode 3 grunge, mode 1 blocks). Gold = uGloss hard specular sheet + a small uEmit.
// Light: the engine's own cel light; "gold light wash from above" is an additive disc on the plateau (ground only, depth-tested).
import { BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, CylinderGeometry, DoubleSide, Group, LatheGeometry, Mesh, Object3D, PlaneGeometry, Points, RingGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { paint, painted } from "../../../sdf.js";
import { boulder, merge } from "../../../kit3d.js";
import { additive, hex } from "./portals.js";

const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export function buildStage(ctx, T, portalData) {
  const { engine } = ctx, R = ctx.rng("stage");
  const stat = new Group(), dyn = new Group();
  dyn.userData.layer = 1;
  const geos = [], mats = [];
  const part = (parent, geo, col, shade, id, f = {}) => {
    geos.push(geo);
    const m = engine.prop(painted(geo, paint(col, shade)), id), u = m.material.uniforms;
    if (f.stone) u.uStone.value.set(...f.stone);
    if (f.gloss) u.uGloss.value.set(...f.gloss);
    if (f.emit) u.uEmit.value.set(...f.emit);
    parent.add(m); mats.push(m.material);
    return m;
  };
  const flat = (geo, mat, parent) => { geos.push(geo); mats.push(mat); const m = new Mesh(geo, mat); m.frustumCulled = false; parent.add(m); return m; };

  // ---- PLATEAU: a stone disc, cracked (grunge mode 3), hard 2-band; shadow stays crimson-brown, never grey ----
  part(stat, new CylinderGeometry(20, 17.5, 1.2, 72, 1).translate(0, -0.6, 0), "#d8c8a8", "#84543f", 0.5, { stone: [3, 0.55, 0.5, 0.35] });
  // trim: a thin gold-lit ring at the lip
  part(stat, new RingGeometry(18.9, 19.5, 72).rotateX(-Math.PI / 2).translate(0, 0.012, 0), "#e8cf8a", "#a8742a", 0.5, { gloss: [0.5, 30, 0.2, 0] });
  // underbelly: a rough inverted cone of dark rubble. Radii jitter by ring, so the silhouette reads as torn rock.
  {
    const g = new CylinderGeometry(17.5, 2.5, 18, 28, 7, true).translate(0, -1.2 - 9, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i), k = (y + 1.2) / -18, s = 1 + 0.16 * Math.sin(P.getX(i) * 0.7 + P.getZ(i) * 1.3 + k * 9) * (0.4 + k) + 0.1 * (R() - 0.5);
      P.setXYZ(i, P.getX(i) * s, y + 1.5 * (R() - 0.5) * (k > 0.05 ? 1 : 0), P.getZ(i) * s);
    }
    g.computeVertexNormals();
    part(stat, g, "#6a4038", "#2a1018", 0.5, { stone: [2, 0.8, 0.6, 0.3] });
  }

  // ---- BASIN (4 m), the pocket anchor: a lathed stone bowl, gold-lit water, a small pillar, off to the right and back ----
  const BX = 4.6, BZ = -5.2;
  {
    const prof = [[0, 0], [2.15, 0], [2.2, 0.72], [1.85, 0.72], [1.85, 0.34], [0, 0.34]].map(([x, y]) => new Vector2(x, y));
    part(stat, new LatheGeometry(prof, 40).translate(BX, 0, BZ), "#d8c8a8", "#84543f", 0.5, { stone: [3, 0.9, 0.5, 0.3] });
    part(stat, new CylinderGeometry(0.28, 0.42, 1.5, 12).translate(BX, 0.9, BZ), "#d8c8a8", "#84543f", 0.5, { stone: [1, 1.5, 0.4, 0.2] });
    part(stat, new SphereGeometry(0.34, 14, 10).translate(BX, 1.8, BZ), "#ffe27a", "#c98a12", 0.5, { gloss: [0.8, 40, 0.5, 0], emit: [0.35, 0.22, 0.04] });
    part(stat, new CircleGeometry(1.85, 40).rotateX(-Math.PI / 2).translate(BX, 0.36, BZ), "#ffe27a", "#ffb020", 0.5, { emit: [0.55, 0.36, 0.08], gloss: [0.6, 50, 0.4, 0] }); // the water, gold under the portals
  }

  // ---- COLONNADE: seven fluted columns on the back arc, some broken, lintels between three of them; rubble on the rim ----
  {
    const shafts = [], bases = [], lints = [];
    const C = [];
    for (let i = 0; i < 7; i++) {
      const th = Math.PI * (0.18 + 0.64 * i / 6), Rr = 14.5 + (R() - 0.5) * 1.5, x = Rr * Math.cos(th), z = -Rr * Math.sin(th);
      const h = i % 3 === 1 ? 2.4 + R() * 1.2 : 5.5 + R() * 1.6;
      C.push({ x, z, h });
      shafts.push(new CylinderGeometry(0.52, 0.62, h, 10).translate(x, h / 2 + 0.4, z));
      bases.push(new BoxGeometry(1.7, 0.4, 1.7).translate(x, 0.2, z));
      if (h > 4) bases.push(new BoxGeometry(1.5, 0.45, 1.5).translate(x, h + 0.62, z));
      if (h < 4) shafts.push(new CylinderGeometry(0.55, 0.55, 1.1, 10).rotateZ(Math.PI / 2).rotateY(R() * 3).translate(x + (R() - 0.5) * 3, 0.55, z + 1.4 + R()));
    }
    for (const [a, b] of [[0, 2], [4, 6]]) { // lintels span the tall neighbours
      const A = C[a], B = C[b], len = Math.hypot(B.x - A.x, B.z - A.z), h = Math.min(A.h, B.h);
      if (h < 4) continue;
      lints.push(new BoxGeometry(len, 0.5, 0.9).rotateY(-Math.atan2(B.z - A.z, B.x - A.x)).translate((A.x + B.x) / 2, h + 1.1, (A.z + B.z) / 2));
    }
    part(stat, merge(shafts, "shafts"), "#d8c8a8", "#84543f", 0.5, { stone: [1, 1.2, 0.5, 0.3] });
    part(stat, merge(bases, "bases"), "#cdb995", "#7a4a38", 0.5, { stone: [3, 0.9, 0.5, 0.3] });
    if (lints.length) part(stat, merge(lints, "lintels"), "#d8c8a8", "#84543f", 0.5, { stone: [3, 0.9, 0.5, 0.3] });
    const rub = [];
    for (let i = 0; i < 26; i++) {
      const a = R() * 6.28, rr = 9 + R() * 8, s = 0.18 + R() * 0.32;
      rub.push(boulder([s * 1.3, s * 0.8, s], [rr * Math.cos(a), s * 0.3, rr * Math.sin(a) * (Math.sin(a) < 0 ? 1 : 0.6)], i + 3));
    }
    part(stat, merge(rub, "rubble"), "#c8b894", "#7a4a38", 0.5, { stone: [2, 1.5, 0.5, 0.3] });
  }

  // ---- GATE BAB-ILU (3 m): frame static, doors + red circuits + halo animated. Stands behind the basin line at z = -8.5 ----
  const GZ = -8.5, gate = new Group(); gate.position.set(0, 0, GZ);
  const gateStat = new Group(); gateStat.position.copy(gate.position);
  stat.add(gateStat);
  {
    const gold = (parent, geo, id = 0.5) => part(parent, geo, "#ffe27a", "#c98a12", id, { gloss: [0.8, 40, 0.5, 0], emit: [0.14, 0.09, 0.0] });
    gold(gateStat, new BoxGeometry(0.55, 3.5, 0.6).translate(-1.55, 1.75, 0));
    gold(gateStat, new BoxGeometry(0.55, 3.5, 0.6).translate(1.55, 1.75, 0));
    gold(gateStat, new BoxGeometry(3.9, 0.55, 0.7).translate(0, 3.75, 0));
    part(gateStat, new BoxGeometry(3.0, 3.4, 0.4).translate(0, 1.7, -0.45), "#8a0c1e", "#3a0610", 0.5);       // the vault behind the leaves
    part(gateStat, new BoxGeometry(4.6, 0.3, 1.6).translate(0, 0.15, 0.3), "#cdb995", "#7a4a38", 0.5, { stone: [3, 0.9, 0.5, 0.3] }); // threshold
    // engraved gold crown: a small stepped cap
    gold(gateStat, new BoxGeometry(2.2, 0.35, 0.5).translate(0, 4.18, 0));
    gold(gateStat, new BoxGeometry(1.0, 0.4, 0.45).translate(0, 4.55, 0));
  }
  // the doors: gold leaves hinged at x = +-1.28 (swing inward, toward -z), each carrying a circuit overlay
  const K = { value: 0 };
  const circuitMat = additive(new ShaderMaterial({
    side: DoubleSide, uniforms: { uK: K },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    // CIRCUITS: u = 0 at the hinge .. 1 at the seam, v = 0..1 bottom..top. Cell grid 7 x 15; every cell carries a horizontal or a
    // vertical trace (width 0.06 of the cell) and some a node pad. The wavefront leaves the keyhole (u = 1, v = 0.55):
    //   d = |((1-u) 1.3, (v - 0.55) 3)| / 3.2;  lit = d < 1.1 uK;  front = hairline at d = 1.1 uK, 1.6 times brighter
    fragmentShader: `uniform float uK; varying vec2 vUv;
      float h(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main() {
        vec2 g = vec2(vUv.x * 7.0, vUv.y * 15.0), id = floor(g), f = fract(g) - 0.5;
        float horiz = step(0.5, h(id));
        float line = horiz > 0.5 ? step(abs(f.y), 0.06) : step(abs(f.x), 0.06);
        float pad = step(length(f), 0.14) * step(0.55, h(id + 9.0));
        float on = max(line * step(0.3, h(id + 3.0) + 0.5), pad);
        float d = length(vec2((1.0 - vUv.x) * 1.3, (vUv.y - 0.55) * 3.0)) / 3.2;
        float lit = step(d, uK * 1.1) * step(0.001, uK);
        float front = smoothstep(0.06, 0.0, abs(d - uK * 1.1));
        vec3 col = ${hex("#ff2a3a")} * (0.9 + 1.6 * front) * on * lit;
        if (dot(col, col) < 1e-4) discard;
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  mats.push(circuitMat);
  const leaves = [];
  for (const side of [-1, 1]) {
    const hinge = new Group(); hinge.position.set(side * 1.28, 0, 0); hinge.scale.x = side; // local x runs hinge -> seam
    part(hinge, new BoxGeometry(1.28, 3.3, 0.2).translate(0.64, 1.7, 0), "#ffe27a", "#c98a12", 0.5, { gloss: [0.8, 40, 0.5, 0], emit: [0.1, 0.06, 0] });
    part(hinge, new BoxGeometry(1.1, 3.05, 0.03).translate(0.64, 1.7, 0.11), "#ffb020", "#c98a12", 0.5, { gloss: [0.6, 30, 0.4, 0] });
    const plane = flat(new PlaneGeometry(1.1, 3.05).translate(0.64, 1.7, 0.13), circuitMat, hinge);
    plane.renderOrder = 3;
    gate.add(hinge); leaves.push({ hinge, side });
  }
  // light spilling from the open vault: a gold-white card behind the doors, a halo, and a floor wedge in front
  const spill = { value: 0 };
  const spillMat = additive(new ShaderMaterial({
    side: DoubleSide, uniforms: { uS: spill },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    // card behind the doors: #ffe27a inside, #fff2c0 core at the centre, fading at the frame edge; strength uS (0 shut .. 1 open)
    fragmentShader: `uniform float uS; varying vec2 vUv;
      void main() { vec2 p = vUv - 0.5; float e = smoothstep(0.5, 0.2, max(abs(p.x) * 1.1, abs(p.y)));
        float c = exp(-dot(p, p) * 9.0);
        gl_FragColor = vec4((${hex("#ffe27a")} * 0.7 + ${hex("#fff2c0")} * c * 0.45) * e * uS, 1.0); }`,
  }));
  mats.push(spillMat);
  flat(new PlaneGeometry(2.9, 3.3).translate(0, 1.75, -0.22), spillMat, gate).renderOrder = 3;
  const halo = { value: 0 };
  const haloMat = additive(new ShaderMaterial({
    side: DoubleSide, uniforms: { uH: halo },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uH; varying vec2 vUv;
      void main() { vec2 p = vUv - 0.5; float d = length(p) * 2.0;
        float g = exp(-d * d * 3.2) * 0.55 + smoothstep(0.08, 0.0, abs(d - 0.62)) * 0.25;
        gl_FragColor = vec4(${hex("#ffb020")} * g * uH, 1.0); }`,
  }));
  mats.push(haloMat);
  const haloCard = flat(new PlaneGeometry(12, 12).translate(0, 2.2, 0.4), haloMat, gate);
  haloCard.renderOrder = 3;
  haloCard.onBeforeRender = (_r, _s, cam) => { haloCard.quaternion.copy(cam.quaternion); };
  dyn.add(gate);
  // glints on the frame: two small additive stars that flare as the circuits spread (the "add glints" of the bible)
  const glintMat = additive(new ShaderMaterial({
    side: DoubleSide, uniforms: { uG: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    // 4-point star: exp(-|x| 40 |y|^0.6 ...) approximated by two crossed gaussians plus a core
    fragmentShader: `uniform float uG; varying vec2 vUv;
      void main() { vec2 p = (vUv - 0.5) * 2.0;
        float a = exp(-abs(p.x) * 9.0) * exp(-abs(p.y) * 70.0), b = exp(-abs(p.y) * 9.0) * exp(-abs(p.x) * 70.0);
        float c = exp(-dot(p, p) * 40.0);
        gl_FragColor = vec4(${hex("#fff2c0")} * (a + b + c) * uG, 1.0); }`,
  }));
  mats.push(glintMat);
  [[-1.55, 3.55], [1.55, 3.55], [0, 4.8]].map(([x, y]) => {
    const g = flat(new PlaneGeometry(1.4, 1.4).translate(x, y, 0.5), glintMat, gate); g.renderOrder = 4;
    g.onBeforeRender = (_r, _s, cam) => { g.quaternion.copy(cam.quaternion); }; return g;
  });

  // ---- GOLD LIGHT WASH on the plateau: an additive disc, depth-tested so it only ever lights ground, never the seal ----
  const wash = { value: 0.05 };
  const washMat = additive(new ShaderMaterial({
    uniforms: { uW: wash },
    vertexShader: "varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    // radial: #ffb020 * uW * (1 - r/18)^1.4, centred a little toward the portals (-z)
    fragmentShader: `uniform float uW; varying vec2 vP;
      void main() { float r = length(vP) / 18.0; float g = pow(clamp(1.0 - r, 0.0, 1.0), 1.4);
        gl_FragColor = vec4(${hex("#ffb020")} * g * uW, 1.0); }`,
  }));
  const washM = flat(new CircleGeometry(18.5, 48).rotateX(-Math.PI / 2).translate(0, 0.03, -1), washMat, dyn);
  washM.renderOrder = 1;

  // ---- EGG 4: sixteen blade hilts on the rim, fading one by one from 14.0 s (the PR number, drawn: 16 to 0) ----
  const hilts = [];
  {
    const gGuard = new BoxGeometry(0.5, 0.06, 0.08).translate(0, 0.9, 0), gGrip = new CylinderGeometry(0.035, 0.035, 0.3, 8).translate(0, 1.07, 0);
    const gPom = new SphereGeometry(0.065, 8, 6).translate(0, 1.26, 0), gBlade = new BoxGeometry(0.09, 0.9, 0.02).translate(0, 0.45, 0);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1, g = new Group();
      g.position.set(Math.cos(a) * 18.3, 0, Math.sin(a) * 18.3);
      g.rotation.set(Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14);
      part(g, gGuard.clone(), "#ffb020", "#c98a12", 0.5, { gloss: [0.8, 40, 0.5, 0] });
      part(g, gGrip.clone(), "#c82040", "#8a0c1e", 0.5);
      part(g, gPom.clone(), "#ffe27a", "#c98a12", 0.5, { gloss: [0.8, 40, 0.5, 0] });
      part(g, gBlade.clone(), "#e8f0ff", "#3a4560", 0.5, { gloss: [0.9, 60, 0.6, 0] });
      dyn.add(g); hilts.push(g);
    }
  }

  // ---- EGG 1: the Holy Grail, black, floating over the dome's centre from 2.3 s, with a dull crimson drip-glow ----
  const grail = new Group(); grail.position.set(0, 66, -34); grail.scale.setScalar(3.4);
  {
    const prof = [[0, 0], [0.22, 0.02], [0.2, 0.5], [0.5, 0.95], [0.62, 1.35], [0.52, 1.5], [0.4, 1.42], [0.45, 1.22], [0.18, 0.78], [0, 0.72]].map(([x, y]) => new Vector2(x, y));
    part(grail, new LatheGeometry(prof, 18).translate(0, -0.7, 0), "#14080c", "#000000", 0.5, { gloss: [0.5, 30, 0.6, 0] });
  }
  const grailGlowMat = additive(new ShaderMaterial({
    side: DoubleSide, uniforms: { uV: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uV; varying vec2 vUv;
      void main() { vec2 p = vUv - 0.5; float d = length(p) * 2.0; float g = exp(-d * d * 4.0);
        gl_FragColor = vec4((${hex("#d3122e")} * 0.5 + ${hex("#8a0c1e")} * 0.5) * g * uV, 1.0); }`,
  }));
  mats.push(grailGlowMat);
  const grailGlow = flat(new PlaneGeometry(4.4, 4.4), grailGlowMat, grail); grailGlow.renderOrder = 1;
  grailGlow.onBeforeRender = (_r, _s, cam) => { grailGlow.quaternion.copy(cam.quaternion); };
  dyn.add(grail);

  // ---- EGG 2: Enkidu's chains, out of the far-left portal from 3.0 s, sagging to the plateau; one merged geometry revealed by drawRange ----
  let chain = null, linkVerts = 0, nLinks = 0;
  {
    const src = portalData.filter((d) => d.layer === 0 && d.az < 0 && d.el > 0.3).sort((a, b) => a.pos.x - b.pos.x)[0] ?? portalData[0];
    const P0 = src.pos.clone(), P1 = new Vector3(-6, 0.45, -2.5), total = P0.distanceTo(P1);
    nLinks = Math.min(110, Math.floor(total / 0.55));
    const proto = new TorusGeometry(0.22, 0.05, 5, 12).scale(1.45, 1, 1), parts = [];
    const o = new Object3D(), pt = (s) => P0.clone().lerp(P1, s).add(new Vector3(0, -Math.sin(Math.PI * s) * total * 0.07, 0));
    for (let i = 0; i < nLinks; i++) {
      const s = i / (nLinks - 1), p = pt(s), q = pt(Math.min(1, s + 0.01));
      o.position.copy(p); o.lookAt(q.lerp(p, 0)); o.rotateY(Math.PI / 2); o.rotateX((i % 2) * Math.PI / 2);
      o.scale.setScalar(1 + 0.0 * s); o.updateMatrix();
      const g = proto.clone().applyMatrix4(o.matrix); parts.push(g);
    }
    const merged = merge(parts, "chain");
    linkVerts = merged.attributes.position.count / nLinks;
    chain = part(dyn, merged, "#8a98b8", "#3a4560", 0.5, { gloss: [0.9, 50, 0.7, 0] });
    chain.frustumCulled = false; chain.geometry.setDrawRange(0, 0);
  }

  // ---- SNOW with GOLD MOTES (shot 8): Points whose fall is computed in the vertex shader from the stepped clock ----
  const NM = 220, mp = new Float32Array(NM * 3), ms = new Float32Array(NM * 2);
  for (let i = 0; i < NM; i++) { mp.set([(R() - 0.5) * 36, R() * 15, (R() - 0.5) * 36], i * 3); ms[2 * i] = 0.4 + R() * 0.7; ms[2 * i + 1] = i % 6 === 0 ? 1 : 0; } // every 6th is gold
  const mg = new BufferGeometry();
  mg.setAttribute("position", new BufferAttribute(mp, 3)); mg.setAttribute("aS", new BufferAttribute(ms, 2));
  const motes = { uT: { value: 0 }, uShow: { value: 0 } };
  const moteMat = additive(new ShaderMaterial({
    uniforms: motes,
    // p.y = mod(y0 - speed t, 15) - 0.3 ;  p.x += 0.6 sin(0.7 t + y0)   ;  point size = 130 / depth
    vertexShader: `attribute vec2 aS; uniform float uT; varying float vG;
      void main() { vec3 p = position; p.y = mod(position.y - uT * aS.x, 15.0) - 0.3; p.x += 0.6 * sin(uT * 0.7 + position.y);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vG = aS.y; gl_PointSize = clamp(130.0 / max(-mv.z, 0.5), 1.5, 9.0 * (1.0 + aS.y)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uShow; varying float vG;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.12, d);
        vec3 c = mix(${hex("#f4f4f0")}, ${hex("#ffe27a")}, vG) * (0.8 + 0.25 * vG);
        gl_FragColor = vec4(c * a * uShow, 1.0); }`,
  }));
  const pts = new Points(mg, moteMat); pts.frustumCulled = false; pts.renderOrder = 5; geos.push(mg); mats.push(moteMat);
  dyn.add(pts);

  return {
    stat, dyn,
    update(t, st) {
      // st: { key, open, chains, hilts, grail, after, dim }
      K.value = Math.min(1, Math.max(0, (t - st.key) / 0.7));
      const open = sm((t - st.key - 0.6) / 1.4);
      spill.value = open; halo.value = Math.max(open, K.value * 0.35) * (st.after ? 0 : 1);
      for (const l of leaves) l.hinge.rotation.y = -l.side * open * 1.45;
      const gl = st.after ? 0 : Math.sin(Math.PI * Math.min(1, Math.max(0, (t - st.key) / 1.4))) * 0.9;
      glintMat.uniforms.uG.value = gl;
      wash.value = (st.after ? 0.06 : 0.05 + 0.2 * sm((t - st.portals) / 6)) * (1 - 0.5 * st.dim);
      // hilts: all stand until 14.0, then one per 0.28 s each shrinks away in 0.15 s
      hilts.forEach((g, i) => { const k = 1 - sm((t - (st.hilts + i * 0.28)) / 0.15); g.scale.setScalar(Math.max(k, 0.0001)); g.visible = k > 0.002 && !st.after; });
      grail.visible = t >= st.grail && !st.after;
      grail.scale.setScalar(3.4 * sm((t - st.grail) / 0.5));
      grail.position.y = 66 + Math.sin(t * 0.8) * 0.8; grail.rotation.y = t * 0.3;
      grailGlowMat.uniforms.uV.value = 0.9 * (1 - 0.5 * st.dim);
      const prog = Math.min(1, Math.max(0, (t - st.chains) / 1.2));
      chain.geometry.setDrawRange(0, Math.floor(prog * nLinks) * linkVerts);
      chain.visible = !st.after && prog > 0;
      motes.uShow.value = st.after ? 1 : 0; motes.uT.value = t;
    },
    dispose() { geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); },
  };
}
