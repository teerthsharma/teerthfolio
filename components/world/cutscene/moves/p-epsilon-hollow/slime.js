// TENSURA builders: the crystal cave and its pool, Veldora sealed in his sphere, Demon Lord Rimuru's
// towering silhouette, the void maw that eats reality, MEGIDDO's water lenses and sunbeams, the Great Sage's holographic panel and 
// One opaque material (rimMaterial: flat toon bands, cyan/gold rim, emissive "glow" kinds) plus a few additive glow shaders.
// Everything is built once at mount; nothing is allocated per frame.
import { AdditiveBlending, BackSide, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, TorusGeometry } from "three";
import { KIND, layer } from "./paper";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const GLOW = { kind: KIND.glow, noEdge: true };
const mesh = (mat, geo) => {
  const m = new Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
};

export function makeRim() {
  return new ShaderMaterial({
    side: DoubleSide,
    vertexColors: true,
    uniforms: { uTime: { value: 0 }, uGlow: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 aMeta;
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying vec4 vMeta;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = color.rgb;
        #endif
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vCol *= instanceColor;
        #endif
        vec4 w = modelMatrix * p;
        vWorld = w.xyz;
        vN = mat3(modelMatrix) * n + vec3(0.0, 0.0001, 0.0);
        vMeta = aMeta;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uGlow;
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying vec4 vMeta;
      void main() {
        vec3 n = normalize(vN + vec3(0.0, 0.0001, 0.0));
        if (!gl_FrontFacing) n = -n;
        vec3 base = pow(vCol, vec3(1.0 / 2.2));
        if (vMeta.x > 5.5) { gl_FragColor = vec4(base * (1.1 + 0.25 * uGlow), 1.0); return; }
        float d = dot(n, normalize(vec3(-0.45, 0.7, 0.55))) * 0.5 + 0.5;
        float shade = 0.7 + 0.18 * step(0.4, d) + 0.16 * step(0.72, d);
        vec3 v = normalize(cameraPosition - vWorld + vec3(0.0, 0.0001, 0.0));
        float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);
        vec3 rc = mix(vec3(1.0, 0.72, 0.25), vec3(0.25, 0.85, 1.0), step(0.0, n.x));
        rim *= 1.0 - smoothstep(0.45, 0.9, abs(n.y));
        gl_FragColor = vec4(base * shade + rc * rim * 1.1, 1.0);
      }`,
  });
}

// ---------------------------------------------------------------- the cave
export function caveSky() {
  const m = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: { uEat: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uEat; varying vec3 vW;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        vec3 dir = normalize(vW - cameraPosition + vec3(0.0, 0.0001, 0.0));
        float y = clamp(dir.y, -0.2, 1.0);
        vec3 c = mix(vec3(0.1, 0.75, 0.95), vec3(0.22, 0.38, 0.95), smoothstep(0.0, 0.25, y));
        c = mix(c, vec3(0.55, 0.2, 0.85), smoothstep(0.22, 0.6, y));
        c = mix(c, vec3(0.2, 0.08, 0.48), smoothstep(0.55, 1.0, y));
        float az = atan(dir.x, dir.z + 0.0001);
        vec3 cell = floor(vec3(az * 14.0, y * 22.0, 0.0));
        float s = step(0.965, h(cell)) * (0.6 + 0.4 * h(cell + 3.0));
        c += mix(vec3(0.5, 1.0, 1.0), vec3(1.0, 0.6, 1.0), h(cell + 7.0)) * s;
        float d = acos(clamp(dot(dir, normalize(vec3(0.0, 0.25, -1.0))), -1.0, 1.0));
        float rr = uEat * 3.6;
        float ang = atan(dir.y - 0.25, dir.x + 0.0001);
        float arms = 0.5 + 0.5 * sin(ang * 3.0 + d * 9.0 - uEat * 14.0);
        float inside = 1.0 - smoothstep(rr - 0.5, rr, d);
        float edge = smoothstep(rr - 0.9, rr - 0.3, d) * inside;
        c = mix(c, vec3(0.03, 0.0, 0.07) + vec3(0.7, 0.1, 0.9) * arms * edge * 0.8, inside);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m3 = mesh(m, new SphereGeometry(150, 24, 16));
  m3.renderOrder = -10;
  return { mesh: m3, dispose: () => (m3.geometry.dispose(), m.dispose()) };
}

// the floor: concentric bands of purple and teal crystal stone, and a rim of tall glowing crystals
export function floor(mat) {
  const L = layer();
  const bands = ["#6a2fd0", "#3b3fe0", "#8a3fe0", "#2a7ae6", "#a040e0", "#2f58d8"];
  for (let i = 0; i < 6; i++) {
    const r1 = 30 - i * 5;
    L.add(new CylinderGeometry(r1, r1, 0.1, 40).translate(0, 0.05 + i * 0.004, 0), bands[i], {});
  }
  const cols = ["#3ff0ff", "#ff5ad8", "#9a6bff", "#46ffc8", "#6aa8ff"];
  for (let k = 0; k < 34; k++) {
    const a = (k / 34) * Math.PI * 2 + hash(k, 1) * 0.2;
    const near = k % 3 === 0;
    const ring = near ? 11 + 4 * hash(k, 2) : 24 + 7 * hash(k, 2);
    const h = near ? 1.6 + 1.6 * hash(k, 3) : 6 + 11 * hash(k, 3);
    const r = (near ? 0.5 : 1.2) * (0.7 + hash(k, 4));
    if (near && Math.cos(a) > 0.2 && Math.sin(a) > 0.2) continue; // keep the camera side open
    const c = cols[k % cols.length];
    L.add(new ConeGeometry(r, h, 6).translate(0, h / 2, 0), c, k % 2 ? GLOW : {}, Math.cos(a) * ring, 0, Math.sin(a) * ring, 0, hash(k, 5) * 0.2 - 0.1, hash(k, 6) * 0.2 - 0.1);
  }
  return mesh(mat, L.build());
}

// ripples: one additive disc (the cave pool, the return portal). colours a/b, swirl false = plain rings
export function ripple(a, b, swirl) {
  const m = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: { uA: { value: new Color(a) }, uB: { value: new Color(b) }, uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA, uB; uniform float uT, uK; varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x + 0.0001);
        float w = sin(r * 22.0 - uT * 3.5 + ${swirl ? "ang * 3.0" : "0.0"}) * 0.5 + 0.5;
        float edge = 1.0 - smoothstep(0.82, 1.0, r);
        float core = 1.0 - smoothstep(0.0, 1.0, r);
        vec3 c = mix(uA, uB, w) * (0.35 + 0.65 * w) * edge + uA * core * 0.6 + uB * smoothstep(0.85, 0.96, r) * edge * 0.8;
        gl_FragColor = vec4(c * uK, 1.0);
      }`,
  });
  const g = new PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const o = mesh(m, g);
  o.position.y = 0.16;
  o.visible = false;
  return { mesh: o, mat: m, dispose: () => (g.dispose(), m.dispose()) };
}

