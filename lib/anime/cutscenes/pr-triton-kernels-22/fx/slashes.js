// Dismantle (18 thin tapered strokes from 8.1 s, interval 0.25 s easing to 0.5 s) and Cleave (one heavy cut at 16.3 s).
// Strokes are clip-space ribbons, flat to the lens. Layers: tapered white core, red edge, soft glow, additive.
// Maths (per stroke i, age a = uT - birth, stepped: ones for the first 2 frames at 24 fps, then twos at 12 fps):
//   prog = clamp(a/draw,0,1)          draw = 2 drawings (1/6 s); cleave 1/12 s
//   fade = clamp((a-draw)/F,0,1)      F = 4 drawings (1/3 s); cleave 0.5 s
//   s(u) = L * mix(fade^2 prog, prog, u)   the tail retracts onto the head while fading
//   w(u) = W sin(pi u^1.9)^0.85 (1-0.6 fade)  pointed at both ends, thickest near the head (MAPPA's pointed tail)
//   pos  = p0 + d s(u) + n v w(u),  v in [-1,1] across
// Fragment: c=|v|; core=1-smoothstep(0,.42,c); edge=smoothstep(.25,.62,c)(1-smoothstep(.8,1,c)); glow=exp(-2.2c^2)*.35.
import { GLSL_NOISE, GLSL_SEAL } from "./common.js";

const N = 19, SEG = 14;

export function buildSlashes(ctx, TL, track) {
  const { THREE } = ctx, r = ctx.rng("slash"), asp0 = Math.max(1.2, ctx.aspect ? ctx.aspect() : 1.78);
  const A = [], B = [], strokes = [];
  let t = TL.slash;
  const heavyIdx = new Set([0, 8, 13]);
  for (let i = 0; i < 18; i++) {
    const ang = (20 + r() * 50) * Math.PI / 180 * (r() < 0.5 ? 1 : -1) + (r() < 0.5 ? 0 : Math.PI);
    const L = 0.7 + r() * 2.1, d = [Math.cos(ang), Math.sin(ang)];
    const c = [(r() * 2 - 1) * 0.95 * asp0, (r() * 2 - 1) * 0.75];
    const heavy = heavyIdx.has(i);
    A.push([c[0] - d[0] * L / 2, c[1] - d[1] * L / 2, c[0] + d[0] * L / 2, c[1] + d[1] * L / 2]);
    B.push([heavy ? 0.045 : 0.012 + r() * 0.02, t, r() * 100, 0]);
    strokes.push({ t, heavy });
    t += 0.25 + 0.25 * Math.pow(i / 16, 1.5);
  }
  // the Cleave: one heavy red-white cut across the whole frame
  const a = 38 * Math.PI / 180, L = 3.9 * Math.max(1, asp0 / 1.78);
  A.push([-Math.cos(a) * L / 2, -Math.sin(a) * L / 2 + 0.05, Math.cos(a) * L / 2, Math.sin(a) * L / 2 + 0.05]);
  B.push([0.12, TL.cleave, 7.7, 1]);
  strokes.push({ t: TL.cleave, heavy: true });

  const nv = N * (SEG + 1) * 2;
  const pos = new Float32Array(nv * 3), aU = new Float32Array(nv), aV = new Float32Array(nv), aS = new Float32Array(nv);
  const idx = [];
  for (let i = 0; i < N; i++) for (let k = 0; k <= SEG; k++) for (let s = 0; s < 2; s++) {
    const v = (i * (SEG + 1) + k) * 2 + s;
    aU[v] = k / SEG; aV[v] = s ? 1 : -1; aS[v] = i;
    if (k < SEG && s === 0) idx.push(v - s, v - s + 1, v - s + 2, v - s + 1, v - s + 3, v - s + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aU", new THREE.BufferAttribute(aU, 1));
  g.setAttribute("aV", new THREE.BufferAttribute(aV, 1));
  g.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
  g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      ...track.u, uT: { value: 0 },
      uA: { value: A.map((x) => new THREE.Vector4(...x)) }, uB: { value: B.map((x) => new THREE.Vector4(...x)) },
      uCore: { value: new THREE.Color("#f4efe2") }, uEdge: { value: new THREE.Color("#d1081f") },
    },
    vertexShader: /* glsl */ `
      attribute float aU, aV, aS; uniform vec4 uA[${N}]; uniform vec4 uB[${N}]; uniform float uT, uAsp;
      varying float vU, vV, vLife, vSeed; varying vec2 vN;
      void main(){
        int i=int(aS+0.5); vec4 a=uA[i]; vec4 b=uB[i];
        float age=uT-b.y;
        age = age<2./24. ? floor(age*24.)/24. : floor(age*12.)/12.;
        float cl=b.w; float draw=cl>.5?1./12.:1./6.;
        float prog=clamp(age/draw,0.,1.); float fade=clamp((age-draw)/(cl>.5?.5:1./3.),0.,1.);
        float vis=(age>=0. && fade<1.)?1.:0.;
        vec2 p0=a.xy,p1=a.zw; vec2 d=normalize(p1-p0); vec2 n=vec2(-d.y,d.x); float L=length(p1-p0);
        float s=mix(fade*fade*prog,prog,aU)*L;
        float prof=pow(max(sin(3.14159*pow(aU,1.9)),0.),.85);
        float w=b.x*prof*(1.-.6*fade);
        vec2 pos=p0+d*s+n*aV*w;
        vN=vec2(pos.x/uAsp,pos.y);
        gl_Position= vis>.5 ? vec4(vN,0.,1.) : vec4(2.,2.,2.,1.);
        vU=aU; vV=aV; vLife=1.-fade; vSeed=b.z;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE} ${GLSL_SEAL}
      uniform vec3 uCore, uEdge; varying float vU,vV,vLife,vSeed; varying vec2 vN;
      void main(){
        float c=abs(vV);
        float core=1.-smoothstep(0.,.42,c);
        float edge=smoothstep(.25,.62,c)*(1.-smoothstep(.8,1.,c));
        float glow=exp(-c*c*2.2)*.35;
        float grain=.82+.18*h21(vec2(vU*60.,vV*7.)+vSeed);
        vec3 col=uCore*core*1.05+uEdge*(edge*1.4+glow);
        float al=(core+edge+glow)*vLife*grain*sealMask(vN);
        gl_FragColor=vec4(col,al);
      }`,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 1001;
  track.attach(mesh);
  return { mesh, strokes, update(t) { mat.uniforms.uT.value = t; }, dispose() { g.dispose(); mat.dispose(); } };
}
