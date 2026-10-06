// LENS (bible 3.14, 6, egg 1): crepuscular shafts, the five hexagon ghosts (+ one pink on the sun line), the 4-point flare cross
// with its long pink horizontal streak (poster key art), the poster flare at frame centre 2.8-3.0 s, and the link glint.
// All full-frame passes sit BEHIND the seal's depth, so the seal is never lit by them and nothing milks it.
//
// Sun. The sun is a direction at infinity (lib.js setSun): ndc = (P V (d, 0)).xy / w, and it counts only when w > 0.
//   sun visibility  vis = inFront * (1 - smoothstep(1.3, 2.4, |s|))   (s in height units, aspect corrected)
// Ghosts (Shinkai lens artefacts). A ghost sits on the line through the sun and the frame centre: g_i = -s c_i.
//   hexagon distance  hexd(q) = max(|q.x| .866 + |q.y| .5, |q.y|)  (1 on the hexagon of circumradius 1)
//   ghost             ring = 1 - smoothstep(0, .06, |hexd - 1|)   fill = .35 (1 - smoothstep(.9, 1, hexd))
//   colour            #ffb273 (near the sun) -> #8da6ff (far), radii .06 .10 .16 .09 .22 and one pink #f0a0d0 at c .45
//   time              in 1.9 -> 3.2 s, held at .55, lifted to 1.0 by the flare cross, out over 19.4 -> 22.4 s (ghostsOut)
// Flare cross. F(p) = glint(p - s, .22): core exp(-7 d / size) plus two spikes; plus the anamorphic streak
//   streak(p) = exp(-|p.y - s.y| / .012) exp(-|p.x - s.x| / 1.4) in #f0a0d0.   Colour #ffe0a8.
// Shafts. 6 diagonal bands in a screen frame rotated to dir (-.62, -.78): band i at q = c_i, half width .05-.14,
//   alpha = (.6 + .4 h_i) (1 - smoothstep(.4 w, w, |q - c_i|)) * ragged(fbm) * (1 - smoothstep(.6, 2.8, along)),
//   rust #c46a3a at about 14 percent after the additive gain; in over .8 s at 2.8 s, out by 11.0 s (shots 2-3 only).
import { billboard, sstep, clamp01 } from "./lib.js";

