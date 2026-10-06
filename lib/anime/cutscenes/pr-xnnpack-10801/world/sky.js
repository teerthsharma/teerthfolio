// WORLD / sky. Two skies, one on top of the other.
//
// 1. THE DIMENSION SKY (bible: "Black sky and crescent moon"): pure black #080a0f, no stars, a thin white crescent at upper
//    right (about 6 % of the frame width), a 3 px halo and a 12 % #d8ecff glow. LIVE (layer 1) because it is wiped in and
//    shattered by the glass pass. A BackSide sphere of radius 400 at the seal.
//      moon direction m (seal frame: az +0.30 right, el +0.36, behind the seal at -z), rotated by the seal yaw
//      frame: e1 = normalize(up x m), e2 = m x e1; gnomonic q = (d.e1, d.e2) / (d.m)          (radians, small-angle)
//      crescent = disc(R) minus disc(0.9 R) shifted (-0.38, +0.38) R           (the horns point up-left, bulge low right)
//      R = 0.04 rad (about 6 % of the frame width at fov 42, aspect 16:9)
//      halo = 0.12 exp(-(|q| / 2.6 R)^2), and a 3 px rim ring just outside the edge
//      the moon slides 0.0004 rad per second (0.2 % per second), a pure function of the stepped clock
//    The sky has no real distance, so the wipe tests a fake world point: wp = seal + d * D, D = mix(90, 450, (1 - max(d.y, 0))^2)
//    which makes the black sphere arrive from overhead down to the horizon, meeting the ground's frontier there.
//
// 2. THE ISLAND SKY: the real world behind the picture, a baked dome (layer 0): pale dusk, #d8ecff at the horizon rising to
//    #aab1bf with a 12 % breath of #3d7fc4 at the zenith, one far ice ridge. The holes in the glass and the final fall show
//    it, and it is what shot 1 and shot 6 sit under.
//      ridge(az) = 0.018 + 0.05 fbm(2.2 az);  below it #c8ccd6 with a 1 px #080a0f edge at 40 %, then snow haze below the
//      horizon so the sky meets the snow plane with no seam.
import { Mesh, SphereGeometry, ShaderMaterial, BackSide } from "three";
import { PAL, V, GLASS } from "./common.js";

export function buildDimSky(ctx, U) {
  const { THREE } = ctx;
  const sd = ctx.scene.seal ?? {};
  const yaw = sd.yaw ?? 0, azM = 0.30, elM = 0.36;
  // seal frame (forward +z) -> world: behind the seal is -z; rotate about y by yaw
  const vx = Math.cos(elM) * Math.sin(azM), vy = Math.sin(elM), vz = -Math.cos(elM) * Math.cos(azM);
  const m = new THREE.Vector3(vx * Math.cos(yaw) + vz * Math.sin(yaw), vy, -vx * Math.sin(yaw) + vz * Math.cos(yaw)).normalize();
  const mat = new ShaderMaterial({
    side: BackSide, depthWrite: false,
    uniforms: { ...U, uMoon: { value: m }, uDrift: { value: 0 } },
    vertexShader: `varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }`,
    fragmentShader: `
      uniform vec3 uMoon; uniform float uDrift; varying vec3 vD;
      ${GLASS}
      const vec3 SKY = ${V(PAL.ink)}; const vec3 MOON = ${V(PAL.paper)}; const vec3 HALO = ${V(PAL.pale)};
      void main() {
        vec3 d = normalize(vD);
        float D = mix(90.0, 450.0, pow(1.0 - max(d.y, 0.0), 2.0));
        vec3 m = normalize(uMoon);
        vec3 e1 = normalize(cross(vec3(0.0, 1.0, 0.0), m)); vec3 e2 = cross(m, e1);
        float dm = dot(d, m);
        vec3 col = SKY;
        if (dm > 0.05) {
          vec2 q = vec2(dot(d, e1), dot(d, e2)) / dm; q.x -= uDrift;
          float R = 0.04, len = length(q), w = fwidth(len) * 0.8 + 1e-6;
          float disc = 1.0 - smoothstep(R - w, R + w, len);
          float cut = 1.0 - smoothstep(0.9 * R - w, 0.9 * R + w, length(q - vec2(-0.38, 0.38) * R));
          float cres = disc * (1.0 - cut);
          float halo = 0.12 * exp(-pow(len / (2.6 * R), 2.0));
          float rim = (1.0 - smoothstep(R + w * 3.0 - w, R + w * 3.0 + w, len)) * (1.0 - disc) * 0.22;
          col = mix(col, HALO, halo + rim * (1.0 - cut * 0.0));
          col = mix(col, MOON, cres);
        }
        col = glassPass(col, uSeal + d * D);
        gl_FragColor = vec4(col, 0.0);   // alpha 0 = sky id
      }`,
  });
  const mesh = new Mesh(new SphereGeometry(400, 48, 24), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -9; mesh.userData.layer = 1;
  mesh.position.set(...(sd.at ?? [0, 0, 0]));
  return {
    obj: mesh,
    update(t) { mat.uniforms.uDrift.value = t * 0.0004; },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}

export function buildIslandSky(ctx) {
  const body = `
    const vec3 HOR = ${V(PAL.pale)}; const vec3 ZEN = ${V(PAL.grey)}; const vec3 BLU = ${V(PAL.blue)};
    const vec3 RIDGE = ${V(PAL.hatch)}; const vec3 INKC = ${V(PAL.ink)}; const vec3 SNOW = ${V(PAL.snow)};
    vec3 sky(float az, float el) {
      vec3 col = mix(HOR, ZEN, smoothstep(0.0, 1.0, el));
      col = mix(col, BLU, 0.12 * smoothstep(0.55, 1.2, el));
      float ridge = 0.018 + 0.05 * fbm(vec2(az * 2.2, 3.0)) + 0.012 * vn(vec2(az * 9.0, 1.0));
      float d = el - ridge;
      float below = 1.0 - smoothstep(-0.002, 0.002, d);
      col = mix(col, RIDGE, below);
      col = mix(col, INKC, 0.4 * (1.0 - smoothstep(0.0, 0.0016, abs(d))));
      col = mix(col, SNOW, smoothstep(-0.02, -0.12, el));
      return col;
    }`;
  const dome = ctx.bake.sky(body, { az: [-3.1416, 3.1416], el: [-0.5, 1.2], pxPerRad: 700, tools: ["noise"] });
  const sd = ctx.scene.seal ?? {};
  dome.position.set(...(sd.at ?? [0, 0, 0]));
  dome.renderOrder = -11;
  return { obj: dome, update() {}, dispose() { dome.userData.target?.dispose(); dome.geometry.dispose(); dome.material.dispose(); } };
}
