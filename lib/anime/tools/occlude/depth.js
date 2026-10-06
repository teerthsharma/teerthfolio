// Family 2 — depth-proxy halo / contact / rim / AO-ish (15).
// Maths: ocDepthProxy is radial+height, never a depth texture. Halos sit on fwidth(proxy) ridges.
import { defineModule } from "./define.js";

const D = (name, doc, glsl, demo) => defineModule({ name, doc, glsl, demo });

export const DEPTH = [
  D("depthHalo", "depth-proxy halo: bright rim where the height/radial proxy has a discontinuity (fwidth ridge)",
    /* glsl */ `
  vec3 depthHalo(vec2 p, vec3 plate, vec3 rim, float gain) {
    float z = ocDepthProxy(p);
    float ridge = ocStroke(z - 0.55, 1.6) + ocStroke(fwidth(z) * 18.0 - 0.12, 1.2);
    return mix(plate, ocCap(plate + rim * gain), clamp(ridge, 0.0, 1.0));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(depthHalo(p, ocPlate(p, t), vec3(0.86, 0.62, 0.28), 0.55 + 0.2 * sin(t))); }`),

  D("contactShadow", "fake contact shadow: multiply dark disc under a screen-space seat, height-weighted",
    /* glsl */ `
  vec3 contactShadow(vec2 p, vec3 plate, vec2 seat, float r) {
    vec2 q = (p - seat) * vec2(1.0, 2.4);
    float d = length(q) - r;
    float z = ocDepthProxy(p);
    float m = ocAA(d) * (0.35 + 0.65 * (1.0 - z));
    return plate * mix(vec3(1.0), OC_INK * 4.2, m * 0.72);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(contactShadow(p, ocPlate(p, t), vec2(0.72, 0.22), 0.20)); }`),

  D("rimLightProxy", "view-space rim: grazing term from the proxy gradient (screen dFdx/dFdy), additively capped",
    /* glsl */ `
  vec3 rimLightProxy(vec2 p, vec3 plate, vec3 rim) {
    float z = ocDepthProxy(p);
    vec2 g = vec2(dFdx(z), dFdy(z));
    float graze = smoothstep(0.02, 0.12, length(g) * 40.0);
    return ocCap(plate + rim * graze * 0.55);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(rimLightProxy(p, ocPlate(p, t), vec3(0.78, 0.84, 0.92))); }`),

  D("aoHeight", "height-based AO: multiply darkens low proxy values, stronger in cavities of the radial seat",
    /* glsl */ `
  vec3 aoHeight(vec2 p, vec3 plate, float k) {
    float z = ocDepthProxy(p);
    float ao = mix(0.42, 1.0, smoothstep(0.08, 0.62, z));
    ao *= mix(0.7, 1.0, smoothstep(0.0, 0.2, length(p - vec2(0.72, 0.38))));
    return plate * mix(vec3(1.0), vec3(ao), k);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(aoHeight(p, ocPlate(p, t), 0.85)); }`),

  D("depthFogOcclude", "depth fog occlude: lerp plate toward a haze as the proxy recedes, never milky-white",
    /* glsl */ `
  vec3 depthFogOcclude(vec2 p, vec3 plate, vec3 haze, float start, float end) {
    float z = ocDepthProxy(p);
    float f = smoothstep(start, end, 1.0 - z);
    return mix(plate, ocCap(haze), f * 0.72);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(depthFogOcclude(p, ocPlate(p, t), vec3(0.42, 0.48, 0.58), 0.15, 0.85)); }`),

  D("creaseDark", "crease darkening: where |laplacian| of the proxy is high, multiply a cool crease",
    /* glsl */ `
  vec3 creaseDark(vec2 p, vec3 plate, float k) {
    float z = ocDepthProxy(p);
    float lap = abs(dFdx(dFdx(z)) + dFdy(dFdy(z))) * 220.0;
    float m = smoothstep(0.04, 0.28, lap);
    return plate * mix(vec3(1.0), vec3(0.38, 0.34, 0.48), m * k);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(creaseDark(p, ocPlate(p, t), 0.9)); }`),

  D("haloInner", "inner halo: glow on the inside of the proxy body, opposite of an outer rim",
    /* glsl */ `
  vec3 haloInner(vec2 p, vec3 plate, vec3 glow) {
    float z = ocDepthProxy(p);
    float inner = smoothstep(0.62, 0.88, z) * (1.0 - smoothstep(0.88, 0.98, z));
    return ocCap(plate + glow * inner * 0.45);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(haloInner(p, ocPlate(p, t), vec3(0.90, 0.70, 0.32))); }`),

  D("depthSoftClip", "soft clip by depth-proxy: fade the plate out as proxy drops below a threshold, AA",
    /* glsl */ `
  vec3 depthSoftClip(vec2 p, vec3 plate, vec3 behind, float cut) {
    float z = ocDepthProxy(p);
    float m = ocAA(cut - z);
    return mix(behind, plate, m);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(depthSoftClip(p, ocPlate(p, t), vec3(0.12, 0.10, 0.18), 0.40 + 0.12 * sin(t))); }`),

  D("groundContact", "ground-plane contact: horizontal band at low p.y, width from proxy, multiply dirt",
    /* glsl */ `
  vec3 groundContact(vec2 p, vec3 plate, float y0) {
    float d = p.y - y0;
    float band = ocAA(0.10 - abs(d)) * (1.0 - ocDepthProxy(p));
    return plate * mix(vec3(1.0), vec3(0.32, 0.26, 0.20), band * 0.8);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(groundContact(p, ocPlate(p, t), 0.18)); }`),

  D("siloHalo", "silhouette halo: AA ring around the radial seat, additive gold, capped",
    /* glsl */ `
  vec3 siloHalo(vec2 p, vec3 plate, vec3 rim, vec2 c, vec2 rad) {
    float d = ocEllipse(p, c, rad);
    float ring = ocStroke(d, 2.2);
    return ocCap(plate + rim * ring);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(siloHalo(p, ocPlate(p, t), vec3(0.88, 0.64, 0.24), vec2(0.72, 0.40), vec2(0.22, 0.28))); }`),

  D("depthRidge", "ridge highlight: add on rising proxy slopes (max(dFdy,0)), a cheap backlight",
    /* glsl */ `
  vec3 depthRidge(vec2 p, vec3 plate, vec3 hi) {
    float z = ocDepthProxy(p);
    float up = max(dFdy(z) * 50.0, 0.0);
    return ocCap(plate + hi * smoothstep(0.04, 0.22, up));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(depthRidge(p, ocPlate(p, t), vec3(0.86, 0.80, 0.62))); }`),

  D("cavityDark", "cavity AO: darken where the proxy is a local minimum vs a 4-tap screen neighbourhood",
    /* glsl */ `
  vec3 cavityDark(vec2 p, vec3 plate, float k) {
    float z = ocDepthProxy(p);
    vec2 o = vec2(0.02, 0.02);
    float n = ocDepthProxy(p + vec2(o.x, 0.0)) + ocDepthProxy(p - vec2(o.x, 0.0))
            + ocDepthProxy(p + vec2(0.0, o.y)) + ocDepthProxy(p - vec2(0.0, o.y));
    float cav = clamp((n * 0.25 - z) * 6.0, 0.0, 1.0);
    return plate * mix(vec3(1.0), vec3(0.36, 0.32, 0.42), cav * k);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(cavityDark(p, ocPlate(p, t), 0.9)); }`),

  D("volumeHalo", "volumetric-ish halo: exponential falloff from the seat through the proxy, additive",
    /* glsl */ `
  vec3 volumeHalo(vec2 p, vec3 plate, vec3 glow, vec2 c) {
    float r = length((p - c) * vec2(0.7, 1.0));
    float fog = exp(-r * r * 3.4) * (0.4 + 0.6 * ocDepthProxy(p));
    return ocCap(plate + glow * fog * 0.5);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(volumeHalo(p, ocPlate(p, t), vec3(0.72, 0.48, 0.86), vec2(0.72, 0.40))); }`),

  D("depthBand", "quantized depth bands: floor the proxy into poster steps, ink the isolines with fwidth",
    /* glsl */ `
  vec3 depthBand(vec2 p, vec3 plate, float steps) {
    float z = ocDepthProxy(p);
    float q = floor(z * steps + 1e-4) / steps;
    float iso = ocStroke(fract(z * steps) - 0.5, 0.9);
    vec3 banded = mix(plate, plate * (0.55 + 0.45 * q), 0.65);
    return mix(banded, OC_INK * 6.5, iso * 0.55);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(depthBand(p, ocPlate(p, t), 5.0)); }`),

  D("occludeByHeight", "height fade: plate multiplies toward ink as p.y drops, a cheap occlude-by-ground",
    /* glsl */ `
  vec3 occludeByHeight(vec2 p, vec3 plate, float yCut) {
    float d = p.y - yCut;
    float m = ocAA(d);
    return mix(plate * OC_INK * 5.5, plate, m);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return ocCap(occludeByHeight(p, ocPlate(p, t), 0.22 + 0.06 * sin(t))); }`),
];
