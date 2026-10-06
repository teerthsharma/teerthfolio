// pr-highway-3244 WORLD / E7 + E8 + easter eggs 1 and 2: flags, finish banner, gantry, tyre walls, rocks, cacti, the red-cape star flag, the Waver tea cart.
// All in the rail frame (they ride the treadmill), layer 1. Solids use the anime program (engine.prop + painted(): flat 2-tone + ink);
// cloth is its own shader.
// CLOTH (vertex): k = uv.x (0 at the pole, 1 at the free edge), phase = 5 t + 2.2 x + uPh
//   z += amp k sin(phase);  y += 0.04 amp k sin(1.7 phase + 1);  the fold band = sign(cos(phase)) k decides the 2-tone shade
//   scale by uOn (the star flag grows in at 2.4 s)
// CLOTH (fragment): mode 0 chequer: parity(floor(uv * cells)) -> #fbf5ea x 0.9 / #1a1420; mode 1 the Vergina sun on crimson:
//   q = (uv - 0.5)(aspect, 1), r = |q|, a = atan(q);  rays: r < mix(0.16, 0.30, |cos 8a|^6)  (16 rays);  disc r < 0.12 gold #ffc926;
//   ring cut r in (0.075, 0.09) crimson; cloth crimson #e0102c / shadow #7a0a30; folds multiply (0.62, 0.45, 0.70); 1 px ink at the free edge.
// TEAPOT SIGN (egg 2): a quad with a cream teapot on tea red: body ellipse, lid + knob, spout capsule, handle ring (SDF, hard edges). No lettering.
import { PAL, V, paintGeo, mergeParts, beatTime, sm01 } from "./common.js";