export default function makeLens(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "lens";
  const C = (h) => new THREE.Color(h);

  const shaftFs = /* glsl */ `
    uniform vec3 uCol; uniform float uA;
    void main() {
      vec2 p = vUv * vec2(vAsp, 1.);
      vec2 dir = normalize(vec2(-.62, -.78)), nrm = vec2(-dir.y, dir.x);
      float along = dot(p - vec2(.9, .75), dir), q = dot(p, nrm);
      float a = 0.;
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float c = (h11(fi * 7.13 + 1.) - .5) * 2.4 + sin(uT * .07 + fi * 1.7) * .05;
        float w = .05 + .09 * h11(fi * 3.7 + .3);
        a += (1. - smoothstep(w * .4, w, abs(q - c))) * (.6 + .4 * h11(fi + 9.1));
      }
      float rag = .55 + .45 * fbm(vec2(along * 2.5, q * 3. + uT * .05));
      a *= smoothstep(-.1, .25, along) * (1. - smoothstep(.6, 2.8, along)) * rag;
      gl_FragColor = vec4(uCol * a * uA * 1.6, 1.);
    }`;
  const shafts = billboard(THREE, sh, shaftFs, { uCol: { value: C("#c46a3a") }, uA: { value: 0.14 } }, { full: true, push: 0.9, order: 1 });

  const lensFs = /* glsl */ `
    uniform float uGhost; uniform float uCross; uniform float uPoster;
    vec3 ghost(vec2 p, vec2 s, float c, float r, vec3 tint) {
      vec2 q = (p + s * c) / r;
      float hd = hexd(q);
      float ring = 1. - smoothstep(0., .06, abs(hd - 1.));
      float fill = (1. - smoothstep(.9, 1., hd)) * .35;
      return tint * (ring * .9 + fill);
    }
    void main() {
      vec2 asp = vec2(vAsp, 1.);
      vec2 p = vUv * asp, s = vSun * asp;
      float vis = vSunOk * (1. - smoothstep(1.3, 2.4, length(s)));
      vec3 col = vec3(0.);
      if (uGhost > .002 && vis > .001) {
        col += ghost(p, s, .35, .06, vec3(1., .70, .45));
        col += ghost(p, s, .70, .10, vec3(1., .62, .52));
        col += ghost(p, s, 1.15, .16, vec3(.80, .56, .78));
        col += ghost(p, s, 1.70, .09, vec3(.62, .60, 1.));
        col += ghost(p, s, -.25, .22, vec3(.55, .65, 1.)) * .6;
        col += ghost(p, s, .45, .13, vec3(.94, .63, .82)) * .8; // the one pink hex ghost on the sun line
        col *= uGhost * vis * .5;
      }
      if (uCross > .002 && vis > .001) {
        vec2 d = p - s;
        float F = min(glint(d, .22), 2.2);
        float streak = exp(-abs(d.y) / .012) * exp(-abs(d.x) / 1.4);
        col += (vec3(1., .88, .66) * F + vec3(.94, .63, .82) * streak * .9) * uCross * vis;
      }
      if (uPoster > .002) {
        // egg 1: the poster flare cross at frame centre, with the streak across the whole width
        vec2 d = p - vec2(0., .03);
        float F = min(glint(d, .3), 2.4);
        float streak = exp(-abs(d.y) / .011) * exp(-abs(d.x) / 2.2);
        col += (vec3(1., .88, .66) * F + vec3(.94, .63, .82) * streak) * uPoster;
      }
      gl_FragColor = vec4(col, 1.);
    }`;
  const lens = billboard(THREE, sh, lensFs, { uGhost: { value: 0 }, uCross: { value: 0 }, uPoster: { value: 0 } }, { full: true, push: 0.8, order: 4 });

  // the 4-point glint at the link instant: where the two loops meet
  const glintFs = /* glsl */ `
    uniform vec3 uCol;
    void main() {
      float d = length(vUv); if (d > 1.) discard;
      float g = min(glint(vUv * .5, .5), 2.) * (1. - smoothstep(.8, 1., d));
      gl_FragColor = vec4(mix(uCol, vec3(1.), clamp(g - .8, 0., 1.)) * 1.4, clamp(g, 0., 1.) * uK * vFade);
    }`;
  const linkGlint = billboard(THREE, sh, glintFs, { uCol: { value: C("#ffd6a0") } }, { order: 6 });
  linkGlint.userData.u.uCenter.value.set(...L.loops);
  group.add(shafts, lens, linkGlint);

  return {
    group,
    update(t) {
      const TS = T.sc;
      // shafts: shots 2-3 only
      const ks = sstep(T.shafts, T.shafts + 0.8, t) * (1 - sstep(T.shafts + T.shaftsD - 0.8, T.shafts + T.shaftsD, t));
      shafts.userData.u.uK.value = ks; shafts.userData.u.uT.value = t; shafts.visible = ks > 0.01;
      // ghosts
      const gIn = sstep(T.ghosts, T.ghosts + T.ghostsD, t) * (1 - sstep(T.ghostsOut, T.ghostsOut + T.ghostsOutD, t));
      const crossE = T.env(t, "flareCross", 0.5, 0.8);
      const ghost = gIn * (0.55 + 0.45 * crossE);
      const poster = sstep(T.posterFlare - 0.05, T.posterFlare + 0.05, t) * (1 - sstep(T.posterFlare + T.posterFlareD - 0.06, T.posterFlare + T.posterFlareD + 0.04, t));
      const u = lens.userData.u;
      u.uGhost.value = ghost; u.uCross.value = crossE; u.uPoster.value = poster * 0.9;
      lens.visible = ghost > 0.003 || crossE > 0.003 || poster > 0.003;
      // the link glint: pops at the link instant, decays over 0.9 s
      const a = t - T.link, g = a > 0 ? Math.exp(-a * 4.2) * sstep(0, 0.05, a) : 0;
      const gu = linkGlint.userData.u; gu.uK.value = g; gu.uSize.value.set(2.6 * L.sc, 2.6 * L.sc); gu.uRot.value = 0.12; linkGlint.visible = g > 0.01;
    },
    dispose() { group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}
