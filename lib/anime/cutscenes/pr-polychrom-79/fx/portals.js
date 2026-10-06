// GATE OF BABYLON portal field: 90 near instanced swirl-disc portals in 3 depth layers + 200 tiny far portals for parallax.
// TOOLKIT: engine/anime:portal-ring (this is the local adapter; Consolidate swaps it).
//
// Portal shader maths (disc coords vP in [-1.3,1.3], disc radius 1, rr = |vP| / open):
//   open   = smoothstep(clamp((t - tOpen)/0.35)) * (1 - clamp((t - tClose)/0.5))      staggered arcs, 0.08 s gap
//   swirl  = fbm(( ang*1.5 + rr*4 - ts*1.2 + seed*9 , rr*6 - ts*0.8 ))                 ts = STEPPED clock (ripple on twos)
//   rings  = 0.5 + 0.5 sin(2pi (rr*4 - 2 ts + swirl*1.2))                              4 concentric rings, 2 rings/s outward
//   colour = ramp rim #c98a12 -> ripple #ffb020 -> mid #ffe27a (x rings) -> core #fff2c0, + hot core exp(-9 rr^2)
//   refract = thin ring at rr 0.86..0.96 in core colour (the 4 px refracted light ring)
//   glow   = exp(-5 (rr-1)) #ff8a1a outside the disc (outer glow), faded by the plate edge
// Layout: 3 arcs by elevation band, azimuth sorted so each arc sweeps across the sky; 60% of portals behind the seal (the low-arc shots look
// that way), 40% all around (the behind-the-seal shots). Orientation: face the seal, tilted 20 to 60 deg so no disc is dead-on.
import { GLSL_NOISE, instGeo } from "./common.js";

