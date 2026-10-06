// p-separatrix FX helpers: maths, beat windows, arena frame, shared GLSL. Everything here is a PURE function of the clock (scrub == play).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
// same hash as GLSL h11: fract(sin(x*127.1+311.7)*43758.5453)
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Beat windows. If scene.js carries beats of this name they WIN (direction owns timing); else the bible defaults are used.
// A window is { t, dur, ...args }. alias: a second name tried when the first has no beat (e.g. timeskip -> erase).
export function makeWin(scene) {
  const by = {};
  for (const b of scene.beats || []) (by[b.name] ||= []).push(b);
  return (name, defs, alias) => {
    const src = by[name] || (alias && by[alias]);
    return src ? src.map((b, i) => ({ ...b, dur: b.dur ?? defs[Math.min(i, defs.length - 1)].dur })) : defs;
  };
}
// the first window of the list that holds t -> { w, u (0..1), age }, else null
export function active(list, t) {
  for (const w of list) if (t >= w.t && t <= w.t + w.dur) return { w, u: (t - w.t) / w.dur, age: t - w.t };
  return null;
}
// 0 before the window, 0..1 across it, 1 after (a "hold")
export const prog = (w, t) => clamp((t - w.t) / w.dur);

// Arena frame F0: the seal's FIRST pose. Arena guesses (Diavolo's mark, pools, beacon) live in F0 local space and may be
// overridden from scene.fx = { dia:[x,y,z], poolL:[..], poolR:[..], beacon:[..], column:[..] } (all F0-local metres).
export function arena(THREE, scene) {
  const s0 = scene.seal || {};
  const at = s0.at || [0, 0, 0], yaw = s0.yaw || 0, c = Math.cos(yaw), s = Math.sin(yaw);
  const o = scene.fx || {};
  const W = (l, out = new THREE.Vector3()) => out.set(at[0] + l[0] * c + l[2] * s, at[1] + l[1], at[2] - l[0] * s + l[2] * c);
  return {
    W,
    dia: o.dia || [0, 0.45, 4.5], poolL: o.poolL || [-4.4, 0.05, 7], poolR: o.poolR || [4.4, 0.05, 7],
    beacon: o.beacon || [0, 3.2, 13], at, yaw,
  };
}

export function col(THREE, hex) { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; }

// shared GLSL: hashes, 2-octave value noise, 4-point star, smooth-min. h11 matches the JS hash above.
export const GLSL = /* glsl */ `
float h11(float x){ return fract(sin(x*127.1+311.7)*43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x), mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x), f.y); }
float fbm2(vec2 p){ return vn(p)*.6 + vn(p*2.03+7.1)*.4; }      // 2 octaves, the bible's "noisy edge (2 octaves)"
// astroid 4-point sparkle: sqrt|x|+sqrt|y| < sqrt(r); 1 at the centre, thin arms along the axes
float star4(vec2 p, float r){ p=abs(p); float s=(sqrt(p.x)+sqrt(p.y))/sqrt(r); return pow(clamp(1.-s,0.,1.),1.6); }
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }
float sdCap(vec2 p, vec2 a, vec2 b, float r){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
// seal screen mask: 0 inside the seal's screen ellipse, 1 outside. NOTHING may cover the seal (owner law).
float sealMask(vec2 p, vec4 S){ return smoothstep(.85,1.35,length((p-S.xy)/S.zw)); }
`;
