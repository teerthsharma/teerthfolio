// Sky tear + Tengai Shinsei meteors.
//
// SKY TEAR (3.45-3.95 s): a jagged spine x_i = x0 + a_i (random walk), a strip of half-width w_i * open * (1 - |v|^3).
//   Layer 1 dark gap #0a0408 (normal blend) so it reads as a RIP, layer 2 light seam #fff2d8 (additive, 0.42 x width),
//   plus 6 forked branches. open(k) = smoothstep(0, .55, k); the seam flickers on twos: 0.8 + 0.2 hash(floor(12 t)).
//
// METEORS (bible 3.8): rock = 3-cut cel  tone = d > .35 ? 1 : d > -.1 ? .62 : .32,  d = N.L
//   lava = flat cell where vn3(P*.55) > .74 (colour #e6c799), rim .6 step(.5, (1-N.V)^3), inverted-hull edge #1a0f0a.
//   Radius is jittered by a smooth field r(P) = r0 (.92 + .1 sin(3x+a) sin(2.3y+b) + .08 sin(4.7z+c)): lumpy, no seams.
//   Fire tail = two cones (white-hot core r .5, ember r 1.15), shade (1 - h)^1.5 (.7 + .6 vn(atan, 8h - 14 t)),
//   core (1,.95,.8) -> ember (1,.54,.16) with h, plus 12 trailing chips.
//   M1: (-32,28,-105) -> (-13,0,-44), f = (t-3.8)/.9, u = f^2 (.6 + .4 f).
//   M2: r 32. Slides out 4.85 -> hangs (4,14,-68) wide / (3,19,-72) tall, to 6.1; slams to (5,0,-38) by 6.42 with u = a^2;
//       the last 4 frames (1/6 s) run on ones (display clock cue.t, not the stepped t).
import { NOISE } from "./glsl.js";
import { sstep, clamp01, lerp } from "./util.js";

export const M1_FROM = [-32, 28, -105], M1_TO = [-13, 0, -44];
export const M2_HANG_W = [4, 14, -68], M2_HANG_T = [3, 19, -72], M2_SLAM = [5, 0, -38];

function tear(ctx, THREE) {
  const rng = ctx.rng("tear");
  const N = 30, g = new THREE.Group();
  function strip(pts, w) {
    const pos = [], side = [], wid = [], idx = [];
    pts.forEach((p, i) => {
      const v = i / (pts.length - 1), ww = w * (0.35 + 0.65 * Math.sin(Math.PI * v)) * (0.7 + 0.6 * rng());
      pos.push(p[0], p[1], p[2], p[0], p[1], p[2]); side.push(-1, 1); wid.push(ww, ww);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
    geo.setAttribute("aW", new THREE.Float32BufferAttribute(wid, 1));
    geo.setIndex(idx);
    return geo;
  }
  const mk = (col, add, scale) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uOpen: { value: 0 }, uA: { value: 1 }, uCol: { value: new THREE.Color(col) }, uScale: { value: scale } },
    vertexShader: `attribute float aSide; attribute float aW; uniform float uOpen,uScale; varying float vS;
      void main(){ vS=aSide; vec3 p=position; p.x += aSide*aW*uOpen*uScale; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float uA; uniform vec3 uCol; varying float vS;
      void main(){ float e=1.-pow(abs(vS),3.); gl_FragColor=vec4(uCol*(.6+.7*e),uA);}`,
  });
  const dark = mk("#0a0408", false, 1.0), seam = mk("#fff2d8", true, 0.42);
  const spine = [];
  let x = 0;
  for (let i = 0; i <= N; i++) { x += (rng() - 0.5) * 3.2; spine.push([x, -22 + (44 * i) / N, 0]); }
  const meshes = [strip(spine, 3.4)];
  for (let b = 0; b < 6; b++) {                       // forked branches
    const s = spine[4 + Math.floor(rng() * (N - 8))], dir = rng() < 0.5 ? -1 : 1, br = [];
    let bx = s[0], by = s[1];
    for (let i = 0; i < 8; i++) { bx += dir * (1.4 + rng() * 2); by += (rng() - 0.35) * 3.4; br.push([bx, by, 0]); }
    br.unshift(s); meshes.push(strip(br, 1.1));
  }
  const objs = [];
  meshes.forEach((geo) => {
    const d = new THREE.Mesh(geo, dark); d.renderOrder = 1; d.frustumCulled = false;
    const l = new THREE.Mesh(geo, seam); l.renderOrder = 2; l.frustumCulled = false; l.position.z = 0.05;
    g.add(d, l); objs.push(d, l);
  });
  g.position.set(3, 26, -86); g.scale.setScalar(1.15); g.visible = false;
  return {
    group: g,
    update(t, cue, win) {
      const w = win(cue, "skytear", 3.45, 0.5);
      const open = sstep(0, 0.55, w.k);
      const gone = win(cue, "flareHit", 6.42, 0.3).k;           // the rip closes into the impact flash
      const alive = w.s >= 0 && gone < 1;
      g.visible = alive;
      dark.uniforms.uOpen.value = seam.uniforms.uOpen.value = open * (1 - gone);
      const fl = 0.8 + 0.2 * Math.abs(Math.sin(Math.floor(t * 12) * 12.9898) * 43758.5453 % 1);
      seam.uniforms.uA.value = fl * (1 - gone); dark.uniforms.uA.value = 0.96 * (1 - gone);
    },
    dispose() { dark.dispose(); seam.dispose(); meshes.forEach((m) => m.dispose()); },
  };
}