export default function portals(ctx, S) {
  const { THREE, U, flares } = S;
  const r = ctx.rng("gate-portals");
  const NN = 90, NF = 200, N = NN + NF;
  const P = [];
  const tooClose = (pos, R) => P.some((q) => {
    const a = Math.acos(Math.min(1, pos.clone().normalize().dot(q.pos.clone().normalize())));
    return a < (R / pos.length() + q.R / q.pos.length()) * 0.85;
  });
  const dists = [22, 34, 48];
  for (let i = 0; i < NN; i++) {
    const layer = i % 3;
    let pos, R, tries = 0;
    do {
      const d = dists[layer] * (0.9 + 0.2 * r());
      const az = r() < 0.6 ? Math.PI + (r() - 0.5) * 3.4 : r() * Math.PI * 2;
      const el = (8 + r() * 58) * Math.PI / 180;
      pos = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d);
      pos.y += 1; R = d * 0.065 * (0.6 + 0.9 * r());
      pos.userData = { az, el };
      tries++;
    } while (tries < 40 && tooClose(pos, R));
    const el = Math.atan2(pos.y, Math.hypot(pos.x, pos.z)), az = Math.atan2(pos.x, pos.z);
    P.push({ pos, R, near: true, el, az, band: Math.min(2, Math.floor(((el * 180 / Math.PI) - 8) / (58 / 3))) });
  }
  // open order: per elevation band, sweep by azimuth distance from "behind"; 0.08 s gap
  const bandStart = [2.3, 2.5, 2.7];
  for (let b = 0; b < 3; b++) {
    const arc = P.filter((p) => p.near && p.band === b).sort((a, c) => Math.abs(Math.atan2(Math.sin(a.az - Math.PI), Math.cos(a.az - Math.PI))) - Math.abs(Math.atan2(Math.sin(c.az - Math.PI), Math.cos(c.az - Math.PI))));
    arc.forEach((p, j) => { p.open = bandStart[b] + j * 0.08; });
    if (b === 0) arc.slice(0, 3).forEach((p, j) => { p.open = 1.3 + j * 0.16; }); // shot 2: the first portal ripples
  }
  for (const p of P) { p.close = 14.8 + r() * 2.2; }
  for (let i = 0; i < NF; i++) {
    const d = 110 + r() * 30, az = r() * Math.PI * 2, el = (4 + r() * 56) * Math.PI / 180;
    const pos = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d);
    P.push({ pos, R: d * 0.012 * (0.6 + r()), near: false, open: 2.6 + r() * 3.5, close: 15.5 + r() * 2 });
  }
  S.portals = P; // other FX modules (volley, glints) read the layout

  const dummy = new THREE.Object3D();
  const geo = new THREE.PlaneGeometry(2.6, 2.6);
  const aOpen = new Float32Array(N), aClose = new Float32Array(N), aSeed = new Float32Array(N);
  const mesh0 = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial(), N); // matrices only; replaced material below
  P.forEach((p, i) => {
    dummy.position.copy(p.pos);
    dummy.lookAt(new THREE.Vector3((r() - 0.5) * 3, 1 + r(), (r() - 0.5) * 3));
    dummy.rotateY((r() < 0.5 ? -1 : 1) * (0.35 + 0.7 * r()));  // 20 to 60 deg off the lens axis
    dummy.rotateX((r() - 0.5) * 0.8);
    dummy.rotateZ(r() * Math.PI * 2);
    dummy.scale.setScalar(p.R);
    dummy.updateMatrix();
    mesh0.setMatrixAt(i, dummy.matrix);
    aOpen[i] = p.open; aClose[i] = p.close; aSeed[i] = r();
    if (p.near) { // star glint at emergence
      const toC = p.pos.clone().multiplyScalar(-1).normalize().multiplyScalar(p.R * 0.4);
      flares.add({ c: [p.pos.x + toC.x, p.pos.y + toC.y, p.pos.z + toC.z], size: p.R * 0.95, t0: p.open + 0.18, t1: p.open + 0.55, kind: 0, col: "#fff2c0", fi: 0.04, fo: 0.3 });
    }
  });
  geo.setAttribute("aOpen", new THREE.InstancedBufferAttribute(aOpen, 1));
  geo.setAttribute("aClose", new THREE.InstancedBufferAttribute(aClose, 1));
  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
  mesh0.material.dispose();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: U.uT, uTs: U.uTs },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    extensions: { derivatives: true },
    vertexShader: /* glsl */ `
      attribute float aOpen; attribute float aClose; attribute float aSeed;
      varying vec2 vP; varying float vOpen; varying float vClose; varying float vSeed;
      void main(){
        vP = position.xy; vOpen = aOpen; vClose = aClose; vSeed = aSeed;
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = m*instanceMatrix;
        #endif
        gl_Position = projectionMatrix*viewMatrix*m*vec4(position,1.);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uT; uniform float uTs;
      varying vec2 vP; varying float vOpen; varying float vClose; varying float vSeed;
      ${GLSL_NOISE}
      void main(){
        float r = length(vP);
        float o = clamp((uT-vOpen)/.35,0.,1.); o = o*o*(3.-2.*o);
        float c = 1.-clamp((uT-vClose)/.5,0.,1.);
        float open = o*c; if(open<=.001) discard;
        float rr = r/open;
        float aa = fwidth(rr)*1.2+1e-4;
        float disc = 1.-smoothstep(1.-aa,1.,rr);
        float ang = atan(vP.y,vP.x);
        float sw = fbm(vec2(ang*1.5+rr*4.-uTs*1.2+vSeed*9., rr*6.-uTs*.8));
        float rings = .5+.5*sin(6.28318*(rr*4.-2.*uTs+sw*1.2));
        vec3 core=vec3(1.,.949,.753), mid=vec3(1.,.886,.478), rip=vec3(1.,.69,.125), rim=vec3(.788,.541,.071), glow=vec3(1.,.541,.102);
        vec3 col = mix(rim,rip,smoothstep(.9,.6,rr));
        col = mix(col,mid,smoothstep(.65,.3,rr)*(.5+.5*rings));
        col = mix(col,core,smoothstep(.32,0.,rr));
        col *= .72+.5*rings;
        float refr = smoothstep(.86,.9,rr)*(1.-smoothstep(.94,.99,rr));
        col += core*refr*.8;
        col += core*exp(-rr*rr*9.)*1.1;
        float g = exp(-max(rr-1.,0.)*5.)*(1.-disc)*(1.-smoothstep(1.1,1.3,r));
        vec3 rgb = col*disc + glow*g*.55;
        gl_FragColor = vec4(min(rgb*open*.92, vec3(1.4)), 1.);
      }`,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.instanceMatrix = mesh0.instanceMatrix;
  mesh.frustumCulled = false; mesh.renderOrder = 2;
  mesh.userData.layer = 1;
  const group = new THREE.Group(); group.add(mesh);
  return { group, update() {}, dispose() { geo.dispose(); mat.dispose(); mesh0.dispose(); } };
}
