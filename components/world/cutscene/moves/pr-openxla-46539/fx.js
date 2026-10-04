// THE WEATHER AND THE BLOWS, all pooled and instanced, none of it a post pass:
// smoke that rises in dotted, ink-edged puffs, lamp halos, rain that turns to
// updraft, the pillar of sun, the comic starburst at the fist, the shock dome
// and the beam of the uppercut, the page's panel border, the crater's geyser
// column. Each factory returns { obj, tick(ctx) }; the move calls tick once a
// frame with the clock. Nothing is allocated per frame.

import { CircleGeometry, Color, CylinderGeometry, DoubleSide, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, ShaderMaterial, SphereGeometry } from "three";
import { hash } from "../p-caustic/parts";
import { PRINT, SH, u } from "./print";

const O = new Object3D();
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const spriteVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vC;
  void main() {
    vUv = uv;
    vC = vec3(1.0);
    #ifdef USE_INSTANCING_COLOR
      vC = instanceColor;
    #endif
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  }`;

// ---- smoke: dotted puffs with an ink edge, over the stumps and the crater's lip ----
export function smokeFx(cols, n = 7) {
  const count = cols.length * n;
  const mesh = new InstancedMesh(
    new PlaneGeometry(1, 1),
    new ShaderMaterial({
      uniforms: { ...SH },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      vertexShader: spriteVert,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vC;
        uniform float uSun;
        ${PRINT}
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float a = atan(p.y, p.x);
          float edge = 0.78 + 0.1 * sin(a * 5.0 + vC.g * 20.0) + 0.06 * sin(a * 11.0 + vC.g * 7.0);
          if (r > edge + 0.07) discard;
          float lit = 0.5 + 0.5 * dot(normalize(p + 0.001), normalize(vec2(-0.5, 0.8)));
          vec4 t = vec4(0.32, 0.26, 0.02, 0.18 + 0.55 * (1.0 - lit) * smoothstep(0.1, edge, r));
          t.z += 0.3 * uSun;
          t.y += 0.22 * lit * smoothstep(0.2, 0.9, r / edge) * (1.0 - uSun); // the burning city lights the underside
          vec3 col = inkPrint(t);
          col = mix(col, INK_K, step(edge - 0.06, r));
          gl_FragColor = vec4(pow(col, vec3(2.2)), vC.r);
        }`,
    }),
    count,
  );
  mesh.frustumCulled = false;
  const c = new Color();
  for (let i = 0; i < count; i++) mesh.setColorAt(i, c.setRGB(0, hash(i, 3), 0));
  return {
    obj: mesh,
    tick({ tt, cam, wind, gone }) {
      for (let i = 0; i < count; i++) {
        const ci = (i / n) | 0;
        const col = cols[ci];
        const k = (tt / (3.4 / col.s) + (i % n) / n + hash(ci, 5)) % 1;
        const sway = Math.sin(i * 2.1 + tt * 1.2) * 0.35;
        O.position.set(col.x + sway + wind * (0.4 + 4.5 * k * k), col.y + 7.5 * col.s * k, col.z + 0.3 * Math.cos(i));
        O.quaternion.copy(cam.quaternion);
        const s = (0.9 + 2.6 * k) * col.s * (col.big ?? 1);
        O.scale.setScalar(gone ? 0.0001 : s);
        O.updateMatrix();
        mesh.setMatrixAt(i, O.matrix);
        mesh.setColorAt(i, c.setRGB(0.85 * Math.sin(Math.PI * k) ** 0.7, hash(i, 3), 0));
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    },
  };
}