function rockGeo(THREE, r, detail, ph) {
  const geo = new THREE.IcosahedronGeometry(r, detail), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const k = 0.92 + 0.1 * Math.sin(3 * n.x + ph[0]) * Math.sin(2.3 * n.y + ph[1]) + 0.08 * Math.sin(4.7 * n.z + ph[2]) + 0.05 * Math.sin(9 * n.x + 7 * n.y + ph[0]);
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function meteor(ctx, THREE, r, detail, salt) {
  const rng = ctx.rng(salt);
  const root = new THREE.Group();
  const ph = [rng() * 6, rng() * 6, rng() * 6];
  const rock = new THREE.ShaderMaterial({
    uniforms: { uHeat: { value: 0 }, uSc: { value: 0.55 / Math.max(1, r / 4.5) } },
    vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vV; uniform float uSc;
      void main(){ vP=position*uSc; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz);
        gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${NOISE} varying vec3 vN; varying vec3 vP; varying vec3 vV; uniform float uHeat;
      void main(){
        vec3 N=normalize(vN), V=normalize(vV), L=normalize(vec3(.5,.7,.4));
        float d=dot(N,L); float tone = d>.35 ? 1. : (d>-.1 ? .62 : .32);       // 3-cut cel
        vec3 col = vec3(.165,.129,.102)*tone*1.5;                                // rock #2a211a
        float n = vn3(vP*1.0);
        float lava = step(.74 - .25*uHeat, n);                                   // flat lava cells
        col = mix(col, vec3(.9,.78,.6)*(1.1+.6*uHeat), lava);
        float fr = pow(1.-clamp(dot(N,V),0.,1.),3.);
        col += vec3(.9,.78,.6)*.6*step(.5,fr);                                   // rim .6
        gl_FragColor=vec4(col,1.); }`,
  });
  const rm = new THREE.Mesh(rockGeo(THREE, r, detail, ph), rock); rm.renderOrder = 3; rm.frustumCulled = false;
  const hull = new THREE.Mesh(rm.geometry, new THREE.MeshBasicMaterial({ color: 0x1a0f0a, side: THREE.BackSide }));
  hull.scale.setScalar(1.045); hull.renderOrder = 2; hull.frustumCulled = false;       // inverted-hull 2 px dark edge
  root.add(hull, rm);

  // tail: two additive cones pointing along -travel
  const tailMat = (core) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uL: { value: 1 }, uA: { value: 1 }, uCore: { value: core ? 1 : 0 } },
    vertexShader: `varying float vH; varying vec3 vN; varying vec3 vV; varying vec2 vXZ; uniform float uL;
      void main(){ vH=position.y/uL; vXZ=position.xz; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz);
        gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${NOISE} varying float vH; varying vec3 vN; varying vec3 vV; varying vec2 vXZ; uniform float uT,uA,uCore;
      void main(){ float h=clamp(vH,0.,1.);
        float fl=.7+.6*vn(vec2(atan(vXZ.x,vXZ.y)*3., h*8.-uT*14.));
        float a=pow(1.-h,1.5)*fl*pow(abs(dot(normalize(vN),normalize(vV))),.8);
        vec3 c = uCore>.5 ? mix(vec3(1.,.95,.8),vec3(1.,.82,.5),h) : mix(vec3(1.,.54,.16),vec3(.45,.18,.06),h);
        gl_FragColor=vec4(c*a*uA*1.4,1.); }`,
  });
  const L1 = r * 5.8, L2 = r * 4.0;
  const mkCone = (rad, len, mat) => {
    const geo = new THREE.ConeGeometry(rad, len, 20, 1, true); geo.translate(0, len / 2, 0);
    mat.uniforms.uL.value = len;
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 4; m.frustumCulled = false; return m;
  };
  const ember = mkCone(r * 0.26, L1, tailMat(false)), core = mkCone(r * 0.11, L2, tailMat(true));
  const tail = new THREE.Group(); tail.add(ember, core); root.add(tail);

  // 12 trailing chips (opaque rock) lagging along the path
  const chipGeo = new THREE.IcosahedronGeometry(r * 0.06, 0);
  const chipM = new THREE.MeshBasicMaterial({ color: 0x2a211a });
  const chips = new THREE.InstancedMesh(chipGeo, chipM, 12); chips.frustumCulled = false;
  const chipSeed = Array.from({ length: 12 }, () => [rng() - 0.5, rng() - 0.5, rng() - 0.5, 0.04 + rng() * 0.2]);
  return { root, rock, tail, ember, core, chips, chipSeed, r, dispose() { rm.geometry.dispose(); rock.dispose(); hull.material.dispose(); chipGeo.dispose(); chipM.dispose(); } };
}

export function buildSky(ctx) {
  const { THREE } = ctx;
  const g = new THREE.Group();
  const T = tear(ctx, THREE); g.add(T.group);
  const m1 = meteor(ctx, THREE, 4.5, 2, "m1"), m2 = meteor(ctx, THREE, 32, 3, "m2");
  g.add(m1.root, m2.root, m1.chips, m2.chips);
  m1.root.visible = m2.root.visible = m1.chips.visible = m2.chips.visible = false;

  const dummy = new THREE.Object3D(), A = new THREE.Vector3(), B = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
  const lerp3 = (a, b, u, out) => out.set(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u));

  function place(m, pos, vel, t, vis, heat, scaleTail) {
    m.root.visible = vis; m.chips.visible = vis;
    if (!vis) return;
    m.root.position.copy(pos);
    const dir = vel.clone().normalize();
    m.tail.quaternion.setFromUnitVectors(UPV, dir.clone().negate());
    m.tail.scale.setScalar(scaleTail);
    m.ember.material.uniforms.uT.value = t; m.core.material.uniforms.uT.value = t;
    m.rock.uniforms.uHeat.value = heat;
    m.root.rotation.y = t * 0.4;
    for (let i = 0; i < 12; i++) {                         // chips trail behind in world space
      const s = m.chipSeed[i], lag = (i + 1) * m.r * 0.85;
      dummy.position.copy(pos).addScaledVector(dir, -lag).add(B.set(s[0], s[1], s[2]).multiplyScalar(m.r * 1.6));
      dummy.rotation.set(t * 3 * s[3] * 6, t * 2, i); dummy.scale.setScalar(0.8 + s[3] * 4); dummy.updateMatrix();
      m.chips.setMatrixAt(i, dummy.matrix);
    }
    m.chips.instanceMatrix.needsUpdate = true;
  }

  return {
    group: g,
    update(t, dt, cue, win) {
      T.update(t, cue, win);
      const tall = ctx.aspect() < 1;
      // ---- M1: 3.8-4.7 s, f^2 (.6+.4 f), plunges to the ridge then is gone in a puff (impact module draws it)
      const w1 = win(cue, "meteor1", 3.8, 0.9), f = w1.k, u = f * f * (0.6 + 0.4 * f);
      lerp3(M1_FROM, M1_TO, u, A);
      const v1 = new THREE.Vector3(M1_TO[0] - M1_FROM[0], M1_TO[1] - M1_FROM[1], M1_TO[2] - M1_FROM[2]);
      place(m1, A.clone(), v1, t, w1.s >= 0 && w1.s < 0.9, f, 1);

      // ---- M2: slide out 4.85 -> hang -> slam 6.1-6.42 (a^2), last 4 frames on ones
      const sRaw = win(cue, "meteor2", 4.85, 1.57).s;          // 0 .. 1.57 -> 6.42 (display clock)
      const ones = sRaw > 1.57 - 4 / 24;                        // last 4 frames run on ones, the rest on twos
      const s = ones ? sRaw : Math.floor(sRaw * 12) / 12;
      const hang = tall ? M2_HANG_T : M2_HANG_W;
      const vis2 = sRaw >= 0 && sRaw < 1.57;
      const pos = new THREE.Vector3(), vel = new THREE.Vector3(0, -1, -0.3);
      if (s < 0.65) {                                           // slide out of the sky
        const a = sstep(0, 1, s / 0.65);
        pos.set(hang[0], lerp(hang[1] + 46, hang[1], a), lerp(hang[2] - 60, hang[2], a)); vel.set(0, -1, 0.9);
      } else if (s < 1.25) {                                    // hang: slow bob
        pos.set(hang[0], hang[1] + Math.sin((s - 0.65) * 3) * 0.6, hang[2]); vel.set(0, -0.2, 0.05);
      } else {                                                  // slam: a^2
        const a = clamp01((s - 1.25) / 0.32), e = a * a;
        pos.set(lerp(hang[0], M2_SLAM[0], e), lerp(hang[1], M2_SLAM[1] + 8, e), lerp(hang[2], M2_SLAM[2], e));
        vel.set(M2_SLAM[0] - hang[0], -hang[1], M2_SLAM[2] - hang[2]);
      }
      const heat = s < 1.25 ? 0.2 + 0.1 * Math.sin(s * 5) : 0.5 + 0.5 * clamp01((s - 1.25) / 0.32);
      place(m2, pos, vel, ones ? cue.t : t, vis2, heat, s < 1.25 ? 0.55 : 1.15);
    },
    dispose() { T.dispose(); m1.dispose(); m2.dispose(); },
  };
}
