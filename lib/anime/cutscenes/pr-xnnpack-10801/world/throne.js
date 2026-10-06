// WORLD / Aizen's throne (bible: a towering dais-and-seat of white stone rising out of the sand; the hero seal sits on top).
// Built in the SEAL'S frame (forward +z, back of the seat at -z), at the seal's x/z, rotated by its yaw.
//
// Geometry (metres; the seat parts scale by ks = max(1, seal.scale) so the seal sits comfortably on it):
//   dais     4 octagonal tiers, r = 6.5, 5.5, 4.5, 3.5, 0.875 high each, from the ground G up to G + 3.5 (steps 7 wide at the top)
//   pedestal a square column 3.2 x 3.2 from the dais top to the seat; its HEIGHT FOLLOWS THE SEAL: seatTop = the seal's feet y,
//            so the throne "rises out of the sand over 36 frames and carries the seal up" whatever the direction layer's seal move is
//   seat     slab 2.8ks x 0.5 x 2.6ks, top face at the seal's feet; armrests; back 2.6ks x 3.2ks x 0.45 at z = -1.15ks
//   back     a black PANEL on the back's front face with a white negative inset line and grey fold chevrons (TYBW grammar:
//            black fill, white negative-space edge cut): the seal reads white against black
//   crown    three blades above the back; the hogyoku sits at the centre blade tip
// Shading, hard two-band, light from upper left L = normalize(-0.5, 0.8, 0.35):
//   l = n.L;  col = mix(#b0b4c0, #f4f4f0, smoothstep(0.30 -+ fwidth(l)));  downward faces (n.y < -0.5) go ink #080a0f
//   panel: ink fill, white inset line at uv-edge distance 0.05 (width 0.012), grey #6a6a72 chevron |v - (0.62 - 0.9|u - .5|)| < .008
//   the gap: along the lowest tier the stone tints cold blue #3d7fc4: col = mix(col, blue, uGap (1 - smoothstep(0, 1, y - G)) 0.85)
// Each part has its own id (0.30...0.38) so the engine's set-line pass inks the seams between parts (inner line 1 px).
// Easter egg 1: the hogyoku, one violet-blue dot HDR (above 1 so it blooms) for ONE twos frame at 6.4 s.
// Easter egg 6: the gap is exactly 32/144 of the dais foot: an arc of 2 pi 32/144 = 80 degrees, #5fb6ff, lit at 8.4 s.
import { BoxGeometry, CylinderGeometry, ConeGeometry, Group, Mesh, PlaneGeometry, RingGeometry, ShaderMaterial, SphereGeometry } from "three";
import { PAL, V, GLASS, since, EV } from "./common.js";

const LIGHT = "normalize(vec3(-0.5, 0.8, 0.35))";

function stone(U, id, mode) {
  return new ShaderMaterial({
    uniforms: { ...U, uId: { value: id }, uMode: { value: mode } },
    side: 2, // DoubleSide: thin blades and the panel are seen from both sides
    vertexShader: `varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${GLASS} uniform float uId; uniform float uMode; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      const vec3 WHITE = ${V(PAL.paper)}; const vec3 SHADE = ${V(PAL.shade)}; const vec3 INKC = ${V(PAL.ink)};
      const vec3 FOLD = ${V(PAL.fold)}; const vec3 BLUE = ${V(PAL.blue)};
      void main() {
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        float l = dot(n, ${LIGHT}); float w = fwidth(l) * 0.75 + 1e-4;
        vec3 col = mix(SHADE, WHITE, smoothstep(0.30 - w, 0.30 + w, l));
        col = mix(col, INKC, 1.0 - smoothstep(-0.5 - w, -0.5 + w, n.y));          // undersides are deep ink
        if (uMode > 0.5) {                                                         // the black panel with the white negative cut
          float b = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
          float pw = fwidth(b) * 0.8 + 1e-4;
          float line = 1.0 - smoothstep(0.006 - pw, 0.006 + pw, abs(b - 0.05));
          float chev = 1.0 - smoothstep(0.0, fwidth(vUv.y) * 1.2 + 1e-4, abs(vUv.y - (0.62 - 0.9 * abs(vUv.x - 0.5))) - 0.004);
          col = mix(INKC, FOLD, chev * step(0.1, vUv.y) * step(vUv.y, 0.92) * 0.9);
          col = mix(col, WHITE, line);
        }
        float foot = 1.0 - smoothstep(0.0, 1.0, vW.y - uGround);
        col = mix(col, BLUE, uGap * foot * 0.85);
        gl_FragColor = vec4(glassPass(min(col, vec3(0.95)), vW), uId);
      }`,
  });
}

