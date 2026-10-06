// ONE instanced billboard renderer for every 3D fx sprite of p-separatrix (a single shader program, F3).
// Per instance: iP=(pos.xyz, kind) iB=(b.xyz or ripple progress in x, seed) iS=(sx, sy, rot, alpha) iC=(rgb, sealMaskStrength).
// The CPU rebuilds the list every update from the clock alone (no state), so scrubbing equals playing.
// Output is premultiplied: additive kinds write a=0, painted kinds write a>0. Every instance is faded by the seal's screen
// ellipse (sealMask) so no fx ever covers the seal.
//  kind 0 mote       exp(-4 r^2) soft disc
//  kind 1 disc       flat coin, darker rim            (rounding discs #f4b8a0)
//  kind 2 flake      polar blob r < .72+.28*noise, sinopia rim, hatch cracks (plaster flakes)
//  kind 3 spark      astroid star sqrt|x|+sqrt|y|<1 plus a core                (hit sparks)
//  kind 4 fist       rounded box + 4 knuckle circles (smooth-min), stripe shading  (MUDA afterimage)
//  kind 5 segment    ribbon between two world points, taper u^1.6, white head      (arrow, trails, bursts)
//  kind 6 glint      long-armed star pow(|x|,.4)+pow(|y|,.4)<1 + ring + core       (gold star glints)
//  kind 7 puff       noisy soft dust disc, painted
//  kind 8 halo       crimson edge-glow of a silhouette SDF: band(d)=exp(-max(d,0)*10)*smoothstep(-.03,.02,d), noisy d (2 oct),
//                    R/G/B read the band at d+0.014 / d / d-0.014 = the 2-3 px chromatic fringe. seed<.5 KC, else seal blob
//  kind 10 ripple    ground-flat concentric rings, iB.x = progress
//  kind 12 crescent  lens = disc(1) minus disc(1) shifted -.45: the 2-3 frame smear
import { GLSL } from "./util.js";

const VERT = /* glsl */ `
attribute vec4 iP; attribute vec4 iB; attribute vec4 iS; attribute vec4 iC;
varying vec2 vUv; varying vec4 vC; varying vec4 vS; varying vec4 vBB; varying float vKind; varying vec2 vN;
void main(){
  float kind=iP.w;
  vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
  vec3 up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
  vec2 q=position.xy; vec3 wp;
  if(kind>4.5 && kind<5.5){
    vec3 A=iP.xyz, B=iB.xyz; float u=q.x*.5+.5; vec3 mid=mix(A,B,u);
    vec3 side=normalize(cross(B-A,cameraPosition-mid)+vec3(1e-5))*iS.x;
    wp=mid+side*q.y;
  } else if(kind>9.5 && kind<10.5){
    wp=iP.xyz+vec3(q.x*iS.x,0.,q.y*iS.y);
  } else {
    float c=cos(iS.z), s=sin(iS.z); vec2 r=vec2(c*q.x-s*q.y, s*q.x+c*q.y);
    wp=iP.xyz+right*r.x*iS.x+up*r.y*iS.y;
  }
  vUv=q; vC=iC; vS=iS; vBB=iB; vKind=kind;
  vec4 clip=projectionMatrix*viewMatrix*vec4(wp,1.);
  vN=clip.xy/clip.w; gl_Position=clip;
}`;

