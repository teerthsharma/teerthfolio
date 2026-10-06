// p-caustic WORLD / rubble and debris (bible 3.4): 150 instanced dodecahedra 0.12-0.87 m on the field, 2 x 60 debris thrown
// at the two hits (9-14 m/s, 14-20 m/s on hit two), ballistic arcs with a ground clamp, on twos. Contact shadows are soot discs.
//   JS ballistics:  x(tau) = O + v tau,  y(tau) = .3 + vy tau - 4.9 tau^2,  landing at tl (quadratic root), frozen after
//   rock shade:     n = flat normal from dFdx/dFdy(vP); l = n . key (up-left, as the moon); 3 hard cuts:
//                   lit = tint, mid = tint * .68 toward wine #3a1520, shadow = tint * .4; tint = mix(#6b5c4c, #8f7b5c, hash(instance))
//                   red sheen only pow(max(l,0), 4) * .25 * (.5,.06,.08); dark edge #1a0f0a where |n . v| < .22
//   break:          every rock falls (gravity x2, delayed by hash) and shrinks to nothing in .9 s
import { PAL, V, GEO, since } from "./common.js";

const VERT = /* glsl */ `
  varying vec3 vP; varying float vS;
  void main() {
    mat4 M = modelMatrix;
    #ifdef USE_INSTANCING
      M = modelMatrix * instanceMatrix;
    #endif
    vec4 wp = M * vec4(position, 1.0); vP = wp.xyz;
    vS = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const FRAG = /* glsl */ `
  varying vec3 vP; varying float vS;
  void main() {
    vec3 n = normalize(cross(dFdx(vP), dFdy(vP)));
    vec3 v = normalize(cameraPosition - vP);
    if (dot(n, v) < 0.0) n = -n;
    float l = dot(n, normalize(vec3(-0.45, 0.75, -0.5)));
    vec3 tint = mix(${V(PAL.rock)}, ${V(PAL.rockHi)}, vS);
    vec3 col = l > 0.55 ? tint : (l > 0.15 ? mix(tint, ${V("#3a1520")}, 0.32) * 0.68 : tint * 0.4);
    col += vec3(0.5, 0.06, 0.08) * pow(max(l, 0.0), 4.0) * 0.25;
    col = mix(${V(PAL.rockEdge)}, col, step(0.22, abs(dot(n, v))));
    gl_FragColor = vec4(min(col, vec3(0.9)), 0.5);
  }`;

// the same height as the ground shader, enough to sit rocks on the ridge and in the craters (nn mirrors GLSL hh/nn)
const hh = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const nn = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hh(ix, iy), b = hh(ix + 1, iy), c = hh(ix, iy + 1), d = hh(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};
const crater = (x, z, c, R, d) => { const k = Math.hypot(x - c[0], z - c[1]) / R; return (k < 1 ? -d * (1 - k * k) : 0) + 0.3 * d * Math.exp(-(((k - 1.05) / 0.2) ** 2)); };
const heightAt = (x, z) => {
  const rz = (z - GEO.RIDGE_Z) / 4.5;
  let h = 1.7 * Math.exp(-rz * rz) * (0.65 + 0.5 * nn(x * 0.08, 1.3)) * (0.8 + 0.2 * nn(x * 0.5, z * 0.5));
  for (const c of GEO.CRATERS) h += crater(x, z, c, c[2], c[3]);
  return h;
};

export function buildRubble(ctx, env) {
  const { THREE } = ctx, rng = ctx.rng("p-caustic-rubble");
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG });
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const N = 150, D = 120;
  const rocks = new THREE.InstancedMesh(geo, mat, N), debris = new THREE.InstancedMesh(geo, mat, D);
  rocks.frustumCulled = debris.frustumCulled = false; rocks.userData.layer = debris.userData.layer = 1;
  const shadowMat = new THREE.ShaderMaterial({
    vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
    fragmentShader: `void main() { gl_FragColor = vec4(${V(PAL.soot)}, 0.5); }`,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const shadows = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), shadowMat, N);
  shadows.frustumCulled = false; shadows.userData.layer = 1;

  // static rocks: on the field and beyond the ridge, never in the seal's yard or the allied row
  const R = [];
  while (R.length < N) {
    const x = (rng() - 0.5) * 120, z = -4 - rng() * 75;
    if (Math.abs(x) < 7 && z > -9) continue;
    if (Math.abs(z - GEO.RIDGE_Z + 0.5) < 3.2 && Math.abs(x) < 35) continue;
    const s = 0.12 + Math.pow(rng(), 2.2) * 0.75;
    R.push({ x, z, s, sx: 0.85 + rng() * 0.3, sz: 0.85 + rng() * 0.3, rx: rng() * 6.28, ry: rng() * 6.28, rz: rng() * 6.28, dl: rng() * 0.5, y: heightAt(x, z) });
  }
  const o = new THREE.Object3D();
  // debris launches: first 60 on hit one, last 60 on hit two
  const Db = Array.from({ length: D }, (_, i) => {
    const hit = i < D / 2 ? 0 : 1, a = rng() * 6.283, el = 0.35 + rng() * 0.9, sp = hit ? 14 + rng() * 6 : 9 + rng() * 5;
    const O = hit ? GEO.HIT2 : GEO.HIT1;
    const vy = Math.sin(el) * sp;
    return { hit, ox: O[0], oz: O[1], vx: Math.cos(a) * Math.cos(el) * sp, vz: Math.sin(a) * Math.cos(el) * sp, vy, s: 0.12 + rng() * 0.5,
      tl: (vy + Math.sqrt(vy * vy + 2 * 9.8 * 0.3)) / 9.8, w: (rng() - 0.5) * 12, ax: rng() * 6.28, dl: rng() * 0.4 };
  });

  const put = (mesh, i, x, y, z, sx, sy, sz, rx, ry, rz) => {
    o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
  };
  return {
    obj: [rocks, debris, shadows],
    update(t, dt, cue) {
      const tb = since(cue, "break"), tt = tb < 0 ? 0 : tb;
      const gone = (d) => (tb < 0 ? 1 : Math.max(0, 1 - Math.max(0, tt - d) / 0.9));
      R.forEach((r, i) => {
        const fall = tb < 0 ? 0 : Math.max(0, tt - r.dl);
        const k = gone(r.dl);
        put(rocks, i, r.x, r.y + r.s * 0.3 - 9.8 * fall * fall, r.z, r.s * r.sx * k, r.s * k, r.s * r.sz * k, r.rx + fall * 3, r.ry, r.rz + fall * 2);
        const sk = tb < 0 ? 1 : 0;
        put(shadows, i, r.x, r.y + 0.03, r.z, r.s * 1.35 * sk, 1, r.s * 1.25 * sk, 0, 0, 0);
      });
      rocks.instanceMatrix.needsUpdate = shadows.instanceMatrix.needsUpdate = true;
      Db.forEach((d, i) => {
        const s0 = since(cue, d.hit ? "impact" : "hit1");
        if (s0 < 0) { put(debris, i, 0, -50, 0, 0, 0, 0, 0, 0, 0); return; }
        const tau = Math.min(s0, d.tl);
        const fall = tb < 0 ? 0 : Math.max(0, tt - d.dl);
        const k = gone(d.dl);
        const y = Math.max(0.3 + d.vy * tau - 4.9 * tau * tau, d.s * 0.4);
        put(debris, i, d.ox + d.vx * tau, y - 9.8 * fall * fall, d.oz + d.vz * tau, d.s * k, d.s * k, d.s * k, d.ax + d.w * tau, d.ax * 0.5 + d.w * tau * 0.6, d.w * tau * 0.3);
      });
      debris.instanceMatrix.needsUpdate = true;
    },
    dispose() { geo.dispose(); mat.dispose(); shadowMat.dispose(); shadows.geometry.dispose(); rocks.dispose(); debris.dispose(); shadows.dispose(); },
  };
}
