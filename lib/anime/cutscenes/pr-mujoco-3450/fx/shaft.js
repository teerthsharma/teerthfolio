// E13 LIGHT SHAFT THROUGH THE SPLIT + E17 MOTES (mote-stars).
// MATHS
//   shaft    an open cone from the hole (r = 5.5 m at y = 38, an 11 m opening) widening toward the plain by tan(7 deg) per metre
//            (apex angle 14 deg), 38 m tall. Only its BACK faces draw, so the seal (nearer to the lens than the far wall of the
//            volume) is depth-tested clean: the shaft can never milk the seal. Three flat bands from the view-ray chord proxy
//            ndv = |n . v|: core (>.66) #f5e0b0 at 18 percent, mid (>.33) 11 percent, edge white 6 percent.
//   envelope appears f104 (T.shaft0), full by f123 (T.shaft1), holds, breathes: 1 + .01 sin(1.9 t) (1 percent); the foot fades over 1.2 m
//   motes    60 plain motes drift 0.1 m/s on twos (wrapped box) + 40 riding the shaft (rising .25 m/s); #fff1d8, 0.02-0.05 m, drawn as
//            fixed-pixel round sprites with a 1 px ink ring: size_px = clamp(h * 90 * resH / 720, 2, 5)
import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, CylinderGeometry, Group, Mesh, Points, ShaderMaterial } from "three";
import { C, PAL, sstep, hash } from "./util.js";

const SHAFT_V = `varying vec3 vN, vV; varying float vY; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = position.y; gl_Position = projectionMatrix * mv; }`;
const SHAFT_F = `uniform float uA, uH; uniform vec3 uCore, uEdge; varying vec3 vN, vV; varying float vY;
void main(){
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  float band = ndv > 0.66 ? 0.18 : (ndv > 0.33 ? 0.11 : 0.06);          // 3 flat steps
  vec3 c = ndv > 0.33 ? uCore : uEdge;
  float foot = smoothstep(0.0, 1.2, vY + uH * 0.5);                      // fade into the plain
  gl_FragColor = vec4(c, band * uA * foot);
}`;
const MOTE_V = `attribute float aS; uniform float uK; varying float vA; void main(){ gl_PointSize = aS * uK; vA = 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const MOTE_F = `uniform vec3 uC, uInk; uniform float uA; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard; gl_FragColor = vec4(r > 0.78 ? uInk : uC, uA * vA * (r > 0.78 ? 0.55 : 1.0)); }`;

export function make(ctx, S) {
  const { T, F } = S, group = new Group();
  const H = 38, rTop = 5.5, rBot = rTop + H * Math.tan(7 * Math.PI / 180);
  const geo = new CylinderGeometry(rTop, rBot, H, 48, 1, true);
  const sm = new ShaderMaterial({ vertexShader: SHAFT_V, fragmentShader: SHAFT_F, uniforms: { uA: { value: 0 }, uH: { value: H }, uCore: { value: C(PAL.shaft) }, uEdge: { value: C("#ffffff") } }, transparent: true, depthWrite: false, side: BackSide, blending: AdditiveBlending });
  const shaft = new Mesh(geo, sm); shaft.position.set(F.H.x, H / 2, F.H.z); shaft.renderOrder = 3; shaft.frustumCulled = false; group.add(shaft);

  // motes: first 60 on the plain, last 40 on the shaft
  const N = 100, pos = new Float32Array(N * 3), size = new Float32Array(N), seeds = [];
  for (let i = 0; i < N; i++) {
    const h = (k) => hash(i * 7.77 + k), onShaft = i >= 60;
    const p = onShaft ? { x: F.H.x + (h(1) - 0.5) * 2 * rTop * 0.8, y: h(2) * 30, z: F.H.z + (h(3) - 0.5) * 2 * rTop * 0.8 } : { x: -12 + h(1) * 24, y: 0.3 + h(2) * 6, z: -10 + h(3) * 16 };
    seeds.push({ ...p, onShaft, dx: (h(4) - 0.5) * 0.2, dz: (h(5) - 0.5) * 0.2 });
    size[i] = 0.02 + 0.03 * h(6);
  }
  const g2 = new BufferGeometry(); g2.setAttribute("position", new BufferAttribute(pos, 3)); g2.setAttribute("aS", new BufferAttribute(size.map((s) => s * 90), 1));
  const mm = new ShaderMaterial({ vertexShader: MOTE_V, fragmentShader: MOTE_F, uniforms: { uK: { value: 1 }, uC: { value: C(PAL.hot) }, uInk: { value: C(PAL.ink) }, uA: { value: 1 } }, transparent: true, depthWrite: false });
  const motes = new Points(g2, mm); motes.renderOrder = 4; motes.frustumCulled = false; group.add(motes);

  return {
    group,
    update(ts) {
      const env = sstep(T.shaft0, T.shaft1, ts), breath = 1 + 0.01 * Math.sin(ts * 1.9);
      sm.uniforms.uA.value = env * breath; shaft.visible = env > 0.001;
      mm.uniforms.uK.value = S.resH.value / 720;
      seeds.forEach((s, i) => {
        let x = s.x + s.dx * ts, y = s.y, z = s.z + s.dz * ts;
        if (s.onShaft) { y = (s.y + 0.25 * ts) % 30; x = s.x; z = s.z; }
        else { x = ((x + 12) % 24 + 24) % 24 - 12; }
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      });
      g2.attributes.position.needsUpdate = true;
      if (env < 0.02) // shaft motes stay under the plain until the shaft exists
        for (let i = 60; i < N; i++) pos[i * 3 + 1] = -50;
    },
    dispose() { geo.dispose(); sm.dispose(); g2.dispose(); mm.dispose(); },
  };
}
