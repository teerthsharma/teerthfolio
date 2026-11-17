// THE DOCK ISLAND the cutscene opens on and returns to: snow, the two-turn transport tower with its ramp, lamps, a bench, a stall,
// crates, a sign and two floating balls, as flat cel on a two-band light (no photography). The sky dome turns to Sindria's dusk with dusk(k).
// Built in the rig frame: the pup stands at the origin, the tower behind it at z -6.6.
import { BackSide, BoxGeometry, BufferGeometry, CanvasTexture, CircleGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, Vector3 } from "three";
import { SHEET_SEGMENTS, buildRampSheetData } from "../../../../../components/world/monuments/parts/transport-ramp.js";
import { U, merge, part } from "../live/look.js";
import { tone } from "../tone.js";
import { R } from "../clock.js";

const box = (w, h, d, x, y0, z, hex, k = 0) => part(new BoxGeometry(w, h, d), hex, k, [x, y0 + h / 2, z]);
const cyl = (rt, rb, h, x, y0, z, hex, k = 0, seg = 12) => part(new CylinderGeometry(rt, rb, h, seg), hex, k, [x, y0 + h / 2, z]);
const ball = (r, x, y, z, hex, k = 0) => part(new SphereGeometry(r, 14, 10), hex, k, [x, y, z]);

const CEL_VERT = /* glsl */ `
  varying vec3 vCol; varying vec3 vN;
  void main() { vCol = color; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CEL_FRAG = /* glsl */ `
  uniform vec3 uSun, uShadeK; varying vec3 vCol; varying vec3 vN;
  void main() {
    float lit = step(0.25, dot(normalize(vN), uSun));
    vec3 c = vCol * mix(uShadeK, vec3(1.0), lit);
    gl_FragColor = vec4(pow(max(c, 0.0), vec3(2.2)), 0.99);
  }`;

const DOME_VERT = /* glsl */ `varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const DOME_FRAG = /* glsl */ `
  varying vec3 vD; uniform float uK;
  void main() {
    vec3 d = normalize(vD); float h = d.y;
    vec3 day = mix(vec3(0.859, 0.914, 0.937), vec3(0.718, 0.827, 0.910), smoothstep(0.0, 0.7, h));
    vec3 dk = h < 0.3 ? mix(vec3(1.0, 0.70, 0.28), vec3(0.70, 0.07, 0.227), smoothstep(0.0, 0.3, h)) : mix(vec3(0.70, 0.07, 0.227), vec3(0.165, 0.122, 0.42), smoothstep(0.3, 0.75, h));
    vec3 c = mix(day, dk, uK);
    float sun = step(0.99755, dot(d, normalize(vec3(-0.2, 0.16, -1.0))));
    c = mix(c, vec3(1.0, 0.953, 0.839), sun * uK);
    gl_FragColor = vec4(pow(max(c, 0.0), vec3(2.2)), 0.99);
  }`;

function ramp() {
  const lap = (t0, t1, capStart, capEnd) => {
    const { positions, indices } = buildRampSheetData(t0, t1, SHEET_SEGMENTS, capStart, capEnd);
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return part(g, "#14b8a6", 0, [0, 0, -6.6]);
  };
  return [lap(0, 0.5, true, false), lap(0.5, 1, false, true)];
}

function signTexture() {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 192;
  const g = cv.getContext("2d");
  if (!g) return null;
  const draw = () => {
    g.fillStyle = "#f5d54a"; g.fillRect(0, 0, 512, 192);
    g.fillStyle = "#3a2a10"; g.font = "800 66px 'Shantell Sans', sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NEW AREA SOON", 256, 100);
  };
  draw();
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  document.fonts?.load("800 66px 'Shantell Sans'").then(() => { draw(); tex.needsUpdate = true; }, () => {});
  return tex;
}

