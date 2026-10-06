// KEY OF THE HEAVENS halo + glints, and the VAULT GATE Bab-ilu with red circuits spreading, then opening.   (shot 4, 6.8 to 8.9 s)
// Seal-local coordinates (the parent group follows the seal). Key held at KEY; gate door stands behind the seal.
//
// Circuit shader maths (p in [-1,1]^2 over a 2.4 x 3.0 m door):
//   grid cells g = p * (9, 11); id = floor(g), f = fract(g); h = hash(id)
//   trace = h<.5 ? (|f.y-.5| < .06) : (|f.x-.5| < .06)         one horizontal or vertical segment through each cell centre
//   pad   = h>.78 && |f-.5| < .17                                 solder pad on a few cells
//   growth front: d = |p - socket| ; lit = d + h*.12 < prog*1.7 ; head = band of width .06 at the front, in white-gold #fff2c0
//   panels: gold #ffb020 x .28 with engraved vertical grooves, frame band at the border, seam glow at the split.
//   opening: gap g = open*.95; |p.x| < g is the vault light: core #fff2c0 falling to gold with fbm rays.
import { GLSL_NOISE, smooth } from "./common.js";

export default function gate(ctx, S) {
  const { THREE, U, flares } = S;
  const KEY = [0.28, 1.9, 0.4], GATE = [0, 1.9, -1.4];
  // key halo, ring, turning glints, lock-click flash
  flares.add({ c: KEY, size: 0.8, t0: 6.9, t1: 9.6, kind: 1, col: "#fff2c0", fi: 0.6, fo: 0.9 });
  flares.add({ c: KEY, size: 0.9, t0: 7.0, t1: 8.6, kind: 2, col: "#ffe27a", fi: 0.4, fo: 0.8 });
  [7.25, 7.5, 7.75, 7.98].forEach((t, i) => flares.add({ c: [KEY[0] + (i % 2 ? 0.1 : -0.1), KEY[1] + 0.05 * i, KEY[2]], size: 0.55, t0: t, t1: t + 0.25, kind: 0, col: "#ffffff", fi: 0.03, fo: 0.2 }));
  flares.add({ c: [GATE[0], GATE[1], GATE[2] + 0.05], size: 2.2, t0: 8.0, t1: 8.5, kind: 0, col: "#fff2c0", fi: 0.02, fo: 0.4 }); // lock-click
  const geo = new THREE.PlaneGeometry(2.4, 3.0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: U.uT, uProg: { value: 0 }, uOpen: { value: 0 }, uA: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vP; void main(){ vP=position.xy/vec2(1.2,1.5); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uProg, uOpen, uA; varying vec2 vP;
      ${GLSL_NOISE}
      void main(){
        vec2 p = vP;
        float g = uOpen*.95;
        vec3 gold = vec3(1.,.69,.125), lit = vec3(1.,.886,.478), core = vec3(1.,.949,.753), red = vec3(1.,.165,.227);
        float panel = step(g, abs(p.x));
        float edge = 1.-smoothstep(0.,.05, abs(p.x)-g);                          // seam glow at the split
        float frame = step(.9, abs(p.x)) + step(.92, abs(p.y));
        float groove = .5+.5*sin(p.y*34.);
        vec3 col = panel*(gold*(.22+.12*groove) + lit*.55*min(frame,1.));
        // circuits
        vec2 q = p*vec2(9.,11.); vec2 id = floor(q), f = fract(q); float h = h21(id);
        float tr = h<.5 ? 1.-smoothstep(.05,.08,abs(f.y-.5)) : 1.-smoothstep(.05,.08,abs(f.x-.5));
        float pad = step(.78,h)*(1.-smoothstep(.14,.17,length(f-.5)));
        float d = length(p-vec2(0.,-.1));
        float front = uProg*1.7;
        float on = smoothstep(front, front-.05, d+h*.12);
        float head = smoothstep(.06,0.,abs(d+h*.12-front))*step(.001,uProg)*step(uProg,.98);
        float cir = max(tr, pad)*step(.3,h21(id+7.))*panel;
        col += red*cir*on*1.15 + core*cir*head*1.2;
        // vault light behind the split
        float inside = 1.-panel;
        float rays = fbm(vec2(p.y*3.+uT*.6, p.x*14.));
        col += (core*(1.-abs(p.x)/max(g,.01))*1.2 + lit*.4*rays)*inside*step(.001,uOpen);
        col += core*edge*.5*step(.001,uOpen)*panel;
        float vig = smoothstep(1.,.85,abs(p.y))*smoothstep(1.,.9,abs(p.x));      // keep the plane edge invisible
        gl_FragColor = vec4(col*uA*vig*.9, 1.);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(GATE[0], GATE[1], GATE[2]); mesh.renderOrder = 3;
  const group = new THREE.Group(); group.add(mesh);
  return {
    group,
    update(t, dt, cue) {
      const T = cue.t, u = mat.uniforms;
      u.uProg.value = smooth(6.8, 8.3, T);
      u.uOpen.value = smooth(8.0, 8.9, T);
      u.uA.value = smooth(6.6, 6.9, T) * (1 - smooth(9.4, 10.4, T));
      mesh.visible = u.uA.value > 0.002;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
