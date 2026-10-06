// The 3D half of the gild wipe: a ground ring front and a cylindrical shell, both additive gold (#f2bd45), expanding from the
// seal over 1.25 s (the repaint behind the front is the world's uGild uniform; this is only the front). Pure function of uK.
//   ground: d = |xz - c|; R(k) = 70*(1-(1-k)^2.2); front = exp(-((d-R)/w)^2) with w=1.4 m and a 2-octave angular noise edge,
//           trail = exp(-(R-d)/6)*0.25 for d<R, all * (1-k)^0.6
//   shell : open cylinder radius R, height 5 m; alpha=(1-y)*0.5*(0.6+0.4*noise(ang*6+t)) * ray stripes fract(ang*40), * (1-k)^0.7
import { GLSL } from "./util.js";

const VERT = /* glsl */ `varying vec3 vW; varying vec3 vL; void main(){ vL=position; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const FRAG = /* glsl */ `
varying vec3 vW; varying vec3 vL;
uniform float uK, uShell, uT; uniform vec3 uC, uGold;
${GLSL}
void main(){
  float fade=pow(1.-clamp(uK,0.,1.),.6);
  float R=70.*(1.-pow(1.-clamp(uK,0.,1.),2.2));
  if(uShell>.5){
    float y=vL.y+.5, ang=atan(vL.z,vL.x);
    float n=vn(vec2(ang*6.+uT*2.,y*3.));
    float ray=.55+.45*step(.5,fract(ang*40.+n));
    float a=(1.-y)*.5*(.6+.4*n)*ray*pow(1.-clamp(uK,0.,1.),.7);
    gl_FragColor=vec4(uGold*a*1.5,0.);
  } else {
    vec2 d=vW.xz-uC.xz; float dist=length(d), ang=atan(d.y,d.x);
    float nz=(fbm2(vec2(ang*3.,uT*.5))-.5)*2.2;
    float dd=dist-R-nz;
    float front=exp(-(dd*dd)/(1.4*1.4));
    float trail=dist<R?exp(-(R-dist)/6.)*.25:0.;
    float a=(front+trail)*fade;
    gl_FragColor=vec4(uGold*a*1.5,0.);
  }
}`;

export function makeGild(THREE, goldRgb) {
  const U = { uK: { value: 0 }, uShell: { value: 0 }, uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uGold: { value: new THREE.Vector3(...goldRgb) } };
  const mk = (shell) => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, premultipliedAlpha: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { ...U, uShell: { value: shell } },
  });
  const matG = mk(0), matS = mk(1);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220).rotateX(-Math.PI / 2), matG);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 96, 1, true), matS);
  for (const m of [ground, shell]) { m.frustumCulled = false; m.visible = false; m.renderOrder = 20; }
  return {
    group: [ground, shell],
    set(k, cx, cz, t) {
      const on = k >= 0 && k <= 1;
      ground.visible = shell.visible = on;
      if (!on) return;
      const R = 70 * (1 - Math.pow(1 - k, 2.2));
      for (const m of [matG, matS]) { m.uniforms.uK.value = k; m.uniforms.uT.value = t; m.uniforms.uC.value.set(cx, 0, cz); }
      ground.position.set(cx, 0.04, cz);
      shell.position.set(cx, 2.5, cz); shell.scale.set(Math.max(.01, R), 5, Math.max(.01, R));
    },
    dispose() { ground.geometry.dispose(); shell.geometry.dispose(); matG.dispose(); matS.dispose(); },
  };
}
