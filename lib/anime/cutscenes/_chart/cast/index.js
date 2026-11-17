// CAST for _chart (layer 1): two costumed seals behind the hero at two depths. The near one overlaps the hero's silhouette
// on screen, so the line pass draws an occlusion edge between two characters; both cast shadows onto the ground and stones.
export default function build(ctx) {
  const { THREE, engine, kit, scene } = ctx;
  const group = new THREE.Group();
  const extras = scene.set.extras.map((e) => {
    const s = kit.costumedSeal(engine, { ...kit.COSTUMES[e.costume], scale: e.scale });
    s.place(e.at[0], e.at[1], e.at[2], e.yaw);
    group.add(s.group);
    return s;
  });
  return {
    group,
    update(t) {
      extras.forEach((s, i) => { s.update(t); s.body.position.y += 0.005 * Math.sin(t * 2.4 + i * 1.9); });
    },
    dispose() { for (const s of extras) s.dispose(); },
  };
}
