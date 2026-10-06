// SFX and ink lettering art: red brush letters with a pale outline and a drop shadow, painted once to a canvas
// (dry-brush streaks cut out with destination-out), drawn flat to the lens as a clip-space quad.
//   DOMAIN CLOSED  (bible: fill #c8081c, outline #f4efe2 3 px, shadow #0e0b0d; 18 % of frame width) pops on the close with an
//                  overshoot, judders on twos (random +-0.006 offset, +-1.5 deg each drawing), then is rubbed out from the horizon.
//   SHING          (egg: red brush on the first slash, 8.1 s) skipped when scene.sfx already carries a SHING.
// pop(t) = 1 + 0.3 (1 - k)^2 for k = (t - t0)/0.25 in [0,1]; judder noise = hash(floor(t*12)).
import { GLSL_NOISE, GLSL_SEAL, sstep } from "./common.js";

function paint(ctx, text, o) {
  if (typeof document === "undefined") return null;
  const W = 1024, H = 256, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), r = ctx.rng("brush:" + text);
  g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  let size = o.size || 150; g.font = `900 italic ${size}px "Rock Salt","Permanent Marker","Impact","Arial Black",sans-serif`;
  while (g.measureText(text).width > W * 0.94 && size > 30) { size -= 6; g.font = `900 italic ${size}px "Rock Salt","Permanent Marker","Impact","Arial Black",sans-serif`; }
  g.fillStyle = "#0e0b0d"; g.fillText(text, W / 2 + 9, H / 2 + 9); // shadow
  g.strokeStyle = "#f4efe2"; g.lineWidth = size * 0.11; g.strokeText(text, W / 2, H / 2); // outline
  g.fillStyle = "#c8081c"; g.fillText(text, W / 2, H / 2); // fill
  g.globalCompositeOperation = "destination-out"; // dry-brush streaks
  for (let i = 0; i < 46; i++) { g.globalAlpha = 0.25 + r() * 0.5; g.fillRect(r() * W, r() * H, 40 + r() * 220, 1 + r() * 2.4); }
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  const tex = new ctx.THREE.CanvasTexture(cv); tex.colorSpace = ctx.THREE.SRGBColorSpace; tex.needsUpdate = true; return tex;
}

function letter(ctx, track, text, o) {
  const { THREE } = ctx, tex = paint(ctx, text, o);
  if (!tex) return null;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      ...track.u, uMap: { value: tex }, uC: { value: new THREE.Vector4(0, 0, 0.36, 0) }, uRot: { value: 0 }, uPop: { value: 0 }, uA: { value: 0 }, uRub: { value: 0 }, uHz: { value: -0.05 },
    },
    vertexShader: /* glsl */ `
      uniform vec4 uC; uniform float uRot,uPop,uAsp; varying vec2 vUv, vN;
      void main(){ vUv=uv; vec2 q=position.xy*.5; vec2 wh=vec2(uC.z*uAsp, uC.z*uAsp*.25)*uPop;   // 4:1 plate, width in y-units
        float c=cos(uRot),s=sin(uRot); vec2 r=vec2(c*q.x*wh.x-s*q.y*wh.y, s*q.x*wh.x+c*q.y*wh.y);
        vN=vec2(r.x/uAsp+uC.x, r.y+uC.y); gl_Position=vec4(vN,0.,1.); }`,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE} ${GLSL_SEAL}
      uniform sampler2D uMap; uniform float uA,uRub,uHz; varying vec2 vUv, vN;
      void main(){ vec4 t=texture2D(uMap,vUv); vec2 p=vec2(vN.x*uAsp,vN.y);
        float e=abs(vN.y-uHz)+(fbm(p*3.)-.5)*.2; float keep=uRub>.001 ? smoothstep(uRub*2.-.15,uRub*2.,e) : 1.;
        keep=clamp(keep,0.,1.);
        gl_FragColor=vec4(t.rgb,t.a*uA*keep*sealMask(vN)); }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); mesh.frustumCulled = false; mesh.renderOrder = 1020; track.attach(mesh);
  return { mesh, mat, tex };
}

export function buildLettering(ctx, TL, track) {
  const items = [];
  const hasShing = (ctx.scene.sfx || []).some((s) => /shing/i.test(s.text || ""));
  const dc = letter(ctx, track, "DOMAIN CLOSED", { size: 140 });
  if (dc) items.push({ ...dc, t0: TL.closed, t1: TL.flex + 0.4, at: [0.0, 0.52], w: 0.36, rot: -0.03, rub: [17.4, 18.4] });
  if (!hasShing) { const sh = letter(ctx, track, "SHING", { size: 200 }); if (sh) items.push({ ...sh, t0: TL.slash, t1: TL.slash + 0.85, at: [0.46, 0.24], w: 0.5, rot: -0.24, rub: null }); }
  const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  return {
    meshes: items.map((i) => i.mesh),
    update(t, ts) {
      for (const i of items) {
        const u = i.mat.uniforms, on = t >= i.t0 && t < i.t1;
        u.uA.value = on ? 1 : 0; if (!on) continue;
        const k = Math.min(1, (t - i.t0) / 0.25), jf = Math.floor(ts * 12);
        u.uPop.value = 1 + 0.3 * (1 - k) * (1 - k);
        u.uC.value.set(i.at[0] + (hash(jf) - 0.5) * 0.012, i.at[1] + (hash(jf + 9) - 0.5) * 0.012, i.w, 0);
        u.uRot.value = i.rot + (hash(jf + 3) - 0.5) * 0.05;
        u.uRub.value = i.rub ? sstep(i.rub[0], i.rub[1], t) : 0;
      }
    },
    dispose() { for (const i of items) { i.mesh.geometry.dispose(); i.mat.dispose(); i.tex.dispose(); } },
  };
}
