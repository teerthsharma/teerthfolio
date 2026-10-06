// THE THREE DEAD MOONS (bible 3.6, egg 6): "T6 RGCS", "T9 CMA", "T10 WPHB", the theorems the boot gate lists as "Not checked;
// no runtime consumer": spheres of r 14..22 m orbiting nothing, one lit socket each, the name carved on the equator band.
// Static art (layer 0, painted into the plate). Lit by the eye like everything else: 3 hard bands, gold rim, 2 px-class hull (a 4% shell).
//   band3(dot(N, hole)); craters: thin Voronoi seams cracks(3 p/r) darken the stone; the socket is the cap dot(p/|p|, sock) > 0.985
//   (core > 0.990 burns teal x1.7: blooms), ringed in deep; the name occupies uv u in [0, 0.5], v in [0.375, 0.625] (4:1 on the equator)
import { BackSide, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { U } from "./palette.js";
import { BANDS, NOISE3, SLASH } from "./glsl.js";
import { nameAtlas } from "./plinths.js";
import { NAMES } from "./data.js";

const VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vP; varying vec2 vUv; varying vec3 vWorld;
  void main() { vP = position; vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRAG = /* glsl */ `
  ${NOISE3}
  ${BANDS}
  ${SLASH}
  uniform vec3 uHole, uSock; uniform float uRow, uRows, uRad, uId;
  uniform vec3 cDeep, cDark, cLit, cTeal, cGold, cRimG, cRimM;
  uniform sampler2D uMap;
  varying vec3 vN; varying vec3 vP; varying vec2 vUv; varying vec3 vWorld;
  void main() {
    vec3 ec; float ed;
    if (slashCut(ec, ed) > 0.5) discard;
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vWorld);
    float l = dot(N, uHole);
    vec3 col = band3(l, cDark, cLit, mix(cRimM, cRimG, smoothstep(0.5, 1.0, l)));
    col *= 0.8 + 0.4 * f3(vP / uRad * 3.0);
    if (l < 0.0) col = mix(col, cDeep, 0.5 * hatch4());
    vec2 k = cracks(vP / uRad * 3.0);
    col *= 1.0 - 0.5 * smoothstep(0.1, 0.0, k.x);
    col = mix(col, cGold, step(0.80, 1.0 - abs(dot(N, V))) * step(0.1, l));
    // the one lit socket
    float s = dot(normalize(vP), uSock);
    col = mix(col, cDeep, smoothstep(0.972, 0.982, s));
    col += cTeal * 1.7 * smoothstep(0.986, 0.992, s);
    // the carved name on the equator band
    float tu = vUv.x / 0.5, tv = (vUv.y - 0.375) / 0.25;
    if (tu > 0.0 && tu < 1.0 && tv > 0.0 && tv < 1.0) {
      vec2 uv = vec2(tu, 1.0 - (uRow + 1.0 - tv) / uRows);
      col = mix(col, cTeal * 1.1, (1.0 - texture2D(uMap, uv).r) * 0.9);
    }
    col = mix(col, ec, ed);
    gl_FragColor = vec4(col, uId);
  }`;
const HULL_FRAG = /* glsl */ `
  ${SLASH}
  uniform vec3 cHull; uniform float uId;
  void main() { vec3 ec; float ed; if (slashCut(ec, ed) > 0.5) discard; gl_FragColor = vec4(mix(cHull, ec, ed), uId); }`;
const HULL_VERT = /* glsl */ `void main() { gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`;

// the socket sits in object space on the named side, 33 deg above the equator band (clear of the carving)
const SOCK = new Vector3(-0.5, 0.55, 0.7).normalize();
// moons: [{ p: Vector3 (world), r, row (NAMES index), yaw }]
export function buildMoons(S, moons) {
  const map = nameAtlas();
  const out = [], disp = [];
  for (const m of moons) {
    const geo = new SphereGeometry(m.r, 48, 32);
    const mat = new ShaderMaterial({
      uniforms: {
        uHole: S.uHole, uSock: { value: SOCK }, uRow: { value: m.row }, uRows: { value: NAMES.length }, uRad: { value: m.r }, uId: { value: 0.45 },
        uCut: S.uCut, uCutN: S.uCutN, uRes: S.uRes, uEdgeA: S.uEdgeA, uEdgeB: S.uEdgeB, uMap: { value: map },
        cDeep: U("deep"), cDark: U("basaltDark"), cLit: U("basaltLit"), cTeal: U("teal"), cGold: U("gold"), cRimG: U("rimGold"), cRimM: U("rimMid"),
      },
      vertexShader: VERT, fragmentShader: FRAG,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.copy(m.p); mesh.rotation.y = m.yaw ?? 0; // the name half (u 0..0.5, facing +z) turns toward the planet
    const hmat = new ShaderMaterial({
      side: BackSide,
      uniforms: { cHull: U("hull"), uId: { value: 0.45 }, uCut: S.uCut, uCutN: S.uCutN, uRes: S.uRes, uEdgeA: S.uEdgeA, uEdgeB: S.uEdgeB },
      vertexShader: HULL_VERT, fragmentShader: HULL_FRAG,
    });
    const hull = new Mesh(geo, hmat);
    hull.position.copy(m.p); hull.scale.setScalar(1.04); hull.renderOrder = -1;
    mesh.userData.layer = 0; hull.userData.layer = 0;
    out.push(mesh, hull); disp.push(geo, mat, hmat);
  }
  return { objects: out, dispose() { disp.forEach((d) => d.dispose()); map?.dispose(); } };
}
