// Genjutsu break (6.6-8.1 s): the red picture shatters like glass and falls; daylight returns.
// The world layer shardifies its own surfaces; this layer adds the sky-glass: 140 tumbling triangular shards with a
// 2 px bright edge (#fff4e4, 0.9 for the first 0.2 s then 0.5).
//   P(s)  = P0 + v s + (0, -.5 g s^2, 0),  g = 9.8 * 1.6     rotation: Rodrigues about a per-shard axis, angle = w s
//   edge  = 1 - smoothstep(0, e, min(b0,b1,b2)),  e = 2 px in barycentric space  (e = fwidth(min b) * 2)
//   face  = mix(#6a5c4d, #b80a17, h)   (war sepia / moon red)   alpha .55 (1 - smoothstep(.55, 1, k))
// plus a warm daylight bloom behind the horizon at the break: #fff0c8, never a white-out (peak .18).
import { glowCard, instanced } from "./util.js";

export function buildShatter(ctx) {
  const { THREE } = ctx;
  const rng = ctx.rng("shatter");
  const g = new THREE.Group();
  const N = 140;
  const tri = new THREE.BufferGeometry();
  tri.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.6, 0, -0.5, -0.4, 0, 0.5, -0.4, 0], 3));
  tri.setAttribute("aBary", new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1], 3));
  tri.setIndex([0, 1, 2]);
  const p0 = new Float32Array(N * 4), vel = new Float32Array(N * 4), spin = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    p0.set([(rng() - 0.5) * 230, 2 + rng() * 85, -55 - rng() * 80, 3 + rng() * 7], i * 4);        // x y z size
    vel.set([(rng() - 0.5) * 5, (rng() - 0.3) * 4, (rng() - 0.5) * 4, rng()], i * 4);                // v, hue
    spin.set([rng() - 0.5, rng() - 0.5, rng() - 0.5, (rng() - 0.5) * 6], i * 4);                     // axis, rate
  }
  const geo = instanced(THREE, tri, N, { aP: [4, p0], aV: [4, vel], aS: [4, spin] });
  geo.setAttribute("aBary", tri.getAttribute("aBary"));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uS: { value: -1 }, uK: { value: 0 } },
    vertexShader: `attribute vec3 aBary; attribute vec4 aP; attribute vec4 aV; attribute vec4 aS; uniform float uS,uK;
      varying vec3 vB; varying float vH; varying float vA;
      vec3 rot(vec3 v, vec3 ax, float an){ ax=normalize(ax+1e-3); float c=cos(an),s=sin(an); return v*c+cross(ax,v)*s+ax*dot(ax,v)*(1.-c); }
      void main(){ float s=max(uS,0.); vB=aBary; vH=aV.w; vA=(uS<0.)?0.:1.-smoothstep(.55,1.,uK);
        vec3 v=rot(position*aP.w, aS.xyz, s*aS.w);
        vec3 P=aP.xyz+aV.xyz*s+vec3(0.,-.5*15.7*s*s*(.4+aV.w),0.)+v;
        gl_Position=(uS<0.)?vec4(2.,2.,2.,1.):projectionMatrix*viewMatrix*vec4(P,1.); }`,
    fragmentShader: `varying vec3 vB; varying float vH; varying float vA; uniform float uS;
      void main(){ float m=min(vB.x,min(vB.y,vB.z)); float e=fwidth(m)*2.; float edge=1.-smoothstep(0.,e,m);
        float eI = uS<.2 ? .9 : .5;
        vec3 face=mix(vec3(.416,.361,.302),vec3(.72,.04,.09),vH);
        vec3 c=mix(face,vec3(1.,.957,.894),edge*eI*1.6);
        gl_FragColor=vec4(c, mix(.55,1.,edge)*vA); }`,
  });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 3; g.add(m);
  const day = glowCard(THREE, { size: 220, col: "#fff0c8", a: 0, pow: 1.4 });
  day.position.set(0, 14, -90); day.renderOrder = 1; g.add(day);

  return {
    group: g,
    update(t, dt, cue, win) {
      const w = win(cue, "shatter", 6.6, 1.5);
      mat.uniforms.uS.value = w.s; mat.uniforms.uK.value = w.k;
      const d = win(cue, "shatter", 6.6, 2.4);
      day.material.uniforms.uA.value = d.s >= 0 ? 0.18 * Math.sin(Math.PI * Math.min(1, d.k * 1.05)) : 0;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
