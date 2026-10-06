// WORLD / the white desert (bible: "White desert and dunes"): endless white sand, dunes drawn as CONTOUR LINES, hatching on the
// shadow side only, no fill detail, no fog. Plus dead trees (black on white) and drifting sand motes (twos, 0.3 m/s).
//
// Dune ground (layer 1: it is wiped in and shattered by the glass pass).
//   height   h(p) = fl(r) (4.2 r1^2 + 1.3 r2)                           common.js HEIGHT; 2-6 m, spacing 30-80 m
//   normal   n = normalize(h(p - ex) - h(p + ex), 2e, h(p - ez) - h(p + ez)), e = 1.2 m, in the VERTEX shader (cheap, smooth)
//   shading  two flat tones, light from upper left L = normalize(-0.5, 0.8, 0.35): l = n.L
//            sand #f4f4f0; the shadow side (l < 0.24) is HATCH ONLY: diagonal lines at a 5 px pitch, 1 px, #c8ccd6; a second
//            cross-hatch below l < -0.15; far dunes tint to #d8d8e0 by distance (a flat tint, NOT fog: the far field stays black)
//   contour  iso-lines of h every 0.9 m: hs = (h + 0.37)/0.9, cf = |fract(hs - .5) - .5|, line = 1 - smoothstep(0, 1.2 fwidth(hs), cf),
//            1 px #080a0f at 40 %; faded where the lines get denser than a pixel (cw > 0.35); no lines on the flat dais ground
//   draw-in  behind the wipe frontier (first 60 m) the ground is BLACK with WHITE contour lines at 90 %; it fills to paper as
//            draw = smoothstep(0, 60, uBuild - |wp - seal|): the dunes are drawn in line first, then filled
//   grain    1 % paper grain: col *= 1 - 0.01 h21(fragcoord)
import { BufferAttribute, DoubleSide, InstancedMesh, Matrix4, Mesh, PlaneGeometry, RingGeometry, ShaderMaterial, Points, BufferGeometry, Quaternion, Vector3, Euler } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CylinderGeometry } from "three";
import { PAL, V, GLASS, HEIGHT } from "./common.js";

const LIGHT = "normalize(vec3(-0.5, 0.8, 0.35))";

