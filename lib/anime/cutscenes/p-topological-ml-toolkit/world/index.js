// WORLD layer for p-topological-ml-toolkit (Index / Accelerator vs Kakine): bright-overcast Academy City, pushed to dopamine cobalt.
// Bible: scripts/p-topological-ml-toolkit.md sections 2, 3.1-3.6, 3.13, 3.14, 7 (eggs 2, 3, 7). Layout is in the world frame of the old build:
// the seal at the origin facing -z, the plaza centred (0, 1), the viaduct at z = -17.8, hinges at z = 0, -22, -50, -82, the landmark at z = -122.
//
// WHAT IS WHERE
//   layer 0 (the plate, baked per shot): the calm overcast sky dome, the grass island (the pocket the city stands on and returns to).
//   layer 1 (redrawn every step, alpha id 0.62 so the composite keeps it): the whole city (bloom -> storm -> fold -> vanish are
//           vertex-shader functions of the stepped clock, see stage.js), its ink hull, the live storm/erase sky, the far skylines,
//           the shell wave, the train, the LEVEL 6 sign.
//
// CUES READ (all optional: each falls back to the bible's own frame times, converted at 24 fps)
//   bloom (0, 1.2)  storm (2.0, dur 3.5)  train (3.58)  flip (4.17, 0.25)  seize (5.8, 1.2)  pop (10.33, 0.95)  fold (10.42, 0.88)  vanish (11.29, 0.29)
//   They are looked up in scene.beats by name; the layer never needs the player to fire them.
import { CanvasTexture, Group, Mesh, PlaneGeometry, RingGeometry, SRGBColorSpace } from "three";
import { Acc } from "./geo.js";
import { applyStage, makeStageUniforms, stageAt, timeline } from "./stage.js";
import { cityMaterial, flatMaterial, hullMaterial, mapMaterial } from "./materials.js";
import { bakedSky, liveSky, skylines } from "./sky.js";
import { buildCity, buildTrain } from "./city.js";

