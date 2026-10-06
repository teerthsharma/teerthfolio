// SEAL GUARD (GLSL): a translucent world element (shaft, motes) must never veil the seal. It needs `uniform vec3 uSeal;`
// (the seal's chest, world) and the built-in cameraPosition. Maths: for the ray from the eye through this fragment, take
//   ts = depth of the seal along the ray, dRay = distance from the seal to the ray, tf = distance eye -> fragment.
// A fragment NEARER than the seal (tf < ts) whose ray passes within ~2 m of the seal fades to 0 (smoothstep 0.7 .. 2.0);
// a fragment behind the seal is occluded by depth anyway and is left alone (blend over tf - ts in 0.4 .. 1.4).
export const SEAL_GUARD = /* glsl */ `
  float sealGuard(vec3 wp) {
    vec3 rd = normalize(wp - cameraPosition); vec3 toS = uSeal - cameraPosition;
    float ts = dot(toS, rd), tf = length(wp - cameraPosition), dRay = length(toS - rd * ts);
    return mix(smoothstep(0.7, 2.0, dRay), 1.0, smoothstep(0.4, 1.4, tf - ts));
  }`;
// over-blend that keeps the target's alpha (the set id), as mistCard does
export const OVER_KEEP_ID = { blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201 };
