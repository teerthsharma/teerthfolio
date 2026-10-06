// FINALE (shot 8, 22.8 s on): the space shatter into gold and red shards, then gold motes over the island. Gold embers drift through the barrage.
// TOOLKIT: engine/anime:glass-shatter-wipe (local adapter: instanced tumbling facets, not a voronoi wipe).
//
// Shard (a triangle with a barycentric attribute, instanced, pure in uT):
//   tau = uT - tStart ; centre = P0 + V tau + (0, -2.2, 0) tau^2 ; orientation = Rodrigues(axis, spin*tau + phase)
//   shape = (0,1), (-.85,-.55)*(.6+h1), (.9,-.5)*(.5+h2) scaled by size (0.4 to 1.4 m: 3 to 12 percent of the frame at 12 m)
//   colour flat gold #ffe27a / red #d3122e / deep #8a0c1e, facet shade .8 + .2 sin(spin tau); edge glint where min(bary) < .06 in #fff2c0
//   alpha fades over the last second of the 4.2 s life; colours are capped under white (0.95).
// Shards sit 5 to 13 m out and never between lens and seal (the home camera is 3.4 to 3.8 m from the seal).
// Motes (Points): y = mod(y0 + rise*t, 9), x sways, twinkle .6 + .4 sin(5t + phase). K ramps: embers .3 from 2.3 s, full gold dust from 23.0 s.
import { smooth } from "./common.js";

