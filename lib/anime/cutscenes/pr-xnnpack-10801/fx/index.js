// FX layer for pr-xnnpack-10801 (Aizen, protected look). Layer 1. Written from scripts/pr-xnnpack-10801.md sections 6 and 7.
// Everything screen-space is ONE picture plane sitting just behind the seal (plane.js), so the seal is never covered or milky;
// the plane's program is overlay-shader.js (all the maths is commented there). Extra parts: falling glass shards (instanced),
// the "10801" shard, sand motes (points), the dais-foot gap light (32 ticks = 32 MiB).
//
// CUES (each is a free beat; the default time in seconds is the bible's, a beat of that name overrides the start):
//   wipe 0.6 d2.4   black wipe out of the pup (shot 1)           swell1 2.0 d1.0 / swell2 8.4 d0.9  reverse swell (a breath in)
//   eyepanel 3.9    ten TYBW ovals (egg 2)                       slash1 4.85 / slash2 5.35  slash arc, 3 frames on ones (arg at:[u,v])
//   crack1 5.42     glass cracks once and mends (ones x2)        (arg at:[u,v])   hat: rides crack1 (Urahara's hat in a hole, egg 4)
//   flash1 5.42 / flash2 8.96 / flash3 9.55  cold flash #aab1bf  hogyoku 6.4  one violet-blue dot, 1 frame (egg 1)
//   gap 8.4 (args y,z)  dais-foot light, width 32 (egg 6)        crack2 8.96  second crack from the blade (arg at:[u,v])
//   snap 9.58  the tip snaps; dimension falls as shards          choir 9.6 d1.4  pale columns       number 9.6  "10801" shard (egg 3)
//   island (optional)  when the island is visible: the glass fill fades out from there (default 11.0)
// Reserved beats (impact, speedlines, shock, trauma) are fired by scene.js; this layer only adds trauma on the three breaks.
import { makePlane } from "./plane.js";
import { VERT, FRAG } from "./overlay-shader.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const F24 = 1 / 24;

