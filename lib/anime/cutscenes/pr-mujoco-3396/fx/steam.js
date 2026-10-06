// E07 steam + dust + sparks/embers (+ E16 footfall dust). Three-tone cel puffs, sparks 2-4 px additive.
// Gate groups (uGate vec4): 0 titan-shoulder steam, 1 crack dust+embers, 2 strike ground steam/embers, 3 square footfall dust.
import { GLSL_HASH, pxScale, win, smooth, clamp } from "./util.js";

// Nape/shoulder stations of the five hero Wall Titans (world metres, relative to the scene origin; the world agent
// stands the titans on the same rank: x spread behind the Wall at z -34..-52). Tweak here if world moves them.
export const TITANS = [[-40, 40, -44], [-20, 44, -38], [0, 47, -36], [20, 44, -38], [40, 40, -44]];
const WALL_Z = -30;

export default function buildSteam(ctx, O) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const r = ctx.rng(7);
  // ---- puffs (normal blend, 3-tone) ----
  const emit = []; // {p:[x,y,z], g, n, size, life}
  TITANS.forEach(([x, y, z]) => { for (const sx of [-6, 0, 6]) emit.push({ p: [O[0] + x + sx, O[1] + y - 3, O[2] + z], g: 0, n: 5, size: 7, life: 6 }); });
  emit.push({ p: [O[0], O[1] + 0.4, O[2] + WALL_Z + 1], g: 1, n: 26, size: 9, life: 4.5 });       // crack dust 12 m puff
  emit.push({ p: [O[0], O[1] + 0.5, O[2]], g: 2, n: 28, size: 5, life: 4 });                        // strike steam at the seal's feet
  for (let i = 0; i < 18; i++) emit.push({ p: [O[0] + (r() - .5) * 26, O[1] + 0.3, O[2] + 1 + r() * 8], g: 3, n: 2, size: 2.4, life: 3 }); // footfall dust
  let N = 0; emit.forEach(e => { N += e.n; });
  const P = new Float32Array(N * 3), S = new Float32Array(N * 4), G = new Float32Array(N);
  let k = 0;
  for (const e of emit) for (let i = 0; i < e.n; i++, k++) {
    P.set(e.p, k * 3); S.set([r(), e.life * (0.7 + r() * .6), e.size * (0.6 + r() * .8), r()], k * 4); G[k] = e.g;
  }
  const gp = new THREE.BufferGeometry();
  gp.setAttribute("position", new THREE.BufferAttribute(P, 3)); gp.setAttribute("aS", new THREE.BufferAttribute(S, 4)); gp.setAttribute("aG", new THREE.BufferAttribute(G, 1));
  const U = { uT: { value: 0 }, uPx: { value: 600 }, uGate: { value: new THREE.Vector4() }, uSun: { value: new THREE.Vector2(0.6, 0.8) } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `${GLSL_HASH}
      attribute vec4 aS; attribute float aG; uniform float uT,uPx; uniform vec4 uGate; varying float vAlpha; varying float vSeed; varying float vShade;
      void main(){
        float gate = uGate[int(aG)];
        // age wraps over this puff's lifetime; uT is already stepped (twos); each drawing re-rolls the puff jitter
        float L = aS.y, age = fract(uT/L + aS.x) * L, u = age/L;
        float drawing = floor(uT*12.);
        vec2 jit = (h22(vec2(aS.x*91., drawing + aG*7.)) - .5);
        vec3 p = position + vec3(jit.x*aS.z*.5 + sin(age*.9+aS.x*6.)*aS.z*.4, age*3.0 + jit.y*.6, jit.y*aS.z*.3); // rise 3 m/s
        // gate thins the field: a puff exists only if its random rank < gate (fractional intensity)
        float on = step(aS.w, gate);
        vAlpha = on * smoothstep(0.,.12,u) * (1.-smoothstep(.55,1.,u)) * .9;
        vSeed = aS.x; vShade = aS.w;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_Position = projectionMatrix*mv;
        gl_PointSize = aS.z * (.55 + 1.6*u) * uPx / max(-mv.z, 1.);
      }`,
    fragmentShader: /* glsl */ `${GLSL_HASH}
      uniform vec2 uSun; varying float vAlpha; varying float vSeed; varying float vShade;
      void main(){
        vec2 q = gl_PointCoord*2.-1.; float ang = atan(q.y,q.x);
        // cauliflower silhouette: radius wobbled by 5-lobe + 9-lobe harmonics (billow cells)
        float edge = .78 + .12*sin(ang*5.+vSeed*40.) + .07*sin(ang*9.+vSeed*17.);
        float d = length(q); if (d > edge || vAlpha < .01) discard;
        // 3-tone cel: lit toward the sun = cream core + #f3d7a0 tint, mid = pink-grey #b5a8b1, deep = #8a788f
        float lit = dot(q/max(d,.001), uSun)*d + .15*(vShade-.5);
        vec3 core = vec3(.875,.847,.804), tint = vec3(.953,.843,.627), sh = vec3(.710,.659,.694), deep = vec3(.541,.471,.561);
        vec3 c = lit > .22 ? mix(core,tint,.35) : (lit > -.28 ? sh : deep);
        c = mix(c, vec3(.937,.894,.812), .12); // fresco plaster shows through at 12%
        gl_FragColor = vec4(c, vAlpha);
      }`,
  });
  const puffs = new THREE.Points(gp, mat); puffs.frustumCulled = false; pxScale(THREE, puffs, U); group.add(puffs);

  // ---- sparks / embers (additive, 2-4 px, flicker, drift 6 m/s) ----
  const SP = [];
  TITANS.forEach(([x, y, z]) => { for (let i = 0; i < 12; i++) SP.push([O[0] + x + (r() - .5) * 14, O[1] + y - 2, O[2] + z + (r() - .5) * 4, 0]); });
  for (let i = 0; i < 46; i++) SP.push([O[0] + (r() - .5) * 2, O[1] + r() * 30, O[2] + WALL_Z + .6, 1]);   // crack embers climb the fissure
  for (let i = 0; i < 40; i++) SP.push([O[0] + (r() - .5) * 8, O[1] + .3, O[2] + (r() - .5) * 8, 2]);       // strike ember burst
  const M = SP.length, SPp = new Float32Array(M * 3), SPs = new Float32Array(M * 4), SPg = new Float32Array(M);
  SP.forEach((s, i) => { SPp.set(s.slice(0, 3), i * 3); SPs.set([r(), 1.5 + r() * 2.5, 2 + r() * 2, r()], i * 4); SPg[i] = s[3]; });
  const gs = new THREE.BufferGeometry();
  gs.setAttribute("position", new THREE.BufferAttribute(SPp, 3)); gs.setAttribute("aS", new THREE.BufferAttribute(SPs, 4)); gs.setAttribute("aG", new THREE.BufferAttribute(SPg, 1));
  const US = { uT: { value: 0 }, uGate: { value: new THREE.Vector4() } };
  const ms = new THREE.ShaderMaterial({
    uniforms: US, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `${GLSL_HASH}
      attribute vec4 aS; attribute float aG; uniform float uT; uniform vec4 uGate; varying float vF; varying float vHot;
      void main(){
        float gate = uGate[int(aG)]; float L = aS.y, age = fract(uT/L + aS.x)*L, u = age/L;
        // drift 6 m/s up with lateral wander; flicker = on/off by hash of the drawing (twos)
        vec3 p = position + vec3(sin(age*3.+aS.x*20.)*1.6, age*6., cos(age*2.3+aS.x*11.)*1.2);
        float fl = step(.35, h21(vec2(aS.x*50., floor(uT*12.))));
        vF = step(aS.w, gate) * fl * (1.-smoothstep(.6,1.,u)); vHot = aS.w;
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
        gl_PointSize = aS.z; // 2..4 px, constant on screen
      }`,
    fragmentShader: /* glsl */ `varying float vF; varying float vHot;
      void main(){ if (vF < .01) discard; vec3 c = mix(vec3(1.,.604,.235), vec3(1.,.941,.784), step(.7,vHot)); gl_FragColor = vec4(c*1.3, 1.); }`,
  });
  const sparks = new THREE.Points(gs, ms); sparks.frustumCulled = false; group.add(sparks);

  return {
    group,
    update(t, dt, cue) {
      U.uT.value = t; US.uT.value = t;
      // steam: wisps from 1.25 s (shot 2), full pour once the titans stand (4.4-5.4 s), surge at the strike (6.85 s)
      const wisp = 0.12 * smooth(1.2, 2.2, t), stand = smooth(4.4, 5.6, t), surge = smooth(6.8, 7.4, t);
      const g0 = clamp(wisp + 0.7 * stand + 0.3 * surge);
      const crack = win(cue, t, "crack", 3.3, 4.3), dustK = crack.since < 2.5 ? 1 - smooth(0, 2.5, crack.since) : 0;
      const stk = win(cue, t, "strike", 6.75, 7.05), g2 = stk.since < 3.5 ? 1 - smooth(1.2, 3.5, stk.since) : 0;
      // footfall dust: a puff each footfall (22 frames) once the Rumbling starts
      const ft = (t - 4.92) * 24 / 22, g3 = ft > 0 ? 0.6 * Math.exp(-(ft % 1) * 4) : 0;
      U.uGate.value.set(g0, dustK, g2, g3);
      US.uGate.value.set(0.35 * stand + 0.45 * surge, crack.since < Infinity ? clamp(0.9 - smooth(5, 8, t)) : 0, g2, 0);
    },
    dispose() { gp.dispose(); gs.dispose(); mat.dispose(); ms.dispose(); },
  };
}
