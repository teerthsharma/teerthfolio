// p-epsilon-hollow CAST: the crow (bible 3.10, easter egg 4). One 3D cel crow, span 0.5 m, body #0e0d12, rim gold (the hull ink is #ffb524),
// lifts off the maw at 20.0 s and arcs 2 s into the eye. Flap on twos: wing angle = 0.75 sin(2 pi 3 ts), ts the stepped time.
// Path: quadratic Bezier P(u) = (1-u)^2 P0 + 2(1-u)u P1 + u^2 P2, P0 the maw, P1 = P0 + 4 m up + 3 m toward the eye, P2 = eye direction x 55 m.
// Heading follows P'(u) = 2(1-u)(P1-P0) + 2u(P2-P1); scale 1 -> 0.35 (it dives into the distance, into the eye).
// Seal-local metres. Defaults are assumptions; override with scene.cast = { maw:[x,y,z], eye:[x,y,z] } (the world layer owns the real maw and eye).
export function buildCrow(ctx, mk) {
  const { THREE } = ctx;
  const BODY = ["#0e0d12", "#050408"], O = { ink: "#ffb524", lineMul: 0.85 };
  const g = new THREE.Group();
  const body = mk(new THREE.SphereGeometry(0.09, 12, 8).scale(0.8, 0.7, 1.6), ...BODY, O);
  const head = mk(new THREE.SphereGeometry(0.05, 10, 8), ...BODY, O); head.position.set(0, 0.03, 0.16);
  const beak = mk(new THREE.ConeGeometry(0.018, 0.07, 6).rotateX(Math.PI / 2), "#1a1820", "#08070b", O); beak.position.set(0, 0.025, 0.23);
  const tail = mk(new THREE.ConeGeometry(0.05, 0.16, 5).rotateX(-Math.PI / 2), ...BODY, O); tail.position.set(0, 0, -0.2);
  const ws = new THREE.Shape(); // one wing, 0.25 m: the pair spans 0.5 m
  ws.moveTo(0, 0.07); ws.lineTo(0.25, 0.03); ws.lineTo(0.2, -0.04); ws.lineTo(0.1, -0.02); ws.lineTo(0.05, -0.09); ws.lineTo(0, -0.07);
  const wg = new THREE.ExtrudeGeometry(ws, { depth: 0.012, bevelEnabled: false }).rotateX(Math.PI / 2);
  const wingR = new THREE.Group(), wingL = new THREE.Group();
  wingR.add(mk(wg, ...BODY, O));
  wingL.add(mk(wg.clone().scale(-1, 1, 1), ...BODY, O));
  wingR.position.set(0.05, 0.04, 0.02); wingL.position.set(-0.05, 0.04, 0.02);
  g.add(body, head, beak, tail, wingR, wingL);
  g.visible = false; ctx.setLayer(g, 1);
  const P0 = new THREE.Vector3(...(ctx.scene.cast?.maw ?? [-3.6, 0.9, 6.5]));
  const dir = new THREE.Vector3(...(ctx.scene.cast?.eye ?? [0.3, 0.5, 0.8])).normalize();
  const P2 = dir.clone().multiplyScalar(55), P1 = P0.clone().add(new THREE.Vector3(0, 4, 0)).addScaledVector(dir, 3);
  const p = new THREE.Vector3(), d = new THREE.Vector3(), e = new THREE.Vector3();
  return {
    group: g,
    update(t, t0) { // t0 = lift-off time (20.0)
      const u = (t - t0) / 2;
      if (u < 0 || u > 1) { g.visible = false; return; }
      g.visible = true;
      const a = 1 - u;
      p.copy(P0).multiplyScalar(a * a).addScaledVector(P1, 2 * a * u).addScaledVector(P2, u * u);
      d.copy(P1).sub(P0).multiplyScalar(2 * a).add(e.copy(P2).sub(P1).multiplyScalar(2 * u)).normalize();
      g.position.copy(p); g.lookAt(p.x + d.x, p.y + d.y, p.z + d.z);
      g.scale.setScalar(1 - 0.65 * u);
      const f = 0.75 * Math.sin(2 * Math.PI * 3 * t);
      wingR.rotation.z = f; wingL.rotation.z = -f;
    },
    dispose() { g.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}
