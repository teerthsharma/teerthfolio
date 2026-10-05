// TENSURA builders: the crystal cave and its pool, Veldora sealed in his sphere, Demon Lord Rimuru's
// towering silhouette, the void maw that eats reality, MEGIDDO's water lenses and sunbeams, the Great Sage's holographic panel and 
// One opaque material (rimMaterial: flat toon bands, cyan/gold rim, emissive "glow" kinds) plus a few additive glow shaders.
// Everything is built once at mount; nothing is allocated per frame.
import { AdditiveBlending, CanvasTexture, Color, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, TorusGeometry } from "three";
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
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying vec4 vMeta; varying vec3 vLocal;
      void main() {
        vLocal = position;
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
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying vec4 vMeta; varying vec3 vLocal;
      void main() {
        vec3 n = normalize(vN + vec3(0.0, 0.0001, 0.0));
        if (!gl_FrontFacing) n = -n;
        vec3 base = pow(vCol, vec3(1.0 / 2.2));
        if (vMeta.x > 5.5) { gl_FragColor = vec4(base * (1.1 + 0.25 * uGlow), 1.0); return; }
        if (vMeta.y > 0.5 && vMeta.y < 1.5) {
          // scales: staggered round plates, dark in the seams
          vec3 q = vLocal * 13.0;
          vec2 uv = vec2(q.x + q.z, q.y * 1.25);
          uv.x += 0.5 * mod(floor(uv.y), 2.0);
          vec2 f = fract(uv) - 0.5;
          float sc = smoothstep(0.52, 0.18, length(f * vec2(1.0, 1.25)));
          base *= 0.5 + 0.62 * sc;
        } else if (vMeta.y > 1.5 && vMeta.y < 2.5) {
          // woven cloth: fine weave and long soft folds
          float wv = 0.5 + 0.5 * sin(vLocal.x * 70.0 + sin(vLocal.y * 9.0) * 2.0) * sin(vLocal.y * 90.0);
          float fold = 0.5 + 0.5 * sin(atan(vLocal.x, vLocal.z + 0.001) * 11.0 + vLocal.y * 2.0);
          base *= 0.7 + 0.12 * wv + 0.12 * fold;
        }
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

// the Demon Lord fist: a black glove with a gold cuff and knuckle studs, drawn in front of the camera for the punch
export function fistMesh(mat) {
  const L = layer();
  L.add(new SphereGeometry(0.9, 14, 10), "#14101f", {}, 0, 0, 0, 0, 0, 0, 1.1, 0.9, 1);
  L.add(new CylinderGeometry(0.62, 0.7, 0.5, 12).rotateX(Math.PI / 2), "#d4a63a", {}, 0, -0.1, -0.95);
  for (let i = 0; i < 4; i++) L.add(new SphereGeometry(0.2, 8, 6), "#ffd23a", GLOW, (i - 1.5) * 0.42, 0.05, 0.78);
  const g = L.build();
  const o = mesh(mat, g);
  o.visible = false;
  o.renderOrder = 998;
  return { mesh: o, dispose: () => g.dispose() };
}
