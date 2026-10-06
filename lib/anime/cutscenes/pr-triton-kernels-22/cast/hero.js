// HERO decals for the demon seal (Sukuna's marks on the LOCKED seal, bible section 4 "Hero: demon seal").
// Nothing here edits the pup: every part is a child of seal.body via seal.attach(). All fills are MeshBasicMaterial with values
// well under 1, so nothing here can reach the bloom threshold (the seal stays out of bloom, lit luma <= 0.92).
//
// Face (head ellipsoid c=(0,.555,.03) r=(.27,.245,.255)); a decal at (x,y) sits at z = cz + rz sqrt(1-u^2-v^2), u=(x-cx)/rx, v=(y-cy)/ry.
// Magic Eyes of Destruction: the anime eye decal (iris disc gradient, slit pupil, 2 hard highlights, lash) in red #c8081c, ring-dark limbus.
export default function buildHero(ctx, ev) {
  const { THREE, seal, kit } = ctx;
  const HEAD = { c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] };
  const root = new THREE.Group();
  const ink = new THREE.MeshBasicMaterial({ color: "#0e0b0d", side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const red = new THREE.MeshBasicMaterial({ color: "#c8081c", side: THREE.DoubleSide });
  const flat = (w, h, x, y, rz, mat = ink, lift = 0.006) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat), f = kit.faceOnHead(HEAD, x, y, lift);
    m.position.copy(f.p); m.lookAt(f.p.clone().add(f.n)); m.rotateZ(rz); m.renderOrder = 3; root.add(m); return m;
  };
  // four black stripes, two each side of the muzzle (4 px), and the forehead stripe pair
  for (const s of [1, -1]) { flat(0.075, 0.009, s * 0.175, 0.505, s * 0.12); flat(0.065, 0.009, s * 0.17, 0.478, s * 0.18); }
  flat(0.009, 0.06, 0.045, 0.69, 0.1); flat(0.009, 0.06, -0.045, 0.69, -0.1);
  // the Magic Eyes decal (red ring iris, slit pupil)
  const eyes = kit.eyePair(HEAD, { style: "slit", iris: "#c8081c", irisLo: "#7a0410", pupilCol: "#0e0b0d", lash: "#0e0b0d" });
  root.add(eyes);
  // grin lines (barrage): two short cheek arcs, 1 drawing in, off outside the barrage
  const grin = new THREE.Group();
  for (const s of [1, -1]) { const a = flat(0.05, 0.007, s * 0.2, 0.43, s * -0.5); root.remove(a); grin.add(a); }
  root.add(grin);
  // the four-eyed mark: two small slits under the eyes, ONE drawing on the Cleave (easter egg 2, 16.3 s)
  const four = new THREE.Group();
  for (const s of [1, -1]) { const a = flat(0.05, 0.012, s * 0.122, 0.5, s * 0.25, red, 0.007); root.remove(a); four.add(a); }
  root.add(four);
  // red sash 6 cm about the waist (the kimono's sash; the belly decal stays the locked one)
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.026, 8, 40), red);
  sash.rotation.x = Math.PI / 2; sash.scale.set(1.04, 0.9, 1); sash.position.y = 0.185; root.add(sash);
  seal.attach(root, 1);

  return {
    group: root,
    update(t) {
      const tF = ev("flick", 7.5), tB = ev("barrage", 8.1), tC = ev("cleave", 16.3), tX = ev("flex", 18.0);
      // Beat 1 half-lidded red; beat 2 wide slit; barrage grin lines, mouth slightly open; flex calm
      let n = "calm", k = 1;
      if (t >= tX) n = "calm"; else if (t >= tB) n = "smug"; else if (t >= tF) { n = "neutral"; k = 1; }
      eyes.userData.set(n, k);
      grin.visible = t >= tB && t < tX;
      four.visible = t >= tC && t < tC + 1 / 12;
      sash.visible = true;
    },
    dispose() { eyes.userData.dispose?.(); ink.dispose(); red.dispose(); root.traverse((o) => o.geometry?.dispose?.()); },
  };
}
