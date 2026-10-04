// THE PUP IS LIGHT: the real 3D pup (round head, NO ears) in a white school shirt with a loosened dark tie and
// rolled sleeves, a black notebook in one flipper and a pen in the other, painted by the same single key as the
// dimension (its lit side glows ivory with a glaze sheen, its shadow side falls into umber, no outline). It is the
// brightest figure in the frame, the saint of the painting.
//
// The pup's own flippers are aimed here, after the pup has posed itself (D.jsx runs first), by plain aiming:
// a flipper's local +x runs along it, so one quaternion points it at a target. Props ride the flippers' tips in
// the rig frame: the apple, the notebook (open page: four ivory lines that take coral strikes), the pen with its
// spray of ink, the chip bag torn open, the page, the chip. Everything is a pure function of t.

import { BoxGeometry, CanvasTexture, CylinderGeometry, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Quaternion, SRGBColorSpace, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { pupParts } from "../p-caustic/parts";
import { T, linesAt, strikesAt } from "./timeline";
import { ball, box, clamp01, ease, hash, merge, mergeC, prep, prepSmooth, sm, tene, tint } from "./look";

const D = new Object3D();
const V = new Vector3();
const W = new Vector3();
const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Q = new Quaternion();
const Z = new Vector3(0, 0, 1);
const TMP_L = new Vector3();
const TMP_R = new Vector3();
const PEN = new Vector3();
const BAGAT = new Vector3();
// aim points in the rig frame (the pup at the origin facing three-quarters to its left, toward Ryuk's side)
const LREST = new Vector3(0.95, 0.3, 0.55);
const RREST = new Vector3(-0.85, 0.3, 0.7);
const MEET = new Vector3(1.4, 1.25, -1.1);
const NOTE = new Vector3(-0.35, 0.62, 1.0);
const PAGEHOLD = new Vector3(-0.55, 1.1, 1.2);
const PAGEMID = new Vector3(0.0, 0.9, 1.1);

// ---- the page's canvas: four ivory lines, three struck in coral -----------------------------------------------------
const ROW = [72, 126, 180, 234];
function drawPage(ctx, n, s, w, h) {
  ctx.fillStyle = "#0e0b0a";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(244,233,208,0.28)";
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let r = 0; r < Math.min(n, 4); r++) {
    ctx.strokeStyle = r === 3 ? "#fff4d6" : "#f1e4c8";
    ctx.lineWidth = 6;
    ctx.beginPath();
    let x = 26;
    ctx.moveTo(x, ROW[r]);
    for (let i = 0; i < 26; i++) {
      x += (w - 64) / 26;
      ctx.lineTo(x, ROW[r] + Math.sin(i * 1.7 + r * 2.3) * 9 + (hash(i + r * 40, 1) - 0.5) * 12);
    }
    ctx.stroke();
  }
  for (let r = 0; r < Math.min(s, 3); r++) {
    ctx.strokeStyle = "#ff6b5a";
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(14, ROW[r] + 8);
    ctx.lineTo(w - 14, ROW[r] - 8);
    ctx.stroke();
  }
}
function pageTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 300;
  const ctx = c.getContext("2d");
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  let key = -1;
  drawPage(ctx, 0, 0, 256, 300);
  return {
    tex,
    set(n, s) {
      const k = n * 10 + s;
      if (k === key) return;
      key = k;
      drawPage(ctx, n, s, 256, 300);
      tex.needsUpdate = true;
    },
    dispose: () => tex.dispose(),
  };
}

// the tie, the collar, the sleeves, in the pup's own frames
function costumeGeometry(body) {
  // the shirt: the body shell pushed out a little along its own normals
  const g = body.geometry.clone();
  const p = g.attributes.position;
  const n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * 0.03, p.getY(i) + n.getY(i) * 0.03, p.getZ(i) + n.getZ(i) * 0.03);
  g.deleteAttribute("color");
  const shirt = prepSmooth(g);
  const collar = merge(
    [new TorusGeometry(0.37, 0.05, 6, 20).scale(1, 0.85, 1).rotateX(Math.PI / 2 - 0.55).translate(0, 0.34, 0.9), new TorusGeometry(0.37, 0.05, 6, 20).scale(1.02, 0.85, 1).rotateX(Math.PI / 2 - 0.62).translate(0, 0.3, 0.92)],
    true,
  );
  // the loosened tie: a knot low at the throat and a blade lying down the chest, a little askew
  const tie = merge([box(0.1, 0.1, 0.07, 0, 0.3, 1.2), box(0.14, 0.36, 0.035, 0.012, 0.1, 1.17, -0.5, 0, 0.1), box(0.1, 0.1, 0.035, 0.03, -0.1, 1.12, -0.6, 0, 0.1)]);
  const pocket = merge([box(0.15, 0.015, 0.14, 0.36, 0.14, 0.7, 0.2, 0, 0.35)]);
  return { shirt, collar, tie, pocket };
}