export function buildThrone(ctx, U) {
  const sd = ctx.scene.seal ?? {};
  const ks = Math.max(1, sd.scale ?? 1);
  const root = new Group();            // at the seal's x/z, yaw, ground height
  const mats = [];
  const M = (id, mode = 0) => { const m = stone(U, id, mode); mats.push(m); return m; };
  const add = (geo, mat, x, y, z, parent = root) => { const m = new Mesh(geo, mat); m.position.set(x, y, z); m.frustumCulled = false; m.userData.layer = 1; parent.add(m); return m; };

  // dais: 4 octagonal tiers (ground-fixed, they are the first thing out of the sand)
  const radii = [6.5, 5.5, 4.5, 3.5], th = 0.875, tierMat = M(0.30);
  const dais = new Group(); root.add(dais);
  radii.forEach((r, i) => {
    const t = add(new CylinderGeometry(r - 0.25, r, th, 8), tierMat, 0, i * th + th / 2, 0, dais); t.rotation.y = Math.PI / 8;
  });
  // pedestal: unit-height square column scaled in y to reach the seat
  const pedGeo = new BoxGeometry(3.2, 1, 3.2).translate(0, 0.5, 0);
  const ped = add(pedGeo, M(0.32), 0, 3.5, 0);
  // seat group: everything above the seat plane, positioned each frame at seatTop
  const seat = new Group(); root.add(seat);
  const stoneMat = M(0.34), armMat = M(0.38), backMat = M(0.36), panelMat = M(0.37, 1), crownMat = M(0.39);
  add(new BoxGeometry(2.8 * ks, 0.5, 2.6 * ks), stoneMat, 0, -0.25, 0, seat);                 // slab, top face at seal feet
  for (const sx of [-1, 1]) add(new BoxGeometry(0.4 * ks, 0.6 * ks, 2.0 * ks), armMat, sx * 1.3 * ks, 0.3 * ks, -0.1 * ks, seat);
  add(new BoxGeometry(2.6 * ks, 3.2 * ks, 0.45), backMat, 0, 1.6 * ks, -1.15 * ks, seat);       // the back, 3.2 m
  const panel = add(new PlaneGeometry(2.2 * ks, 2.8 * ks), panelMat, 0, 1.6 * ks, -1.15 * ks + 0.24, seat);   // faces +z, in front of the back
  void panel;
  for (const [sx, h] of [[-0.95, 2.0], [0, 3.0], [0.95, 2.0]]) {
    const b = add(new ConeGeometry(0.34 * ks, h * ks, 4), crownMat, sx * ks, (3.2 + h / 2) * ks, -1.15 * ks, seat); b.rotation.y = Math.PI / 4;
  }
  // easter egg 1: the hogyoku (HDR, one frame)
  const hog = new Mesh(new SphereGeometry(0.16 * ks, 10, 8), new ShaderMaterial({
    uniforms: { ...U }, transparent: false,
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `${GLASS} varying vec3 vW; void main() { gl_FragColor = vec4(${V(PAL.hogyoku)} * 3.2, 0.5); }`,
  }));
  hog.position.set(0, (3.2 + 3.0) * ks + 0.2, -1.15 * ks); hog.visible = false; hog.userData.layer = 1; hog.frustumCulled = false; seat.add(hog);

  // the gap: an 80 degree arc (= 2 pi 32/144) along the dais foot, in front of the throne (+z)
  const arcLen = (Math.PI * 2 * 32) / 144;
  const gapGeo = new RingGeometry(6.55, 7.05, 24, 1, Math.PI / 2 - arcLen / 2, arcLen).rotateX(-Math.PI / 2);
  const gapMat = new ShaderMaterial({
    uniforms: { ...U }, side: 2, depthWrite: false,
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `${GLASS} varying vec3 vW; void main() { if (uGap < 0.01) discard;
      vec3 col = ${V(PAL.blueHi)} * (0.9 + 0.7 * uGap); gl_FragColor = vec4(glassPass(col, vW), 0.5); }`,
  });
  const gap = new Mesh(gapGeo, gapMat); gap.position.y = 0.06; gap.frustumCulled = false; gap.userData.layer = 1; root.add(gap);

  let lastTop = 0, frozen = false;
  return {
    obj: root,
    update(t, dt, cue) {
      const s = ctx.seal, G = U.uGround.value;
      root.position.set(s.at[0], G, s.at[2]); root.rotation.y = s.yaw;
      // the seat follows the seal's feet until the glass falls, then holds (the seal drops, the throne is shards)
      const sb = since(cue, "break", EV.break);
      if (sb >= 0) frozen = true; else frozen = false;
      let top = frozen ? lastTop : Math.max(0.5, s.at[1] - G - 0.05);
      if (!frozen) lastTop = top;
      seat.position.y = top;
      const hp = Math.max(top - 3.5 - 0.0, 0.001);
      ped.scale.y = hp; ped.position.y = 3.5;
      ped.visible = top > 3.5;
      // the dais tiers sink in as the seat is below them (before the rise the whole throne is under the sand)
      dais.position.y = Math.min(0, top - 3.5 - 0.0) * 1.0;
      // easter egg 1: one twos frame at 6.4 s
      const sh = since(cue, "hogyoku", EV.hogyoku);
      hog.visible = sh >= 0 && sh < 1 / 12 + 1e-4;
      gap.position.y = 0.06 + dais.position.y;
    },
    dispose() { for (const m of mats) m.dispose(); root.traverse((o) => o.geometry?.dispose()); hog.material.dispose(); gapMat.dispose(); },
  };
}
