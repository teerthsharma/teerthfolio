// SHOT 5: THE LOOP EXIT. The closing ring (bible 3.8, FX 5), the H1 loop on the floor (3.9, easter egg 5) and the STILL lettering (3.16).
// All three share one clock: the ring closes 8.7..9.5 s and STILL is lettered the instant it shuts (easter egg 4: the Aether-Lang loop exit).
//
// CLOSING RING  screen-space, centred on the seal's screen point, radius R = 0.29 of frame height, 3 px (borrowed from ref 06).
//   s     = (atan2(y, x) + pi) / 2 pi        position round the ring, 0..1
//   cov   = ease((t - 8.7) / 0.8)            share of the ring drawn: the head sweeps round and the GAP (1 - cov) shrinks to 0 at 9.5 s
//   line  = lineAA(r - R, hw), hw = 1.5 px (0.25 + 0.75 smoothstep(0, 1, s / cov))      tapered: thin tail, full head
//   fringe R channel pushed 1.5 px out, B in (halo-ring-fringe)
//   dust  96 cells round the ring: a cell at s holds a 4-point sparkle (size 0.004..0.010) with probability
//         p = smoothstep(0.30, 0, |s - cov + 0.05|): a trail that thickens at the head and thins away from it, jittered +-0.025 radially
//   stars 6 four-point rim stars (12..30 px = 0.017..0.04 of frame height) at 15 + 60 i degrees, lit once the line has passed them
//   pulse at the close a second ring expands r = 0.29 + 0.27 smoothstep(0,1,k), 2 px, alpha 1 - k, k = (t - 9.5) / 0.6, #ede0ff
//   After the close the ring holds, then fades 9.9..10.4 s. It sits at NDC depth ~1 behind the seal: it never crosses the seal.
// H1 LOOP       one circle on the floor, radius 1.2 m, 3 px #a98cff (fwidth line), drawn by the same coverage, never labelled.
// STILL         a canvas brush-lettered sprite (fill #f4eeff, outline 6 px #2a1480, offset shadow 4 px #12083a), anchored above the seal's
//               screen point, pop 0.5 -> 1.22 over 0.1 s then 1.22 -> 1 over 0.25 s, wobble +-0.02 rad on twos, gone 10.4..10.6 s.
import { screenQuad, mkMat, hexLin, sstep, clamp01, lerp, GLSL_COMMON } from "./lib.js";

function stillTexture(THREE) {
  if (typeof document === "undefined") return null;
  try {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 384;
    const g = c.getContext("2d");
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.miterLimit = 2;
    g.font = '900 300px Impact, "Arial Black", Anton, "Helvetica Neue", sans-serif';
    const cx = 512, cy = 190;
    g.fillStyle = "#12083a"; g.strokeStyle = "#12083a"; g.lineWidth = 24;   // offset shadow, 4 px at 1x
    g.strokeText("STILL", cx + 8, cy + 8); g.fillText("STILL", cx + 8, cy + 8);
    g.strokeStyle = "#2a1480"; g.lineWidth = 24;                            // outline, 6 px at 1x
    g.strokeText("STILL", cx, cy);
    g.fillStyle = "#f4eeff"; g.fillText("STILL", cx, cy);
    // dry-brush: a few thin streaks cut back into the fill so it reads hand-lettered
    g.globalCompositeOperation = "source-atop"; g.strokeStyle = "rgba(205,189,255,0.55)"; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const y = 80 + i * 17; g.beginPath(); g.moveTo(180 + ((i * 53) % 90), y); g.lineTo(830 - ((i * 37) % 120), y + ((i % 3) - 1) * 3); g.stroke(); }
    const tex = new THREE.CanvasTexture(c);
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    return tex;
  } catch { return null; }
}

