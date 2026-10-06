// spawn-seal WORLD: Megiddo (S2). Seven water LENSES hang in a ring above the crystal nodes (7.0 m up); they form 226-254 f on twos with a
// 1.12 overshoot, then hard-edged gold beam cones drop from each lens to its node (240-262 f, node order) and ignite the node to gold.
// Layer 1.
//
// LENS SHADER: two-tone glass sphere. lit = step(0.2, N . L) mixes #1fb8ff (core) -> #7fd0ff; a hard white CRESCENT where
//   N . H1 > 0.74 and N . H2 < 0.86 (two offset highlight directions; their difference is a crescent); rim #e8ffff where 1 - |N . V| > 0.72.
// BEAM SHADER: hard bands on a = |N . V| of the cone: a > 0.78 core #fff3b0 (x1.1, the only thing that blooms), a > 0.40 mid #ffd23a,
//   else outer #ffb35a; a < 0.12 thin dark-gold outline #7a4a0a.  Over-blend, alpha 0.95 / 0.85 / 0.6 / 0.9. No pure-white blow-out.
// TIMING (bible frames at 24 fps): lens i forms at 226 + 3 i f over 10 f, scale = backOut(k, 1.3) (peak ~1.12) stepped on twos;
//   beam i starts 240 + 2 i f, grows 6 f, all end at 262 (last 4 f the cones thin to nothing); node i ignites 4 f after its beam lands.
import { CylinderGeometry, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { C, SHARED_GLSL, V, FR, backOut, clamp, smooth, tAt } from "./common.js";

const LENS_Y = 7.0;

export function buildMegiddo(ctx, S) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const lensMat = new ShaderMaterial({
    uniforms: { ...S.U },
    vertexShader: "varying vec3 vP, vN; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `varying vec3 vP, vN; ${SHARED_GLSL}
      void main() {
        vec3 N = normalize(vN), Vd = normalize(cameraPosition - vP), L = normalize(vec3(0.0, 0.5, -1.0));
        vec3 col = mix(${V(C.lensCore)}, ${V(C.lens)}, step(0.2, dot(N, L) * 0.5 + 0.35));
        vec3 H1 = normalize(Vd + vec3(-0.5, 0.8, 0.2)), H2 = normalize(Vd + vec3(-0.25, 0.55, 0.2));
        float cres = step(0.74, dot(N, H1)) * (1.0 - step(0.86, dot(N, H2)));
        col = mix(col, vec3(1.0), cres);
        col = mix(col, ${V(C.lensRim)}, step(0.72, 1.0 - abs(dot(N, Vd))));
        gl_FragColor = vec4(worldFinish(col, vP), 0.5);
      }`,
  });
  const beamMat = new ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201,
    uniforms: { ...S.U },
    vertexShader: "varying vec3 vP, vN; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `varying vec3 vP, vN; ${SHARED_GLSL}
      void main() {
        float a = abs(dot(normalize(vN), normalize(cameraPosition - vP)));
        vec3 col = a > 0.78 ? ${V(C.goldHot)} * 1.1 : (a > 0.40 ? ${V(C.gold)} : ${V(C.goldOuter)});
        float al = a > 0.78 ? 0.95 : (a > 0.40 ? 0.85 : 0.6);
        col = mix(col, ${V(C.goldLine)}, step(a, 0.12)); al = mix(al, 0.9, step(a, 0.12));
        gl_FragColor = vec4(worldFinish(col, vP), al);
      }`,
  });
  const lensGeo = new SphereGeometry(1.0, 32, 20);
  const beamGeo = new CylinderGeometry(0.62, 0.16, 1, 14, 1, true).translate(0, -0.5, 0); // top at the lens, tip at the node
  const lenses = [], beams = [];
  for (const n of S.nodes) {
    const l = new Mesh(lensGeo, lensMat); l.position.set(n.x, S.gy + LENS_Y, n.z); l.visible = false; l.frustumCulled = false; group.add(l); lenses.push(l);
    const b = new Mesh(beamGeo, beamMat); b.position.set(n.x, S.gy + LENS_Y - 1.0, n.z); b.visible = false; b.frustumCulled = false; b.renderOrder = 6; group.add(b); beams.push(b);
  }

  function update(cue) {
    const t = cue.ts;
    const lensT = tAt(cue, "lenses", FR(226)), beamT = tAt(cue, "beams", FR(240)), beamEnd = beamT + FR(22);
    let anyBeam = 0;
    for (let i = 0; i < 7; i++) {
      const n = S.nodes[i], L = lenses[i], B = beams[i];
      const k = (t - lensT - FR(3 * i)) / FR(10);
      L.visible = k > 0;
      L.scale.setScalar(Math.max(0.001, backOut(k, 1.3)));
      L.position.y = S.gy + LENS_Y + 0.08 * Math.sin(t * 1.3 + i);
      const s = beamT + FR(2 * i), p = clamp((t - s) / FR(6)), thin = 1 - smooth((t - (beamEnd - FR(4))) / FR(4));
      const live = t >= s && t < beamEnd && L.visible;
      B.visible = live;
      if (live) {
        const top = L.position.y - 1.0, len = top - n.tip;
        B.position.y = top; B.scale.set(thin, len * p, thin);
        anyBeam = 1;
      }
      // ignite 4 f after the beam lands; settles to the lattice gold (0.6) once the beams are gone
      const land = s + FR(6 + 4);
      const ig = smooth((t - land) / FR(4));
      S.ign[i] = ig * (t < beamEnd ? 1 : 0.6);
    }
    return anyBeam;
  }
  return { group, lenses, update, dispose() { lensGeo.dispose(); beamGeo.dispose(); lensMat.dispose(); beamMat.dispose(); } };
}
