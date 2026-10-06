// Shared helpers for the pr-polychrom-79 FX layer (Gate of Babylon). Everything is a PURE function of the clock
// (uT = display clock, uTs = stepped clock) so a scrubbed frame equals a played one.
// Palette (bible section 2): core #fff2c0, gold #ffe27a, orange #ffb020, rim #c98a12, glow #ff8a1a,
// red #d3122e / #ff2a3a / #ff4a5a, deep #8a0c1e, black-red #1a0a10, steel #e8f0ff.
// TOOLKIT: shared-candidate helpers: flareSet (instanced star/glow/ring billboards), propMat (2-band toon prop), GLSL noise.

export const GLSL_NOISE = /* glsl */ `
float h11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float h21(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
vec3 h33(vec3 p){ p=fract(p*vec3(.1031,.1030,.0973)); p+=dot(p,p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x), mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+17.1; a*=.5; } return s; }
`;

export function shared() {
  return { uT: { value: 0 }, uTs: { value: 0 }, uAspect: { value: 1.78 } };
}

export const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

// InstancedBufferGeometry from a base geometry (position/index/normal kept) plus per-instance attributes {name:[itemSize, Float32Array]}
export function instGeo(THREE, base, n, attrs) {
  const g = new THREE.InstancedBufferGeometry();
  if (base.index) g.index = base.index;
  for (const k of Object.keys(base.attributes)) g.setAttribute(k, base.attributes[k]);
  for (const [k, [s, arr]] of Object.entries(attrs)) g.setAttribute(k, new THREE.InstancedBufferAttribute(arr, s));
  g.instanceCount = n;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// FLARES: one draw for every star glint, soft glow and halo ring in the cutscene.
// Billboard in view space: mv = MV*c; mv.xy += quad*size; envelope env(t) = smoothstep(t0,t0+fi) * (1 - smoothstep(t1-fo,t1)).
// Star = core exp(-r^2 40) + long horizontal/vertical streaks exp(-|y|30)exp(-|x|3.5) + half-strength diagonals (45 deg rotated).
// kind 0 star, 1 soft glow exp(-r^2 5), 2 ring exp(-((r-.7)14)^2).
export function flareSet(THREE, U) {
  const list = [];
  return {
    add(o) { list.push(o); },
    finish() {
      const n = Math.max(1, list.length);
      const C = new Float32Array(n * 3), S = new Float32Array(n), T = new Float32Array(n * 3), F = new Float32Array(n * 3), K = new Float32Array(n * 3);
      list.forEach((o, i) => {
        C.set(o.c, i * 3); S[i] = o.size;
        T.set([o.t0, o.t1, o.kind || 0], i * 3);
        F.set([o.fi ?? 0.05, o.fo ?? Math.max(0.05, (o.t1 - o.t0) * 0.8), o.flick ?? 0], i * 3);
        const c = new THREE.Color(o.col || "#fff2c0"); K.set([c.r, c.g, c.b], i * 3);
      });
      const g = instGeo(THREE, new THREE.PlaneGeometry(2, 2), list.length, { aC: [3, C], aS: [1, S], aTm: [3, T], aFd: [3, F], aCol: [3, K] });
      const m = new THREE.ShaderMaterial({
        uniforms: { uT: U.uT },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          attribute vec3 aC; attribute float aS; attribute vec3 aTm; attribute vec3 aFd; attribute vec3 aCol;
          uniform float uT; varying vec2 vQ; varying float vE; varying vec3 vCol; varying float vKind;
          void main(){
            float env = smoothstep(aTm.x, aTm.x+aFd.x, uT) * (1.-smoothstep(aTm.y-aFd.y, aTm.y, uT));
            env *= 1. + aFd.z*sin(uT*37.+aC.x*3.1+aC.y*1.7);
            vQ = position.xy; vE = env; vCol = aCol; vKind = aTm.z;
            vec4 mv = modelViewMatrix*vec4(aC,1.);
            mv.xy += position.xy*aS*(.55+.45*clamp(env,0.,1.));
            gl_Position = env>0.002 ? projectionMatrix*mv : vec4(2.,2.,2.,1.);
          }`,
        fragmentShader: /* glsl */ `
          varying vec2 vQ; varying float vE; varying vec3 vCol; varying float vKind;
          void main(){
            float r = length(vQ); float v;
            if(vKind<.5){
              vec2 d = vec2(vQ.x+vQ.y, vQ.x-vQ.y)*.7071;
              float core = exp(-r*r*40.);
              float cr = exp(-abs(vQ.y)*30.)*exp(-abs(vQ.x)*3.5) + exp(-abs(vQ.x)*30.)*exp(-abs(vQ.y)*3.5);
              float di = exp(-abs(d.y)*34.)*exp(-abs(d.x)*5.) + exp(-abs(d.x)*34.)*exp(-abs(d.y)*5.);
              v = core*1.2 + cr + .5*di;
            } else if(vKind<1.5){ v = exp(-r*r*5.); }
            else { float q=(r-.7)*14.; v = exp(-q*q); }
            v *= 1.-smoothstep(.85,1.,r);
            gl_FragColor = vec4(vCol*v*clamp(vE,0.,1.5), 1.);
          }`,
      });
      const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 6;
      return { mesh, dispose() { g.dispose(); m.dispose(); } };
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// propMat: two-band toon prop (no lights needed). band = d>.12 ? 1 : d>-.3 ? .62 : .36 with d = N.L (view space, L upper-left-front),
// gold rim = pow(1 - N.V, 3). Life window (t0, tFadeStart, tEnd): per-instance attribute aLife when `perLife`, else uniform uLife.
// Per-vertex colour through attribute aCol when `vcol`.
export function propMat(THREE, U, o = {}) {
  const defs = {};
  if (o.perLife) defs.PER_LIFE = 1;
  if (o.vcol) defs.VCOL = 1;
  return new THREE.ShaderMaterial({
    defines: defs,
    uniforms: {
      uT: U.uT, uLife: { value: new THREE.Vector3(...(o.life || [0, 1e5, 1e5 + 1])) },
      uCol: { value: new THREE.Color(o.col || "#8a98b8") }, uShade: { value: new THREE.Color(o.shade || "#3a4560") },
      uRim: { value: new THREE.Color(o.rim || "#ffb020") },
    },
    transparent: true, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uT; varying vec3 vN; varying vec3 vV; varying float vA; varying vec3 vC;
      #ifdef PER_LIFE
        attribute vec3 aLife;
      #else
        uniform vec3 uLife;
      #endif
      #ifdef VCOL
        attribute vec3 aCol;
      #endif
      void main(){
        #ifdef PER_LIFE
          vec3 L = aLife;
        #else
          vec3 L = uLife;
        #endif
        vA = smoothstep(L.x, L.x+.25, uT)*(1.-smoothstep(L.y, L.z, uT));
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = m*instanceMatrix;
        #endif
        vec4 wp = m*vec4(position,1.);
        vN = normalize(mat3(viewMatrix)*mat3(m)*normal);
        vec4 mv = viewMatrix*wp; vV = normalize(-mv.xyz);
        #ifdef VCOL
          vC = aCol;
        #else
          vC = vec3(-1.);
        #endif
        gl_Position = vA>.002 ? projectionMatrix*mv : vec4(2.,2.,2.,1.);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCol, uShade, uRim; varying vec3 vN; varying vec3 vV; varying float vA; varying vec3 vC;
      void main(){
        vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
        float d = dot(n, normalize(vec3(-.4,.7,.6)));
        float band = d>.12 ? 1. : (d>-.3 ? .62 : .36);
        vec3 base = vC.x<0. ? uCol : vC;
        vec3 col = mix(uShade, base, band) * (band>.9 ? 1. : .8);
        col += uRim * pow(1.-max(dot(n, normalize(vV)),0.), 3.) * .55;
        gl_FragColor = vec4(min(col, vec3(.95)), vA);
      }`,
  });
}

// merge geometries into one non-indexed geometry with position, normal, aCol
export function mergeColored(THREE, parts) {
  const P = [], N = [], C = [];
  for (const { geo, col, at } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (at) g.translate(at[0], at[1], at[2]);
    const c = new THREE.Color(col), n = g.attributes.position.count;
    for (const v of g.attributes.position.array) P.push(v);
    for (const v of g.attributes.normal.array) N.push(v);
    for (let i = 0; i < n; i++) C.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("aCol", new THREE.Float32BufferAttribute(C, 3));
  return g;
}
