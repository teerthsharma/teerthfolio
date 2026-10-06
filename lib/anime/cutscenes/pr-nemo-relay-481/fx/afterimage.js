// Afterimages (bible 3 + 6): 3 silver-blue translucent pup-shaped copies trailing the dodging seal, cyan fresnel edge, short smear.
// TOOLKIT: engine/anime:lib/anime/fx/afterimage.js
// Flat #c9d4e8 at 40 percent, edge #a8d8ff. Flicker on twos. Copies sit where the seal was 2/4/6 steps (1/6 s each) ago, plus a lateral
// dodge offset so they read even when the seal stands still. Window beat: "afterimage" (default 2.9 s to 13.5 s).
// Shape: a chibi body ellipsoid + head sphere (the pup's proportions: head ~ 0.5 of height); no mesh clone, so no skinned-mesh risk.
import { wk, sstep, disposeAll } from "./util.js";

// Fragment: flat silver with edge = (1 - n.v)^2.2 cyan rim, alpha 0.40 flat inside, 0.9 on the rim.
const V = "varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }";
const F = `varying vec3 vN; varying vec3 vV; uniform float uA;
void main(){
  float v = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  float rim = pow(1.0 - v, 2.2);
  vec3 body = vec3(0.788, 0.831, 0.910), edge = vec3(0.659, 0.847, 1.0);
  vec3 col = mix(body, edge, smoothstep(0.25, 0.7, rim));
  float a = mix(0.40, 0.90, smoothstep(0.25, 0.7, rim)) * uA;
  gl_FragColor = vec4(min(col, vec3(0.92)), a);
}`;

export function buildAfterimage(ctx, frame, win) {
  const THREE = ctx.THREE, g = new THREE.Group();
  const geoB = new THREE.SphereGeometry(1, 16, 12), geoH = new THREE.SphereGeometry(1, 16, 12);
  const NC = 3, copies = [];
  for (let i = 0; i < NC; i++) {
    const mat = new THREE.ShaderMaterial({ uniforms: { uA: { value: 1 } }, vertexShader: V, fragmentShader: F, transparent: true, depthWrite: false });
    const grp = new THREE.Group();
    const body = new THREE.Mesh(geoB, mat); body.userData.k = "b";
    const head = new THREE.Mesh(geoH, mat); head.userData.k = "h";
    grp.add(body, head); grp.visible = false;
    grp.traverse((o) => { o.frustumCulled = false; o.renderOrder = 3; });
    g.add(grp); copies.push({ grp, body, head, mat });
  }
  const wA = win("afterimage", 2.9, 10.6), wD = win("dodge", 8.08, 5.42);
  const hist = []; // [step, x, y, z]
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  let lastStep = -1;

  return {
    group: g,
    update(t) {
      const step = Math.floor(t * 12);
      if (step !== lastStep) { // history sampled once per step, pure of t only when scrubbed forward; ghosts also use a closed-form offset
        hist.push([step, frame.base.x, frame.base.y, frame.base.z]); if (hist.length > 24) hist.shift(); lastStep = step;
      }
      const ka = wk(wA, t), on = ka >= 0 && ka <= 1;
      const dodging = wk(wD, t) >= 0 && wk(wD, t) <= 1;
      for (let i = 0; i < NC; i++) {
        const c = copies[i];
        // flicker on twos: copy i shows on alternating steps, phase-shifted per copy
        const show = on && ((step + i) % 2 === 0 || dodging);
        c.grp.visible = show;
        if (!show) continue;
        const H = frame.H, back = i + 1;
        // closed-form lateral dodge offset: the seal sidesteps +-0.55 H on a 1 s cycle; ghosts lag by 1/6 s per copy
        const tt = t - back / 6;
        const side = Math.sin(tt * 6.283) * 0.55 * H * (dodging ? 1 : 0.35);
        frame.world(side, 0, 0, p);
        // blend toward recorded position history if the seal actually travels
        const h = hist[Math.max(0, hist.length - 1 - back * 2)];
        if (h) { q.set(h[1], h[2], h[3]); p.x += (q.x - frame.base.x); p.z += (q.z - frame.base.z); }
        c.grp.position.copy(p);
        c.grp.rotation.y = frame.yaw;
        // smear: stretch along the sidestep (local x) by the lateral speed
        const vx = Math.abs(Math.cos(tt * 6.283)) * (dodging ? 1 : 0.35);
        const sm = 1 + 0.55 * vx;
        c.body.position.set(0, 0.32 * H, 0); c.body.scale.set(0.34 * H * sm, 0.30 * H, 0.30 * H);
        c.head.position.set(0, 0.78 * H, 0); c.head.scale.set(0.34 * H * sm, 0.30 * H, 0.30 * H);
        c.mat.uniforms.uA.value = (1 - i * 0.22) * (0.5 + 0.5 * sstep(0, 0.1, ka));
      }
    },
    dispose() { disposeAll(g); },
  };
}
