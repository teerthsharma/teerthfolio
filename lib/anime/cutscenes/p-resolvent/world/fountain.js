// FOUNTAIN: dry cracked bowl (r 2.06 m, rim 0.55 m) at (-4.4, -4.6), the sky puddle (r 0.95, #8fd0c8), dark crack strips, 40 clover
// heads and leaves (owner ref fierien.jpg), a blue butterfly crossing on threes (layer 1), and the carved "sorry" struck through on
// the rim facing the seal (Easter egg 6: zero sorry; relief, not a plaque). Clover is kept 3.2 m clear of the seal.
import { CircleGeometry, Group, IcosahedronGeometry, InstancedMesh, LatheGeometry, Mesh, Object3D, PlaneGeometry, Shape, ShapeGeometry, Vector2 } from "three";
import { C, V, mat, flat, decal, FOUNT } from "./common.js";

export function buildFountain(ctx, U) {
  const R = ctx.rng(31), group = new Group(), disposers = [];
  const [fx, fz] = FOUNT;
  const bowl = new Group(); bowl.position.set(fx, 0, fz); group.add(bowl);
  // the bowl: lathe of a thick rim profile
  const prof = [[1.7, 0], [2.06, 0], [2.12, 0.5], [2.06, 0.55], [1.78, 0.55], [1.72, 0.42], [1.7, 0.1]].map(([r, y]) => new Vector2(r, y));
  const stoneMat = mat(ctx, U, /* glsl */ `
    vec3 shade(vec3 P, vec3 N, vec3 Vw) {
      float edge = unmakeEdge(P);
      float lam = dot(N, normalize(uLightDir));
      float row = floor(P.y / 0.18), a = atan(P.z + ${(-FOUNT[1]).toFixed(2)}, P.x + ${(-FOUNT[0]).toFixed(2)});
      float t = h21(vec2(floor(a * 3.0), row));
      vec3 sc = mix(${V(C.stone[1])}, ${V(C.stone[3])}, step(0.5, t));
      vec3 c = mix(mix(sc * 0.55, ${V(C.cast)}, 0.5), sc, smoothstep(0.1, 0.14, lam));
      c = mix(c, ${V(C.stoneTop)}, step(0.7, N.y) * smoothstep(0.1, 0.14, lam) * 0.7);
      c = mix(c, ${V(C.line)}, (1.0 - smoothstep(0.02, 0.04, fract(P.y / 0.18))) * 0.45);
      vec2 vv = vor(vec2(a * 4.0, P.y * 3.0));                                       // the cracks of the bowl
      c = mix(c, ${V(C.crack)}, (1.0 - smoothstep(0.0, 0.03, vv.y)) * 0.5 * step(0.7, h21(floor(vec2(a * 4.0, P.y * 3.0)))));
      return finish(c, P, edge);
    }`, { side: 2 });
  const lathe = new Mesh(new LatheGeometry(prof, 24), stoneMat); lathe.frustumCulled = false; bowl.add(lathe);
  const floorM = flat(ctx, U, "#9a8466"); const floor = new Mesh(new CircleGeometry(1.72, 24).rotateX(-Math.PI / 2), floorM); floor.position.y = 0.1; bowl.add(floor);
  const pudMat = mat(ctx, U, /* glsl */ `
    vec3 shade(vec3 P, vec3 N, vec3 Vw) { float e = unmakeEdge(P);
      float cl = step(0.6, fbm(P.xz * 2.4 + 4.0));                                    // a flat cloud reflected in the sky puddle
      return finish(mix(${V(C.puddle)}, ${V(C.snow)}, cl * 0.8), P, e); }`);
  const pud = new Mesh(new CircleGeometry(0.95, 24).rotateX(-Math.PI / 2), pudMat); pud.position.set(0.15, 0.115, 0.1); bowl.add(pud);
  const crackMat = flat(ctx, U, C.crack);
  for (let i = 0; i < 5; i++) {                                                       // crack strips across the floor
    const c = new Mesh(new PlaneGeometry(1.5 + R(), 0.05).rotateX(-Math.PI / 2), crackMat);
    c.position.set((R() - 0.5) * 0.8, 0.118, (R() - 0.5) * 0.8); c.rotation.y = R() * 3.14; bowl.add(c);
  }
  // Easter egg 6: "sorry", struck through, on the rim face toward the seal
  const dx = -fx, dz = -fz, dl = Math.hypot(dx, dz);
  const sorry = decal("sorry", { w: 1.15, h: 0.3, col: "#3a2a38", alpha: 0.85, strike: true, light: "#f0d7ae", font: "italic 600" });
  sorry.position.set(fx + (dx / dl) * 2.115, 0.27, fz + (dz / dl) * 2.115); sorry.rotation.y = Math.atan2(dx, dz); group.add(sorry);

  // clover: 4 patches, white heads, green leaves
  const headMat = flat(ctx, U, C.clover, { instanced: true }), leafMat = flat(ctx, U, C.moss, { instanced: true, side: 2 });
  const heads = new InstancedMesh(new IcosahedronGeometry(0.075, 0), headMat, 40), leaves = new InstancedMesh(new CircleGeometry(0.11, 5).rotateX(-Math.PI / 2), leafMat, 120);
  const o = new Object3D(); let hi = 0, li = 0;
  for (let p = 0; p < 4; p++) {
    const a = 0.6 + p * 1.3, pr = 2.9 + R() * 1.4, px = fx + pr * Math.cos(a), pz = fz + pr * Math.sin(a);
    for (let k = 0; k < 10; k++) {
      let x = px + (R() - 0.5) * 1.5, z = pz + (R() - 0.5) * 1.5;
      if (Math.hypot(x, z) < 3.2) { x = fx - (x - fx); z = fz - (z - fz); }
      o.position.set(x, 0.1, z); o.rotation.set(0, 0, 0); o.scale.setScalar(0.8 + R() * 0.5); o.updateMatrix(); heads.setMatrixAt(hi++, o.matrix);
      for (let l = 0; l < 3; l++) { o.position.set(x + (R() - 0.5) * 0.22, 0.03, z + (R() - 0.5) * 0.22); o.rotation.set(0, R() * 6.28, 0); o.scale.setScalar(0.9 + R() * 0.6); o.updateMatrix(); leaves.setMatrixAt(li++, o.matrix); }
    }
  }
  heads.frustumCulled = false; leaves.frustumCulled = false; group.add(heads, leaves);

  // the butterfly (layer 1): outer dark wing + inner blue wing, flapping about the body axis, on threes
  const bf = new Group(); bf.userData.layer = 1; group.add(bf);
  const wingShape = (s) => { const w = new Shape(); w.moveTo(0, 0); w.bezierCurveTo(0.05 * s, 0.16 * s, 0.22 * s, 0.2 * s, 0.26 * s, 0.07 * s); w.bezierCurveTo(0.3 * s, -0.04 * s, 0.14 * s, -0.12 * s, 0.07 * s, -0.1 * s); w.bezierCurveTo(0.03 * s, -0.08 * s, 0.01 * s, -0.04 * s, 0, 0); return new ShapeGeometry(w, 8).rotateX(-Math.PI / 2); };
  const wOut = flat(ctx, U, C.butterEdge, { side: 2 }), wIn = flat(ctx, U, C.butter, { side: 2 });
  const wings = [];
  for (const sx of [1, -1]) {
    const pivot = new Group(); pivot.scale.x = sx;
    const a = new Mesh(wingShape(1), wOut), b = new Mesh(wingShape(0.72), wIn); b.position.y = 0.003;
    pivot.add(a, b); bf.add(pivot); wings.push(pivot);
  }
  bf.scale.setScalar(1.1);
  const A = [-9.5, 1.3, -1.8], B = [-1.8, 2.3, -7.8];
  const T = ctx.scene.beats?.find((b) => b.name === "butterfly"), t0 = T?.t ?? 4.6, dur = T?.dur ?? 3.0;
  function update(ts) {
    const u = (ts - t0) / dur; bf.visible = u >= 0 && u <= 1;
    if (!bf.visible) return;
    const w = Math.sin(u * 14) * 0.25;
    bf.position.set(A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u + w, A[2] + (B[2] - A[2]) * u + Math.cos(u * 9) * 0.3);
    bf.rotation.y = Math.atan2(B[0] - A[0], B[2] - A[2]);
    const flap = 0.15 + 1.0 * Math.abs(Math.sin(ts * Math.PI * 4));
    wings[0].rotation.z = flap; wings[1].rotation.z = -flap;
  }
  disposers.push(() => { for (const m of [stoneMat, floorM, pudMat, crackMat, headMat, leafMat, wOut, wIn]) m.dispose(); sorry.userData.dispose?.(); heads.geometry.dispose(); leaves.geometry.dispose(); });
  return { group, sorry, update, dispose() { disposers.forEach((f) => f()); } };
}
