// Fullscreen FX for p-separatrix: ONE "uber" screen pass (premultiplied: additive where a=0, paint where a>0) and the
// depth-placed cosmos plane. Every effect is masked by the seal's screen ellipse (the seal is never covered).
import { GLSL } from "./util.js";

const VERT = /* glsl */ `varying vec2 vN; void main(){ vN=position.xy; gl_Position=vec4(position.xy,0.,1.); }`;

// UBER. p = ndc*(aspect,1) (height units, frame height = 2). Sections, each a pure function of uniforms:
//  ring    gaussian band exp(-d^2/w^2), d = |p-c| - R(k) - noise. R(k)=k*(asp+1.6). Gold ring wipe / gild ring / chime ring.
//  bloom   gold radial lift exp(-|p|^2*0.9)*uBloom (gold ONLY, shot 1, 0.75-1.2 s)
//  streak  frame-07 magenta streaks: 64 rows, row hash picks presence/length/speed; taper (1-u/len)^2; weighted to the edges
//  sketch  sinopia 1 px contour lines of a 2-octave noise, in noise patches (plaster-to-sinopia erase sketches)
//  grey    cold dark wash (dark, never milky) with a hole at Diavolo + KC (the "all but Diavolo and KC" mask)
//  muda    84 radial spokes from Diavolo, gold/magenta alternating, regenerated on twos
//  claim   rising stripes at both edges, magenta left / gold right (GOGOGO column glow)
//  zero    cream #fbf6e8 disc growing from the seal, noisy edge, gold rim; sepia tint; wipe bar with ink head edge
const UBER = /* glsl */ `
varying vec2 vN;
uniform float uAsp, uT, uPx;
uniform vec4 uSeal, uDia;           // ellipses in p-space: (cx,cy,rx,ry)
uniform vec4 uRingA, uRingB;        // (k, cx, cy, amp), k<0 = off
uniform float uBloom, uStreak, uSketch, uGrey, uMuda, uClaim, uSepia, uWipe;
uniform vec4 uZero;                 // (k, cx, cy, alpha)
uniform vec3 uGold, uMag, uCrim, uCream, uSino, uCold, uSepiaC, uInk;
${GLSL}
float ringBand(vec2 p, vec4 R, float w){
  if(R.x<0.) return 0.;
  vec2 d=p-R.yz; float ang=atan(d.y,d.x);
  float R0=R.x*(uAsp+1.6);
  float n=(fbm2(vec2(ang*2.5,R.x*3.))-.5)*.09;
  float dd=length(d)-R0-n, wd=w*(.6+.8*R.x);
  return exp(-dd*dd/(wd*wd))*pow(1.-clamp(R.x,0.,1.),.7);
}
void over(inout vec4 ov, vec3 c, float a){ ov.rgb += c*a*(1.-ov.a); ov.a += a*(1.-ov.a); }
void main(){
  vec2 p=vN*vec2(uAsp,1.); float m=sealMask(p,uSeal); float edge=smoothstep(.3,.95,length(vN));
  vec3 add=vec3(0.); vec4 ov=vec4(0.);
  add += uGold*ringBand(p,uRingA,.05)*uRingA.w;
  add += uGold*ringBand(p,uRingB,.06)*uRingB.w;
  if(uRingB.x>=0.) add += uGold*.14*(1.-uRingB.x)*edge;
  add += uGold*uBloom*.42*exp(-dot(p,p)*.9);
  if(uStreak>0.){
    float rows=64., ry=p.y*rows, row=floor(ry), fr=fract(ry)-.5, st=floor(uT*8.);
    float r1=h11(row*1.37+st*5.1), r2=h11(row*2.91+st*3.3), r3=h11(row*.77+7.);
    float thick=.08+.22*r2, ln=1.-smoothstep(thick*.6,thick,abs(fr));
    float len=.25+.9*r1, u=fract(p.x*.45-uT*(1.2+2.5*r3)*.35+r3*3.);
    float tp=u<len?1.-u/len:0.; tp*=tp;
    add += uMag*ln*tp*step(.45,r1)*edge*uStreak*1.6;
  }
  if(uSketch>0.){
    float f=fbm2(p*2.2+floor(uT*8.)*1.7)*9.; float fw=max(fwidth(f),.001);
    float g=abs(fract(f)-.5), line=smoothstep(.5-1.3*fw,.5,g);
    float pat=smoothstep(.45,.6,vn(p*1.3+3.));
    over(ov,uSino,line*pat*uSketch*.6);
  }
  if(uGrey>0.){
    float hole=sealMask(p,uDia);
    over(ov,uCold,uGrey*(.34*hole+.12*edge));
  }
  if(uMuda>0.){
    vec2 d=p-uDia.xy; float rr=length(d), ang=atan(d.y,d.x)/6.28318+.5, N=84.;
    float cell=floor(ang*N), f=abs(fract(ang*N)-.5)*2., st=floor(uT*12.);
    float r=h11(cell*1.3+st*9.7), r2=h11(cell*3.1+st*2.3);
    float w=.05+.2*r2, line=1.-smoothstep(w*.5,w,f);
    float inner=.42+.5*r, vis=smoothstep(inner,inner+.08,rr)*step(.35,r)*smoothstep(.2,.9,length(vN));
    add += (mod(cell,3.)<1.?uGold:uMag)*line*vis*uMuda*1.5;
  }
  if(uClaim>0.){
    float ax=abs(p.x), A=uAsp-.16, band=exp(-pow((ax-A)/.14,2.));
    float c=floor(p.x*34.), rs=h11(c*1.9), v=fract(p.y*.7-uT*(.35+.5*rs)+rs*5.);
    float stripe=smoothstep(0.,.5,v)*(1.-smoothstep(.5,.52,v));
    add += (p.x<0.?uMag:uGold)*band*(.25+.9*stripe*step(.4,rs))*uClaim;
  }
  if(uZero.x>=0.){
    vec2 d=p-uZero.yz; float ang=atan(d.y,d.x), R0=uZero.x*(uAsp+1.7);
    float n=(fbm2(vec2(ang*3.,3.))-.5)*.16, dd=length(d)-R0-n;
    float inside=1.-smoothstep(-.01,.01,dd), rim=exp(-dd*dd/.0016);
    vec3 c=uCream*(.97+.06*vn(p*220.));
    over(ov,c,inside*uZero.w);
    add += uGold*rim*.6*(1.-uZero.x*.5)*step(.001,uZero.w)*step(uZero.x,.999);
  }
  if(uSepia>0.) over(ov,uSepiaC,uSepia);
  if(uWipe>=0.){
    float A=uAsp+.4, ex=mix(-A-.35,A+.35,uWipe), bw=.34, u=(p.x-(ex-bw))/bw;
    float inb=step(0.,u)*step(u,1.);
    vec3 c=mix(uGold,vec3(1.,.94,.63),smoothstep(.6,1.,u));
    float ink=smoothstep(.93,.95,u)*(1.-smoothstep(.985,1.,u));
    over(ov,mix(c,uInk,ink),inb*.92);
  }
  gl_FragColor=vec4((add+ov.rgb)*m, ov.a*m);
}`;

