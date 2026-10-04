// THE SWISS-GRID DIMENSION'S LOOK. One ShaderMaterial paints every scenery surface in a single flat colour taken
// from a fixed swatch of ten (glacier blue, pale blue-grey, slate, deep slate, pale concrete, warm grey, cherry rose,
// blazer crimson, amber, coral). Light only chooses between two values of each swatch, lit and shade, split by a hard
// planar edge: no gradient, no texture noise, no outline, no contour line anywhere. A faint chessboard (about 2 % in
// value, 4 m squares) is laid in world space over the ground, the sea and every facade. When the game is over the
// board is cleared square by square: every 4 m cell flips to the opposite colour for two drawings, then is gone.

import { BoxGeometry, BufferAttribute, CylinderGeometry, DoubleSide, DynamicDrawUsage, InstancedBufferAttribute, Matrix4, ShaderMaterial, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const SW = { GLACIER: 0, PALEBLUE: 1, SLATE: 2, DEEP: 3, CONCRETE: 4, WARM: 5, ROSE: 6, CRIMSON: 7, AMBER: 8, CORAL: 9 };

// [lit, shade] in sRGB. Cool light: shade is always a cooler, darker slate of the same swatch, never brown.
const PAL = [
  ["#9cc3dd", "#7aa2c0"], // glacier blue
  ["#c6d7e3", "#a5b9c9"], // pale blue-grey
  ["#6b7d90", "#53647a"], // slate
  ["#3b4757", "#2a3443"], // deep slate
  ["#d7d7d2", "#b5b8b8"], // pale concrete (the palest surface: never white)
  ["#bab2a9", "#9c979a"], // warm grey
  ["#ecaabb", "#c98496"], // cherry rose
  ["#a8222f", "#7f1823"], // blazer crimson
  ["#f2ab3c", "#d08b22"], // amber
  ["#ef7060", "#c9503f"], // coral
];
const rgb = (h) => new Vector3(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
export const HEX = PAL.map((p) => p[0]);
export const SKY = ["#8fb8d8", "#b9d3e6", "#e6dccf", "#f0cfa6"]; // glacier, pale blue, pale peach, apricot (hard bands)

// ONE set of uniforms, shared by every material the scene makes
export function makeLook() {
  const u = {
    uLit: { value: PAL.map((p) => rgb(p[0])) },
    uShd: { value: PAL.map((p) => rgb(p[1])) },
    uLight: { value: new Vector3(0.6, 0.62, 0.12).normalize() },
    uBreak: { value: -1 }, // seconds since the board was cleared (< 0: whole)
    uOrigin: { value: new Vector2(22, -2) }, // where the clearing starts (the plaza)
    uSky: { value: SKY.map(rgb) },
    uTime: { value: 0 },
  };
  const vert = /* glsl */ `
    attribute float aSw;
    varying vec3 vL;
    varying vec3 vN;
    varying float vSw;
    void main() {
      vec4 p = vec4(position, 1.0);
      vec3 n = normal;
      #ifdef USE_INSTANCING
        p = instanceMatrix * p;
        n = mat3(instanceMatrix) * n;
      #endif
      vL = p.xyz;
      vN = n;
      vSw = aSw;
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * p;
    }`;
  const frag = /* glsl */ `
    uniform vec3 uLit[10];
    uniform vec3 uShd[10];
    uniform vec3 uLight;
    uniform float uBreak;
    uniform vec2 uOrigin;
    uniform float uAlpha;
    varying vec3 vL;
    varying vec3 vN;
    varying float vSw;
    float hash3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
    void main() {
      vec3 n = normalize(vN);
      if (!gl_FrontFacing) n = -n;
      int id = int(vSw + 0.5);
      float lit = step(0.0, dot(n, uLight));
      vec3 col = mix(uShd[id], uLit[id], lit);
      #ifdef GRID
        vec3 a = abs(n);
        vec2 g = a.y > 0.5 ? vL.xz : (a.x > a.z ? vL.zy : vL.xy);
        float chk = mod(floor(g.x / 4.0) + floor(g.y / 4.0), 2.0);
        col *= 1.0 + (chk - 0.5) * 0.04;
      #endif
      #ifdef CLEAR
        if (uBreak >= 0.0) {
          vec3 cell = floor(vL / 4.0);
          vec2 c2 = cell.xz * 4.0 + 2.0;
          float d = min(length(c2 - uOrigin), 95.0);
          float k = uBreak - (d * 0.026 + hash3(cell) * 0.2);
          if (k > 0.17) discard;
          if (k > 0.0) col = mod(cell.x + cell.z, 2.0) < 0.5 ? uLit[2] : uLit[1]; // the square turns over
        }
      #endif
      gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), uAlpha); // the composer writes sRGB: hand it linear
    }`;
  const make = ({ grid = true, clear = true, transparent = false, alpha = 1, side = DoubleSide } = {}) => {
    const m = new ShaderMaterial({
      uniforms: { ...u, uAlpha: { value: alpha } },
      vertexShader: vert,
      fragmentShader: frag,
      defines: { ...(grid ? { GRID: 1 } : {}), ...(clear ? { CLEAR: 1 } : {}) },
      side,
      transparent,
      depthWrite: !transparent,
    });
    return m;
  };
  return { u, make };
}

// ---------------------------------------------------------------- geometry: a flat-shaded piece with a swatch

const T4 = new Matrix4();
// any geometry -> non-indexed position + normal + aSw, with an optional matrix
export function piece(geo, sw, m) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute("uv");
  if (m) g.applyMatrix4(m);
  const n = g.attributes.position.count;
  g.setAttribute("aSw", new BufferAttribute(new Float32Array(n).fill(sw), 1));
  return g;
}

export class Mesher {
  constructor() {
    this.list = [];
  }
  add(geo, sw, m) {
    this.list.push(piece(geo, sw, m));
    return this;
  }
  // a box centred (x, y, z), size (w, h, d), turned ry about y
  box(x, y, z, w, h, d, sw, ry = 0) {
    return this.add(new BoxGeometry(w, h, d), sw, T4.makeRotationY(ry).setPosition(x, y, z));
  }
  // a box from a base point (x, y0, z): standing on y0
  stand(x, y0, z, w, h, d, sw, ry = 0) {
    return this.box(x, y0 + h / 2, z, w, h, d, sw, ry);
  }
  // an axis-aligned slab from corner to corner
  slab(x0, y0, z0, x1, y1, z1, sw) {
    return this.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, sw);
  }
  cyl(x, y0, z, rt, rb, h, seg, sw) {
    return this.add(new CylinderGeometry(rt, rb, h, seg), sw, T4.makeTranslation(x, y0 + h / 2, z));
  }
  build() {
    const g = mergeGeometries(this.list);
    for (const p of this.list) p.dispose();
    this.list = [];
    return g;
  }
}

// a per-instance swatch attribute on the mesh's own geometry (sheets and windows change colour by instance)
export function swatchAttr(mesh, n, sw = 0) {
  const attr = new InstancedBufferAttribute(new Float32Array(n).fill(sw), 1);
  attr.setUsage(DynamicDrawUsage);
  mesh.geometry.setAttribute("aSw", attr);
  return attr;
}
