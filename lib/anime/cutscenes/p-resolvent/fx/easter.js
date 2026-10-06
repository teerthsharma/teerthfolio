// EGG 2 (bible 7): one blue butterfly crossing the frame at 5.4 s (frame 130), from fierien.jpg's meadow.
// A camera-facing flat butterfly: body axis = screen vertical, the flap is the wing width |cos(phase)| on the 12 fps step (twos).
// Two flat polygons per wing: an ink outline (#1d3a7a) under the blue (#4a8fe0) with a pale inner band. Seal-cleared like every fx.
import { PAL, T, sstep, lerp, flatMat, pushFan } from "./common.js";

function wingGeo(THREE, k, tone) {
  // right wing outline (unit), fanned from the hinge; k scales it (the ink outline is 1.16x)
  const o = [[0.05, 0.1], [0.5, 0.78], [0.95, 0.72], [1.0, 0.18], [0.78, -0.1], [0.55, -0.62], [0.22, -0.55], [0.05, -0.1]].map((p) => [p[0] * k, p[1] * k, 0]);
  const pos = [], col = []; pushFan(pos, col, o, [0.05 * k, 0.05 * k, 0], tone);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export default function easter(ctx, S) {
  const THREE = ctx.THREE, group = new THREE.Group(); group.name = "easter";
  const cam = ctx.player?.camera;
  const bf = new THREE.Group(); group.add(bf);
  const inkG = wingGeo(THREE, 1.16, [1, 1, 1]), blueG = wingGeo(THREE, 1, [1, 1, 1]), bandG = wingGeo(THREE, 0.55, [1.35, 1.35, 1.3]);
  const inkM = flatMat(THREE, S, { color: PAL.butterflyInk, alpha: 1, vertexColors: true }), blueM = flatMat(THREE, S, { color: PAL.butterfly, alpha: 1, vertexColors: true });
  const bandM = flatMat(THREE, S, { color: PAL.butterfly, alpha: 1, vertexColors: true });
  const wing = (sx) => {
    const w = new THREE.Group();
    const a = new THREE.Mesh(inkG, inkM), b = new THREE.Mesh(blueG, blueM), c = new THREE.Mesh(bandG, bandM);
    a.position.z = 0.000; b.position.z = 0.002; c.position.z = 0.004; a.renderOrder = 12; b.renderOrder = 13; c.renderOrder = 14;
    w.add(a, b, c); w.scale.x = sx; return w;
  };
  const wl = wing(-1), wr = wing(1);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.5, 2, 6), flatMat(THREE, S, { color: PAL.butterflyInk, alpha: 1 }));
  body.renderOrder = 15;
  bf.add(wl, wr, body);
  const size = 0.22;
  function update(t, dt, cue) {
    const b0 = Number.isFinite(cue.since("butterfly")) ? cue.t - cue.since("butterfly") : null;
    const t0 = b0 === null ? T.butterfly[0] : b0, t1 = t0 + (T.butterfly[1] - T.butterfly[0]);
    const k = (t - t0) / (t1 - t0);
    bf.visible = k > 0 && k < 1;
    if (!bf.visible) return;
    const s = ctx.seal.at;
    // a lazy S-curve across the meadow, near the fountain side (+x of the seal), clear of the seal's own column of sight by sealClear
    const x = lerp(s[0] - 4.5, s[0] + 9, k), z = s[2] + 3.4 + 0.8 * Math.sin(k * 5);
    const y = s[1] + 1.35 + 0.45 * Math.sin(k * 9) + 0.25 * k;
    bf.position.set(x, y, z);
    if (cam) bf.quaternion.copy(cam.quaternion);
    bf.rotateZ(-0.35 + 0.2 * Math.sin(k * 7));
    const ph = Math.floor(t * 12) * 1.9;                        // flap: |cos| on the twos step
    const fl = 0.3 + 0.7 * Math.abs(Math.cos(ph));
    wl.scale.x = -fl; wr.scale.x = fl;
    const sc = size * sstep(0, 0.06, k) * (1 - sstep(0.94, 1, k));
    bf.scale.setScalar(Math.max(sc, 1e-4));
  }
  return { group, update, dispose() { [inkG, blueG, bandG, body.geometry].forEach((g) => g.dispose()); [inkM, blueM, bandM, body.material].forEach((m) => m.dispose()); } };
}