// ---- lamp halos: yellow dots, round every live lamp ----
export function halosFx(lamps) {
  const mesh = new InstancedMesh(
    new PlaneGeometry(1, 1),
    new ShaderMaterial({
      uniforms: { ...SH },
      transparent: true,
      depthWrite: false,
      vertexShader: spriteVert,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vC;
        ${PRINT}
        void main() {
          float r = length(vUv * 2.0 - 1.0);
          float tone = pow(max(1.0 - r, 0.0), 1.4) * vC.r;
          float cv;
          vec3 col = inkPrint(vec4(0.0, 0.08, tone, 0.0), cv);
          float a = cv * step(0.02, tone);
          if (a < 0.02) discard;
          gl_FragColor = vec4(pow(col, vec3(2.2)), a * 0.9);
        }`,
    }),
    Math.max(1, lamps.length),
  );
  mesh.frustumCulled = false;
  const c = new Color();
  return {
    obj: mesh,
    tick({ tt, cam, gone }) {
      lamps.forEach((l, i) => {
        O.position.set(l.x, l.y, l.z);
        O.quaternion.copy(cam.quaternion);
        O.scale.setScalar(gone ? 0.0001 : (l.s ?? 1.7));
        O.updateMatrix();
        mesh.setMatrixAt(i, O.matrix);
        mesh.setColorAt(i, c.setRGB(0.75 + 0.25 * Math.sin(tt * 7 + i * 3.1) * (hash(i, 2) > 0.7 ? 1 : 0.2), 0, 0));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}

// ---- rain that turns to updraft: cool streaks falling, then warm ones climbing the sun's pillar and the geyser ----
const RAIN = 200;
export function rainFx(crater, k) {
  const mesh = new InstancedMesh(new PlaneGeometry(0.03, 1), new MeshBasicMaterial({ color: "#bfe6ff", transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide }), RAIN);
  mesh.frustumCulled = false;
  const d = Array.from({ length: RAIN }, (_, i) => ({
    x: (hash(i, 1) - 0.5) * 30 * k,
    z: -34 + 35 * hash(i, 2),
    y: 15 * hash(i, 3),
    v: 13 + 5 * hash(i, 4),
    l: 0.9 + 0.9 * hash(i, 5),
    // the updraft's place: half in the pillar's column, half over the crater
    ux: i % 2 ? crater[0] + (hash(i, 6) - 0.5) * 4.4 : (hash(i, 6) - 0.5) * 16,
    uz: i % 2 ? crater[1] + (hash(i, 7) - 0.5) * 3 : -26 + (hash(i, 7) - 0.5) * 12,
  }));
  const warm = new Color("#fff0b0");
  const cool = new Color("#bfe6ff");
  return {
    obj: mesh,
    tick({ tt, hit, cam, gone }) {
      const age = tt - hit;
      const up = age > 0.15;
      const calm = up ? smooth(0.15, 0.7, age) : 0;
      mesh.material.color.copy(cool).lerp(warm, calm);
      mesh.material.opacity = 0.6 * (up ? 0.5 + 0.5 * smooth(0.3, 1.2, age) : 1) * (gone ? 0 : 1);
      for (let i = 0; i < RAIN; i++) {
        const s = d[i];
        let x = s.x;
        let z = s.z;
        let y;
        let len = s.l;
        if (!up) {
          y = (((s.y - tt * s.v) % 15) + 15) % 15;
        } else {
          const kk = smooth(0.15, 1.0, age);
          x = s.x + (s.ux - s.x) * kk;
          z = s.z + (s.uz - s.z) * kk;
          y = (((s.y + (tt - hit) * s.v * 1.1) % 22) + 22) % 22;
          len = s.l * 1.6;
        }
        O.position.set(x, y, z);
        O.quaternion.copy(cam.quaternion);
        O.rotateZ(up ? 0 : 0.16);
        O.scale.set(1, len, 1);
        O.updateMatrix();
        mesh.setMatrixAt(i, O.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// ---- the pillar of sun: a wide shaft from the opening to the street, rays in dots, and its pool of light ----
export function pillarFx(at) {
  const shaft = new ShaderMaterial({
    uniforms: { ...SH, uK: u(0) },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uK;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      ${PRINT}
      void main() {
        float f = abs(dot(normalize(vN), normalize(vV)));
        float rays = step(0.5, fract(vUv.x * 9.0));
        float tone = (0.35 + 0.3 * rays) * (0.35 + 0.65 * vUv.y);
        float cv;
        vec3 col = inkPrint(vec4(0.0, 0.03, tone, 0.0), cv);
        float a = (0.1 + 0.55 * cv) * pow(f, 0.9) * uK;
        gl_FragColor = vec4(pow(mix(col, vec3(1.0, 0.97, 0.82), 0.45), vec3(2.2)), a);
      }`,
  });
  const shaftMesh = new Mesh(new CylinderGeometry(5, 7.5, 70, 28, 1, true).translate(0, 35, 0), shaft);
  shaftMesh.frustumCulled = false;
  const poolMat = new ShaderMaterial({
    uniforms: { ...SH, uK: u(0) },
    transparent: true,
    depthWrite: false,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uK;
      varying vec2 vUv;
      ${PRINT}
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        float cv;
        vec3 col = inkPrint(vec4(0.0, 0.05, pow(max(1.0 - r, 0.0), 0.8), 0.0), cv);
        float a = max(cv, 0.22 * step(r, 0.97)) * uK * step(r, 1.0);
        gl_FragColor = vec4(pow(mix(col, vec3(1.0, 0.96, 0.8), 0.4), vec3(2.2)), a);
      }`,
  });
  const pool = new Mesh(new CircleGeometry(1, 40).rotateX(-Math.PI / 2), poolMat);
  pool.frustumCulled = false;
  return {
    shaft: shaftMesh,
    pool,
    geoms: [shaftMesh.geometry, pool.geometry],
    mats: [shaft, poolMat],
    tick({ k, tt }) {
      shaftMesh.position.set(at[0], 0, at[1]);
      shaftMesh.scale.set(0.5 + 0.5 * k, 1, 0.5 + 0.5 * k);
      shaftMesh.visible = k > 0.002;
      shaft.uniforms.uK.value = k * 0.9;
      pool.position.set(at[0], 0.06, at[1]);
      pool.scale.setScalar(at[2] * (0.5 + 0.5 * k) * (1 + 0.02 * Math.sin(tt * 3)));
      pool.visible = k > 0.002;
      poolMat.uniforms.uK.value = k;
    },
  };
}

// ---- the starburst at the fist (the print's impact), and the uppercut's beam ----
export function burstFx() {
  const m = new ShaderMaterial({
    uniforms: { ...SH, uAge: u(0), uSpin: u(0) },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uAge, uSpin;
      varying vec2 vUv;
      ${PRINT}
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float a = atan(p.y, p.x);
        float sp = abs(fract(a * 7.0 / 6.2832 + uSpin) - 0.5) * 2.0;
        float edge = mix(0.5, 0.98, pow(sp, 1.4));
        float inside = 1.0 - smoothstep(edge - 0.01, edge, r);
        float rim = (1.0 - smoothstep(edge, edge + 0.045, r)) * (1.0 - inside);
        vec4 t = r < 0.3 * edge ? vec4(0.0, 0.0, 0.05, 0.0) : (r < 0.66 * edge ? vec4(0.0, 0.22, 1.0, 0.0) : vec4(0.0, 0.8, 1.0, 0.0));
        vec3 col = mix(inkPrint(t), INK_K, rim);
        float al = max(inside, rim);
        if (al < 0.02) discard;
        gl_FragColor = vec4(pow(col, vec3(2.2)), al * (1.0 - smoothstep(0.55, 1.0, uAge)));
      }`,
  });
  const g = new PlaneGeometry(1, 1);
  return { g, m };
}
export function beamFx() {
  const g = new CylinderGeometry(0.2, 1.1, 34, 14, 1, true).translate(0, 17, 0);
  const m = new ShaderMaterial({
    uniforms: { ...SH, uAge: u(0) },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAge;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      ${PRINT}
      void main() {
        float f = abs(dot(normalize(vN), normalize(vV)));
        float lines = step(0.45, fract(vUv.x * 16.0 + uAge * 3.0));
        float cv;
        vec3 col = inkPrint(vec4(0.0, 0.1 * lines, 0.4 + 0.6 * lines, 0.0), cv);
        col = mix(col, vec3(1.0), pow(f, 3.0) * 0.8);
        gl_FragColor = vec4(pow(col, vec3(2.2)), (0.35 + 0.65 * pow(f, 1.5)) * (1.0 - smoothstep(0.1, 0.5, uAge)) * (1.0 - vUv.y * 0.5));
      }`,
  });
  return { g, m };
}

// ---- the shock dome: a printed ring racing out from the fist, gone before it reaches the lens ----
export function domeFx() {
  const g = new SphereGeometry(1, 36, 18);
  const m = new ShaderMaterial({
    uniforms: { ...SH, uFade: u(0) },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelViewMatrix) * normal);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uFade;
      varying vec3 vN;
      varying vec3 vV;
      ${PRINT}
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float band = smoothstep(0.5, 0.78, f);
        float cv;
        vec3 col = inkPrint(vec4(0.0, 0.1, band, 0.0), cv);
        col = mix(col, vec3(1.0, 0.98, 0.9), smoothstep(0.82, 0.93, f));
        col = mix(col, INK_K, smoothstep(0.96, 0.985, f));
        float a = max(cv * step(0.02, band), smoothstep(0.82, 0.9, f)) * uFade;
        if (a < 0.02) discard;
        gl_FragColor = vec4(pow(col, vec3(2.2)), a);
      }`,
  });
  return { g, m };
}