export function buildDunes(ctx, U) {
  const { THREE, tools } = ctx;
  const sd = ctx.scene.seal ?? {};
  const at = sd.at ?? [0, 0, 0];
  const noise = tools.glslFor(["noise"]);
  const vert = /* glsl */ `
    ${HEIGHT}
    uniform vec2 uCenter; uniform float uGround;
    varying vec3 vW; varying vec3 vN; varying float vH;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vec2 p = w.xz; float e = 1.2;
      float h = duneH(p, uCenter);
      vN = normalize(vec3(duneH(p - vec2(e, 0.0), uCenter) - duneH(p + vec2(e, 0.0), uCenter), 2.0 * e,
                          duneH(p - vec2(0.0, e), uCenter) - duneH(p + vec2(0.0, e), uCenter)));
      vH = h; w.y = uGround - 0.03 + h; vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const frag = /* glsl */ `
    ${noise}
    ${GLASS}
    varying vec3 vW; varying vec3 vN; varying float vH;
    const vec3 SAND = ${V(PAL.paper)}; const vec3 HATCHC = ${V(PAL.hatch)}; const vec3 FARC = ${V(PAL.far)}; const vec3 INKC = ${V(PAL.ink)};
    void main() {
      vec3 n = normalize(vN); float l = dot(n, ${LIGHT});
      float dist = length(vW - cameraPosition);
      float draw = smoothstep(0.0, 60.0, uBuild - length(vW - uSeal));
      vec3 sand = mix(SAND, FARC, smoothstep(70.0, 260.0, dist));
      vec3 col = mix(INKC, sand, draw);
      // hatch on the shadow side only (5 px pitch, 1 px)
      float w = fwidth(l) * 0.75 + 1e-4;
      float sh = 1.0 - smoothstep(0.24 - w, 0.24 + w, l);
      float hp = dot(gl_FragCoord.xy, vec2(0.7071)) / 5.0; float hl = min(fract(hp), 1.0 - fract(hp)) * 5.0;
      float h1 = 1.0 - smoothstep(0.4, 0.9, hl);
      float hq = dot(gl_FragCoord.xy, vec2(0.7071, -0.7071)) / 5.0; float hm = min(fract(hq), 1.0 - fract(hq)) * 5.0;
      float h2 = (1.0 - smoothstep(0.4, 0.9, hm)) * (1.0 - smoothstep(-0.15 - w, -0.15 + w, l));
      float fade = 1.0 - smoothstep(120.0, 300.0, dist);
      col = mix(col, HATCHC, max(h1, h2) * sh * fade * draw);
      // contour lines of the height field
      float hs = (vH + 0.37) / 0.9; float cf = abs(fract(hs - 0.5) - 0.5); float cw = fwidth(hs);
      float cl = (1.0 - smoothstep(0.0, cw * 1.2 + 1e-4, cf)) * (1.0 - smoothstep(0.35, 0.7, cw));
      col = mix(col, mix(SAND, INKC, draw), cl * mix(0.9, 0.4, draw));   // white lines on black while drawing in, ink on paper after
      col *= 1.0 - 0.01 * h21(gl_FragCoord.xy);
      col = glassPass(min(col, vec3(0.95)), vW);
      gl_FragColor = vec4(col, 0.5);
    }`;
  const mat = new ShaderMaterial({ uniforms: { ...U }, vertexShader: vert, fragmentShader: frag });
  const main = new Mesh(new PlaneGeometry(600, 600, 300, 300).rotateX(-Math.PI / 2), mat);
  main.position.set(at[0], 0, at[2]);
  // the flat apron beyond the dunes (same shader: h = 0 out there is not true, so it stays dune-lit; it keeps the horizon white)
  const apron = new Mesh(new RingGeometry(298, 900, 64, 1).rotateX(-Math.PI / 2), mat);
  apron.position.set(at[0], 0, at[2]);
  for (const m of [main, apron]) { m.frustumCulled = false; m.userData.layer = 1; }
  const g = new THREE.Group(); g.add(main, apron);
  U.uCenter.value.set(at[0], at[2]);
  U.uGround.value = at[1];
  return { obj: g, update() {}, dispose() { main.geometry.dispose(); apron.geometry.dispose(); mat.dispose(); } };
}

// ---- dead trees: black on white (bible 2 FOLIAGE). One merged geometry, one InstancedMesh; the instance y is the dune height
//      h(origin) from the same GLSL, so a tree stands on the sand it was placed on at any frame.
export function buildTrees(ctx, U) {
  const sd = ctx.scene.seal ?? {};
  const at = sd.at ?? [0, 0, 0];
  const parts = [];
  const limb = (len, r0, r1, ry, rz, y) => {
    const c = new CylinderGeometry(r1, r0, len, 5); c.translate(0, len / 2, 0);
    c.applyMatrix4(new Matrix4().makeRotationFromEuler(new Euler(0, ry, rz)));
    c.translate(0, y, 0); return c;
  };
  parts.push(limb(4.6, 0.22, 0.05, 0, 0, 0));
  parts.push(limb(2.2, 0.08, 0.02, 0.0, 0.9, 2.2));
  parts.push(limb(1.9, 0.07, 0.02, 2.1, -0.85, 2.9));
  parts.push(limb(1.5, 0.06, 0.015, 4.0, 0.8, 3.6));
  parts.push(limb(1.2, 0.05, 0.015, 5.2, -0.7, 4.0));
  for (const p of parts) { p.deleteAttribute("uv"); }
  const geo = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  const mat = new ShaderMaterial({
    uniforms: { ...U },
    vertexShader: `${HEIGHT} uniform vec2 uCenter; uniform float uGround; varying vec3 vW; varying vec3 vN;
      void main() {
        mat4 M = modelMatrix * instanceMatrix; vec4 w = M * vec4(position, 1.0);
        vec3 o = (M * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        w.y += uGround - 0.03 + duneH(o.xz, uCenter); vW = w.xyz;
        vN = normalize(mat3(M) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `${GLASS} varying vec3 vW; varying vec3 vN;
      const vec3 INKC = ${V(PAL.ink)}; const vec3 RIM = ${V(PAL.grey)};
      void main() {
        float l = dot(normalize(vN), ${LIGHT}); float w = fwidth(l) * 0.75 + 1e-4;
        vec3 col = mix(INKC, RIM, smoothstep(0.72 - w, 0.72 + w, l) * 0.85);   // black fill, a hard lit rim #aab1bf
        gl_FragColor = vec4(glassPass(col, vW), 0.5);
      }`,
  });
  const N = 18;
  const mesh = new InstancedMesh(geo, mat, N);
  const r = ctx.rng(1081), M4 = new Matrix4(), q = new Quaternion(), s = new Vector3(), p = new Vector3();
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2, d = 26 + r() * 90, k = 0.7 + r() * 0.9;
    p.set(at[0] + Math.cos(a) * d, 0, at[2] + Math.sin(a) * d);
    q.setFromEuler(new Euler((r() - 0.5) * 0.12, r() * 6.28, (r() - 0.5) * 0.16)); s.set(k, k * (0.8 + r() * 0.5), k);
    mesh.setMatrixAt(i, M4.compose(p, q, s));
  }
  mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; mesh.userData.layer = 1;
  return { obj: mesh, update() {}, dispose() { geo.dispose(); mat.dispose(); } };
}

// ---- sand motes: 420 instanced points drifting at 0.3 m/s on twos, #f4f4f0. Position = wrap(base + drift ts) inside a 48 m box
//      around the seal, 0..7 m up. A pure function of the stepped clock.
export function buildMotes(ctx, U) {
  const N = 420, r = ctx.rng(1082), base = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { base[i * 3] = r() * 48; base[i * 3 + 1] = r() * 7; base[i * 3 + 2] = r() * 48; }
  const geo = new BufferGeometry(); geo.setAttribute("position", new BufferAttribute(base, 3)); geo.setAttribute("aBase", new BufferAttribute(base, 3));
  const mat = new ShaderMaterial({
    uniforms: { ...U }, depthWrite: true,
    vertexShader: `attribute vec3 aBase; uniform vec2 uCenter; uniform float uGround; uniform float uT; uniform vec2 uRes; varying vec3 vW;
      void main() {
        vec3 p = aBase + vec3(0.30, 0.04, 0.12) * uT;                       // 0.3 m/s drift
        p.xz = mod(p.xz, 48.0) - 24.0; p.y = mod(p.y, 7.0);
        vW = vec3(p.x + uCenter.x, p.y + uGround, p.z + uCenter.y);
        vec4 mv = viewMatrix * vec4(vW, 1.0);
        gl_Position = projectionMatrix * mv; gl_PointSize = max(1.5, 2.6 * uRes.y / 720.0);
      }`,
    fragmentShader: `${GLASS} varying vec3 vW;
      void main() {
        vec2 c = gl_PointCoord - 0.5; if (dot(c, c) > 0.25) discard;
        gl_FragColor = vec4(glassPass(${V(PAL.paper)}, vW), 0.5);
      }`,
  });
  const pts = new Points(geo, mat); pts.frustumCulled = false; pts.userData.layer = 1;
  return { obj: pts, update() {}, dispose() { geo.dispose(); mat.dispose(); } };
}