export default function finale(ctx, S) {
  const { THREE, U } = S;
  const r = ctx.rng("gate-finale");
  const group = new THREE.Group();

  const NS = 100;
  const tri = new THREE.BufferGeometry();
  tri.setAttribute("position", new THREE.Float32BufferAttribute([0, 1, 0, -0.85, -0.55, 0, 0.9, -0.5, 0], 3));
  tri.setAttribute("aBary", new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1], 3));
  const sg = new THREE.InstancedBufferGeometry();
  sg.setAttribute("position", tri.attributes.position); sg.setAttribute("aBary", tri.attributes.aBary);
  const P0 = new Float32Array(NS * 3), V = new Float32Array(NS * 3), AX = new Float32Array(NS * 4), MS = new Float32Array(NS * 4);
  for (let i = 0; i < NS; i++) {
    const a = r() * Math.PI * 2, rad = 5 + r() * 8, y = 0.6 + r() * 7.5;
    P0.set([Math.sin(a) * rad, y, Math.cos(a) * rad], i * 3);
    V.set([(r() - 0.5) * 0.8, (r() - 0.3) * 0.8, (r() - 0.5) * 0.8], i * 3);
    const ax = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
    AX.set([ax.x, ax.y, ax.z, 1.5 + r() * 3.5], i * 4);
    MS.set([22.8 + r() * 0.7, 0.4 + r() * r() * 1.1 + r() * 0.2, Math.floor(r() * 3), r()], i * 4); // tStart, size, colour id, seed
  }
  sg.setAttribute("aP0", new THREE.InstancedBufferAttribute(P0, 3));
  sg.setAttribute("aV", new THREE.InstancedBufferAttribute(V, 3));
  sg.setAttribute("aAx", new THREE.InstancedBufferAttribute(AX, 4));
  sg.setAttribute("aMs", new THREE.InstancedBufferAttribute(MS, 4));
  sg.instanceCount = NS;
  const sm = new THREE.ShaderMaterial({
    uniforms: { uT: U.uT },
    transparent: true, depthWrite: true, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aBary; attribute vec3 aP0; attribute vec3 aV; attribute vec4 aAx; attribute vec4 aMs;
      uniform float uT; varying vec3 vB; varying float vA; varying float vC; varying float vShade;
      vec3 rot(vec3 v, vec3 k, float a){ float c=cos(a), s=sin(a); return v*c + cross(k,v)*s + k*dot(k,v)*(1.-c); }
      void main(){
        float tau = uT-aMs.x;
        vec3 pos = position;
        pos.xy *= vec2(aBary.y>.5 ? .6+aMs.w : 1., aBary.z>.5 ? .5+fract(aMs.w*7.) : 1.);
        float ang = aAx.w*tau + aMs.w*6.28;
        vec3 q = rot(pos*aMs.y, normalize(aAx.xyz), ang);
        vec3 c = aP0 + aV*tau + vec3(0.,-2.2,0.)*tau*tau;
        vB = aBary; vC = aMs.z; vShade = .8+.2*sin(ang*2.);
        vA = (tau>0. && tau<4.2) ? 1.-smoothstep(3.2,4.2,tau) : 0.;
        gl_Position = vA>.002 ? projectionMatrix*viewMatrix*modelMatrix*vec4(c+q,1.) : vec4(2.,2.,2.,1.);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vB; varying float vA; varying float vC; varying float vShade;
      void main(){
        vec3 gold = vec3(1.,.886,.478), red = vec3(.827,.07,.18), deep = vec3(.541,.047,.118);
        vec3 col = vC<.5 ? gold : (vC<1.5 ? red : deep);
        col *= vShade;
        float e = 1.-smoothstep(.0,.06,min(vB.x,min(vB.y,vB.z)));
        col = mix(col, vec3(1.,.949,.753), e);
        gl_FragColor = vec4(min(col,vec3(.95)), vA);
      }`,
  });
  const shards = new THREE.Mesh(sg, sm); shards.frustumCulled = false; shards.renderOrder = 4;
  group.add(shards);

  // motes
  const NM = 220;
  const mg = new THREE.BufferGeometry();
  const MP = new Float32Array(NM * 3), MA = new Float32Array(NM * 2);
  for (let i = 0; i < NM; i++) { MP.set([(r() - 0.5) * 22, r() * 9, (r() - 0.5) * 22], i * 3); MA.set([r(), 0.4 + r() * 0.6], i * 2); }
  mg.setAttribute("position", new THREE.BufferAttribute(MP, 3));
  mg.setAttribute("aM", new THREE.BufferAttribute(MA, 2));
  const pr = (ctx.engine && ctx.engine.renderer && ctx.engine.renderer.getPixelRatio && ctx.engine.renderer.getPixelRatio()) || 1;
  const mm = new THREE.ShaderMaterial({
    uniforms: { uT: U.uT, uK: { value: 0 }, uPx: { value: 3.5 * pr } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec2 aM; uniform float uT, uK, uPx; varying float vTw;
      void main(){
        vec3 p = position;
        p.y = mod(position.y + (.35*aM.y)*uT, 9.);
        p.x += sin(uT*.5 + aM.x*6.28)*.4; p.z += cos(uT*.4 + aM.x*9.)*.4;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        vTw = (.6+.4*sin(uT*5.+aM.x*40.))*uK;
        gl_PointSize = uPx*aM.y*clamp(10./max(-mv.z,.1),.4,2.);
        gl_Position = uK>.002 ? projectionMatrix*mv : vec4(2.,2.,2.,1.);
      }`,
    fragmentShader: /* glsl */ `
      varying float vTw;
      void main(){
        float d = length(gl_PointCoord-.5); if(d>.5) discard;
        gl_FragColor = vec4(vec3(1.,.886,.478)*vTw*(1.-d*1.6), 1.);
      }`,
  });
  const motes = new THREE.Points(mg, mm); motes.frustumCulled = false; motes.renderOrder = 5;
  group.add(motes);
  return {
    group,
    update(t, dt, cue) {
      const T = cue.t;
      mm.uniforms.uK.value = 0.3 * smooth(2.3, 3.5, T) + 0.7 * smooth(23.0, 24.0, T);
      shards.visible = T > 22.7;
    },
    dispose() { tri.dispose(); sg.dispose(); sm.dispose(); mg.dispose(); mm.dispose(); },
  };
}
