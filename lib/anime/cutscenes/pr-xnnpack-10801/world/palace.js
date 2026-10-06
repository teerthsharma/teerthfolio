// WORLD / Las Noches on the horizon (bible: dome-and-towers palace, central white dome, a ring of slender spired towers, black
// window slits, drawn as thin lines; 30 % of the frame wide, dome height 2.5 x tower base width).
//
// Built at 170 m BEHIND the seal (seal frame -z, rotated by the seal yaw) so the wide, arc and kill shots all look at it.
//   tower base width 6 (r 3) -> dome height 15 m (drum 4 m + a half-ellipsoid 15 wide, 11 high)
//   ring: 8 towers at radius 34 (shaft r 1.8, h 28, spire cone r 2.3, h 10), a curtain wall r 36, h 7 between them: width ~ 74 m,
//   which is 30 % of the frame at fov 42 from the wide camera
//   the base is sunk 5 m so the dunes hide the foundation
// Shading: flat two-band, light L = normalize(-0.5, 0.8, 0.35): lit #f4f4f0, shadow side #b0b4c0 (the bible's palace shadow);
//   windows are black #080a0f slits cut by object-space coordinates on every cylinder:
//     a = atan(x, z) / tau * N   (N slits round the shaft),   v = y / H   (a row every H metres)
//     slit = [|fract(a) - .5| < 0.07] * [|fract(v) - .5| < 0.28]
//   no detail beyond that (negative space); the engine's set-line pass inks the silhouette, 1 px.
// Motion: static, except the heat-wave wobble at the end of the glass break (uWob, a bell over 1.6 s from the snap):
//   x += sin(0.35 y + 6 uT) 0.9 uWob.  The palace is part of the dimension, so the glass pass wipes it in and drops it.
import { CylinderGeometry, ConeGeometry, Group, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { PAL, V, GLASS } from "./common.js";

function palaceMat(U, id, slitN, slitH) {
  return new ShaderMaterial({
    uniforms: { ...U, uId: { value: id }, uSlitN: { value: slitN }, uSlitH: { value: slitH } },
    side: 2,
    vertexShader: `uniform float uWob; uniform float uT; varying vec3 vW; varying vec3 vN; varying vec3 vL;
      void main() {
        vL = position; vec4 w = modelMatrix * vec4(position, 1.0);
        w.x += sin(0.35 * w.y + 6.0 * uT) * 0.9 * uWob;
        vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `${GLASS} uniform float uId; uniform float uSlitN; uniform float uSlitH; varying vec3 vW; varying vec3 vN; varying vec3 vL;
      const vec3 WHITE = ${V(PAL.paper)}; const vec3 SHADE = ${V(PAL.shade)}; const vec3 INKC = ${V(PAL.ink)};
      void main() {
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        float l = dot(n, normalize(vec3(-0.5, 0.8, 0.35))); float w = fwidth(l) * 0.75 + 1e-4;
        vec3 col = mix(SHADE, WHITE, smoothstep(0.22 - w, 0.22 + w, l));
        if (uSlitN > 0.5) {
          float a = atan(vL.x, vL.z) / 6.28318 * uSlitN, v = vL.y / uSlitH;
          float sa = 1.0 - smoothstep(0.07, 0.07 + fwidth(a) * 1.2 + 1e-4, abs(fract(a) - 0.5));
          float sv = 1.0 - smoothstep(0.28, 0.28 + fwidth(v) * 1.2 + 1e-4, abs(fract(v) - 0.5));
          col = mix(col, INKC, sa * sv);
        }
        gl_FragColor = vec4(glassPass(min(col, vec3(0.95)), vW), uId);
      }`,
  });
}

export function buildPalace(ctx, U) {
  const sd = ctx.scene.seal ?? {};
  const yaw = sd.yaw ?? 0, at = sd.at ?? [0, 0, 0];
  const root = new Group();
  const mats = [];
  const M = (id, n, h) => { const m = palaceMat(U, id, n, h); mats.push(m); return m; };
  const add = (geo, mat, x, y, z) => { const m = new Mesh(geo, mat); m.position.set(x, y, z); m.frustumCulled = false; m.userData.layer = 1; root.add(m); return m; };
  // central dome: drum (slits) + half-ellipsoid (smooth) + a finial
  add(new CylinderGeometry(15, 15.5, 4, 40, 1, false), M(0.60, 24, 4), 0, 2, 0);
  const dome = add(new SphereGeometry(15, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), M(0.62, 0, 1), 0, 4, 0); dome.scale.y = 11 / 15;
  add(new ConeGeometry(0.7, 5, 6), M(0.62, 0, 1), 0, 4 + 11 + 2.2, 0);
  // curtain wall and the ring of 8 spired towers
  add(new CylinderGeometry(36, 36, 7, 64, 1, true), M(0.64, 64, 3.5), 0, 3.5, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, x = Math.cos(a) * 34, z = Math.sin(a) * 34;
    add(new CylinderGeometry(1.8, 2.2, 28, 10, 1, false), M(0.66, 10, 3.5), x, 14, z);
    add(new ConeGeometry(2.4, 10, 10), M(0.68, 0, 1), x, 28 + 5, z);
  }
  // 170 m behind the seal (seal-frame -z -> world by yaw: x' = -170 sin, z' = -170 cos), base sunk 5 m below the ground
  root.position.set(at[0] - 170 * Math.sin(yaw), U.uGround.value - 5.0, at[2] - 170 * Math.cos(yaw));
  return { obj: root, update() {}, dispose() { for (const m of mats) m.dispose(); root.traverse((o) => o.geometry?.dispose()); } };
}
