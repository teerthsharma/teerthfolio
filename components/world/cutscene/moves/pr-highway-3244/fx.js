// THE EFFECTS of the Highway scene, each a pooled mesh written without
// allocating: the ribbons that draw the comparison lines (camera-facing
// quads rebuilt in place), tyre smoke (instanced puffs on an analytic
// schedule), confetti (shader-driven, two bursts), speed streaks, contact
// shadows, the Ka-chow glint, and THE PAGE: the chequered flag that sweeps
// across the lens and turns like a page, uncovering the island behind it.
// No post pass: every effect is geometry in the scene.

import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, DynamicDrawUsage, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { hash, lightUniforms, rgb } from "./shade";

const u = (v) => ({ value: v });

// ---- ribbons ------------------------------------------------------------------

export function ribbons(maxQuads, hex, { additive = false } = {}) {
  const g = new BufferGeometry();
  const pos = new Float32Array(maxQuads * 12);
  const side = new Float32Array(maxQuads * 4);
  const alpha = new Float32Array(maxQuads * 4);
  const idx = new Uint16Array(maxQuads * 6);
  for (let q = 0; q < maxQuads; q++) {
    side.set([-1, 1, -1, 1], q * 4);
    idx.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4 + 1, q * 4 + 3, q * 4 + 2], q * 6);
  }
  const pa = new BufferAttribute(pos, 3).setUsage(DynamicDrawUsage);
  const aa = new BufferAttribute(alpha, 1).setUsage(DynamicDrawUsage);
  g.setAttribute("position", pa);
  g.setAttribute("aSide", new BufferAttribute(side, 1));
  g.setAttribute("aA", aa);
  g.setIndex(new BufferAttribute(idx, 1));
  g.setDrawRange(0, 0);
  const m = new ShaderMaterial({
    uniforms: { uColor: u(new Color(...rgb(hex))), uGlow: u(1) },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    ...(additive ? { blending: AdditiveBlending } : {}),
    vertexShader: "attribute float aSide; attribute float aA; varying float vS; varying float vA; void main(){ vS = aSide; vA = aA; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uGlow;
      varying float vS; varying float vA;
      void main() {
        float e = 1.0 - pow(abs(vS), 3.0);
        vec3 c = mix(uColor, vec3(1.0), pow(e, 5.0) * 0.55 * uGlow);
        gl_FragColor = vec4(pow(c, vec3(2.2)), vA * e);
      }`,
  });
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  let n = 0;
  return {
    mesh,
    geometry: g,
    material: m,
    begin() {
      n = 0;
    },
    // a quad from a to b, `w` wide, facing the lens at (cx, cy, cz)
    seg(ax, ay, az, bx, by, bz, w, a, cx, cy, cz) {
      if (n >= maxQuads) return;
      const dx = bx - ax;
      const dy = by - ay;
      const dz = bz - az;
      const vx = cx - (ax + bx) / 2;
      const vy = cy - (ay + by) / 2;
      const vz = cz - (az + bz) / 2;
      let sx = dy * vz - dz * vy;
      let sy = dz * vx - dx * vz;
      let sz = dx * vy - dy * vx;
      const l = Math.hypot(sx, sy, sz) || 1;
      sx = (sx / l) * w * 0.5;
      sy = (sy / l) * w * 0.5;
      sz = (sz / l) * w * 0.5;
      const o = n * 12;
      pos[o] = ax - sx; pos[o + 1] = ay - sy; pos[o + 2] = az - sz;
      pos[o + 3] = ax + sx; pos[o + 4] = ay + sy; pos[o + 5] = az + sz;
      pos[o + 6] = bx - sx; pos[o + 7] = by - sy; pos[o + 8] = bz - sz;
      pos[o + 9] = bx + sx; pos[o + 10] = by + sy; pos[o + 11] = bz + sz;
      alpha[n * 4] = alpha[n * 4 + 1] = alpha[n * 4 + 2] = alpha[n * 4 + 3] = a;
      n++;
    },
    end() {
      g.setDrawRange(0, n * 6);
      pa.needsUpdate = true;
      aa.needsUpdate = true;
    },
  };
}

// ---- smoke -------------------------------------------------------------------------

export function smokeMaterial() {
  return new ShaderMaterial({
    uniforms: lightUniforms(),
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aA;
      varying vec3 vN; varying float vA; varying vec3 vW;
      void main() {
        vec4 q = instanceMatrix * vec4(position, 1.0);
        vec4 w = modelMatrix * q;
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vA = aA;
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uKey;
      varying vec3 vN; varying float vA; varying vec3 vW;
      void main() {
        vec3 n = normalize(vN);
        float l = clamp(dot(n, uKey) * 0.5 + 0.55, 0.0, 1.0);
        vec3 c = mix(vec3(0.8, 0.62, 0.62), vec3(1.0, 0.95, 0.88), l);
        float rim = pow(1.0 - abs(dot(n, normalize(cameraPosition - vW))), 2.0);
        gl_FragColor = vec4(pow(c, vec3(2.2)), vA * (1.0 - 0.45 * rim));
      }`,
  });
}
export function smokePool(count) {
  const g = new IcosahedronGeometry(1, 1);
  const a = new InstancedBufferAttribute(new Float32Array(count), 1).setUsage(DynamicDrawUsage);
  g.setAttribute("aA", a);
  const mesh = new InstancedMesh(g, smokeMaterial(), count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  return { mesh, alpha: a };
}

// ---- confetti -------------------------------------------------------------------------

export function confetti(count) {
  const g = new PlaneGeometry(0.16, 0.26);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) for (let k = 0; k < 4; k++) seed[i * 4 + k] = hash(i, k + 1);
  g.setAttribute("aSeed", new InstancedBufferAttribute(seed, 4));
  const m = new ShaderMaterial({
    uniforms: { uT: u(0), uC1: u(new Vector3()), uC2: u(new Vector3()), uB1: u(-1), uB2: u(-1) },
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uT, uB1, uB2;
      uniform vec3 uC1, uC2;
      varying vec3 vC; varying float vS;
      void main() {
        bool first = float(gl_InstanceID) < ${(count / 2).toFixed(1)};
        float t0 = first ? uB1 : uB2;
        vec3 c = first ? uC1 : uC2;
        float tau = uT - t0;
        vec3 p = position;
        if (t0 < 0.0 || tau < 0.0 || tau > 3.2) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vC = vec3(0.0); vS = 0.0; return; }
        float th = tau * (5.0 + 9.0 * aSeed.x) + aSeed.y * 6.28;
        float ph = tau * (3.0 + 5.0 * aSeed.z) + aSeed.w * 6.28;
        float cx = cos(th), sx = sin(th), cy = cos(ph), sy = sin(ph);
        p = vec3(p.x * cy + p.y * sx * sy, p.y * cx, -p.x * sy + p.y * sx * cy);
        vec3 org = c + vec3((aSeed.x - 0.5) * (first ? 34.0 : 18.0), (first ? 3.0 : 5.5) + 4.0 * aSeed.y, (aSeed.z - 0.5) * (first ? 8.0 : 14.0));
        float e = exp(-tau * 1.2);
        org.x += (aSeed.w - 0.5) * 6.0 * (1.0 - e) + sin(tau * 3.0 + aSeed.x * 9.0) * 0.5;
        org.z += (aSeed.y - 0.5) * 4.0 * (1.0 - e) + cos(tau * 2.5 + aSeed.z * 9.0) * 0.4;
        org.y += (3.5 + 6.0 * aSeed.z) * (1.0 - e) - 1.5 * tau;
        org.y = max(org.y, 0.05);
        vS = 0.55 + 0.45 * abs(cx * cy);
        // pink, gold, sky, mint, orange, white
        float k = floor(aSeed.w * 6.0);
        vC = k < 1.0 ? vec3(1.0, 0.35, 0.55) : k < 2.0 ? vec3(1.0, 0.82, 0.2) : k < 3.0 ? vec3(0.3, 0.7, 1.0) : k < 4.0 ? vec3(0.4, 0.9, 0.6) : k < 5.0 ? vec3(1.0, 0.55, 0.15) : vec3(1.0, 0.97, 0.9);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(org + p, 1.0);
      }`,
    fragmentShader: "varying vec3 vC; varying float vS; void main(){ gl_FragColor = vec4(pow(vC * vS, vec3(2.2)), 1.0); }",
  });
  const mesh = new InstancedMesh(g, m, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  return mesh;
}

// ---- speed streaks ---------------------------------------------------------------------------

export function streaks(count) {
  const g = new PlaneGeometry(1, 1).translate(-0.5, 0, 0);
  const seed = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seed[i * 3] = -170 + hash(i, 1) * 250; // x along the straight
    seed[i * 3 + 1] = 0.25 + hash(i, 2) * 3.4; // height
    seed[i * 3 + 2] = -12 + hash(i, 3) * 14; // depth across the track
  }
  g.setAttribute("aAt", new InstancedBufferAttribute(seed, 3));
  const m = new ShaderMaterial({
    uniforms: { uSpeed: u(0) },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aAt;
      uniform float uSpeed;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        float len = (2.5 + 7.0 * fract(aAt.x * 0.37)) * uSpeed;
        vec3 p = aAt + vec3(position.x * len, position.y * 0.05, 0.0);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: "varying vec2 vUv; void main(){ float k = pow(max(1.0 + vUv.x * 0.0 - (1.0 - vUv.x), 0.0), 1.5) * (1.0 - abs(vUv.y * 2.0 - 1.0)); gl_FragColor = vec4(pow(vec3(1.0, 0.88, 0.6) * k * 0.45, vec3(2.2)), 1.0); }",
  });
  const mesh = new InstancedMesh(g, m, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  // identity transforms: the vertex shader places each one
  const I = new Matrix4();
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, I);
  return mesh;
}

// ---- contact shadows ----------------------------------------------------------------------------

export function shadowPool(count) {
  const g = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const m = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec2 vUv; void main(){ float r = length(vUv * 2.0 - 1.0); float k = pow(1.0 - smoothstep(0.25, 1.0, r), 1.4); gl_FragColor = vec4(pow(vec3(0.2, 0.08, 0.1), vec3(2.2)), k * 0.55); }",
  });
  const mesh = new InstancedMesh(g, m, count);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.renderOrder = 1;
  return mesh;
}

// ---- the glint ------------------------------------------------------------------------------------

// a four-point star (the Ka-chow sparkle), a billboard; set its scale and alpha through the material
export function glint() {
  const m = new ShaderMaterial({
    uniforms: { uA: u(0), uSpin: u(0) },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uA, uSpin;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float c = cos(uSpin), s = sin(uSpin);
        p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
        float r = length(p);
        float cross = exp(-abs(p.x) * 26.0) * exp(-abs(p.y) * 3.2) + exp(-abs(p.y) * 26.0) * exp(-abs(p.x) * 3.2);
        float diag = (exp(-abs(p.x - p.y) * 40.0) + exp(-abs(p.x + p.y) * 40.0)) * exp(-r * 4.0) * 0.5;
        float core = exp(-r * 9.0);
        vec3 c3 = vec3(1.0, 0.97, 0.85) * (cross + diag + core * 1.4) * uA;
        gl_FragColor = vec4(pow(c3, vec3(2.2)), 1.0);
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 20;
  mesh.visible = false;
  return mesh;
}

// ---- the page ------------------------------------------------------------------------------------------

// THE CHEQUERED FLAG, as a page. A plane held in front of the lens (sized to cover it). uCover sweeps the cloth
// in from the right, rippling; uTurn rolls it up from the right edge across the screen, a page turning, and the
// island is what was under it. The back of the cloth is the same chequer, a shade deeper.
export function pageFlag() {
  const g = new PlaneGeometry(1, 1, 72, 40);
  const m = new ShaderMaterial({
    uniforms: { uCover: u(0), uTurn: u(0), uW: u(1.2), uH: u(0.75), uT: u(0) },
    side: DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uCover, uTurn, uW, uH, uT;
      varying vec2 vXY; varying vec3 vV; varying vec3 vN; varying float vBack; varying float vEdge;
      void main() {
        float W = uW, H = uH;
        vec3 p = vec3(position.x * W, position.y * H, 0.0);
        float x0 = p.x;
        vXY = vec2(position.x + 0.5, position.y + 0.5);
        // the cloth's leading edge, ragged, sweeping in from the right
        float edge = W * (0.62 - 1.32 * uCover) + sin(position.y * 11.0 + uT * 9.0) * 0.045 * W * (1.0 - uCover) + sin(position.y * 27.0 - uT * 14.0) * 0.012 * W;
        vEdge = x0 - edge;
        // ripples travelling along the cloth, calming as it settles
        float calm = 1.0 - 0.8 * uTurn;
        p.z += (sin(x0 * 15.0 / W * 3.0 - uT * 13.0 + position.y * 4.0) * 0.022 + sin(x0 * 40.0 / W * 3.0 - uT * 27.0) * 0.006) * calm * (0.4 + 0.6 * (1.0 - uCover));
        // the turn: a roll that starts at the right edge and travels left
        float R = 0.085 * W;
        float xf = W * 0.5 - uTurn * (W + 6.28 * R + 0.06 * W);
        vec3 n = vec3(0.0, 0.0, 1.0);
        vBack = 0.0;
        float d = x0 - xf;
        if (d > 0.0) {
          float ph = d / R;
          if (ph < 3.14159) {
            p.x = xf + R * sin(ph);
            p.z += R * (1.0 - cos(ph));
            n = vec3(-sin(ph), 0.0, cos(ph));
          } else {
            p.x = xf - (d - 3.14159 * R);
            p.z += 2.0 * R;
            n = vec3(0.0, 0.0, -1.0);
            vBack = 1.0;
          }
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vV = mv.xyz;
        vN = normalMatrix * n;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uW, uH;
      varying vec2 vXY; varying vec3 vV; varying vec3 vN; varying float vBack; varying float vEdge;
      void main() {
        if (vEdge < 0.0) discard;
        float cell = uW / 18.0;
        vec2 q = vec2(vXY.x * uW, vXY.y * uH) / cell;
        float chk = mod(floor(q.x) + floor(q.y), 2.0);
        vec3 c = mix(vec3(0.2, 0.17, 0.26), vec3(0.99, 0.98, 0.95), chk);
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        float l = 0.62 + 0.38 * max(dot(n, normalize(vec3(-0.35, 0.5, 0.8))), 0.0);
        c *= l;
        c = mix(c, c * vec3(0.78, 0.74, 0.82), vBack);
        // a warm rim where the cloth curls away, and the hem at the leading edge
        c += vec3(1.0, 0.7, 0.4) * pow(1.0 - abs(n.z), 2.0) * 0.35;
        c = mix(c, vec3(0.9, 0.12, 0.1), smoothstep(0.03, 0.0, vEdge));
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 45;
  mesh.visible = false;
  return mesh;
}
