// THE DROWNING (bible shot 6) + easter eggs that live in the world: water rings, spray burst, the banana, the road roller,
// mint-edge glows.
//
// Rings: a flat quad on the water at W; ring i (i = 0..2) has radius r_i = Rmax * easeOut(a_i), a_i = clamp((age - .13 i) / 1.3),
//        easeOut(a) = 1 - (1-a)^2 ; band width w_i = .075 (1 - a_i) ; fill = white, inner shade cyan, outline ink. Flat, no shading.
// Burst: N = 96 beads, bead j launches at angle th_j = 2 pi h, horizontal speed vh = 1 + 3h', vertical vy = 5 + 5h'';
//        pos = W + (cos th vh age, vy age - 4.9 age^2, sin th vh age) ; dies when y < W.y. (Pure function of age.)
// Banana: a curved tube (CatmullRom of 5 points, radius .11 -> tips pinched) in the 3-step cel, bobbing on twos at the reservoir.
// Road roller: boxes + 3 cylinders, yellow cel with grey-green drum, drops in at 3.0 s (ease-out + one squash bounce), parked on the crest.
// Mint glows: additive soft discs at scene stage.mint points (optional), pulse from the drowning on.
import { sstep, hash, beatOf, billboard, celPair } from "./common.js";
import { makeDroplets } from "./droplets.js";

const RING_FRAG = /* glsl */ `
  varying vec2 vUv; uniform float uAge, uA; uniform vec3 uFill, uShade, uInk;
  float ring(float r, float a, float i){ float aa = clamp((uAge - .13 * i) / 1.3, 0., 1.); float e = 1. - (1. - aa) * (1. - aa);
    float R = .92 * e, w = .075 * (1. - aa) + .006; float d = abs(r - R) - w; return aa > 0. && aa < 1. ? d : 9.; }
  void main(){ vec2 p = (vUv - .5) * 2.; float r = length(p);
    float d = min(min(ring(r, 0., 0.), ring(r, 0., 1.)), ring(r, 0., 2.));
    if (d > .022) discard;
    vec3 col = d < -.004 ? mix(uShade, uFill, step(.0, p.x * .6 + p.y * .8 + .15)) : uInk;
    gl_FragColor = vec4(col, uA); }`;
const GLOW_FRAG = /* glsl */ `
  varying vec2 vUv; uniform vec3 uCol; uniform float uA;
  void main(){ float r = length(vUv - .5) * 2.; float g = pow(clamp(1. - r, 0., 1.), 2.2); gl_FragColor = vec4(uCol * g * uA, g * uA); }`;

