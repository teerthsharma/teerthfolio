// spawn-seal FX / morph: slime-morph-column (bible 3.7, FX 2) and the 4-point eye glint (FX 3).
// Cues read: "morph" (starts 106/24 s: phase A 4.42-5.79, B 5.79-6.46 stretch, fade to 6.9), "glint" (6.7 s, 6 frames).
// The column is a BackSide shell: only the far wall draws, so it can never lie between the lens and the seal (L: seal never covered).
import { mat, VERT_STD, VERT_BILL, ageOf, clamp01, easeOut, sealPoint } from "./common.js";

export default function morph(ctx) {
  const { THREE, seal } = ctx, group = new THREE.Group();

  // Column. Height H(a): .9 m until 139 f, then -> 1.55 m over 16 f (smoothstep).  Smear: radius * sqrt(.9 / H) during the stretch.
  // Fragment: additive #3fdcff, 0.25 alpha, hard vertical bands (3 levels), hard top edge, white crescent decals on the wall:
  //   crescent(u,v) = disc(c1, r) minus disc(c1 + (.06, .04), r)  (the ref-06 slime highlight shape), two of them, scrolling on twos.
  const colMat = mat(THREE, {
    additive: true, side: THREE.BackSide, vert: VERT_STD, uniforms: { uF: { value: 0 }, uT: { value: 0 } },
    frag: /* glsl */ `uniform float uF,uT; varying vec2 vUv;
      float cres(vec2 p, vec2 c, float r){ float a=step(length(p-c),r); float b=step(length(p-c-vec2(.07,.05)),r*.92); return a*(1.-b); }
      void main(){ float band=floor(vUv.x*6.+floor(uT*12.)*.35); float lv=mod(band,3.)/2.;           // 3 flat levels
        float a=.25*(.55+.45*lv); vec3 col=vec3(.25,.86,1.);
        float top=step(vUv.y,.985);                                                                     // hard top edge
        vec2 p=vec2(fract(vUv.x*2.+.1*floor(uT*12.)),vUv.y);
        float cr=max(cres(p,vec2(.30,.62),.11),cres(p,vec2(.62,.38),.07));
        col=mix(col,vec3(.91,1.,1.),cr); a=mix(a,.6,cr);
        a*=uF*top*(.35+.65*smoothstep(0.,.25,vUv.y));                                                   // base opaque, never a flat sheet
        if(a<=.01) discard; gl_FragColor=vec4(col,a); }`,
  });
  const colGeo = new THREE.CylinderGeometry(0.6, 0.66, 1, 24, 1, true); colGeo.translate(0, 0.5, 0);
  const col = new THREE.Mesh(colGeo, colMat); col.renderOrder = 7; group.add(col);

  // Eye glint: the astroid sqrt|x| + sqrt|y| < k, hard edged, white #ffffff, a soft spoke-free polygon (no gradient).
  const glintMat = mat(THREE, {
    additive: true, depthTest: true, vert: VERT_BILL, uniforms: { uSize: { value: 0.11 }, uF: { value: 0 } },
    frag: /* glsl */ `uniform float uF; varying vec2 vP;
      void main(){ vec2 q=abs(vP)/1.0; float s=sqrt(q.x)+sqrt(q.y); float core=step(length(q),.16);
        float star=step(s,.78)*step(max(q.x,q.y),1.); float a=max(star,core)*uF; if(a<=.01) discard; gl_FragColor=vec4(1.,1.,1.,a); }`,
  });
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glintMat); glint.renderOrder = 12; group.add(glint);

  const tmp = new THREE.Vector3();
  return {
    group,
    update(t, dt, cue) {
      const a = ageOf(cue, t, "morph", 106 / 24);
      const sP = sealPoint(seal, THREE, 0, 0, 0, tmp); col.position.copy(sP);
      const stretch = clamp01((a - (139 - 106) / 24) / (16 / 24)), s = stretch * stretch * (3 - 2 * stretch);
      const H = (0.9 + (1.55 - 0.9) * s) * (seal.scale || 1);
      const smear = Math.sqrt(0.9 / (0.9 + 0.65 * s)) * (1 + 0.35 * Math.sin(Math.PI * stretch)); // one smear frame at the stretch
      col.scale.set(smear * (seal.scale || 1), H, smear * (seal.scale || 1));
      colMat.uniforms.uF.value = a < 0 ? 0 : easeOut(a / 0.25) * (1 - clamp01((a - 2.04) / 0.45));
      colMat.uniforms.uT.value = t;

      const g = ageOf(cue, t, "glint", 6.7);
      let at = null; try { at = cue.arg("glint", "at", null); } catch { /* none */ }
      if (at) glint.position.set(...at); else sealPoint(seal, THREE, 0.07, 1.38, 0.3, glint.position);
      // 6 frames at 24 fps: pop in over 1 f, hold, out; size breathes 0.7 -> 1 -> 0.4
      glintMat.uniforms.uF.value = g < 0 || g > 6 / 24 ? 0 : 1;
      glintMat.uniforms.uSize.value = 0.11 * (g < 3 / 24 ? 0.7 + g * 4 : 1 - (g - 3 / 24) * 3.2);
    },
    dispose() { colGeo.dispose(); colMat.dispose(); glint.geometry.dispose(); glintMat.dispose(); },
  };
}