const FRAG = /* glsl */ `
varying vec2 vUv; varying vec4 vC; varying vec4 vS; varying vec4 vBB; varying float vKind; varying vec2 vN;
uniform float uAsp, uT; uniform vec4 uSeal;
${GLSL}
float sdKC(vec2 q){
  float head=length(q-vec2(0.,.66))-.15;
  float torso=sdBox(q-vec2(0.,.12),vec2(.27,.46))-.04;
  vec2 qa=vec2(abs(q.x),q.y);
  float arm=sdCap(qa,vec2(.27,.42),vec2(.52,-.28),.09);
  return smin(smin(head,torso,.06),arm,.05);
}
float sdBlob(vec2 q){
  float body=(length((q-vec2(0.,-.1))/vec2(.55,.62))-1.)*.55;
  float hd=length(q-vec2(0.,.42))-.36;
  return smin(body,hd,.08);
}
float haloBand(float d){ return smoothstep(-.03,.02,d)*exp(-max(d,0.)*10.); }
void main(){
  vec2 q=vUv; float r2=dot(q,q), r=sqrt(r2), A=vS.w, seed=vBB.w;
  int k=int(vKind+.5);
  vec3 rgb=vC.rgb; float a=0.; bool paint=false;
  if(k==0){ a=exp(-r2*4.)*(1.-smoothstep(.8,1.,r)); }
  else if(k==1){ float disc=1.-smoothstep(.92,1.,r); float rim=smoothstep(.62,.8,r);
    rgb=mix(rgb,rgb*.55+vec3(.15,.02,.04),rim); a=disc*.85; paint=true; }
  else if(k==2){ float ang=atan(q.y,q.x); float edge=.7+.28*(vn(vec2(ang*2.1+seed*13.,seed*5.))-.5)*2.;
    a=1.-smoothstep(edge-.03,edge,r); float rim=smoothstep(edge-.13,edge-.03,r)*a;
    rgb=mix(rgb,vec3(.725,.341,.227),rim*.9);
    rgb*=1.-.12*step(.92,fract(q.x*5.+q.y*3.+seed*7.)); paint=true; }
  else if(k==3){ a=star4(q,1.)+exp(-r2*14.); }
  else if(k==4){
    float box=sdBox(q-vec2(-.1,0.),vec2(.55,.38))-.06;
    float kn=1e3; for(int i=0;i<4;i++){ float y=-.36+.24*float(i); kn=min(kn,length(q-vec2(.5,y))-.17); }
    float d=smin(box,kn,.08);
    a=1.-smoothstep(0.,.05,d);
    rgb*=.75+.45*smoothstep(-.4,.4,q.y)-.25*smoothstep(.45,.5,fract((q.x+q.y)*4.)); }
  else if(k==5){ float u=vUv.x*.5+.5; float prof=pow(u,1.6); float w=pow(max(1.-abs(vUv.y),0.),1.4);
    a=prof*w; rgb=mix(rgb,vec3(1.,.97,.85),smoothstep(.85,1.,u)); }
  else if(k==6){ float f=pow(abs(q.x)+1e-4,.4)+pow(abs(q.y)+1e-4,.4); a=pow(clamp(1.-f*.9,0.,1.),1.4)
      +exp(-pow((r-.6)/.04,2.))*.6*step(.5,seed)+exp(-r2*20.); }
  else if(k==7){ float n=vn(q*3.+seed*20.); a=(1.-smoothstep(.5+.4*n,1.,r))*.5; paint=true; }
  else if(k==8){
    vec2 qq=q; float n=(fbm2(qq*8.+seed*10.+floor(uT*8.)*.37)-.5)*.07;
    float d=(seed<.5?sdKC(qq):sdBlob(qq))+n;
    float bR=haloBand(d+.014), bG=haloBand(d), bB=haloBand(d-.014);
    rgb=vec3(bR*vC.r, bG*vC.g+bB*.08, bB*vC.b+bB*.18)*1.5; a=1.; }
  else if(k==10){ float pg=vBB.x; a=0.;
    for(int i=0;i<3;i++){ float ri=pg-float(i)*.18; if(ri>0.) a+=exp(-pow((r-ri)/.05,2.))*(1.-pg); } }
  else if(k==12){ float lens=(1.-smoothstep(.95,1.,r))*smoothstep(.76,.8,length(q-vec2(-.45,0.)));
    a=lens*(.4+.6*smoothstep(-.6,.9,q.x)); rgb=mix(rgb,vec3(1.),smoothstep(.5,1.,a)*.5); }
  vec2 p=vN*vec2(uAsp,1.); float m=sealMask(p,uSeal);
  float fade=mix(1.,mix(.1,1.,m),vC.a);
  float al=a*A*fade;
  if(al<.003) discard;
  gl_FragColor=paint?vec4(rgb*al,al):vec4(rgb*al,0.);
}`;

export function makeInstances(THREE, U, cap = 1500) {
  const plane = new THREE.PlaneGeometry(2, 2);
  const g = new THREE.InstancedBufferGeometry();
  g.index = plane.index; g.setAttribute("position", plane.attributes.position);
  const mk = (n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
  const P = mk(4), B = mk(4), S = mk(4), C = mk(4);
  g.setAttribute("iP", P); g.setAttribute("iB", B); g.setAttribute("iS", S); g.setAttribute("iC", C);
  g.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, premultipliedAlpha: true, depthTest: true, depthWrite: false,
    side: THREE.DoubleSide, uniforms: { uAsp: U.uAsp, uT: U.uT, uSeal: U.uSeal },
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 30;
  let n = 0;
  return {
    mesh,
    begin() { n = 0; },
    // push(kind, [x,y,z], [sx,sy,rot,alpha], [r,g,b], {b:[x,y,z] | prog, seed, mask})
    push(kind, p, s, c, o = {}) {
      if (n >= cap) return;
      const i = n++, b = o.b || [o.prog || 0, 0, 0];
      P.array.set([p[0], p[1], p[2], kind], i * 4);
      B.array.set([b[0], b[1], b[2], o.seed || 0], i * 4);
      S.array.set(s, i * 4);
      C.array.set([c[0], c[1], c[2], o.mask ?? 1], i * 4);
    },
    end() { g.instanceCount = n; P.needsUpdate = B.needsUpdate = S.needsUpdate = C.needsUpdate = true; },
    count: () => n,
    dispose() { g.dispose(); plane.dispose(); mat.dispose(); },
  };
}