// ---------------------------------------------------------------- Veldora sealed: a black and gold Storm Dragon coiled in a glowing seal sphere
const aura = (c, rim) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uC: { value: new Color(c) }, uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ vP = position; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal + vec3(0.0,0.0001,0.0)); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uC; uniform float uT, uK; varying vec3 vN; varying vec3 vP; varying vec3 vW;
      void main() {
        vec3 v = normalize(cameraPosition - vW + vec3(0.0, 0.0001, 0.0));
        float f = pow(1.0 - abs(dot(normalize(vN + vec3(0.0, 0.0001, 0.0)), v)), ${rim});
        float s = 0.55 + 0.45 * sin(vP.y * 9.0 + vP.x * 5.0 - uT * 5.0) * sin(vP.z * 7.0 + uT * 3.0);
        gl_FragColor = vec4(uC * (f * 1.3 + 0.12) * s * uK, 1.0);
      }`,
  });

export function veldora(mat) {
  const L = layer();
  const BLACK = "#15102e";
  const GOLD = "#ffc83a";
  // the body: a coil of black segments narrowing to the tail, a gold ridge along the back
  const N = 15;
  const pt = (i) => {
    const a = i * 0.62;
    const r = 0.62 * (1 - i / 26);
    return [Math.cos(a) * r, -0.72 + i * 0.075, Math.sin(a) * r];
  };
  for (let i = 0; i < N; i++) {
    const [x, y, z] = pt(i);
    const s = 0.3 * (1 - i * 0.045) + 0.06;
    L.add(new SphereGeometry(s, 10, 8), BLACK, {}, x, y, z);
    L.add(new ConeGeometry(s * 0.45, s * 1.1, 4), GOLD, i % 2 ? GLOW : {}, x, y + s * 1.0, z);
    L.add(new SphereGeometry(s * 0.55, 8, 6), GOLD, {}, x, y - s * 0.35, z - s * 0.2, 0, 0, 0, 1.3, 0.5, 0.9);
  }
  // the head, facing the camera: jaw, snout, golden horns and eyes
  const [hx, hy] = pt(N - 1);
  const H = [hx * 0.4, hy + 0.5, 0.22];
  L.add(new SphereGeometry(0.34, 12, 10), BLACK, {}, H[0], H[1], H[2], 0, 0, 0, 1.1, 0.9, 1.15);
  L.add(new SphereGeometry(0.2, 10, 8), BLACK, {}, H[0], H[1] - 0.12, H[2] + 0.34, 0, 0, 0, 1.2, 0.7, 1.3);
  for (const sx of [-1, 1]) {
    L.add(new ConeGeometry(0.07, 0.7, 6), GOLD, GLOW, H[0] + sx * 0.22, H[1] + 0.38, H[2] - 0.05, 0, -0.5, sx * -0.55);
    L.add(new SphereGeometry(0.075, 8, 6), "#fff1a8", GLOW, H[0] + sx * 0.16, H[1] + 0.06, H[2] + 0.28);
    L.add(new ConeGeometry(0.1, 0.28, 4), GOLD, {}, H[0] + sx * 0.3, H[1] - 0.2, H[2] + 0.1, 0, 0, sx * 1.1);
  }
  // wings: two black blades edged in gold
  for (const sx of [-1, 1]) {
    L.add(new ConeGeometry(0.34, 1.6, 4), BLACK, {}, sx * 0.62, -0.02, -0.1, 0, 0, sx * -1.15, 0.5, 1, 0.45);
    L.add(new ConeGeometry(0.1, 1.55, 4), GOLD, GLOW, sx * 0.64, 0.03, -0.1, 0, 0, sx * -1.15, 0.4, 1, 0.4);
  }
  const g = new Group();
  const body = mesh(mat, L.build());
  body.scale.setScalar(1.15);
  g.add(body);
  // the seal: an outer gold shell and an inner stormy blue one, rimlit
  const shellMat = aura("#ffd25a", "2.2");
  const stormMat = aura("#3aa6ff", "1.4");
  const shell = mesh(shellMat, new SphereGeometry(1.8, 28, 20));
  const storm = mesh(stormMat, new SphereGeometry(1.3, 24, 16));
  shell.renderOrder = 4;
  storm.renderOrder = 3;
  g.add(shell, storm);
  g.visible = false;
  return {
    root: g,
    update(t, k) {
      shellMat.uniforms.uT.value = t;
      stormMat.uniforms.uT.value = t;
      shellMat.uniforms.uK.value = k;
      stormMat.uniforms.uK.value = k * (0.8 + 0.4 * Math.sin(t * 11));
      body.rotation.y = Math.sin(t * 0.9) * 0.35;
    },
    dispose() {
      body.geometry.dispose();
      shell.geometry.dispose();
      storm.geometry.dispose();
      shellMat.dispose();
      stormMat.dispose();
    },
  };
}

// ---------------------------------------------------------------- Demon Lord Rimuru: long black hair, golden eyes, a black coat with gold trim
export function human(mat) {
  const L = layer();
  const HAIR = "#0d0a1c";
  const COAT = "#14101f";
  L.add(new ConeGeometry(0.55, 1.7, 10).translate(0, 0.85, 0), COAT, {}, 0, 0.5, 0, 0, 0, 0, 1, 1, 0.7);
  L.add(new CylinderGeometry(0.62, 0.62, 0.12, 10), "#d4a63a", {}, 0, 1.05, 0, 0, 0, 0, 1, 1, 0.7);
  L.add(new SphereGeometry(0.34, 14, 12), "#ffe9d8", {}, 0, 2.55, 0);
  L.add(new SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), HAIR, {}, 0, 2.62, -0.04);
  // the long hair falls behind the shoulders in blue-silver ribbons
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.14;
    L.add(new ConeGeometry(0.16, 1.9 - Math.abs(i - 3) * 0.12, 6).translate(0, -0.95, 0).rotateX(Math.PI), i % 2 ? HAIR : "#2b2060", {}, x, 2.5, -0.22, 0, 0, 0, 1, 1, 0.8);
  }
  for (const sx of [-1, 1]) {
    L.add(new SphereGeometry(0.055, 8, 6), "#ffd23a", GLOW, sx * 0.13, 2.58, 0.32);
    L.add(new ConeGeometry(0.1, 0.7, 6).translate(0, -0.35, 0).rotateX(Math.PI), COAT, {}, sx * 0.62, 1.95, 0, 0, 0, sx * 0.25);
  }
  const g = new Group();
  const body = mesh(mat, L.build());
  g.add(body);
  g.visible = false;
  return { root: g, dispose: () => body.geometry.dispose() };
}

// ---------------------------------------------------------------- MEGIDDO: floating water lenses focus the sun into beams
const beamMat = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uK: { value: 1 }, uT: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uK, uT; varying vec2 vUv;
      void main() {
        float a = 1.0 - abs(vUv.x * 2.0 - 1.0);
        float s = 0.75 + 0.25 * sin(vUv.y * 40.0 - uT * 30.0);
        vec3 c = mix(vec3(1.0, 0.55, 0.12), vec3(1.0, 0.95, 0.6), a * a);
        gl_FragColor = vec4(c * a * a * s * uK * 1.6, 1.0);
      }`,
  });