export default function make(ctx, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "fx-ring";
  const V = (h) => new THREE.Vector3(...hexLin(h));

  // ---- the closing ring --------------------------------------------------------------------------------------------------------
  const ring = screenQuad(THREE, {
    order: 2, u: { uCov: 0, uPulse: 0, uLine: V("#d9b8ff"), uPale: V("#ede0ff") },
    fs: /* glsl */ `
    uniform float uK; uniform float uCov; uniform float uPulse; uniform vec3 uLine; uniform vec3 uPale;
    void main() {
      if (uK < 0.004) discard;
      vec2 p = (vUv - vC) * vec2(vAsp, 1.);
      float r = length(p), a = atan(p.y, p.x);
      float s = (a + 3.14159265) / 6.2831853;
      float px = fwidth(vUv.y);
      const float R = 0.29;
      float cov = uCov;
      float on = step(s, cov);
      float tw = mix(0.25, 1., smoothstep(0., 1., s / max(cov, 0.001)));
      float hw = px * 1.5 * tw;
      vec3 ln = ringFringe(r - R, 0., hw, px * 1.5) * on;
      vec3 c = ln * uLine;
      c += vec3(1.) * lineAA(r - R, px * 0.6 * tw) * on * 0.9;                      // the white thread in the line
      // dust trail round the head
      float M = 96.;
      float ci = floor(s * M);
      float h1 = h11(ci * 1.37), h2 = h11(ci * 2.71 + 5.), h3 = h11(ci * 3.13 + 9.), h4 = h11(ci * 4.91 + 3.);
      float ac = (ci + 0.5 + (h1 - 0.5) * 0.8) / M * 6.2831853 - 3.14159265;
      vec2 pc = (R + (h2 - 0.5) * 0.05) * vec2(cos(ac), sin(ac));
      float dens = smoothstep(0.30, 0., abs(s - cov + 0.05)) * step(cov, 0.999);
      float dust = star4(p - pc, 0.004 + 0.006 * h3) * step(h4, dens);
      c += mix(uLine, vec3(1.), 0.5) * dust * 1.1;
      // six rim stars, lit once the line has passed them
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float ang = 0.2618 + fi * 1.0472;
        float si = (ang + 3.14159265) / 6.2831853;
        vec2 q = p - R * vec2(cos(ang), sin(ang));
        float sz = 0.017 + 0.0115 * mod(fi, 3.);
        float lit = step(si, cov);
        c += vec3(1.) * star4(q, sz) * lit * 1.1 + uLine * star4(q * vec2(0.45, 1.6), sz * 0.8) * lit * 0.4;
      }
      // the second ring pulsing outward at the close
      if (uPulse > 0.) {
        float R2 = R + 0.27 * smoothstep(0., 1., uPulse);
        c += ringFringe(r, R2, px * 1.5 * (1. - 0.4 * uPulse), px * 1.5) * uPale * (1. - uPulse);
      }
      gl_FragColor = vec4(min(c, vec3(1.3)), uK);
    }`,
  });
  group.add(ring);

  // ---- the H1 loop on the floor -------------------------------------------------------------------------------------------------
  const h1M = mkMat(THREE, {
    u: { uK: 0, uCov: 0, uCol: V("#a98cff") }, add: false,
    vs: `varying vec2 vP; void main() { vP = position.xz * 2.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fs: `${GLSL_COMMON}\nuniform float uK; uniform float uCov; uniform vec3 uCol; varying vec2 vP;
      void main() { float r = length(vP); float a = atan(vP.y, vP.x); float s = (a + 3.14159265) / 6.2831853;
        float w = fwidth(r) * 1.5; float l = lineAA(r - 0.923, w) * step(s, uCov);
        if (l * uK < 0.01) discard; gl_FragColor = vec4(uCol, l * uK * 0.9); }`,
  });
  const gh = new THREE.PlaneGeometry(1, 1); gh.rotateX(-Math.PI / 2);
  const h1 = new THREE.Mesh(gh, h1M); h1.frustumCulled = false; h1.renderOrder = 1;
  h1.position.copy(L.H1); h1.scale.setScalar(2.6);
  group.add(h1);

  // ---- STILL --------------------------------------------------------------------------------------------------------------------
  const tex = stillTexture(THREE);
  const still = screenQuad(THREE, {
    order: 9, add: false, u: { uTex: tex, uRot: 0, uScale: 1 },
    fs: /* glsl */ `
    uniform float uK; uniform sampler2D uTex; uniform float uRot; uniform float uScale;
    void main() {
      if (uK < 0.004) discard;
      vec2 c = vec2(clamp(vC.x, 0.34, 0.66), clamp(vC.y + 0.26, 0.22, 0.80));
      vec2 p = (vUv - c) * vec2(vAsp, 1.);
      float cs = cos(uRot), sn = sin(uRot);
      p = mat2(cs, sn, -sn, cs) * p / uScale;
      vec2 uv = p / vec2(0.9, 0.3375) + 0.5;
      if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) discard;
      vec4 s = texture2D(uTex, uv);
      if (s.a < 0.02) discard;
      gl_FragColor = vec4(min(pow(s.rgb, vec3(2.2)), vec3(1.0)), s.a * uK);
    }`,
  });
  if (!tex) still.visible = false;
  group.add(still);

  // the shock ring on the close (a pure function of the clock, applied by the player)
  const rc = L.T("ringclose", 8.7, 0.8), st = L.T("still", 9.5, 0.9);
  ctx.sakuga.shock({ t: rc.t + rc.dur, dur: 0.5, at: [0.5, 0.5], amp: 0.035, r1: 0.8 });

  return {
    group,
    update(t) {
      const e = (t - rc.t) / rc.dur, cov = clamp01(e);
      const cv = cov * cov * (3 - 2 * cov);
      const end = rc.t + rc.dur;
      const ru = ring.userData.u;
      L.chest(ru.uAnchor.value);
      ru.uCov.value = e <= 0 ? 0 : Math.max(cv, 0.0001);
      ru.uPulse.value = t > end ? clamp01((t - end) / 0.6) : 0;
      ru.uK.value = e <= 0 ? 0 : 1 - sstep(end + 0.4, end + 0.9, t);
      // the floor loop draws with the ring
      const hu = h1M.userData.u; hu.uCov.value = ru.uCov.value; hu.uK.value = e <= 0 ? 0 : 1 - sstep(end + 0.4, end + 0.9, t) * 0.4;
      // STILL
      const su = still.userData.u, se = t - st.t;
      let sc = 1;
      if (se < 0.1) sc = lerp(0.5, 1.22, clamp01(se / 0.1)); else sc = lerp(1.22, 1, sstep(0.1, 0.35, se));
      su.uScale.value = sc; su.uRot.value = 0.02 * (Math.floor(t * 12) % 2 ? 1 : -1);
      L.chest(su.uAnchor.value);
      su.uK.value = se < 0 ? 0 : 1 - sstep(10.4, 10.6, t);
    },
    dispose() { tex?.dispose(); },
  };
}
