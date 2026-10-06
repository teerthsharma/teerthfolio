// THE HORNED CORAL SHELL (bible 3.5) with a pre-scored crack decal (shell-shatter).
// LAW: the hero is never covered. The shell is a dome of 24 spherical plates (3 rings x 8 sectors) plus two flank horns.
// Every frame a plate (or horn) whose direction from the seal's chest lies within PEEL of the direction to the LENS is hidden,
// so the camera always looks through a window in the shell onto the seal; seen from the sides and behind it reads as the full
// opaque horned dome. Cel: opaque 2-tone coral, hull outline #5a1620; cracks are thin gold emissive ribbons that glow from f144.
//
//   plate centre p_i = ( -cos(phi) sin(th), cos(th), sin(phi) sin(th) )            (three's SphereGeometry parameterisation)
//   hidden  iff  dot( normalise(R_y(yaw) S p_i), normalise(cam - chest) ) > cos(PEEL)     S = dome ellipsoid (1.15, .95, 1.05)
//   a crack ribbon is parented to the plate it lies on: hidden with it.
const PEEL = (54 * Math.PI) / 180;

export function buildShell(ctx) {
  const { THREE, engine, sdf } = ctx, rng = ctx.rng("shell");
  const root = new THREE.Group();
  root.userData.layer = 1;
  const dome = new THREE.Group();
  root.add(dome);
  const fig = (geo, col, shade, line = 1.2) => engine.figure(sdf.painted(geo, sdf.paint(col, shade, { line })), { ink: "#5a1620", lineMul: 1.25, constant: true });
  const plates = [];
  const TH = [[0.0, 0.3], [0.3, 0.27], [0.57, 0.27]]; // theta0, dtheta in units of pi (the bottom 0.16 pi stays open)
  const N = 8;
  for (let r = 0; r < TH.length; r++) {
    for (let s = 0; s < N; s++) {
      const phi0 = (s / N) * Math.PI * 2, dphi = (Math.PI * 2) / N, th0 = TH[r][0] * Math.PI, dth = TH[r][1] * Math.PI;
      const geo = new THREE.SphereGeometry(1, 6, 4, phi0 + dphi * 0.03, dphi * 0.94, th0 + dth * 0.02, dth * 0.96);
      // lit #ffa285 / shadow #d9483f; the lowest ring takes the deep #8f2230 under the horn base and rim
      const m = fig(geo, r === 2 ? "#ff7a6b" : (s % 2 ? "#ffa285" : "#ff8f78"), r === 2 ? "#8f2230" : "#d9483f");
      const g = new THREE.Group();
      g.add(m);
      const pm = phi0 + dphi / 2, tm = th0 + dth / 2;
      g.userData.dir = new THREE.Vector3(-Math.cos(pm) * Math.sin(tm), Math.cos(tm), Math.sin(pm) * Math.sin(tm));
      plates.push(g);
      dome.add(g);
    }
  }
  // horns: r 0.2 x h 0.95 (bible, at s=1.55), low on the flanks, swept out; base on the dome
  const horns = [];
  for (const side of [1, -1]) {
    const geo = new THREE.ConeGeometry(0.19, 0.9, 10).translate(0, 0.45, 0);
    const g = new THREE.Group();
    g.add(fig(geo, "#ffa285", "#8f2230", 1.3));
    g.position.set(side * 0.95, -0.2, 0);
    g.rotation.z = -side * 1.3;
    g.userData.dir = new THREE.Vector3(side, -0.1, 0);
    horns.push(g);
    dome.add(g);
  }
  // crack decal: 4 scored paths of 5 segments, climbing from the lower rim over the dome
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.3), toneMapped: false });
  const zAxis = new THREE.Vector3(0, 0, 1), yAxis = new THREE.Vector3(0, 1, 0), cracks = [];
  for (let p = 0; p < 4; p++) {
    let th = 0.62 * Math.PI, ph = (p / 4) * Math.PI * 2 + rng() * 0.6, prev = null;
    for (let k = 0; k < 6; k++) {
      th -= (0.07 + rng() * 0.07) * Math.PI;
      ph += (rng() - 0.5) * 0.5;
      const q = new THREE.Vector3(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)).multiplyScalar(1.012);
      if (prev) {
        const d = q.clone().sub(prev), len = d.length(), mid = prev.clone().add(q).multiplyScalar(0.5);
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, len), glow);
        seg.position.copy(mid);
        seg.quaternion.setFromUnitVectors(zAxis, d.normalize());
        seg.layers.set(1);
        let best = 0, bd = -2;
        const md = mid.clone().normalize();
        plates.forEach((pl, i) => { const dd = pl.userData.dir.dot(md); if (dd > bd) { bd = dd; best = i; } });
        plates[best].add(seg);
        cracks.push(seg);
      }
      prev = q;
    }
  }
  const S = new THREE.Vector3(1.15, 0.95, 1.05), tmp = new THREE.Vector3(), cd = new THREE.Vector3(), chest = new THREE.Vector3();
  const COS = Math.cos(PEEL);
  // st: { vis, gs (0..1 of the 1.55 form), power 0..1, crackGlow 0..1, yaw, t (stepped) }
  function update(st) {
    root.visible = st.vis;
    if (!st.vis) return;
    const sc = ctx.seal.scale, at = ctx.seal.at;
    // dome radii (0.89, 0.735, 0.81) m at gs = 1: unit sphere 0.775 times the ellipsoid S; shudder 1 + 0.03 sin(38 t) power
    const shudder = 1 + 0.03 * Math.sin(st.t * 38) * st.power;
    const k = 0.775 * st.gs * sc * shudder;
    dome.scale.set(S.x * k, S.y * k, S.z * k);
    root.position.set(at[0], at[1] + (0.36 + 0.56 * st.gs) * sc, at[2]);
    const yaw = ctx.seal.yaw + st.yaw;
    root.rotation.y = yaw;
    ctx.seal.chest(chest);
    cd.copy(ctx.player.camera.position).sub(chest).normalize();
    const hide = (g) => { tmp.copy(g.userData.dir).multiply(S).applyAxisAngle(yAxis, yaw).normalize(); g.visible = tmp.dot(cd) < COS; };
    for (const g of plates) hide(g);
    for (const g of horns) hide(g);
    // cracks glow from f144: colour above 1 so only the crack lines bloom (the seal never does); flicker on twos
    const e = st.crackGlow * (0.75 + 0.25 * Math.sin(st.t * 75));
    glow.color.setRGB(2.2 * e, 1.5 * e, 0.3 * e);
    for (const c of cracks) c.visible = st.crackGlow > 0.001;
  }
  const dispose = () => { root.traverse((o) => { o.geometry?.dispose?.(); }); glow.dispose(); };
  return { group: root, update, dispose };
}