export const LENSES = 7;
export function megiddo(mat) {
  const g = new Group();
  const bm = beamMat();
  const lensMat = new MeshBasicMaterial({ color: "#7fe8ff", transparent: true, opacity: 0.5, toneMapped: false, side: DoubleSide, depthWrite: false });
  const spot = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uK: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `uniform float uK; varying vec2 vUv; void main(){ float k = 1.0 - smoothstep(0.0, 1.0, length(vUv * 2.0 - 1.0)); gl_FragColor = vec4(vec3(1.0, 0.8, 0.3) * k * k * uK * 1.4, 1.0); }`,
  });
  const ringL = layer();
  ringL.add(new TorusGeometry(0.62, 0.07, 6, 28).rotateX(Math.PI / 2), "#bff6ff", GLOW);
  const ringGeo = ringL.build();
  const beamGeo = new PlaneGeometry(1, 1).translate(0, -0.5, 0);
  const discGeo = new PlaneGeometry(1.2, 1.2).rotateX(Math.PI / 2);
  const spotGeo = new PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const rig = [];
  for (let i = 0; i < LENSES; i++) {
    const a = (i / LENSES) * Math.PI * 2 + 0.3;
    const lens = new Group();
    lens.add(new Mesh(discGeo, lensMat), mesh(mat, ringGeo));
    const bx = Math.cos(a) * 5.2;
    const by = 5.6 + 1.1 * hash(i, 3);
    const bz = Math.sin(a) * 3.0 - 2.5;
    lens.position.set(bx, by, bz);
    const beam = new Mesh(beamGeo, bm);
    beam.frustumCulled = false;
    const hit = new Mesh(spotGeo, spot);
    hit.frustumCulled = false;
    g.add(lens, beam, hit);
    rig.push({ lens, beam, hit, bx, by, bz, tx: Math.cos(a + 0.5) * (3.2 + 2.2 * hash(i, 4)), tz: Math.sin(a + 0.5) * (2.2 + 1.4 * hash(i, 5)) - 1.6 });
  }
  g.visible = false;
  return {
    root: g,
    // k: 0..1 how far the rain has built; lensK: the lenses' scale
    update(t, k, lensK) {
      bm.uniforms.uT.value = t;
      spot.uniforms.uK.value = k * (0.8 + 0.2 * Math.sin(t * 17));
      for (let i = 0; i < rig.length; i++) {
        const r = rig[i];
        const on = Math.max(0, Math.min(1, (k - i * 0.07) / 0.35));
        const y = r.by + 0.14 * Math.sin(t * 1.7 + i);
        r.lens.scale.setScalar(Math.max(0.001, lensK));
        r.lens.position.set(r.bx, y, r.bz);
        r.lens.rotation.y = t * 0.8 + i;
        const dx = r.tx - r.bx;
        const dz = r.tz - r.bz;
        const len = Math.hypot(dx, y, dz);
        r.beam.visible = on > 0.01;
        r.beam.position.set(r.bx, y, r.bz);
        // the plane's long axis runs down -y; tip it toward the target
        r.beam.rotation.set(Math.atan2(dz, y), 0, -Math.atan2(dx, y), "ZXY");
        r.beam.scale.set(0.34 + 0.12 * Math.sin(t * 20 + i), len * on, 1);
        r.hit.position.set(r.tx, 0.2, r.tz);
        r.hit.scale.setScalar(Math.max(0.001, 0.7 * on));
        r.hit.visible = on > 0.01;
      }
    },
    dispose() {
      ringGeo.dispose();
      beamGeo.dispose();
      discGeo.dispose();
      spotGeo.dispose();
      bm.dispose();
      lensMat.dispose();
      spot.dispose();
    },
  };
}