export function buildPup(scene, rig) {
  const parts = pupParts(scene);
  if (!parts?.root || !parts.head || !parts.rear) return null;
  const { root, head, rear } = parts;
  const body = rear.children.find((o) => o.isMesh);
  const flipL = rear.children.find((o) => o.type === "Group" && o.position.x > 0.2 && o.position.x < 0.5);
  const mirror = rear.children.find((o) => o.type === "Group" && o.scale.x < 0);
  const flipR = mirror?.children[0];
  if (!body || !flipL || !flipR) return null;

  // ---- the tenebrist twins of the pup's own materials ----
  const twins = new Map();
  const list = [];
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial || o.material.isMeshBasicMaterial) return;
    const m = o.material;
    if (m.clearcoat === 1) return; // the eyes keep their own glossy lenses
    let tw = twins.get(m);
    if (!tw) {
      tw = tene({ albedo: `#${(m.color ?? { getHexString: () => "ffffff" }).getHexString()}`, vertexColors: Boolean(m.vertexColors), wet: 0.55, crack: false });
      twins.set(m, tw);
    }
    list.push([o, m, tw]);
  });
  let on = false;
  const setLook = (v) => {
    if (v === on) return;
    on = v;
    for (const [o, m, tw] of list) o.material = v ? tw : m;
  };

  // ---- the costume ----
  const cg = costumeGeometry(body);
  const shirtM = tene({ albedo: "#efe9da", wet: 0.5, crack: false });
  const tieM = tene({ albedo: "#2d2f3d", wet: 0.7, crack: false });
  const sleeveM = tene({ albedo: "#f2ecde", wet: 0.5, crack: false });
  const mk = (geo, mat, parent) => {
    const m = new Mesh(geo, mat);
    m.frustumCulled = false;
    parent.add(m);
    return m;
  };
  const costume = new Group();
  rear.add(costume);
  mk(cg.shirt, shirtM, costume);
  mk(cg.collar, shirtM, costume);
  mk(cg.tie, tieM, costume);
  mk(cg.pocket, shirtM, costume);
  // rolled sleeves: a thick white cuff round each flipper near its root
  const cuffG = new CylinderGeometry(1, 1, 0.13, 16, 1, true).rotateZ(Math.PI / 2).scale(1, 0.12, 0.3).translate(0.13, 0, 0);
  const cuffs = [flipL, flipR].map((f) => mk(cuffG, sleeveM, f));
  const ringG = new TorusGeometry(0.11, 0.022, 6, 14).rotateY(Math.PI / 2).scale(1, 0.75, 0.75).translate(0.32, 0.0, 0);
  const ringM = tene({ albedo: '#c5bfae', wet: 1, crack: false });
  const cuffRing = mk(ringG, ringM, flipR);
  cuffs.push(cuffRing);
  costume.visible = false;
  for (const c of cuffs) c.visible = false;

  // ---- the props, in the rig frame ----
  const page = pageTexture();
  const pageM = new MeshBasicMaterial({ map: page.tex, toneMapped: false, fog: false, side: DoubleSide });
  const coverM = tene({ albedo: "#26242b", wet: 0.9, crack: false });
  const penM = tene({ albedo: "#3a3944", wet: 1, crack: false });
  const bagM = tene({ albedo: "#ffffff", wet: 0.9, vertexColors: true, crack: false });
  const chipM = tene({ albedo: "#e0b866", wet: 0.7, crack: false });
  const inkM = new MeshBasicMaterial({ color: "#fff1cf", toneMapped: false, fog: false });
  const geos = [cg.shirt, cg.collar, cg.tie, cg.pocket, cuffG, ringG];
  const prop = (geo, mat) => {
    geos.push(geo);
    const m = new Mesh(geo, mat);
    m.frustumCulled = false;
    m.visible = false;
    rig.add(m);
    return m;
  };
  // the notebook: a black cover and, once open, its page
  const cover = prop(prep(new BoxGeometry(0.34, 0.035, 0.42)), coverM);
  const pageQ = prop(new PlaneGeometry(0.29, 0.34).rotateX(-Math.PI / 2), pageM);
  const pen = prop(merge([new CylinderGeometry(0.012, 0.012, 0.26, 6).rotateZ(Math.PI / 2), new CylinderGeometry(0.0, 0.012, 0.05, 6).rotateZ(Math.PI / 2).translate(-0.15, 0, 0)]), penM);
  const penPocket = prop(merge([new CylinderGeometry(0.012, 0.012, 0.2, 6)]), penM);
  // the chip bag: two crinkled halves (cream, with the apple-red band) that tear apart
  const half = (sx) => {
    const g = new BoxGeometry(0.1, 0.3, 0.05, 2, 4, 1);
    const q = g.attributes.position;
    for (let i = 0; i < q.count; i++) q.setZ(i, q.getZ(i) + (hash(i, 7) - 0.5) * 0.03 + (q.getY(i) > 0.1 ? Math.sin(q.getX(i) * 90) * 0.012 : 0));
    g.translate(sx * 0.05, 0, 0);
    return mergeC([tint(g, "#ece3cf"), tint(box(0.1, 0.07, 0.056, sx * 0.05, -0.02, 0), "#b3171f")]);
  };
  const bagL = prop(half(-1), bagM);
  const bagR = prop(half(1), bagM);
  const pageBig = prop(new PlaneGeometry(0.42, 0.5), pageM);
  const chip = prop(prepSmooth(ball(0.065, 0, 0, 0, 1.3, 0.3, 1, 8, 5)), chipM);
  // ink spray: ivory droplets thrown off the nib on each stroke
  const DROPS = 28;
  const dropG = new SphereGeometry(0.012, 5, 4);
  const drops = new InstancedMesh(dropG, inkM, DROPS);
  drops.frustumCulled = false;
  rig.add(drops);
  geos.push(dropG);

  const out = {
    ok: true,
    root,
    head,
    tipR: new Vector3(),
    tipL: new Vector3(),
    mouth: new Vector3(),
    mouthOpen: 0,
    pageAt: new Vector3(),
    noteAt: new Vector3(),
    cuffAt: new Vector3(), // where the chain's cuff sits (the right wrist)
    set: setLook,
    showCostume(v) {
      costume.visible = v;
      for (const c of cuffs) c.visible = v;
    },
    hideProps(keepPage = false) {
      for (const m of [cover, pageQ, pen, penPocket, bagL, bagR, chip]) m.visible = false;
      pageBig.visible = keepPage && pageBig.visible;
      drops.visible = false;
    },
    // the picture has broken: the pup is itself again, holding the real page up to the lens
    afterBreak(t, cam) {
      root.updateWorldMatrix(true, true);
      const PR = rig.position;
      this.aim(flipR, -1, PAGEHOLD);
      this.aim(flipL, 1, LREST);
      this.tip(flipR, out.tipR);
      root.updateWorldMatrix(true, true);
      this.hideProps(true);
      pageBig.visible = true;
      W.copy(out.tipR).add(V.set(0.12, 0.24, 0.08));
      pageBig.position.copy(W);
      V.copy(cam.position).sub(PR).sub(pageBig.position);
      pageBig.quaternion.setFromUnitVectors(Z, V.normalize());
      const away = 1 - sm(T.reveal + 2.0, T.reveal + 2.6, t);
      pageBig.scale.setScalar(1.55 * Math.max(away, 0.01));
      pageBig.visible = away > 0.02;
      flipR.localToWorld(out.cuffAt.set(0.3, 0.02, 0)).sub(PR);
    },
    // the pup's own flipper, aimed at a target in the rig frame; mirror frames handled here
    aim(flip, side, target) {
      V.copy(target).add(rig.position);
      rear.worldToLocal(V);
      if (side < 0) V.x = -V.x;
      V.sub(flip.position).normalize();
      flip.quaternion.setFromUnitVectors(X, V);
    },
    tip(flip, out2) {
      flip.updateWorldMatrix(true, false);
      flip.localToWorld(out2.set(0.6, 0.02, 0));
      return out2.sub(rig.position);
    },
    tick(t, cam, mouthW) {
      // the pup's pose first (D.jsx wrote it this frame); matrices must be current for the world conversions
      root.updateWorldMatrix(true, true);
      const PR = rig.position;
      const act = t >= T.reach[0] - 0.6;
      const notebook = t < T.bag[0] - 0.05;
      // ---- targets (rig frame) ----
      // the left flipper (screen right): rest, out to Ryuk with the apple, the pen to the page, the bag, the chip
      let rt = RREST;
      const apple = ease.out(sm(T.reach[0], T.reach[1], t)) * (1 - sm(T.take + 0.35, T.take + 0.95, t));
      let lt = TMP_L.copy(LREST).lerp(MEET, apple);
      // writing: the pen whips across the page in four strokes, with a lift between
      const w0 = sm(T.write[0] - 0.45, T.write[0] - 0.1, t) * (1 - sm(T.write[3] + 0.5, T.write[3] + 1.1, t));
      if (w0 > 0) {
        let sx = -0.13;
        let sy = 0.1;
        for (let i = 0; i < 4; i++) {
          const s = clamp01((t - T.write[i]) / 0.34);
          if (s > 0 && s < 1) {
            sx = -0.13 + 0.26 * s;
            sy = 0.02 + 0.05 * Math.sin(Math.PI * s);
          } else if (t > T.write[i] && i === 3) sy = 0.14;
        }
        PEN.set(NOTE.x + sx + 0.06, NOTE.y + sy, NOTE.z + 0.07);
        lt = TMP_L.lerp(PEN, w0 * (1 - apple));
      }
      // the bag from the pocket, torn open across the chest; the page; then the chip to the mouth
      const bag = sm(T.bag[0], T.bag[0] + 0.45, t);
      const tear = sm(T.bag[1] - 0.2, T.bag[1] + 0.2, t);
      const lift = sm(T.page[0], T.page[1], t);
      const chipK = sm(T.crunch - 0.85, T.crunch - 0.12, t);
      if (bag > 0) {
        BAGAT.set(0.12, 0.68, 1.0);
        lt = TMP_L.lerp(V.copy(BAGAT).add(W.set(0.28 * tear, 0, 0)), bag * (1 - lift));
        rt = TMP_R.copy(RREST).lerp(V.copy(BAGAT).add(W.set(-0.55 * tear - 0.12, 0, 0.05)), bag * (1 - lift));
      }
      if (lift > 0) rt = TMP_R.copy(rt).lerp(PAGEHOLD, lift);
      if (chipK > 0 && mouthW) lt = TMP_L.copy(lt).lerp(V.copy(mouthW).sub(PR), chipK);
      if (notebook && act) rt = TMP_R.copy(NOTE).add(W.set(0, 0.03, 0));
      this.aim(flipL, 1, lt);
      this.aim(flipR, -1, rt);
      this.tip(flipL, out.tipL);
      this.tip(flipR, out.tipR);
      root.updateWorldMatrix(true, true);

      // ---- the head follows the story ----
      const look = sm(T.reach[0] - 0.3, T.reach[0] + 0.4, t) * (1 - sm(T.take + 0.7, T.take + 1.3, t));
      const down = sm(T.write[0] - 0.5, T.write[0] - 0.1, t) * (1 - sm(T.write[3] + 0.6, T.write[3] + 1.1, t));
      head.rotation.y += 0.55 * look;
      head.rotation.x += -0.22 * look + 0.2 * down;

      // ---- props ----
      const vis = (m, v) => (m.visible = v);
      const face = (m, at, up = 0.9, roll = 0) => {
        V.copy(cam.position).sub(PR).sub(at);
        V.y += up;
        V.normalize();
        m.quaternion.setFromUnitVectors(Y, V);
        if (roll) m.quaternion.multiply(Q.setFromAxisAngle(Y, roll));
      };
      // the notebook rides the right flipper's tip (open once the writing starts)
      if (act && notebook) {
        cover.position.copy(out.tipR).add(W.set(0.02, 0.04, 0.02));
        face(cover, cover.position, 0.7, 0.3);
        out.noteAt.copy(cover.position);
        vis(cover, true);
        const open = sm(T.write[0] - 0.4, T.write[0] - 0.1, t) * (1 - sm(T.bag[0] - 0.3, T.bag[0], t));
        vis(pageQ, open > 0.02);
        pageQ.position.copy(cover.position).addScaledVector(V.set(0, 1, 0).applyQuaternion(cover.quaternion), 0.022);
        pageQ.quaternion.copy(cover.quaternion);
        pageQ.scale.set(Math.max(open, 0.01), 1, Math.max(open, 0.01));
        page.set(linesAt(t), strikesAt(t));
        cover.scale.setScalar(Math.max(1 - sm(T.bag[0] - 0.35, T.bag[0] - 0.05, t), 0.01));
      } else {
        vis(cover, false);
        vis(pageQ, false);
      }
      // the pen: in the pocket, then in the left flipper, then gone with the notebook
      const penOut = t >= T.write[0] - 0.5 && t < T.bag[0];
      vis(penPocket, !penOut && t < T.write[0] - 0.5 && act);
      if (penPocket.visible) {
        rear.localToWorld(penPocket.position.set(0.34, 0.26, 0.7));
        penPocket.position.sub(PR);
        penPocket.rotation.set(0, 0, 0.35);
      }
      vis(pen, penOut);
      if (penOut) {
        pen.position.copy(out.tipL).add(W.set(0.0, 0.03, 0.0));
        V.copy(out.noteAt).sub(pen.position).add(W.set(0, 0.01, 0));
        pen.quaternion.setFromUnitVectors(X, V.lengthSq() > 1e-6 ? V.normalize() : X);
      }
      // the spray of ink: ivory droplets thrown on each stroke
      drops.visible = t > T.write[0] && t < T.write[3] + 0.7;
      if (drops.visible) {
        for (let i = 0; i < DROPS; i++) {
          const d = t - (T.write[i % 4] + 0.14);
          if (d < 0 || d > 0.5) {
            D.position.set(0, -50, 0);
            D.scale.setScalar(0.0001);
          } else {
            D.position.set(out.noteAt.x + 0.02 + (hash(i, 1) - 0.3) * d * 1.1, out.noteAt.y + 0.06 + (0.6 + hash(i, 2)) * d * 1.2 - 3.2 * d * d, out.noteAt.z + (hash(i, 3) - 0.5) * d * 0.8);
            D.scale.setScalar(1 - d * 1.6);
          }
          D.rotation.set(0, 0, 0);
          D.updateMatrix();
          drops.setMatrixAt(i, D.matrix);
        }
        drops.instanceMatrix.needsUpdate = true;
      }
      // the chip bag: in both flippers' grip, torn into two halves that drop away
      const bagOn = t >= T.bag[0] && t < T.bag[1] + 0.9;
      vis(bagL, bagOn);
      vis(bagR, bagOn);
      if (bagOn) {
        const fall = sm(T.bag[1] + 0.1, T.bag[1] + 0.9, t);
        bagL.position.copy(out.tipR).add(W.set(0.03, -0.02 - 0.6 * fall, 0.04));
        bagR.position.copy(out.tipL).add(W.set(-0.03, -0.02 - 0.6 * fall, 0.04));
        face(bagL, bagL.position, 0.3, 0);
        face(bagR, bagR.position, 0.3, 0);
        bagL.scale.setScalar(Math.max(bag, 0.01));
        bagR.scale.setScalar(Math.max(bag, 0.01));
      }
      // the page: out of the bag, then held UP to the camera in the right flipper
      const pageOn = t >= T.bag[1] - 0.1;
      vis(pageBig, pageOn);
      if (pageOn) {
        const pop = ease.back(clamp01((t - (T.bag[1] - 0.1)) / 0.4));
        W.copy(out.tipR).add(V.set(0.12, 0.24, 0.08));
        pageBig.position.lerpVectors(PAGEMID, W, lift);
        V.copy(cam.position).sub(PR).sub(pageBig.position);
        pageBig.quaternion.setFromUnitVectors(Z, V.normalize());
        pageBig.scale.setScalar(Math.max(pop, 0.01) * (1 + 0.55 * lift));
        out.pageAt.copy(pageBig.position);
        page.set(4, 3);
      }
      // the chip: in the left flipper, up to the mouth
      vis(chip, t >= T.page[1] - 0.2 && t < T.crunch + 0.02);
      if (chip.visible) {
        chip.position.copy(out.tipL).add(W.set(0, 0.04, 0.03));
        chip.rotation.set(0.4, t * 2, 0.3);
        chip.scale.setScalar(Math.max(sm(T.page[1] - 0.2, T.page[1], t), 0.01));
      }
      out.mouthOpen = chipK > 0.85 && t < T.crunch + 0.5 ? 1 : 0;
      flipR.localToWorld(out.cuffAt.set(0.3, 0.02, 0)).sub(PR);
    },
    dispose() {
      setLook(false);
      for (const tw of twins.values()) tw.dispose();
      for (const m of [shirtM, tieM, sleeveM, ringM, pageM, coverM, penM, bagM, chipM, inkM]) m.dispose();
      for (const g of geos) g.dispose();
      page.dispose();
      costume.removeFromParent();
      for (const c of cuffs) c.removeFromParent();
      for (const m of [cover, pageQ, pen, penPocket, bagL, bagR, pageBig, chip, drops]) m.removeFromParent();
      drops.dispose();
    },
    pageSet: page.set,
  };
  return out;
}
