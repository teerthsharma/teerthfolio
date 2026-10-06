// Shared FX plumbing for pr-triton-kernels-22 (own folder only). Nothing here touches the seal mesh.
// Owner law: the seal is never covered or milky. Every FX fragment multiplies by sealMask(ndc), a smooth
// disc about the seal's projected silhouette: mask = smoothstep(r*0.9, r*1.45, |p - s|) with p = (ndc.x*aspect, ndc.y).

export const GLSL_NOISE = /* glsl */ `
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
// value noise: bilinear blend of lattice hashes with the smoothstep fade f*f*(3-2f)
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x), mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x), f.y); }
// fbm: sum_k 0.5^k vn(2.03^k p + 7.1)
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+7.1; a*=.5; } return s; }
`;

export const GLSL_SEAL = /* glsl */ `
uniform vec3 uSeal; uniform float uAsp;
float sealMask(vec2 ndc){ vec2 p=vec2(ndc.x*uAsp, ndc.y); return smoothstep(uSeal.z*0.9, uSeal.z*1.45, length(p-uSeal.xy)); }
`;

// Tracks the seal's screen disc from the camera that is actually rendering (onBeforeRender), so the mask is exact.
export function sealTracker(ctx) {
  const { Vector3, Vector4, Vector2 } = ctx.THREE;
  const u = {
    uSeal: { value: new Vector3(0, 0, 0.3) }, // (x*aspect, y, radius) in y-units (frame height = 2)
    uAsp: { value: 1.6 },
    uEyes: { value: new Vector4(0, 0, 0.03, 0) }, // face point under the eyes (ndc), mark size, on
    uEyeR: { value: new Vector2(0.05, 0) }, // ndc offset of one eye to the right
  };
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), right = new Vector3(), up = new Vector3(), fw = new Vector3(), r = new Vector3();
  function sync(cam) {
    const s = ctx.seal, k = s.scale || 1, at = s.at;
    const asp = cam.aspect || 1.6;
    a.set(at[0], at[1] + 0.4 * k, at[2]).project(cam);
    b.set(at[0], at[1] + 0.85 * k, at[2]).project(cam);
    u.uAsp.value = asp;
    u.uSeal.value.set(a.x * asp, a.y, Math.hypot((b.x - a.x) * asp, b.y - a.y) * 1.05);
    // face marks: a point just under the eyes, one eye width to the camera's right
    c.set(at[0], at[1] + 0.47 * k, at[2]).project(cam);
    cam.matrixWorld.extractBasis(right, up, fw);
    r.set(at[0], at[1] + 0.47 * k, at[2]).addScaledVector(right, 0.13 * k).project(cam);
    u.uEyes.value.set(c.x, c.y, Math.hypot((r.x - c.x) * asp, r.y - c.y) * 0.5, u.uEyes.value.w);
    u.uEyeR.value.set(r.x - c.x, r.y - c.y);
  }
  return { u, sync, attach(mesh) { mesh.onBeforeRender = (rr, ss, cam) => sync(cam); return mesh; } };
}

// a full-frame clip-space quad (vertex shader writes NDC directly, so it is flat to the lens)
export const NDC_VERT = /* glsl */ `varying vec2 vN; void main(){ vN=position.xy; gl_Position=vec4(position.xy,0.,1.); }`;

export function ndcMesh(ctx, material) {
  const m = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(2, 2), material);
  m.frustumCulled = false; m.renderOrder = 1000; return m;
}

export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// scene.beats time lookup so the direction layer and this layer agree; the bible time is the default
export function beatTimes(ctx) {
  const bt = (n, d) => { const b = (ctx.scene.beats || []).find((x) => x.name === n); return b ? b.t : d; };
  return {
    bleed: bt("bleed", 2.0), rise: bt("rise", 2.7), slash: bt("slash", 8.1), heavy: bt("heavy", 10.4),
    dissolve: bt("dissolve", 13.75), cleave: bt("cleave", 16.3), closed: bt("closed", 16.5), flex: bt("flex", 18.0),
  };
}