// ---------------------------------------------------------------- the Great Sage: a floating blue holographic panel with the 《Notice》 header
export function sagePanel(text) {
  const c = document.createElement("canvas");
  c.width = 1100;
  c.height = 280;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = "rgba(6,24,70,0.82)";
    g.fillRect(8, 8, c.width - 16, c.height - 16);
    for (let y = 12; y < c.height - 12; y += 6) {
      g.fillStyle = "rgba(90,220,255,0.07)";
      g.fillRect(8, y, c.width - 16, 2);
    }
    g.strokeStyle = "#5ff0ff";
    g.lineWidth = 6;
    g.shadowColor = "#37d4ff";
    g.shadowBlur = 22;
    g.strokeRect(8, 8, c.width - 16, c.height - 16);
    g.shadowBlur = 0;
    g.fillStyle = "#7fe8ff";
    g.font = "700 34px 'Segoe UI','Yu Gothic UI',Meiryo,sans-serif";
    g.fillText("GREAT SAGE", 44, 62);
    g.fillRect(44, 76, 230, 3);
    g.fillStyle = "#e9fdff";
    g.shadowColor = "#37d4ff";
    g.shadowBlur = 16;
    let px = 56;
    while (px > 40) {
      g.font = `700 ${px}px 'Segoe UI','Yu Gothic UI',Meiryo,sans-serif`;
      if (g.measureText(text).width < c.width - 88) break;
      px -= 2;
    }
    g.fillText(text, 44, 190);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready?.then(draw);
  const mat = new MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 });
  const geo = new PlaneGeometry(1, c.height / c.width);
  const m = new Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = 999;
  m.visible = false;
  return { mesh: m, mat, dispose: () => (tex.dispose(), geo.dispose(), mat.dispose()) };
}