export default function water(ctx, sh) {
  const { THREE } = ctx;
  const { frame, stage } = sh;
  const group = new THREE.Group();
  const V = THREE.Vector3;
  const sc = () => ctx.seal.scale || 1;

  // ---- rings ----
  const ringMat = new THREE.ShaderMaterial({ vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }", fragmentShader: RING_FRAG, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    uniforms: { uAge: { value: 0 }, uA: { value: 1 }, uFill: { value: new THREE.Color("#f4fbff") }, uShade: { value: new THREE.Color("#19d3ff") }, uInk: { value: new THREE.Color("#05020a") } } });
  const ringGeo = new THREE.PlaneGeometry(1, 1);
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = -Math.PI / 2; ring.frustumCulled = false; ring.renderOrder = 138; ring.visible = false;
  group.add(ring);

  // ---- burst ----
  const NB = 96, burst = makeDroplets(ctx, NB, { order: 143 }); group.add(burst.pts);

  // ---- banana ----
  const curve = new THREE.CatmullRomCurve3([new V(-0.62, 0.0, 0), new V(-0.34, -0.2, 0), new V(0.0, -0.27, 0), new V(0.34, -0.2, 0), new V(0.64, 0.05, 0)]);
  const bGeo = new THREE.TubeGeometry(curve, 20, 0.12, 8, false);
  const pa = bGeo.attributes.position; // pinch the tips: scale radial offset by sin(pi u) ^ .5 (cheap: shrink by distance of x from the middle)
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), k = Math.pow(Math.max(0.15, 1 - Math.pow(Math.abs(x) / 0.7, 3)), 0.6); const c = curve.getPoint(Math.min(1, Math.max(0, (x + 0.64) / 1.28))); pa.setY(i, c.y + (pa.getY(i) - c.y) * k); pa.setZ(i, (pa.getZ(i)) * k); }
  const banana = celPair(ctx, bGeo, { lit: "#fff08a", mid: "#f0c020", shade: "#b88010", order: 139, px: 0.004 });
  const bGroup = new THREE.Group(); bGroup.add(banana.hull, banana.body); bGroup.visible = false; group.add(bGroup);

  // ---- road roller ----
  const rollerG = new THREE.Group(); rollerG.visible = false; group.add(rollerG);
  const YEL = { lit: "#ffd24a", mid: "#e0a020", shade: "#8a5a10" }, GRN = { lit: "#8fa28f", mid: "#7a8a7a", shade: "#4a5a5a" }, BLK = { lit: "#5a5a6a", mid: "#2a2a36", shade: "#0a0a12" };
  const parts = [];
  const part = (geo, col, x, y, z, rz = 0) => { const p = celPair(ctx, geo, { ...col, order: 136, px: 0.0045 }); const g = new THREE.Group(); g.add(p.hull, p.body); g.position.set(x, y, z); g.rotation.z = rz; rollerG.add(g); parts.push(p); return p; };
  const cylX = (r, w) => { const g = new THREE.CylinderGeometry(r, r, w, 20); g.rotateX(Math.PI / 2); return g; }; // axis along z (the width)
  part(new THREE.BoxGeometry(2.4, 1.1, 1.5), YEL, 0.3, 1.25, 0);                 // engine hull
  part(new THREE.BoxGeometry(1.1, 1.3, 1.3), YEL, 0.75, 2.3, 0);                 // cab
  part(new THREE.BoxGeometry(1.4, 0.12, 1.6), BLK, 0.75, 3.0, 0);                // roof
  part(cylX(0.95, 1.8), GRN, -1.35, 0.95, 0);                                    // front drum
  part(cylX(0.62, 0.3), BLK, 1.0, 0.62, 0.8); part(cylX(0.62, 0.3), BLK, 1.0, 0.62, -0.8); // rear wheels
  part(new THREE.CylinderGeometry(0.1, 0.12, 0.7, 8), BLK, -0.55, 2.0, 0);       // exhaust

  // ---- mint glows ----
  const glows = [];
  for (let i = 0; i < 3; i++) { const g = billboard(ctx, { frag: GLOW_FRAG, blending: THREE.AdditiveBlending, order: 147, uniforms: { uCol: { value: new THREE.Color("#3de0b0") }, uA: { value: 0 } } }); group.add(g.mesh); glows.push(g); }

  const W = new V(), P = new V();
  function update(t) {
    frame.update();
    const drown = beatOf(ctx, "drown"), ban = beatOf(ctx, "banana"), rol = beatOf(ctx, "roller");
    const dp = drown.args.at || stage.drop, s = sc();
    frame.L(dp[0], dp[1], dp[2], W);
    const hit = drown.t + (drown.args.hitDelay ?? 0.62), age = t - hit;
    // rings
    if (age >= 0 && age < 1.7) { ring.visible = true; ring.position.copy(W); ring.position.y += 0.03; const R = (stage.ringSize || 12) * s; ring.scale.set(R, R, 1); ringMat.uniforms.uAge.value = age; ringMat.uniforms.uA.value = 1 - sstep(1.4, 1.7, age); }
    else ring.visible = false;
    // burst
    if (age >= 0 && age < 1.5) {
      let n = 0;
      for (let j = 0; j < NB; j++) {
        const th = hash(j * 1.9) * 6.2832, vh = 1 + 3 * hash(j * 3.1), vy = 5 + 5 * hash(j * 5.3);
        const y = vy * age - 4.9 * age * age; if (y < -0.1) continue;
        burst.pos[n * 3] = W.x + (Math.cos(th) * vh * age) * s; burst.pos[n * 3 + 1] = W.y + y * s; burst.pos[n * 3 + 2] = W.z + (Math.sin(th) * vh * age) * s;
        burst.size[n] = (0.16 + 0.26 * hash(j * 7.7)) * s; n++;
      }
      for (let j = n; j < NB; j++) burst.size[j] = 0;
      burst.commit(); burst.pts.visible = true; burst.mat.uniforms.uA.value = 1 - sstep(1.1, 1.5, age);
    } else burst.pts.visible = false;
    // banana: floating, bobbing on twos (stepped t), a little roll
    if (t >= ban.t && t < ban.t + ban.dur) {
      const ba = ban.args.at || stage.banana || [dp[0] + 3.2, dp[1], dp[2] + 2.2];
      frame.L(ba[0], ba[1], ba[2], P);
      bGroup.visible = true; bGroup.position.copy(P); bGroup.position.y += 0.14 * s + Math.sin(t * 2.4) * 0.06 * s;
      bGroup.rotation.set(0, 0.7 + t * 0.15, Math.sin(t * 1.7) * 0.18); bGroup.scale.setScalar(1.3 * s);
    } else bGroup.visible = false;
    // road roller: drops in, squashes once, parks (long axis along seal-local x = the crest)
    if (t >= rol.t && t < rol.t + rol.dur) {
      const ra = rol.args.at || stage.roller; const age2 = t - rol.t;
      const fall = 1 - sstep(0, 0.32, age2); const sq = age2 > 0.32 && age2 < 0.5 ? Math.sin((age2 - 0.32) / 0.18 * Math.PI) * 0.12 : 0;
      frame.L(ra[0], ra[1] + fall * 36, ra[2], P);
      rollerG.visible = true; rollerG.position.copy(P); rollerG.rotation.y = (ctx.seal.yaw || 0) + (stage.rollerYaw ?? 0); rollerG.scale.set(s * (1 + sq), s * (1 - sq), s * (1 + sq));
    } else rollerG.visible = false;
    // mint glows
    const mints = drown.args.mint || stage.mint || [];
    for (let i = 0; i < glows.length; i++) {
      const m = mints[i]; if (!m || t < drown.t + 0.3) { glows[i].mesh.visible = false; continue; }
      frame.L(m[0], m[1], m[2], P); glows[i].mesh.visible = true; glows[i].u.uOrigin.value.copy(P); const sz = 5 * s; glows[i].u.uSize.value.set(sz, sz);
      glows[i].u.uA.value = (0.55 + 0.25 * Math.sin(t * 5 + i * 2)) * sstep(drown.t + 0.3, drown.t + 1.0, t);
    }
  }
  function dispose() {
    ringMat.dispose(); ringGeo.dispose(); burst.geo.dispose(); burst.mat.dispose(); bGeo.dispose();
    for (const p of [banana, ...parts]) { p.body.material.dispose(); p.hull.material.dispose(); p.geo.dispose(); }
    for (const g of glows) { g.mat.dispose(); g.mesh.geometry.dispose(); }
  }
  return { group, update, dispose };
}
