// PROPS of the seal in the dimension: the notebook's open page, the pen and its ink spray, the chip bag and its torn page, the chip.
// Ported from moves/p-nerve/pup.js (prop half, same windows on the scene clock); each prop rides the hero's hand and mouth anchors.
// Positions are in the rig frame: the cast group sits in the rig at DOCK, so a world point is rig = world - DOCK.
import { BoxGeometry, CanvasTexture, CylinderGeometry, DoubleSide, Group, InstancedMesh, Mesh, Object3D, PlaneGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, Vector3 } from "three";
import { DOCK } from "../clock.js";
import { T, linesAt, strikesAt } from "../live/timeline.js";
import { ball, clamp01, ease, flat, hash, box, merge, mergeC, prepSmooth, sm, tene, tint } from "../live/look.js";
import { tone } from "../tone.js";

const HOME = new Vector3(...DOCK);
const X = new Vector3(1, 0, 0), Z = new Vector3(0, 0, 1);
const V1 = new Vector3(), V2 = new Vector3(), V3 = new Vector3(), V4 = new Vector3(), V5 = new Vector3();
const D = new Object3D();
const DROPS = 28;
const ROW = [72, 126, 180, 234];
const to = (out, w) => out.copy(w).sub(HOME);
const faceCam = (m, camR) => { if (camR) m.quaternion.setFromUnitVectors(Z, V5.copy(camR).sub(m.position).normalize()); };