export default function build() {
  const mat = tone(new ShaderMaterial({ uniforms: { uSun: U.uSun, uShadeK: { value: new Vector3(0.8, 0.85, 0.93) } }, vertexShader: CEL_VERT, fragmentShader: CEL_FRAG, vertexColors: true, side: DoubleSide }));
  const dome = tone(new ShaderMaterial({ uniforms: { uK: { value: 0 } }, vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: BackSide, depthWrite: false }));
  const domeMesh = new Mesh(new SphereGeometry(120, 32, 16), dome);
  domeMesh.renderOrder = -4;

  const sign = signTexture();
  const board = new Mesh(new PlaneGeometry(2.2, 0.8), sign ? new MeshBasicMaterial({ map: sign }) : new MeshBasicMaterial({ color: "#f5d54a" }));
  board.position.set(-4.6, 1.5, -5.4);

  const stat = [
    part(new PlaneGeometry(60, 60).rotateX(-Math.PI / 2), "#f3f6fb", 0),
    part(new CylinderGeometry(0.7, 0.7, 4.2, 16), "#cfd6dc", 0, [0, 2.1, -6.6]),
    part(new RingGeometry(1.9, 2.0, 48).rotateX(-Math.PI / 2), "#3b4654", 0, [0, 0.01, -6.6]),
    part(new CircleGeometry(1.9, 48).rotateX(-Math.PI / 2), "#14b8a6", 0, [0, 0.02, -6.6]),
    ball(0.3, 0, 4.5, -6.6, "#e9b23a", 2),
    ...ramp(),
    ...[-1.9, 1.9].flatMap((x) => [cyl(0.07, 0.07, 2.6, x, 0, -3.4, "#7a4a22"), ball(0.2, x, 2.8, -3.4, "#f2b84a", 2)]),
    box(1.6, 0.12, 0.5, -3.6, 0.45, -3.2, "#a0662f"), box(1.6, 0.5, 0.1, -3.6, 0.57, -3.45, "#a0662f"),
    box(0.1, 0.45, 0.5, -4.3, 0, -3.2, "#7a4a22"), box(0.1, 0.45, 0.5, -2.9, 0, -3.2, "#7a4a22"),
    ...[-1, 1].flatMap((s) => [box(0.12, 2.2, 0.12, 3.3 + s * 1.2, 0, -3.4 - 0.6, "#7a4a22"), box(0.12, 2.2, 0.12, 3.3 + s * 1.2, 0, -3.4 + 0.6, "#7a4a22")]),
    box(2.0, 0.9, 1.0, 3.3, 0, -3.4, "#a86a34"),
    box(2.6, 0.15, 1.8, 3.3, 2.2, -3.4, "#14a393"), box(2.7, 0.06, 1.9, 3.3, 2.12, -3.4, "#e9b23a", 2),
    box(0.7, 0.7, 0.7, 4.9, 0, -3.1, "#a86a34"), box(0.6, 0.6, 0.6, 5.1, 0, -2.3, "#a86a34"),
    box(0.12, 1.5, 0.12, -5.5, 0, -5.65, "#7a4a22"), box(0.12, 1.5, 0.12, -3.7, 0, -5.65, "#7a4a22"),
    part(new IcosahedronGeometry(1, 1), "#b9d6ea", 0, [4, 1.2, -14, 0, 0.6, 0, 4.2, 2.4, 3.6]),
  ];
  const island = new Mesh(merge(stat), mat);
  island.frustumCulled = false;

  const shadow = new Mesh(part(new CircleGeometry(0.9, 24).rotateX(-Math.PI / 2), "#b8c7da", 0, [0, 0.005, 0, 0, 0, 0, 1, 1, 0.6]), mat);
  const pink = new Mesh(part(new SphereGeometry(0.28, 14, 10), "#f08ab4", 0), mat);
  const yellow = new Mesh(part(new SphereGeometry(0.28, 14, 10), "#f2d24a", 0), mat);
  pink.position.set(-2.2, 2.4, -7.5);
  yellow.position.set(2.4, 3.0, -8.2);

  const group = new Group();
  group.add(island, domeMesh, board, shadow, pink, yellow);

  return {
    group,
    update(t) {
      shadow.visible = !(t >= R.swapIn && t < R.pop + 2 / 24);
      const bob = Math.sin(t * 0.7 * Math.PI * 2) * 0.08;
      pink.position.y = 2.4 + bob;
      yellow.position.y = 3.0 + Math.sin(t * 0.7 * Math.PI * 2 + 1.3) * 0.08;
    },
    dusk(k) {
      dome.uniforms.uK.value = Math.min(1, Math.max(0, k));
    },
    dispose() {
      for (const o of [island, shadow, pink, yellow]) o.geometry.dispose();
      domeMesh.geometry.dispose();
      mat.dispose(); dome.dispose(); board.material.dispose(); board.geometry.dispose();
      sign?.dispose();
    },
  };
}