// the hollow sphere: three great circles, one for each territory (memory cyan, files gold, the scheduler pink)
export function hollowSphere() {
  const g = new Group();
  const mats = [];
  for (const [c, rx, ry] of [["#34e0ff", 0, 0], ["#ffc83a", Math.PI / 2, 0], ["#ff4fa0", 0, Math.PI / 2]]) {
    const m = new ShaderMaterial({ side: DoubleSide, uniforms: { uC: { value: new Color(c) } }, vertexShader: /* glsl */ `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`, fragmentShader: /* glsl */ `uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0); }` });
    mats.push(m);
    const ring = new Mesh(new SphereGeometry(1, 36, 2, 0, Math.PI * 2, Math.PI / 2 - 0.035, 0.07), m);
    ring.rotation.set(rx, ry, 0);
    ring.frustumCulled = false;
    g.add(ring);
  }
  g.visible = false;
  return { root: g, dispose: () => (g.children.forEach((c) => c.geometry.dispose()), mats.forEach((m) => m.dispose())) };
}


// ---------------------------------------------------------------- the void maw: Predator / Beelzebub, a spiralling black mouth that eats the dimension
export function maw() {
  const m = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uT: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uT; varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x + 0.0001);
        float arms = 0.5 + 0.5 * sin(ang * 4.0 + r * 12.0 - uT * 9.0);
        float teeth = smoothstep(0.55, 0.9, 0.5 + 0.5 * sin(ang * 22.0)) * smoothstep(0.62, 0.5, r) * smoothstep(0.3, 0.45, r);
        float disc = 1.0 - smoothstep(0.92, 1.0, r);
        vec3 c = mix(vec3(0.02, 0.0, 0.05), vec3(0.85, 0.1, 0.95), arms * smoothstep(0.45, 0.95, r));
        c = mix(c, vec3(0.9, 0.85, 1.0), teeth);
        c = mix(vec3(0.0), c, smoothstep(0.18, 0.5, r) + teeth);
        gl_FragColor = vec4(c, disc);
      }`,
  });
  const g = new PlaneGeometry(2, 2);
  const o = mesh(m, g);
  o.visible = false;
  return { mesh: o, mat: m, dispose: () => (g.dispose(), m.dispose()) };
}