function labelTex(text, fg, bg, w, h, px) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#1d3f9a"; g.lineWidth = Math.max(4, h * 0.06); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
  g.fillStyle = fg; g.font = `900 ${px}px Impact, "Arial Black", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + px * 0.04);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export default function build(ctx) {
  const { engine } = ctx, group = new Group(), TL = timeline(ctx.scene), U = makeStageUniforms();
  const L1 = (o) => { o.userData.layer = 1; return o; };
  const disposables = [];

  // ---- layer 0: calm sky on the plate, grass island under the city ----
  const sky0 = bakedSky(ctx); group.add(sky0);
  const grassAcc = new Acc();
  grassAcc.add(new PlaneGeometry(900, 900).rotateX(-Math.PI / 2).translate(0, -0.03, 0), { kind: 7, col: "#8fc6a4", shade: "#3c7a68", cen: [0, 0], xw: 0, y0: 0, y1: 0 });
  const grassGeo = grassAcc.build(), mat = cityMaterial(engine, U);
  const grass = new Mesh(grassGeo, mat); grass.frustumCulled = false; grass.userData.layer = 0; group.add(grass);

  // ---- layer 1: the city and its ink ----
  const cityGeo = buildCity(ctx), hullMat = hullMaterial(engine, U);
  const city = L1(new Mesh(cityGeo, mat)); city.frustumCulled = false;
  const hull = L1(new Mesh(cityGeo, hullMat)); hull.frustumCulled = false; hull.renderOrder = -1;
  group.add(city, hull);

  // ---- the train (bible 3.4): runs +x along the viaduct, torn off at the `train` beat (the cast/fx layers take it from there) ----
  const trainGeo = buildTrain(), train = new Group(); L1(train);
  const tc = new Mesh(trainGeo, mat), th = new Mesh(trainGeo, hullMat); tc.frustumCulled = th.frustumCulled = false; th.renderOrder = -1;
  train.add(tc, th);
  const plateTex = labelTex("M-1", "#1d3f9a", "#f4fbff", 128, 64, 44);          // EASTER EGG 7: the train plate
  if (plateTex) { const p = new Mesh(new PlaneGeometry(0.7, 0.35), mapMaterial(plateTex)); p.position.set(-1.6, -0.35, 0.89); train.add(p); disposables.push(plateTex, p.material, p.geometry); }
  train.visible = false; group.add(train);

  // ---- EASTER EGG 3: a mirrored LEVEL 6 sign on the bottom-left tower, flipping forward at f100 as the vectors reverse ----
  const signTex = labelTex("LEVEL 6", "#ffffff", "#1d3f9a", 512, 128, 92);
  const signRoot = new Group(); L1(signRoot); let sign = null;
  if (signTex) {
    sign = new Mesh(new PlaneGeometry(7, 1.75), mapMaterial(signTex));
    signRoot.add(sign); signRoot.position.set(-31.45, 12, 8); signRoot.rotation.y = Math.PI / 2;
    disposables.push(signTex, sign.material, sign.geometry);
  }
  signRoot.visible = false; group.add(signRoot);

  // ---- the shell wave of shot 1: a white ring over a #9fd0ff ring riding the bloom front ----
  const ringW = L1(new Mesh(new RingGeometry(0.975, 1, 160).rotateX(-Math.PI / 2), flatMaterial("#f6fbff")));
  const ringB = L1(new Mesh(new RingGeometry(0.93, 1, 160).rotateX(-Math.PI / 2), flatMaterial("#9fd0ff")));
  for (const r of [ringW, ringB]) { r.position.y = 0.22; r.frustumCulled = false; r.visible = false; group.add(r); disposables.push(r.material, r.geometry); }

  // ---- the live sky (storm wall 2.0-5.5 s, erase wave from the pop) and the far skylines ----
  const sky1 = liveSky(); group.add(sky1);
  const cards = skylines(ctx, group);

  const seal = ctx.seal, L = engine.shared.uLightDir.value;
  const trainStart = TL.bloom.t + 1.2, bloomEnd = TL.bloom.t + TL.bloom.dur;

  return {
    group,
    update(t) {
      const S = stageAt(t, TL);
      applyStage(U, S, t);

      // contact shadow (bible 3.14): one hard #2a3a8a ellipse, 1.1x the pup width, offset along the shadow direction
      const sp = seal?.group?.position, H = seal?.height ?? 1, az = Math.atan2(-L.z, -L.x);
      const rz = 0.34 * H * 1.1, rx = rz * 1.5;
      U.uShadow.value.set((sp?.x ?? 0) - L.x * 0.2 * H, (sp?.z ?? 0) - L.z * 0.2 * H, rx, rz);
      U.uShadowB.value.set(Math.cos(az), Math.sin(az), 0, 0);

      // sky: the live dome draws only while it differs from the calm plate sky
      sky1.visible = S.stormLive || S.wave > 0;
      const su = sky1.material.uniforms; su.uTc.value = t; su.uStorm.value = S.storm; su.uWave.value = S.wave;

      // far skylines rise with the bloom, fold away at the vanish (bottom edge pinned at y = -3.5)
      for (const c of cards) { const k = S.skylineK; c.visible = k > 0.01; c.scale.y = Math.max(k, 1e-3); c.position.y = c.userData.baseY - 43.5 * (1 - k); }

      // shell wave
      ringW.visible = ringB.visible = S.ringOn && S.front < 238;
      ringW.scale.setScalar(Math.max(S.front, 0.01)); ringB.scale.setScalar(Math.max(S.front * 1.012, 0.01));

      // train: x = -24 + 10 (t - t0) m/s along the deck, visible until it is torn off
      train.visible = t >= trainStart && t < TL.train.t;
      if (train.visible) train.position.set(-24 + 10 * (t - trainStart), 6.85, -17.8);

      // LEVEL 6: mirrored (seen from behind) until the flip, then facing the plaza
      if (sign) { signRoot.visible = t >= bloomEnd && !S.folding; sign.rotation.y = S.flip; }
    },
    dispose() {
      cityGeo.dispose(); trainGeo.dispose(); grassGeo.dispose(); mat.dispose(); hullMat.dispose();
      for (const d of disposables) d.dispose?.();
      for (const c of cards) c.userData.dispose?.();
      sky0.userData.target?.dispose(); sky0.material?.dispose(); sky0.geometry?.dispose();
      sky1.material.dispose(); sky1.geometry.dispose();
    },
  };
}
