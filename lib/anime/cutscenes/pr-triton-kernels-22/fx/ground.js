// Ground FX in the seal-local frame (x right, z forward), one additive plane just above the pool.
//  1. Mirror ripple: every hit sends a ring across the water, 24-frame (1 s) period:
//       R(age) = 16 amp age,  ring = exp(-((|x - c| - R)/0.6)^2) (1 - age),  tinted warm orange-red.
//  2. Scheduled-path pulse (shot 7): row q (0..9) of the causal triangle sits at z_q = 6 + 1.3 q and spans
//       |x| < 0.6 (q+1) + 0.5 (a pyramid, row q holds q+1 blocks). A pulse walks the rows every 0.1 s, period 1.6 s:
//       lit_q = exp(-4 (ph - 0.1 q)) for ph >= 0.1 q, ph = mod(t - flex, 1.6). After the Cleave (16.3 s) the path
//       also holds a steady 0.16 glow ("the scheduled path glows"). Stepped by the stepped clock, so it reads on twos.
import { GLSL_NOISE } from "./common.js";

export function buildGround(ctx, TL, hits) {
  const { THREE } = ctx;
  const H = new Array(8).fill(0).map(() => new THREE.Vector4(0, 0, -1e3, 1));
  hits.filter((h) => h.heavy).slice(0, 8).forEach((h, i) => H[i].set(h.at[0], h.at[2], h.t, h.cleave ? 1.8 : 1));
  const geo = new THREE.PlaneGeometry(110, 110); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { uT: { value: 0 }, uH: { value: H }, uFlex: { value: TL.flex }, uCleave: { value: TL.cleave } },
    vertexShader: /* glsl */ `varying vec2 vXZ; void main(){ vXZ=position.xz+vec2(0.,25.); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE}
      uniform float uT,uFlex,uCleave; uniform vec4 uH[8]; varying vec2 vXZ;
      void main(){
        vec3 col=vec3(0.);
        for(int i=0;i<8;i++){ vec4 h=uH[i]; float age=uT-h.z; if(age<0.||age>1.) continue;
          float R=age*16.*h.w; float d=length(vXZ-h.xy); float ring=exp(-pow((d-R)/.6,2.))*(1.-age);
          col+=vec3(1.,.42,.12)*ring*.9; }
        float pulse=0., steady=0.;
        for(int q=0;q<10;q++){ float zq=6.+1.3*float(q); float inb=smoothstep(.7,.55,abs(vXZ.y-zq))*smoothstep(.6*float(q+1)+.7,.6*float(q+1)+.4,abs(vXZ.x));
          float ph=mod(uT-uFlex,1.6); float lit=(uT>=uFlex && ph>=.1*float(q))?exp(-4.*(ph-.1*float(q))):0.;
          pulse+=inb*lit; steady+=inb*step(uCleave,uT); }
        col+=vec3(.9,.08,.18)*(pulse*1.1+steady*.16);
        float a=clamp(max(max(col.r,col.g),col.b),0.,1.);
        gl_FragColor=vec4(col,a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 5;
  mesh.position.set(0, 0.05, 25);
  const frame = new THREE.Group(); frame.add(mesh);
  return {
    frame,
    update(t) { const s = ctx.seal; frame.position.set(s.at[0], s.at[1], s.at[2]); frame.rotation.y = s.yaw || 0; frame.scale.setScalar(s.scale || 1); mat.uniforms.uT.value = t; },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
