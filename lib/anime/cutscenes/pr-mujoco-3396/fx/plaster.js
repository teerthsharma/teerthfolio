// E14 fresco plaster FX: shot 1 banner dust, craquelure crazing from f330 (13.75 s), the plaster flake wipe f390-462 (16.25-19.25 s).
// Screen-space (NDC) passes: vertex writes clip coords directly, so they sit over the frame regardless of camera.
// The seal is protected: every plaster pixel inside the seal's screen disc is discarded (uSeal = chest NDC, radius grows with its scale).
import { GLSL_HASH, win, smooth } from "./util.js";

export default function buildPlaster(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const aspect = () => (ctx.aspect ? ctx.aspect() : 16 / 9);

  // ---- flake wipe + craze: one full-screen quad, plates found analytically (3x3 neighbour search) ----
  // Grid cell size 0.17 (height units), centre jittered. plate i: delay d_i = 0.9*|c - gap| (gap = frame centre, upper), so flakes
  // peel OUTWARD from the gap. After its delay a plate tilts (rot += 1.4*age) and falls y -= 1.6 age^2 while alpha fades.
  // Pixel p lights if inside the rotated, displaced square; lacunae holes = cell hash < 0.12 (fresco losses); craze = voronoi edge lines.
  const U = { uT: { value: 0 }, uAsp: { value: 16 / 9 }, uCraze: { value: 0 }, uWipe: { value: -1 }, uCover: { value: 0 }, uSeal: { value: new THREE.Vector3(0, 0, .3) } };
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: "varying vec2 vN; void main(){ vN=position.xy; gl_Position=vec4(position.xy,0.,1.); }",
    fragmentShader: /* glsl */ `${GLSL_HASH}
      uniform float uT,uAsp,uCraze,uWipe,uCover; uniform vec3 uSeal; varying vec2 vN;
      const float CELL = .17;
      vec2 jit(vec2 id){ return (h22(id*1.37+3.1)-.5)*.5*CELL; }
      void main(){
        vec2 p = vec2(vN.x*uAsp, vN.y);                     // height units, y up, aspect-correct
        vec2 sc = vec2(uSeal.x*uAsp, uSeal.y);
        float dSeal = length(p - sc);
        if (dSeal < uSeal.z) discard;                       // the seal is never covered
        vec2 cell = floor(p/CELL);
        float best = 0., edge = 1e3; vec3 col = vec3(0.); float fade = 0.;
        // craquelure: distance to nearest jittered cell border (voronoi F2-F1 approximation on the same grid, finer 0.5x)
        {
          vec2 q = p/(CELL*.55), ci = floor(q), cf = fract(q); float d1=9., d2=9.;
          for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){ vec2 g=vec2(float(x),float(y)); vec2 o=h22(ci+g); float d=length(g+o-cf); if(d<d1){d2=d1;d1=d;} else if(d<d2) d2=d; }
          edge = d2 - d1;
        }
        float corner = smoothstep(.75, 1.9, length(vec2(abs(vN.x)*uAsp*.6, abs(vN.y))*1.5)); // crazing hugs the corners
        float ew = max(0.02, fwidth(edge) * 1.6);
        float craze = (1. - smoothstep(ew, ew * 2.4, edge)) * uCraze * corner;
        for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){
          vec2 id = cell + vec2(float(i),float(j));
          vec2 c0 = (id+.5)*CELL + jit(id);
          float hole = step(h21(id+7.7), .1);               // lacunae: bare patches
          // delay by distance from the gap (upper-centre), outward
          float dly = .9*length(c0 - vec2(0., .15)) / 1.2;
          float age = max(0., uWipe - dly*.5);
          float on = step(0., uWipe - dly*.5);
          vec2 vel = (h22(id+2.2)-.5);
          vec2 c = c0 + vec2(vel.x*.25*age, -1.6*age*age + vel.y*.05*age);
          float ang = (h21(id+4.4)-.5)*2. * 1.4 * age;
          vec2 d = p - c; float cs=cos(ang), sn=sin(ang); d = vec2(cs*d.x + sn*d.y, -sn*d.x + cs*d.y);
          float half_ = CELL*.5*.97;
          float inside = step(abs(d.x), half_) * step(abs(d.y), half_) * (1.-hole);
          float a = inside * (1. - smoothstep(.55,1.0,age*1.15)) * uCover * smoothstep(.5,.8,length(vN)); // plaster only frames the picture (outer ring), so the world is never milky   // alpha fades as it falls
          // plate colour #efe4cf with a sepia edge (#5a3b22 1px) and a slight tilt shade
          float eg = 1. - smoothstep(0.,.006, half_ - max(abs(d.x),abs(d.y)));
          vec3 pc = mix(vec3(.937,.894,.812), vec3(.353,.231,.133), eg*.8);
          pc *= .92 + .08*sin(ang*3.) + .05*(h21(id)-.5);
          // painted fresco inside the plate: fine pounce dots
          pc = mix(pc, vec3(.784,.604,.29), .05*step(.93, h21(floor(d*220.))));
          if (a > best) { best = a; col = pc; fade = 1.; }
        }
        // crazing: sepia hair-lines + the plate cream under them
        vec3 cc = vec3(.227,.196,.157); // graphite, never #000
        vec3 leaf = vec3(.788,.604,.290);
        vec4 outc = vec4(col, best);
        if (craze > 0.02) { outc.rgb = mix(outc.rgb, mix(cc, leaf, 0.35), craze*.85); outc.a = max(outc.a, craze*.65); }
        float Y = dot(outc.rgb, vec3(0.2126, 0.7152, 0.0722));
        outc.rgb *= min(1.0, 0.92 / max(Y, 1e-4));
        if (outc.a < .01) discard;
        gl_FragColor = outc;
      }`,
  }));
  quad.frustumCulled = false; quad.renderOrder = 20; group.add(quad);

  // ---- banner dust (shot 1): cream/ochre puffs off the lower edge, rising on twos ----
  const N = 70, r = ctx.rng(11), DP = new Float32Array(N * 3), DS = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { DP.set([(r() * 2 - 1), -1.02, 0], i * 3); DS.set([r(), 120 + r() * 160, r(), 1.6 + r() * 1.6], i * 4); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(DP, 3)); dg.setAttribute("aS", new THREE.BufferAttribute(DS, 4));
  const DU = { uAge: { value: -1 }, uH: { value: 800 } };
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({
    uniforms: DU, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: /* glsl */ `attribute vec4 aS; uniform float uAge,uH; varying float vA; varying float vS;
      void main(){ float a = uAge; float u = clamp(a/1.4,0.,1.);
        vec3 p = position; p.y += (.18 + aS.z*.5)*u*2. + .02*sin(a*5.+aS.x*9.); p.x += (aS.z-.5)*.25*u;
        vA = step(0., a) * (1.-u) * smoothstep(0.,.08,a) * .85; vS = aS.x;
        gl_Position = vec4(p.xy,0.,1.); gl_PointSize = aS.y*(.5+u*1.2)*uH/900.*aS.w; }`,
    fragmentShader: /* glsl */ `varying float vA; varying float vS;
      void main(){ vec2 q=gl_PointCoord*2.-1.; float ang=atan(q.y,q.x); float e=.8+.14*sin(ang*6.+vS*30.); if(length(q)>e || vA<.01) discard;
        vec3 c = q.y > .1 ? vec3(.875,.847,.804) : vec3(.71,.659,.694); gl_FragColor = vec4(mix(c, vec3(.78,.65,.45), .25), vA); }`,
  }));
  dust.frustumCulled = false; dust.renderOrder = 19; group.add(dust);

  const sc = new THREE.Vector3();
  quad.onBeforeRender = (rr, s, camera) => {
    // seal screen disc: project the chest; radius = seal height share of the frame, padded
    ctx.seal.chest(sc); const hs = ctx.seal.group.scale ? ctx.seal.group.scale.y : 1;
    const top = sc.clone(); top.y += 0.9 * hs; const c = sc.clone().project(camera), tp = top.project(camera);
    const rad = Math.abs(tp.y - c.y) + 0.12;
    U.uSeal.value.set(c.x, c.y, rad * 1.15);
  };

  return {
    group,
    update(t, dt, cue) {
      U.uT.value = t; U.uAsp.value = aspect();
      const cz = win(cue, t, "craze", 13.75, 16.2);
      U.uCraze.value = cz.k * (1 - smooth(18.8, 19.4, t));
      const fl = win(cue, t, "flake", 16.25, 19.25);
      // wipe clock 0..1.9 (a plate needs ~1 s after its delay to leave); coverage ramps in 15.9-16.25 so the plates exist before they peel
      U.uWipe.value = fl.k > 0 ? fl.k * 1.9 : -1;
      U.uCover.value = smooth(15.6, 16.25, t) * (fl.k >= 1 ? 0 : 1);
      quad.visible = U.uCover.value > 0.01 || U.uCraze.value > 0.01;
      const bn = win(cue, t, "banner", 0, 1.25);
      DU.uAge.value = bn.since < Infinity && bn.since < 1.6 ? bn.since : -1; dust.visible = DU.uAge.value >= 0;
    },
    dispose() { quad.geometry.dispose(); quad.material.dispose(); dg.dispose(); dust.material.dispose(); },
  };
}