export default function build(ctx) {
  const T = ctx.THREE, seal = ctx.seal, rng = ctx.rng("fx-aizen");
  const group = new T.Group();
  const P = makePlane(T, seal, 0.6);
  const disposables = [];
  const V2 = (x = 0, y = 0) => new T.Vector2(x, y), V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), V4 = (x = 0, y = 0, z = 0, w = 0) => new T.Vector4(x, y, z, w);
  const blendPM = { blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor };

  // ---- 1. the overlay plane (wipe, glass, hat, eyes, swell, choir, slashes, hogyoku, flash) -------------------------------
  const U = {
    uAsp: { value: 1 }, uPx: { value: 1 / 720 }, uSeal: { value: V2() }, uHog: { value: V3() }, uWipe: { value: V2(0, 0) },
    uC1: { value: V4() }, uB1: { value: V4(0, 3.0, 1, 0) }, uC2: { value: V4() }, uB2: { value: V4(0, 7.0, 1, 0) },
    uSl1: { value: V4(0, 0, 0, 0.42) }, uSl2: { value: V4(0, 0, 0.05, 0.38) },
    uSwell: { value: -1 }, uChoir: { value: 0 }, uEye: { value: 0 }, uHat: { value: V4() }, uFlash: { value: 0 },
  };
  const overlayMat = new T.ShaderMaterial({
    uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true,
    premultipliedAlpha: true, toneMapped: false, ...blendPM,
  });
  // the plane matrix scales by H (frame height in metres at the plane), so the quad is in frame-height units: 2.4 wide covers
  // every aspect up to 2.4:1, 1.1 tall; uAsp stays 1 (vP = position.xy = frame-height units).
  const overlayGeo = new T.PlaneGeometry(2.4, 1.1);
  const overlay = new T.Mesh(overlayGeo, overlayMat);
  overlay.renderOrder = 900;
  const hogWorld = V3(), hogUV = V2();
  P.onPlane(overlay, (fr, cam) => {
    U.uPx.value = fr.px; U.uSeal.value.copy(fr.sealUV);
    // the Hogyoku dot sits above the throne back: the seal's chest, 2.2 m up (x seal scale)
    seal.chest(hogWorld); hogWorld.y += 2.2 * (seal.scale || 1);
    P.toUV(hogWorld, cam, hogUV); U.uHog.value.x = hogUV.x; U.uHog.value.y = hogUV.y;
  });
  group.add(overlay);
  disposables.push(overlayGeo, overlayMat);

  // ---- 2. falling glass shards (instanced triangles) ----------------------------------------------------------------------
  const NS = 150;
  const triGeo = new T.BufferGeometry();
  triGeo.setAttribute("position", new T.Float32BufferAttribute([0, 0.5, 0, -0.43, -0.25, 0, 0.43, -0.25, 0], 3));
  triGeo.setAttribute("bary", new T.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1], 3));
  const shardMat = new T.ShaderMaterial({
    uniforms: { uA: { value: 1 } },
    vertexShader: "attribute vec3 bary; varying vec3 vB; void main(){ vB = bary; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
    // fill #5fb6ff at 55%, a glass rim #d8ecff from the barycentric edge distance
    fragmentShader: "precision highp float; varying vec3 vB; uniform float uA;" +
      "void main(){ float e = min(vB.x, min(vB.y, vB.z)); float rim = 1.0 - smoothstep(0.02, 0.07, e);" +
      "vec3 c = mix(vec3(0.373,0.714,1.0), vec3(0.847,0.925,1.0), rim); float a = mix(0.55, 0.95, rim) * uA; gl_FragColor = vec4(c * a, a); }",
    transparent: true, depthWrite: false, premultipliedAlpha: true, side: T.DoubleSide, toneMapped: false, ...blendPM,
  });
  const shards = new T.InstancedMesh(triGeo, shardMat, NS);
  shards.instanceMatrix.setUsage(T.DynamicDrawUsage);
  shards.renderOrder = 901; shards.visible = false;
  P.onPlane(shards);
  group.add(shards);
  disposables.push(triGeo, shardMat);
  // per-shard constants: home (plane units), size 5-18% of frame height, fall delay, spin rates
  const sh = [];
  for (let i = 0; i < NS; i++) {
    sh.push({
      x: (rng() - 0.5) * 1.7, y: (rng() - 0.5) * 1.0, size: 0.05 + rng() * 0.13, rot: rng() * 6.283,
      wx: (rng() - 0.5) * 5, wy: (rng() - 0.5) * 5, wz: (rng() - 0.5) * 2.5, vx: (rng() - 0.5) * 0.12, jit: rng() * 0.18,
    });
  }
  const mM = new T.Matrix4(), mQ = new T.Quaternion(), mE = new T.Euler(), mP = new T.Vector3(), mS = new T.Vector3();

  // ---- 3. the "10801" shard (egg 3) ---------------------------------------------------------------------------------------
  let numTex = null;
  if (typeof document !== "undefined") {
    const cv = document.createElement("canvas"); cv.width = 320; cv.height = 128;
    const g = cv.getContext("2d");
    g.fillStyle = "rgba(95,182,255,0.55)"; g.beginPath(); g.moveTo(8, 118); g.lineTo(40, 8); g.lineTo(312, 22); g.lineTo(290, 120); g.closePath(); g.fill();
    g.strokeStyle = "#d8ecff"; g.lineWidth = 3; g.stroke();
    g.font = "bold 72px 'Courier New', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#080a0f"; g.fillText("10801", 160, 70);
    g.fillStyle = "#d8ecff"; g.fillText("10801", 157, 67);
    numTex = new T.CanvasTexture(cv); numTex.colorSpace = T.SRGBColorSpace;
  }
  const numMat = new T.MeshBasicMaterial({ map: numTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  const numGeo = new T.PlaneGeometry(0.3, 0.12);
  const numMesh = new T.Mesh(numGeo, numMat);
  numMesh.renderOrder = 902; numMesh.visible = false; numMesh.userData.local = new T.Matrix4();
  P.onPlane(numMesh);
  group.add(numMesh);
  disposables.push(numGeo, numMat); if (numTex) disposables.push(numTex);

  // ---- 4. sand motes (drift on twos, 0.3 m/s, #f4f4f0) --------------------------------------------------------------------
  const NM = 260, BOX = 34, BOXH = 12;
  const moteBase = new Float32Array(NM * 3), moteArr = new Float32Array(NM * 3);
  for (let i = 0; i < NM; i++) { moteBase[i * 3] = rng() * BOX; moteBase[i * 3 + 1] = rng() * BOXH; moteBase[i * 3 + 2] = rng() * BOX; }
  const moteGeo = new T.BufferGeometry();
  moteGeo.setAttribute("position", new T.BufferAttribute(moteArr, 3));
  const moteMat = new T.PointsMaterial({ color: 0xf4f4f0, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false });
  const motes = new T.Points(moteGeo, moteMat);
  motes.frustumCulled = false; motes.visible = false;
  group.add(motes);
  disposables.push(moteGeo, moteMat);
  const cv3 = V3();

  // ---- 5. dais-foot gap light (egg 6: 32 ticks, one per MiB of 144 - 112) -------------------------------------------------
  const gapMat = new T.ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    // opens from the centre (|x| < k); core #5fb6ff, rim #3d7fc4; 32 evenly spaced ticks across the full width
    fragmentShader: "precision highp float; varying vec2 vU; uniform float uK;" +
      "void main(){ float x = vU.x * 2.0 - 1.0, y = vU.y * 2.0 - 1.0; float open = 1.0 - smoothstep(uK - 0.04, uK, abs(x));" +
      "float tick = 1.0 - smoothstep(0.0, 0.18, abs(fract(vU.x * 32.0) - 0.5) * 2.0);" +
      "float band = 1.0 - smoothstep(0.35, 1.0, abs(y)); float core = 1.0 - smoothstep(0.0, 0.35, abs(y));" +
      "vec3 c = mix(vec3(0.239,0.498,0.769), vec3(0.373,0.714,1.0), core) + vec3(0.1,0.1,0.0) * tick * band;" +
      "float a = open * (0.2 + 0.8 * band) * (0.75 + 0.25 * tick); gl_FragColor = vec4(c * a, a); }",
    transparent: true, depthWrite: false, premultipliedAlpha: true, toneMapped: false, side: T.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...blendPM,
  });
  const gapGeo = new T.PlaneGeometry(1, 1);
  gapGeo.rotateX(-Math.PI / 2);
  const gap = new T.Mesh(gapGeo, gapMat);
  gap.visible = false; gap.renderOrder = 5;
  group.add(gap);
  disposables.push(gapGeo, gapMat);

  // ---- cue helpers ----------------------------------------------------------------------------------------------------------
  let C = null;
  // start time of an event: the beat's own start once it has fired, else the bible default
  const t0 = (name, def) => { const s = C.since(name); return Number.isFinite(s) ? C.t - s : def; };
  const arg = (name, key, def) => { const v = C.arg(name, key, def); return v == null ? def : v; };
  const ones = (s) => (s < 2 * F24 ? Math.floor(s * 24) / 24 : Math.floor(s * 12) / 12); // ones x2 then twos
  const fire = (name, amt) => { if (C.on(name)) ctx.sakuga.trauma(amt); };
  const flashAt = (s, frames, a) => (s >= 0 && s < frames * F24 ? a : 0);

  function slashU(u4, name, def, defAt) {
    const s = C.t - t0(name, def), f = Math.floor(s * 24);
    if (s < 0 || f > 3) { u4.set(0, 0, u4.z, u4.w); return; }
    const at = arg(name, "at", defAt);
    // 3 frames sweep on ones: prog 1/3, 2/3, 1; the 4th frame holds the trail at half strength
    u4.set(Math.min(1, (f + 1) / 3), f >= 3 ? 0.5 : 1, at[0], at[1]);
  }

  function update(t, dt, cue) {
    C = cue;
    const now = cue.t, ts = t;
    const aspect = ctx.aspect ? ctx.aspect() : 16 / 9;

    // wipe: black disc grows out of the pup, hard cut at the IMPACT (3.0 s)
    const wk = (now - t0("wipe", 0.6)) / arg("wipe", "dur", 2.4);
    U.uWipe.value.set(sstep(0, 1, clamp(wk)) * 1.5 * Math.max(1, aspect), wk >= 0 && wk < 1 ? 1 : 0);

    // swell (reverse shockwave): 2.0 and 8.4
    let sw = -1;
    for (const [n, d, dur] of [["swell1", 2.0, 1.0], ["swell2", 8.4, 0.9]]) { const k = (now - t0(n, d)) / dur; if (k >= 0 && k <= 1) sw = k; }
    U.uSwell.value = sw;

    // eye panel (3.9 s): frames 0-2 on, 3 off, 4-7 on (flicker on ones)
    const ef = Math.floor((now - t0("eyepanel", 3.9)) * 24);
    U.uEye.value = (ef >= 0 && ef <= 2) || (ef >= 4 && ef <= 7) ? 1 : 0;

    // slash arcs
    slashU(U.uSl1.value, "slash1", 4.85, [0.0, 0.42]);
    slashU(U.uSl2.value, "slash2", 5.35, [0.05, 0.38]);

    // crack 1: strike 5.42, ones x2 then twos, holes open, then it mends over ~24 frames; Urahara's hat rides the hole
    {
      const s = now - t0("crack1", 5.42);
      if (s >= 0 && s < 1.2) {
        const q = ones(s), o = arg("crack1", "at", [0.06, 0.04]);
        const hole = 0.34 * sstep(0.08, 0.25, q) * (1 - sstep(0.45, 1.0, q));
        U.uC1.value.set(o[0], o[1], clamp(q * 9, 0, 1.15), hole);
        U.uB1.value.set(1 - sstep(0.85, 1.15, s), 3.0, 1, 0);
        U.uHat.value.set(-0.3, -0.08, s > 0.1 && s < 0.95 ? clamp(hole / 0.34, 0, 1) : 0, 1);
      } else { U.uC1.value.z = 0; U.uHat.value.w = 0; }
      fire("crack1", 0.5);
    }

    // crack 2: creeps from the blade 8.96 -> snap 9.58, then the picture falls (holes -> all); island fill fades from 11.0
    {
      const s = now - t0("crack2", 8.96), snap = t0("snap", 9.58), fs = t0("island", 11.0);
      if (s >= 0 && now < fs + 0.7) {
        const q = Math.floor(s * 12) / 12, sn = now - snap, o = arg("crack2", "at", [0.18, -0.1]);
        const hole = sn < 0 ? 0.1 * sstep(0.2, 0.6, q) : 0.1 + 0.9 * sstep(0, 0.35, sn);
        const fade = 1 - sstep(fs, fs + 0.6, now);
        U.uC2.value.set(o[0], o[1], sstep(0, 0.65, q) * 1.8, hole);
        U.uB2.value.set(fade, 7.0, fade, 0);
      } else U.uC2.value.z = 0;
      fire("crack2", 0.35); fire("snap", 0.9);
    }

    // choir (9.6)
    const ck = (now - t0("choir", 9.6)) / 1.4;
    U.uChoir.value = ck >= 0 && ck < 1 ? Math.sin(Math.PI * ck) : 0;

    // hogyoku: one frame at 6.4
    const hs = now - t0("hogyoku", 6.4);
    U.uHog.value.z = hs >= 0 && hs < F24 ? 1 : 0;

    // cold flash (tinted, never white): 1 frame at the first crack, 1 at the blade, 2 at the snap
    U.uFlash.value = Math.max(flashAt(now - t0("flash1", 5.42), 1, 0.35), flashAt(now - t0("flash2", 8.96), 1, 0.25), flashAt(now - t0("flash3", 9.55), 2, 0.35));

    // falling shards: spawn at the snap, delayed by distance from the blade, gravity 1.2 H/s^2 with a tumble
    const sn = now - t0("snap", 9.58);
    shards.visible = sn >= 0 && sn < 2.4;
    if (shards.visible) {
      const qn = Math.floor(sn * 12) / 12;
      for (let i = 0; i < NS; i++) {
        const a = sh[i], s = qn - (Math.hypot(a.x - 0.18, a.y + 0.1) * 0.35 + a.jit * 0.5);
        if (s < 0) { mM.makeScale(0.0001, 0.0001, 0.0001); shards.setMatrixAt(i, mM); continue; }
        mP.set(a.x * (aspect / 1.78) + a.vx * s, a.y - 0.6 * s * s, 0);
        mQ.setFromEuler(mE.set(a.wx * s * 0.6, a.wy * s * 0.6, a.rot + a.wz * s));
        mS.setScalar(a.size * (1 + 0.25 * Math.min(1, s)));
        shards.setMatrixAt(i, mM.compose(mP, mQ, mS));
      }
      shards.instanceMatrix.needsUpdate = true;
      shardMat.uniforms.uA.value = 1 - sstep(1.6, 2.4, sn);
    }

    // the 10801 shard (9.6 -> 10.9): drifts down-right, tumbles about Y so it reads as glass, fades
    const ns = now - t0("number", 9.6);
    numMesh.visible = ns >= 0 && ns < 1.3;
    if (numMesh.visible) {
      const q = Math.floor(ns * 12) / 12;
      mP.set(0.2 + 0.03 * q, 0.06 - 0.09 * q, 0);
      mQ.setFromEuler(mE.set(0, Math.sin(q * 2.2) * 0.5, -0.08 + q * 0.1));
      numMesh.userData.local.compose(mP, mQ, mS.setScalar(1));
      numMat.opacity = sstep(0, 0.12, ns) * (1 - sstep(0.9, 1.3, ns));
    }

    // sand motes: only inside the dimension (3.0 -> 9.6); the box is anchored on the seal, pushed out of its 2.4 m column
    const dim = now > 2.9 && now < 9.9;
    motes.visible = dim;
    if (dim) {
      seal.chest(cv3);
      const dr = 0.3 * ts;
      for (let i = 0; i < NM; i++) {
        let x = (((moteBase[i * 3] + dr) % BOX) + BOX) % BOX - BOX / 2;
        const y = ((moteBase[i * 3 + 1] + dr * 0.25) % BOXH) - 3;
        let z = moteBase[i * 3 + 2] - BOX / 2;
        const r = Math.hypot(x, z);
        if (r < 2.4) { const k = 2.4 / Math.max(r, 0.01); x *= k; z *= k; }
        moteArr[i * 3] = cv3.x + x; moteArr[i * 3 + 1] = cv3.y + y; moteArr[i * 3 + 2] = cv3.z + z;
      }
      moteGeo.attributes.position.needsUpdate = true;
    }

    // the gap at the dais foot (8.4 -> the snap): 7 m x scale wide, opens from the centre
    const gs = now - t0("gap", 8.4);
    gap.visible = gs >= 0 && now < t0("snap", 9.58);
    if (gap.visible) {
      const sc = seal.scale || 1, gp = seal.group ? seal.group.position : cv3.set(0, 0, 0);
      gap.position.set(gp.x, arg("gap", "y", gp.y - 5.5 * sc) + 0.03, arg("gap", "z", gp.z + 3.0 * sc));
      gap.scale.set(7 * sc, 1, 0.55 * sc);
      gapMat.uniforms.uK.value = sstep(0, 0.9, gs);
    }
  }

  function dispose() { for (const d of disposables) if (d && d.dispose) d.dispose(); }
  return { group, update, dispose };
}