const CLOTH_VERT = /* glsl */ `
  uniform float uTime; uniform float uAmp; uniform float uOn; uniform float uPh;
  varying vec2 vUv; varying float vFold;
  void main() {
    vUv = uv;
    vec3 p = position;
    float k = uv.x, ph = uTime * 5.0 + p.x * 2.2 + uPh;
    p.z += uAmp * k * sin(ph);
    p.y += 0.04 * uAmp * k * sin(1.7 * ph + 1.0);
    vFold = cos(ph) * k;
    p *= uOn;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const CLOTH_FRAG = /* glsl */ `
  uniform float uMode; uniform vec2 uCells; uniform float uAsp;
  varying vec2 vUv; varying float vFold;
  void main() {
    vec3 col;
    vec2 q = (vUv - 0.5) * vec2(uAsp, 1.0);
    float r = length(q), a = atan(q.y, q.x);
    float w = fwidth(r) * 0.8 + 1e-5;
    if (uMode < 0.5) {
      vec2 c = floor(vUv * uCells);
      col = mix(${V(PAL.cream)} * 0.9, ${V(PAL.chequerDark)}, mod(c.x + c.y, 2.0));
    } else {
      float rays = 1.0 - smoothstep(0.0, w, r - mix(0.16, 0.30, pow(abs(cos(8.0 * a)), 6.0)));
      float disc = 1.0 - smoothstep(0.12 - w, 0.12 + w, r);
      float ring = smoothstep(0.075 - w, 0.075 + w, r) * (1.0 - smoothstep(0.09 - w, 0.09 + w, r));
      col = ${V(PAL.crimson)};
      col = mix(col, ${V(PAL.gold)}, max(rays, disc));
      col = mix(col, ${V(PAL.crimson)}, clamp(ring + (1.0 - smoothstep(0.06 - w, 0.06 + w, r)), 0.0, 1.0) * disc);
    }
    float fold = step(0.0, vFold);
    col *= mix(vec3(0.62, 0.45, 0.70), vec3(1.0), fold);
    float ew = fwidth(vUv.x) * 1.3;
    col = mix(${V(PAL.ink)}, col, smoothstep(0.0, ew, 1.0 - vUv.x));
    gl_FragColor = vec4(min(col, vec3(0.9)), 0.5);
  }`;

const SIGN_FRAG = /* glsl */ `
  varying vec2 vUv;
  float cap(vec2 p, vec2 a, vec2 b, float r) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
  void main() {
    vec2 p = vUv * vec2(1.5, 1.0);
    float body = (length((p - vec2(0.75, 0.42)) / vec2(0.34, 0.24)) - 1.0) * 0.24;
    float lid = (length((p - vec2(0.75, 0.66)) / vec2(0.15, 0.06)) - 1.0) * 0.06;
    float knob = length(p - vec2(0.75, 0.74)) - 0.04;
    float spout = cap(p, vec2(1.02, 0.46), vec2(1.18, 0.62), 0.035);
    float handle = abs(length(p - vec2(0.38, 0.46)) - 0.12) - 0.032;
    float d = min(min(min(body, lid), knob), min(spout, handle));
    float w = fwidth(d) * 0.8 + 1e-4;
    vec3 col = mix(${V(PAL.teaRed)}, ${V(PAL.teaCream)}, 1.0 - smoothstep(-w, w, d));
    float edge = step(max(abs(vUv.x - 0.5) * 2.0, abs(vUv.y - 0.5) * 2.0), 0.94);
    col = mix(${V(PAL.wood)}, col, edge);
    gl_FragColor = vec4(col, 0.5);
  }`;

export function buildDressing(ctx, zFin) {
  const { THREE, engine } = ctx;
  const rng = ctx.rng("dressing");
  const group = new THREE.Group();
  const disposables = [], clothMats = [];
  const solid = (geo) => { const m = engine.prop(geo, 0.5); m.userData.layer = 1; group.add(m); disposables.push(m); return m; };
  const box = (w, h, d, x, y, z, c, s) => paintGeo(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c, s);

  // ---- cloth factory
  const cloth = (w, h, o) => {
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uAmp: { value: o.amp ?? 0.25 }, uOn: { value: o.on ?? 1 }, uPh: { value: o.ph ?? 0 }, uMode: { value: o.mode ?? 0 }, uCells: { value: new THREE.Vector2(...(o.cells ?? [8, 5])) }, uAsp: { value: w / h } },
      vertexShader: CLOTH_VERT, fragmentShader: CLOTH_FRAG,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 24, 8).translate(w / 2, 0, 0), mat);
    m.frustumCulled = false; m.userData.layer = 1;
    clothMats.push(mat); disposables.push(m);
    return m;
  };

  // ---- chequered flags on poles along the kerbs (E7)
  const poles = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let z = -40, i = 0; z < zFin + 4; z += 38, i++) {
      const x = side * 10.2, big = (i + (side > 0 ? 0 : 1)) % 2 === 0;
      poles.push(box(0.12, 6, 0.12, x, 3, z, "#d8d0c8", "#7a6a8a"));
      const f = cloth(big ? 2.2 : 1.5, big ? 1.3 : 0.9, { cells: big ? [8, 5] : [6, 4], ph: i * 1.7 + side });
      f.position.set(x, 5.2, z); f.rotation.y = -Math.PI / 2; group.add(f);
    }
  }
  // ---- gantry + finish banner (E7)
  const gantry = [
    box(0.7, 8, 0.7, -9.7, 4, zFin + 1.2, PAL.pylon, "#1c3f8a"), box(0.7, 8, 0.7, 9.7, 4, zFin + 1.2, PAL.pylon, "#1c3f8a"),
    box(21, 0.9, 0.9, 0, 8.2, zFin + 1.2, PAL.beam, "#7a1a1a"), box(21, 0.25, 0.25, 0, 8.85, zFin + 1.2, PAL.railGold, "#a8741a"),
  ];
  const banner = cloth(17.6, 1.5, { cells: [35, 3], amp: 0.06, ph: 0.4 });
  banner.position.set(-8.8, 7.0, zFin + 0.6); group.add(banner);

  // ---- tyre walls (E8): a row of lying tyres on each outer kerb, some stacked two high
  const tyre = [];
  const T = (x, y, z) => tyre.push(paintGeo(new THREE.TorusGeometry(0.42, 0.17, 6, 10).rotateX(Math.PI / 2).translate(x, y, z), PAL.tyre, PAL.tyreShadow));
  for (let side = -1; side <= 1; side += 2) for (let z = -30; z <= zFin + 2; z += 0.9) {
    T(side * 9.95, 0.17, z); if (rng() < 0.4) T(side * 9.95, 0.5, z);
  }
  // ---- rocks and cacti (E8)
  const rocks = [], cacti = [];
  for (let i = 0; i < 36; i++) {
    const side = rng() < 0.5 ? -1 : 1, x = side * (32 + rng() * 80), z = -60 + rng() * 360, s = 1 + rng() * 2.2;
    const g = new THREE.IcosahedronGeometry(1, 0);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const j = 0.78 + 0.4 * rng(); p.setXYZ(k, p.getX(k) * j, p.getY(k) * j, p.getZ(k) * j); }
    g.scale(s * 1.3, s * 0.8, s).rotateY(rng() * 6).translate(x, s * 0.3, z);
    rocks.push(paintGeo(g, PAL.rock, PAL.rockShadow));
  }
  for (let i = 0; i < 28; i++) {
    const side = rng() < 0.5 ? -1 : 1, x = side * (30 + rng() * 85), z = -60 + rng() * 360, s = 0.8 + rng() * 0.8;
    const C = (g) => cacti.push(paintGeo(g.scale(s, s, s).translate(x, 0, z), PAL.cactus, PAL.cactusShadow));
    C(new THREE.CylinderGeometry(0.34, 0.4, 3.4, 7).translate(0, 1.7, 0));
    C(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 6).rotateZ(Math.PI / 2).translate(-0.55, 1.5, 0));
    C(new THREE.CylinderGeometry(0.2, 0.2, 1.1, 6).translate(-0.98, 2.05, 0));
    C(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 6).rotateZ(Math.PI / 2).translate(0.5, 2.1, 0));
    C(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 6).translate(0.88, 2.5, 0));
  }
  solid(mergeParts(poles, "poles")); solid(mergeParts(gantry, "gantry")); solid(mergeParts(tyre, "tyres"));
  solid(mergeParts(rocks, "rocks")); solid(mergeParts(cacti, "cacti"));

  // ---- egg 1: the red cape with the Macedonian star on a pole above the left stand (+x), from 2.4 s
  const tCape = beatTime(ctx.scene, "cape", 2.4);
  solid(mergeParts([box(0.16, 6.5, 0.16, 27.5, 8.1, zFin - 48, "#d8d0c8", "#7a6a8a")], "starpole"));
  const star = cloth(3.4, 2.1, { mode: 1, amp: 0.38, on: 0, ph: 0.9 });
  star.position.set(27.4, 10.4, zFin - 48); star.rotation.y = -Math.PI / 2; group.add(star);
  const starMat = star.material;

  // ---- egg 2: the Waver tea cart by the gantry, 11.0 to 15.3 s
  const cart = new THREE.Group();
  const cartParts = [
    box(1.7, 0.9, 1.1, 0, 0.75, 0, PAL.wood, "#3c2430"),
    box(2.1, 0.08, 1.5, 0, 2.05, 0, PAL.teaRed, "#6a0a1c"),
    box(2.1, 0.06, 0.75, 0, 2.09, 0.38, PAL.teaCream, "#a89878"),
    box(0.08, 1.4, 0.08, -0.9, 1.4, 0.6, PAL.wood, "#3c2430"), box(0.08, 1.4, 0.08, 0.9, 1.4, 0.6, PAL.wood, "#3c2430"),
    paintGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 10).rotateX(Math.PI / 2).translate(-0.7, 0.36, 0.62), PAL.tyre, PAL.tyreShadow),
    paintGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 10).rotateX(Math.PI / 2).translate(0.7, 0.36, 0.62), PAL.tyre, PAL.tyreShadow),
  ];
  const cartMesh = engine.prop(mergeParts(cartParts, "cart"), 0.5); cart.add(cartMesh);
  const signMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: SIGN_FRAG });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), signMat);
  sign.position.set(0, 2.9, 0.1); cart.add(sign);
  cart.position.set(13.2, 0, zFin - 14); cart.rotation.y = -Math.PI / 2 + 0.25; cart.visible = false;
  cart.traverse((o) => { o.userData.layer = 1; });
  group.add(cart); disposables.push(cartMesh, sign);
  const tWaver = [beatTime(ctx.scene, "waver", 11.0), 15.3];

  return {
    group,
    update(t) {
      for (const m of clothMats) m.uniforms.uTime.value = t;
      starMat.uniforms.uOn.value = sm01((t - tCape) / 0.5);
      cart.visible = t >= tWaver[0] && t <= tWaver[1];
    },
    dispose() {
      for (const o of disposables) { o.geometry?.dispose(); o.material?.dispose?.(); }
      signMat.dispose();
    },
  };
}