// ---- the page's panel border: a slanted black frame on cream paper with dots, closing in on the screen's edge ----
export function panelFx() {
  const g = new PlaneGeometry(1, 1);
  const m = new ShaderMaterial({
    uniforms: { ...SH, uK: u(0), uAsp: u(1.6), uCrack: u(0), uFall: u(0) },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uK, uAsp, uCrack, uFall;
      varying vec2 vUv;
      ${PRINT}
      float outward(vec2 p, vec2 a, vec2 b) {
        vec2 e = normalize(b - a);
        return dot(p - a, vec2(-e.y, e.x));
      }
      void main() {
        vec2 p = (vUv - 0.5) * 2.0 * vec2(uAsp, 1.0);
        // after the break the tiles of the page drop away, each its own pace
        vec2 p0 = p;
        vec2 tile = floor(p * vec2(2.2, 3.0) + 20.0);
        float th = h21(tile);
        p.y += uFall * uFall * 4.0 * (0.4 + th);
        float s = mix(1.55, 0.94, uK);
        vec2 A = vec2(-1.0 * uAsp, 0.93) * s;
        vec2 B = vec2(0.97 * uAsp, 1.0) * s;
        vec2 C = vec2(1.0 * uAsp, -0.94) * s;
        vec2 D = vec2(-0.96 * uAsp, -1.0) * s;
        float d = max(max(outward(p, A, B), outward(p, B, C)), max(outward(p, C, D), outward(p, D, A)));
        float bw = 0.04;
        float alpha = 0.0;
        vec3 col = vec3(0.0);
        if (d > 0.0) {
          // the gutter: cream page with a loose screen of cyan and magenta
          col = inkPrint(vec4(0.16, 0.12, 0.05, 0.0));
          alpha = 1.0;
          if (uFall > 0.0) {
            // the torn page falls as printed paper: each piece carries its comic face (a flat four-colour field
            // under a Ben-Day screen), a cream torn rim and an ink edge, so it reads as paper, never as a haze
            vec2 f0 = fract(p0 * vec2(2.2, 3.0) + 20.0);
            float e = min(min(f0.x, 1.0 - f0.x), min(f0.y, 1.0 - f0.y));
            vec4 face = th < 0.34 ? vec4(0.0, 0.18, 0.92, 0.0) : (th < 0.68 ? vec4(0.0, 0.78, 0.15, 0.0) : vec4(0.78, 0.3, 0.0, 0.05));
            face.w += 0.25 * step(0.5, fract((f0.x + f0.y) * 5.0 + th * 3.0));
            col = inkPrint(face);
            col = mix(col, PAPER, 1.0 - smoothstep(0.05, 0.09, e));
            col = mix(col, INK_K, 1.0 - smoothstep(0.015, 0.035, e));
          }
        } else if (d > -bw) {
          col = INK_K;
          alpha = 1.0;
        }
        if (uCrack > 0.0) {
          // the break: cracks run out from the foot of the fist's path along the border and across the page
          float r = length(p - vec2(0.0, -s));
          float cr = vorEdge(p * 2.6 + 7.0) + 0.03 * vnoise(p * 9.0);
          float line = (1.0 - smoothstep(0.012, 0.04, cr)) * (1.0 - smoothstep(uCrack * 3.6 - 0.4, uCrack * 3.6, r)) * smoothstep(-0.32, -0.02, d);
          col = mix(col, vec3(1.0, 0.97, 0.78), line);
          alpha = max(alpha, line);
        }
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(pow(col, vec3(2.2)), alpha * (1.0 - smoothstep(0.93, 1.0, uFall)));
      }`,
  });
  return { g, m };
}

// ---- the geyser: a column of heat from the crater, climbing the updraft ----
export function geyserFx() {
  const g = new CylinderGeometry(0.55, 1.1, 1, 16, 1, true).translate(0, 0.5, 0);
  const m = new ShaderMaterial({
    uniforms: { ...SH, uK: u(0) },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uK;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      ${PRINT}
      void main() {
        float f = abs(dot(normalize(vN), normalize(vV)));
        float band = step(0.5, fract(vUv.y * 9.0 - uTime * 2.2 + vUv.x * 2.0));
        float cv;
        vec3 col = inkPrint(vec4(0.0, 0.6 * (1.0 - vUv.y) * band, 0.5 + 0.5 * band, 0.0), cv);
        col = mix(col, vec3(1.0, 0.97, 0.8), pow(f, 2.5) * 0.7);
        gl_FragColor = vec4(pow(col, vec3(2.2)), (0.25 + 0.7 * pow(f, 1.2)) * uK * (1.0 - vUv.y * 0.7));
      }`,
  });
  return { g, m };
}

