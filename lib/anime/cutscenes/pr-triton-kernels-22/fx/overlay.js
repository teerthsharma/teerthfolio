// Screen-space grade and compositing for the Malevolent Shrine: ONE clip-space quad, layers composited "over" in order.
// Every layer except the letterbox bars and the four-eyed mark is multiplied by sealMask: the seal is never covered or milky.
//  veins   red-veined smoke over the upper sky: ridged noise  r = 1-|2 vn(p)-1|, vein = r^14 (2 octaves), drifting 0.5 % of
//          frame width per second on twos; dark #6a0610 -> mid #b3081c -> hot #e5142e where both octaves meet.
//          Density thickest at the left/right edges, thin behind the shrine (centre).
//  bleed   the sky bleeds red 2.0 -> 4.5 s (upper half, smoothstep(-.1,.6,y)); the Cleave floods the whole frame.
//  veil    the draw-in wipe from the pup: paper #ece5d2 outside a growing, brush-edged hole about the seal,
//          d = |p - s| + 0.35 (fbm - 0.5), alpha = smoothstep(R, R+.06, d). Screentone: 45 deg halftone dots,
//          dot radius = 0.7 sqrt(level), level = 0.7 |ndc|, fading in 2.0 -> 2.8 s and out by 4.5 s.
//  drain   the sky drains to paper 13.75 -> 17.3 s; the drawing is rubbed out from the horizon outward 17.4 -> 18.4 s
//          (|y - horizon| + 0.18 (fbm - .5) < 1.3 rub). Residue paper fades out by 19 s.
//  flash   Cleave flash and the last-cut flash, tinted #ece5d2 (bible: flash quad), decaying 0.4 s.
//  bars    2.39:1 letterbox 2.0 -> 7.75 s (landscape frames only), colour #050206.
//  marks   Easter egg: the four-eyed mark, two slits under the seal's eyes for ONE drawing (1/12 s) on the Cleave.
//  halo    Easter egg: a tiny Mahoraga wheel ring flickering in a distant window at 2.7 s.
import { GLSL_NOISE, GLSL_SEAL, NDC_VERT, ndcMesh, sstep } from "./common.js";

