// The Infinite Void in the rig frame: the live frame loop of 995cc0c moves/p-aether-lang.jsx, on tt = onTwos(sceneOf(t)).
import { Group, Mesh, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from "three";
import { gojo, glintSprite } from "../live/gojo.js";
import { SHARED } from "../live/cosmic.js";
import { CORE, SHELL_R, closingRing, coreSprite, flood, galaxy, krackle, nebulaShell, starField } from "../live/world.js";
import { BACK, CHEST, ENTER, GOJO, HIT, RADIUS, T, TL, onTwos, sceneOf, smooth } from "../clock.js";

const GALAXIES = [
  { at: [-40, 27, -108], size: 72, rot: [-0.7, 0, 0.5], a: [0.56, 0.36, 0.96], b: [0.92, 0.46, 0.86], arms: 2, seed: 3 },
  { at: [48, 14, -120], size: 58, rot: [-1.0, 0, -0.6], a: [0.4, 0.6, 1.0], b: [0.7, 0.5, 1.0], arms: 3, seed: 8 },
  { at: [10, 33, -128], size: 50, rot: [-0.55, 0, 0.1], a: [0.8, 0.7, 1.0], b: [0.5, 0.4, 0.95], arms: 2, seed: 15 },
];
const V = new Vector3(0, CHEST, 0);

function galaxyMesh(spec) {
  const x = galaxy(spec.a, spec.b, spec.arms, spec.seed);
  const mesh = new Mesh(x.g, x.m);
  mesh.rotation.set(...spec.rot);
  mesh.scale.setScalar(spec.size);
  mesh.renderOrder = -2.9;
  mesh.frustumCulled = false;
  return { ...x, mesh, spec };
}

function buildGojo() {
  const G = gojo();
  const root = new Group();
  const band = new Mesh(G.geo.band, G.mats.band);
  for (const o of [new Mesh(G.geo.body, G.mats.body), new Mesh(G.geo.skin, G.mats.skin), new Mesh(G.geo.hair, G.mats.hair), band]) {
    o.frustumCulled = false;
    root.add(o);
  }
  const eyes = [-1, 1].map((sd) => {
    const e = new Mesh(new SphereGeometry(0.03, 20, 14), new MeshBasicMaterial({ color: "#7fd8ff", toneMapped: false }));
    e.position.set(sd * 0.055, 1.925, 0.16);
    e.renderOrder = 15;
    e.visible = false;
    e.frustumCulled = false;
    root.add(e);
    return e;
  });
  const glint = glintSprite();
  const glints = [-1, 1].map((sd) => {
    const g = new Mesh(glint.g, glint.m.clone());
    g.position.set(sd * 0.055, 1.925, 0.2);
    g.rotation.y = 0.4;
    g.renderOrder = 20;
    g.visible = false;
    g.frustumCulled = false;
    root.add(g);
    return g;
  });
  return { root, band, eyes, glints, geos: [...Object.values(G.geo), glint.g], mats: [...Object.values(G.mats), ...eyes.map((e) => e.material), ...glints.map((g) => g.material), glint.m] };
}

export function buildVoid(ctx) {
  const nebula = nebulaShell(), stars = starField(), gal = GALAXIES.map(galaxyMesh), core = coreSprite(), fl = flood(), ring = closingRing(), kr = krackle();
  const group = new Group(), voidRig = new Group(), content = new Group();
  const shell = new Mesh(nebula.g, nebula.m);
  shell.position.set(0, CHEST, 0);
  shell.renderOrder = -3;
  shell.frustumCulled = false;
  const coreMesh = new Mesh(core.g, core.m);
  coreMesh.position.copy(CORE);
  coreMesh.scale.setScalar(34);
  coreMesh.renderOrder = -2.4;
  coreMesh.frustumCulled = false;
  const ringMesh = new Mesh(ring.g, ring.m);
  ringMesh.position.copy(CORE);
  ringMesh.scale.setScalar(5.4);
  ringMesh.renderOrder = -2.2;
  ringMesh.frustumCulled = false;
  stars.pts.renderOrder = -2.8;
  fl.mesh.renderOrder = -2.6;
  kr.mesh.renderOrder = -2.0;
  const G = buildGojo();
  content.add(...gal.map((x) => x.mesh), stars.pts, fl.mesh, coreMesh, ringMesh, kr.mesh, G.root);
  voidRig.add(shell, content);
  group.add(voidRig);

  let flow = 0, last = 0;
  const q0 = new Quaternion(), cen = new Vector3();
  const showing = (t) => t >= HIT.impact && t < BACK;
  const billboard = (m, cam, inv) => m.quaternion.multiplyQuaternions(inv, cam.quaternion);

  return {
    group, shell, gojo: G.root, showing,
    far: [shell, stars.pts, coreMesh, ...gal.map((x) => x.mesh), fl.mesh],
    update(t, cam) {
      const tt = onTwos(sceneOf(t));
      group.updateWorldMatrix(true, false);
      const frozen = smooth(T.freeze, T.freeze + 0.3, tt);
      flow += Math.max(0, t - last) * (1 - frozen);
      last = t;
      const px = ctx.engine.renderer.getPixelRatio();
      const r = RADIUS * smooth(TL.bloom[0], TL.bloom[1], tt);
      const contracting = tt >= T.rv;
      const S = contracting ? 0.0005 : 1;
      voidRig.visible = (r > 0.02 || contracting) && S > 0.002;
      voidRig.scale.setScalar(S);
      voidRig.position.copy(CORE).multiplyScalar(1 - S);
      const inside = r > group.worldToLocal(cam.position.clone()).distanceTo(V) + 0.3;
      const showVoid = inside || contracting;
      content.visible = showVoid;
      shell.scale.setScalar(showVoid ? SHELL_R : Math.max(r, 0.02));
      const fade = contracting ? 1 : smooth(T.fade[0], T.fade[1], tt);
      const CORE_W = group.localToWorld(CORE.clone());
      cen.copy(CORE).multiplyScalar(1 - S);
      cen.y += CHEST * S;
      const CENTRE_W = group.localToWorld(cen);
      const lock = smooth(T.ring[1] - 0.1, T.ring[1] + 0.05, tt) * (1 - 0.5 * smooth(T.ring[1] + 0.4, T.ring[1] + 1.0, tt));
      const burst = smooth(T.lock, T.lock + 0.12, tt) * (1 - smooth(T.lock + 0.12, T.lock + 0.9, tt));
      const pulse = frozen > 0.5 ? 0.5 : 0.5 + 0.5 * Math.sin(flow * 2.2);

      const nu = nebula.m.uniforms;
      nu.uTime.value = flow;
      nu.uCenter.value.copy(CENTRE_W);
      nu.uCore.value.copy(CORE_W);
      nu.uCell.value = 6 * px;
      nu.uLock.value = lock * 0.8;
      SHARED.uCore.value.copy(CORE_W);
      SHARED.uTime.value = flow;
      SHARED.uCell.value = 6 * px;
      SHARED.uSway.value = 1 - frozen * 0.97;
      SHARED.uLock.value = lock;
      const su = stars.m.uniforms;
      su.uDrift.value = flow;
      su.uPx.value = px;
      su.uFade.value = fade;
      for (const x of gal) {
        x.m.uniforms.uTime.value = flow;
        x.m.uniforms.uFade.value = fade;
        x.mesh.position.set(...x.spec.at);
      }
      const cu = core.m.uniforms;
      cu.uTime.value = flow;
      cu.uLock.value = lock;
      cu.uPulse.value = pulse;
      cu.uFade.value = fade;
      const fu = fl.m.uniforms;
      fu.uFlow.value = flow;
      fu.uLock.value = lock;
      fu.uFade.value = fade;
      const ku = kr.m.uniforms;
      ku.uTime.value = flow;
      ku.uBurst.value = burst;
      ku.uFade.value = fade;
      const ru = ring.m.uniforms;
      ru.uProg.value = smooth(T.ring[0], T.ring[1], tt);
      ru.uLock.value = lock;
      ru.uFade.value = fade;
      const inv = group.getWorldQuaternion(q0).invert();
      billboard(coreMesh, cam, inv);
      billboard(ringMesh, cam, inv);

      const gj = G.root;
      const inF = Math.floor((tt - TL.enter) * 12);
      gj.visible = inF >= 0 && showVoid;
      if (gj.visible) {
        const [sx, sy] = ENTER[inF] ?? [1, 1];
        const lean = smooth(TL.move[0], TL.move[1], tt) * 0.07;
        gj.position.set(GOJO.at[0], GOJO.at[1] + 0.03 * Math.sin(flow * 1.3), GOJO.at[2]);
        gj.scale.set(GOJO.scale * sx, GOJO.scale * sy, GOJO.scale * sx);
        const turn = smooth(T.freeze, T.freeze + 0.3, tt);
        gj.rotation.set(0, -0.4 + Math.PI * turn, 0.015 * Math.sin(flow * 2.0) + lean);
        const lift = smooth(T.lock, T.lock + 0.4, tt);
        G.band.position.y = 0.12 * lift;
        for (const e of G.eyes) e.visible = lift > 0.5;
      }
      const gk = smooth(TL.lineB, TL.lineB + 0.12, tt) * (1 - smooth(TL.lineB + 0.55, TL.lineB + 1.05, tt));
      const tw = 0.85 + 0.15 * Math.sin(tt * 26);
      for (const g of G.glints) {
        g.visible = gk > 0.01;
        g.material.uniforms.uK.value = gk * tw;
        g.scale.setScalar(0.55 * (0.6 + gk * 0.6));
      }

      return { flow, lock, fade };
    },
    dispose() {
      for (const g of [nebula.g, stars.g, core.g, fl.g, ring.g, ...gal.map((x) => x.g), ...G.geos]) g.dispose();
      for (const m of [nebula.m, stars.m, core.m, fl.m, ring.m, kr.m, ...gal.map((x) => x.m), ...G.mats]) m.dispose();
      kr.mesh.dispose();
    },
  };
}