// the page's canvas: four ivory lines, three struck in coral (the live drawPage)
function drawPage(g, n, s, w, h) {
  g.fillStyle = "#0e0b0a";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(244,233,208,0.28)";
  g.lineWidth = 3;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.lineCap = "round";
  g.lineJoin = "round";
  for (let r = 0; r < Math.min(n, 4); r++) {
    g.strokeStyle = r === 3 ? "#fff4d6" : "#f1e4c8";
    g.lineWidth = 6;
    g.beginPath();
    let x = 26;
    g.moveTo(x, ROW[r]);
    for (let i = 0; i < 26; i++) {
      x += (w - 64) / 26;
      g.lineTo(x, ROW[r] + Math.sin(i * 1.7 + r * 2.3) * 9 + (hash(i + r * 40, 1) - 0.5) * 12);
    }
    g.stroke();
  }
  for (let r = 0; r < Math.min(s, 3); r++) {
    g.strokeStyle = "#ff6b5a";
    g.lineWidth = 11;
    g.beginPath();
    g.moveTo(14, ROW[r] + 8);
    g.lineTo(w - 14, ROW[r] - 8);
    g.stroke();
  }
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
  uniform sampler2D map; varying vec2 vUv;
  void main() { gl_FragColor = vec4(texture2D(map, vUv).rgb, 0.99); }`;

function pageCard() {
  let key = -1, g = null, tex = null;
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 300;
    g = c.getContext("2d");
    tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    drawPage(g, 0, 0, 256, 300);
  }
  const mat = tone(new ShaderMaterial({ uniforms: { map: { value: tex } }, vertexShader: VERT, fragmentShader: FRAG, side: DoubleSide }));
  return {
    mat,
    set(n, s) {
      const k = n * 10 + s;
      if (k === key || !g) return;
      key = k;
      drawPage(g, n, s, 256, 300);
      tex.needsUpdate = true;
    },
    dispose() { tex?.dispose(); mat.dispose(); },
  };
}

export function buildProps(ctx) {
  const page = pageCard();
  const coverless = [];
  const own = (geo) => (coverless.push(geo), geo);
  const mat = (hex, wet) => tone(tene({ albedo: hex, wet, crack: false }));
  const penM = mat("#3a3944", 1), bagM = tone(tene({ albedo: "#ffffff", wet: 0.9, vertexColors: true, crack: false })), chipM = mat("#e0b866", 0.7);
  const inkM = tone(flat("#fff1cf"));
  const group = new Group();
  const prop = (geo, m, name) => {
    const mesh = new Mesh(own(geo), m);
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  };
  const pageQ = prop(new PlaneGeometry(0.29, 0.34), page.mat, "notebook-page");
  const pageBig = prop(new PlaneGeometry(0.42, 0.5), page.mat, "page-held");
  const pen = prop(merge([new CylinderGeometry(0.012, 0.012, 0.26, 6).rotateZ(Math.PI / 2), new CylinderGeometry(0.0, 0.012, 0.05, 6).rotateZ(Math.PI / 2).translate(-0.15, 0, 0)]), penM, "pen");
  const half = (sx) => {
    const g = new BoxGeometry(0.1, 0.3, 0.05, 2, 4, 1);
    const q = g.attributes.position;
    for (let i = 0; i < q.count; i++) q.setZ(i, q.getZ(i) + (hash(i, 7) - 0.5) * 0.03 + (q.getY(i) > 0.1 ? Math.sin(q.getX(i) * 90) * 0.012 : 0));
    g.translate(sx * 0.05, 0, 0);
    return mergeC([tint(g, "#ece3cf"), tint(box(0.1, 0.07, 0.056, sx * 0.05, -0.02, 0), "#b3171f")]);
  };
  const bagA = prop(half(-1), bagM, "chip-bag-a"), bagB = prop(half(1), bagM, "chip-bag-b");
  const chip = prop(prepSmooth(ball(0.065, 0, 0, 0, 1.3, 0.3, 1, 8, 5)), chipM, "chip");
  const drops = new InstancedMesh(own(new SphereGeometry(0.012, 5, 4)), inkM, DROPS);
  drops.name = "ink-spray";
  drops.frustumCulled = false;
  drops.visible = false;
  group.add(drops);
  let book = null;
  const note = new Vector3();

  return {
    group,
    mouthOpen: 0,
    update(tt, named, cam) {
      if (!book) book = ctx.seal.hero?.parts?.handR?.children.find((c) => c.userData?.hull) ?? null;
      const hR = to(V1, named.handR), hL = to(V2, named.handL), mouth = to(V3, named.mouth);
      const camR = cam ? to(V4, cam.position) : null;
      const alive = tt < T.crunch;
      const act = tt >= T.reach[0] - 0.6;
      const notebookOn = tt < T.bag[0] - 0.05;
      if (book) book.visible = notebookOn;
      if (ctx.nerve) {
        ctx.nerve.tip.copy(named.handL);
        ctx.nerve.cuff.copy(named.handR);
        ctx.nerve.mouth.copy(named.mouth);
      }
      // the open page on the notebook (its hand), written line by line
      const open = sm(T.write[0] - 0.4, T.write[0] - 0.1, tt) * (1 - sm(T.bag[0] - 0.3, T.bag[0], tt));
      const showPage = act && notebookOn && open > 0.02 && alive;
      pageQ.visible = showPage;
      if (showPage) {
        pageQ.position.copy(hR).add(V5.set(0, 0.03, 0));
        faceCam(pageQ, camR);
        pageQ.scale.setScalar(Math.max(open, 0.01));
        page.set(linesAt(tt), strikesAt(tt));
      }
      note.copy(hR).add(V5.set(0, 0.03, 0));
      // the pen in the other hand, pointing at the notebook while it writes; the ink spray thrown off the nib
      pen.visible = tt >= T.write[0] - 0.5 && tt < T.bag[0] && alive;
      if (pen.visible) {
        pen.position.copy(hL);
        V5.copy(note).sub(hL);
        pen.quaternion.setFromUnitVectors(X, V5.lengthSq() > 1e-6 ? V5.normalize() : X);
      }
      drops.visible = tt > T.write[0] && tt < T.write[3] + 0.7 && alive;
      if (drops.visible) {
        for (let i = 0; i < DROPS; i++) {
          const d = tt - (T.write[i % 4] + 0.14);
          if (d < 0 || d > 0.5) { D.position.set(0, -50, 0); D.scale.setScalar(0.0001); }
          else {
            D.position.set(note.x + 0.02 + (hash(i, 1) - 0.3) * d * 1.1, note.y + 0.06 + (0.6 + hash(i, 2)) * d * 1.2 - 3.2 * d * d, note.z + (hash(i, 3) - 0.5) * d * 0.8);
            D.scale.setScalar(1 - d * 1.6);
          }
          D.rotation.set(0, 0, 0);
          D.updateMatrix();
          drops.setMatrixAt(i, D.matrix);
        }
        drops.instanceMatrix.needsUpdate = true;
      }
      // the chip bag: grips in both hands, torn open, the halves drop away
      const bag = sm(T.bag[0], T.bag[0] + 0.45, tt), fall = sm(T.bag[1] + 0.1, T.bag[1] + 0.9, tt);
      const bagOn = tt >= T.bag[0] && tt < T.bag[1] + 0.9 && alive;
      bagA.visible = bagOn;
      bagB.visible = bagOn;
      if (bagOn) {
        bagA.position.copy(hR).add(V5.set(0.03, -0.02 - 0.6 * fall, 0.04));
        bagB.position.copy(hL).add(V5.set(-0.03, -0.02 - 0.6 * fall, 0.04));
        faceCam(bagA, camR);
        faceCam(bagB, camR);
        bagA.scale.setScalar(Math.max(bag, 0.01));
        bagB.scale.setScalar(Math.max(bag, 0.01));
      }
      // the torn page, out of the bag and held up to the lens in the notebook hand
      const pageOn = tt >= T.bag[1] - 0.1 && alive;
      pageBig.visible = pageOn;
      if (pageOn) {
        const pop = ease.back(clamp01((tt - (T.bag[1] - 0.1)) / 0.4)), lift = sm(T.page[0], T.page[1], tt);
        pageBig.position.copy(hR).addScaledVector(V5.set(0.12, 0.24, 0.08), lift);
        faceCam(pageBig, camR);
        pageBig.scale.setScalar(Math.max(pop, 0.01) * (1 + 0.55 * lift));
        page.set(4, 3);
      }
      // the chip: in the left hand, up to the mouth
      const chipK = sm(T.crunch - 0.85, T.crunch - 0.12, tt);
      chip.visible = tt >= T.page[1] - 0.2 && tt < T.crunch + 0.02;
      if (chip.visible) {
        chip.position.lerpVectors(V4.copy(hL).add(V5.set(0, 0.04, 0.03)), mouth, chipK);
        chip.rotation.set(0.4, tt * 2, 0.3);
        chip.scale.setScalar(Math.max(sm(T.page[1] - 0.2, T.page[1], tt), 0.01));
      }
      this.mouthOpen = chipK > 0.85 && tt < T.crunch + 0.5 ? 1 : 0;
      if (ctx.nerve) ctx.nerve.mouthOpen = this.mouthOpen;
    },
    dispose() {
      for (const g of coverless) g.dispose();
      page.dispose();
      for (const m of [penM, bagM, chipM, inkM]) m.dispose();
      group.removeFromParent();
    },
  };
}