export function buildOverlay(ctx, TL, track) {
  const { THREE } = ctx;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      ...track.u, uT: { value: 0 }, uTs: { value: 0 },
      uVeil: { value: new THREE.Vector4(0, 1, 0, 0) }, // holeR, veilA, toneA, rub
      uGrade: { value: new THREE.Vector4(0, 0, 0, 0) }, // bleed, flood, drain, flash
      uBars: { value: 0 }, uHz: { value: -0.05 }, uHalo: { value: new THREE.Vector3(0.62, 0.3, 0) },
    },
    vertexShader: NDC_VERT,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE} ${GLSL_SEAL}
      uniform float uT,uTs,uBars,uHz; uniform vec4 uVeil,uGrade; uniform vec3 uHalo; uniform vec4 uEyes; uniform vec2 uEyeR; varying vec2 vN;
      vec4 over(vec4 d, vec3 c, float a){ return vec4(mix(d.rgb,c,a), d.a+(1.-d.a)*a); }
      float dots(vec2 p, float sc, float level){ vec2 q=mat2(.7071,-.7071,.7071,.7071)*p*sc; vec2 g=fract(q)-.5; float r=sqrt(clamp(level,0.,1.))*.7; return smoothstep(r+.06,r-.06,length(g)); }
      float slit(vec2 q, float w, float h){ return smoothstep(1.,.7,length(q/vec2(w,h))); }
      void main(){
        vec2 p=vec2(vN.x*uAsp,vN.y); float m=sealMask(vN);
        vec4 o=vec4(0.);
        // ---- veins (sky, upper part of frame)
        float sky=smoothstep(uHz-.15,uHz+.55,vN.y);
        vec2 dr=vec2(uTs*.005*uAsp*2.,uTs*.002);
        float r1=1.-abs(2.*fbm(p*1.7+dr)-1.), r2=1.-abs(2.*fbm(p*3.9-dr*1.7+9.)-1.);
        float v1=pow(r1,14.), v2=pow(r2,14.), junc=v1*v2*6.;
        float edge=mix(.3,1.2,smoothstep(.2,1.,abs(vN.x)));
        float vein=clamp((v1+.6*v2)*edge,0.,1.)*sky;
        vec3 vc=mix(vec3(.416,.024,.063),vec3(.702,.031,.11),smoothstep(.0,.5,vein)); vc=mix(vc,vec3(.898,.078,.18),clamp(junc*edge,0.,1.)*sky);
        o=over(o,vc,vein*.62*m*smoothstep(1.7,2.4,uT)); // the sky fills with veins as the shrine arrives
        // ---- red bleed + Cleave flood
        float bleed=uGrade.x*smoothstep(-.1,.6,vN.y)*(.28+.12*fbm(p*2.+dr));
        o=over(o,vec3(.48,.024,.063),clamp(bleed+uGrade.y*.55,0.,1.)*m);
        // ---- veil (draw-in wipe) and screentone
        float dd=length(p-uSeal.xy)+(fbm(p*3.)-.5)*.35;
        float veil=smoothstep(uVeil.x,uVeil.x+.06,dd)*uVeil.y;
        vec3 paper=vec3(.925,.898,.824)*(.95+.05*h21(floor(p*300.)));
        o=over(o,paper,veil*m);
        float tone=dots(p,38.,.7*length(vN))*uVeil.z*.55;
        o=over(o,vec3(.055,.043,.051),tone*m);
        // ---- drain to paper + rub-out from the horizon + flash
        float grain=.75+.25*h21(floor(p*220.)+floor(uTs*12.));
        o=over(o,paper,uGrade.z*grain*.6*m);
        float rub=uVeil.w; float e=abs(vN.y-uHz)+(fbm(p*2.5)-.5)*.18;
        float rubbed=smoothstep(rub*1.3,rub*1.3-.12,e)*step(.001,rub)*(1.-smoothstep(.85,1.,rub));
        o=over(o,paper,rubbed*.9*m);
        o=over(o,vec3(.925,.898,.824),uGrade.w*m);
        // ---- Mahoraga wheel flickering in a distant window (egg)
        vec2 hq=(vN-uHalo.xy)*vec2(uAsp,1.); float hr=length(hq); float ang=atan(hq.y,hq.x);
        float wheel=(smoothstep(.014,.012,abs(hr-.016))+step(.5,fract(ang*8./6.2832))*smoothstep(.012,.0,abs(hr-.024)))*uHalo.z;
        o=over(o,vec3(.96,.93,.78),clamp(wheel,0.,1.)*m);
        // ---- four-eyed mark: two slits under the eyes for one drawing (egg), tilted like Sukuna's lower pair
        if(uEyes.w>.5){ vec2 q=(vN-uEyes.xy)*vec2(uAsp,1.); float s=uEyes.z; vec2 rr=uEyeR*vec2(uAsp,1.);
          vec2 q1=q-rr, q2=q+rr; float ca=.94,sa=.34; q1=mat2(ca,-sa,sa,ca)*q1; q2=mat2(ca,sa,-sa,ca)*q2;
          float mk=max(slit(q1,s*1.5,s*.28),slit(q2,s*1.5,s*.28));
          o=over(o,mix(vec3(.055,.043,.051),vec3(.78,.03,.11),smoothstep(.5,.9,mk)),mk*.95); }
        // ---- letterbox 2.39:1 (landscape only)
        float barH=uAsp>1.2?clamp(1.-uAsp/2.39,0.,.45):0.;
        float inB=step(1.-barH*uBars*1.0, abs(vN.y));
        o=over(o,vec3(.02,.008,.024),inB);
        gl_FragColor=o;
      }`,
  });
  const mesh = ndcMesh(ctx, mat); mesh.renderOrder = 1010; track.attach(mesh);
  const eggT = TL.cleave;
  return {
    mesh,
    update(t, ts) {
      const u = mat.uniforms;
      u.uT.value = t; u.uTs.value = ts;
      const R = sstep(0, 2.0, t) * 3.6;
      u.uVeil.value.set(R, 1, sstep(2.0, 2.8, t) * (1 - sstep(3.2, 4.5, t)), sstep(17.4, 18.4, t));
      const c = TL.cleave;
      const bleed = sstep(TL.bleed, TL.bleed + 2.5, t) * (1 - sstep(14, 17, t));
      const flood = sstep(c, c + 0.08, t) * (1 - sstep(c + 0.3, c + 1.2, t));
      const drain = sstep(TL.dissolve, 17.3, t) * (1 - sstep(18.3, 19.2, t));
      const flash = Math.max(t >= c ? Math.exp(-(t - c) / 0.14) * 0.92 : 0, t >= TL.flex - 0.05 ? Math.exp(-(t - (TL.flex - 0.05)) / 0.12) * 0.75 : 0);
      u.uGrade.value.set(bleed, flood, drain, flash);
      u.uBars.value = sstep(TL.bleed, TL.bleed + 0.25, t) * (1 - sstep(TL.slash - 0.6, TL.slash - 0.35, t));
      // halo flicker on twos
      const fl = t > TL.rise && t < TL.rise + 0.6 ? (Math.sin(Math.floor(t * 12) * 12.9) > -0.2 ? 1 : 0) : 0;
      u.uHalo.value.z = fl;
      u.uEyes.value.w = t >= eggT && t < eggT + 1 / 12 ? 1 : 0;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