export function uberMaterial(THREE, U, C) {
  const V = (x) => ({ value: x });
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: UBER, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
    uniforms: {
      uAsp: U.uAsp, uT: U.uT, uPx: U.uPx, uSeal: U.uSeal, uDia: U.uDia,
      uRingA: V(new THREE.Vector4(-1, 0, 0, 0)), uRingB: V(new THREE.Vector4(-1, 0, 0, 0)),
      uBloom: V(0), uStreak: V(0), uSketch: V(0), uGrey: V(0), uMuda: V(0), uClaim: V(0), uSepia: V(0), uWipe: V(-1),
      uZero: V(new THREE.Vector4(-1, 0, 0, 0)),
      uGold: V(new THREE.Vector3(...C.gold)), uMag: V(new THREE.Vector3(...C.mag)), uCrim: V(new THREE.Vector3(...C.crim)),
      uCream: V(new THREE.Vector3(...C.cream)), uSino: V(new THREE.Vector3(...C.sino)), uCold: V(new THREE.Vector3(...C.cold)),
      uSepiaC: V(new THREE.Vector3(...C.sepia)), uInk: V(new THREE.Vector3(...C.ink)),
    },
  });
}

// COSMOS: a fullscreen quad placed at a WORLD DEPTH (clip z from uDepth) behind Diavolo, so it replaces the sky/colosseum
// beyond him while the figures and floor nearer than that plane stay in front (frame 06: black cosmos, magenta stars).
//   clip z for view distance D: z = (f+n)/(f-n) - 2fn/((f-n)D)
//   stars: grid of 7.5 cells per height unit (~270 cells), presence hash>0.52 (~130 stars), radius 0.6-1.8 px,
//   twinkle 0.65+0.35 sin(t*9(1+h)+30h) on the stepped clock, colours #ff9be0 / #ffffff.
const COSMOS = /* glsl */ `
varying vec2 vN;
uniform float uAsp, uT, uPx, uCosmos;
uniform vec3 uBlack, uPink;
${GLSL}
void main(){
  if(uCosmos<.02) discard;
  vec2 p=vN*vec2(uAsp,1.);
  vec3 c=uBlack;
  float nb=fbm2(p*1.1+vec2(uT*.01,3.)); c += vec3(.23,.05,.20)*pow(nb,2.2)*.55;
  vec2 g=(p+vec2(uT*.012,0.))*7.5, id=floor(g), f=fract(g)-.5;
  float pr=h21(id);
  if(pr>.52){
    vec2 off=(vec2(h21(id+3.1),h21(id+7.7))-.5)*.7;
    float hh=h21(id+1.7), r=(.6+1.2*hh)*uPx, d=length((f-off)/7.5);
    float tw=.65+.35*sin(uT*9.*(1.+hh)+hh*30.);
    float s=smoothstep(r,r*.35,d)+.18*exp(-d/(r*1.8));
    c += mix(uPink,vec3(1.),step(.7,h21(id+9.2)))*s*tw*1.3;
  }
  vec2 q=p-vec2(.62*uAsp,.22);
  c += vec3(1.,.74,.9)*(star4(q,.09)*.9+exp(-dot(q,q)*180.)*.7);
  gl_FragColor=vec4(c*uCosmos,uCosmos);
}`;
const COSMOS_V = /* glsl */ `varying vec2 vN; uniform float uDepth; void main(){ vN=position.xy; gl_Position=vec4(position.xy,uDepth,1.); }`;

export function cosmosMaterial(THREE, U, C) {
  return new THREE.ShaderMaterial({
    vertexShader: COSMOS_V, fragmentShader: COSMOS, transparent: true, premultipliedAlpha: true, depthTest: true, depthWrite: true,
    uniforms: { uAsp: U.uAsp, uT: U.uT, uPx: U.uPx, uCosmos: { value: 0 }, uDepth: { value: 1 },
      uBlack: { value: new THREE.Vector3(...C.black) }, uPink: { value: new THREE.Vector3(...C.pink) } },
  });
}
