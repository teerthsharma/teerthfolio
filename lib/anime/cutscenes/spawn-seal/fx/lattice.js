// spawn-seal FX / lattice: filament-lattice (bible 3.12, FX 6): the hidden topology reveal and the three territories.
// Cues read: "lattice" (331/24 = 13.8 s; nodes ignite, edges draw on 6 f each, triangles fill, loop draws then breathes, sectors bloom),
//            "beams" (nodes flash gold as their beam lands, 10.0 s + 0.12 i), "maw" (eaten from 26.79 s).
// Nodes: scene.crystals (array of 7 [x,y,z]) when the direction layer supplies it, else the bible ring r 6.5 m at 0,51,103,154,206,257,309 deg.
import { GLSL_NOISE, mat, VERT_STD, VERT_BILL, ageOf, clamp01, sealPoint, eatTheta, eaten, MAW_T0, MAW_LOCAL } from "./common.js";

export default function lattice(ctx) {
  const { THREE, seal } = ctx, group = new THREE.Group(), disposables = [];
  const deg = [0, 51, 103, 154, 206, 257, 309];
  let nodes = (ctx.scene.crystals && ctx.scene.crystals.length === 7) ? ctx.scene.crystals.map((p) => new THREE.Vector3(...p))
    : deg.map((d) => new THREE.Vector3(Math.cos(d * Math.PI / 180) * 6.5, 0.9, Math.sin(d * Math.PI / 180) * 6.5));
  // order around the pool: sort by angle about the centroid (so the 7-cycle is the outer ring)
  const ctr = nodes.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / 7);
  nodes = nodes.map((p) => ({ p, a: Math.atan2(p.z - ctr.z, p.x - ctr.x) })).sort((x, y) => x.a - y.a).map((o) => o.p);
  // one-scale Rips on the 7-ring: ring edges (the hidden 1-cycle) + chords (0,2),(2,4),(4,6) -> three filled triangles (0,1,2),(2,3,4),(4,5,6).
  const ring = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]], chords = [[0, 2], [2, 4], [4, 6]], tris = [[0, 1, 2], [2, 3, 4], [4, 5, 6]];
  const edges = [...ring, ...chords];   // draw order: near neighbours first
  const GOLD = new THREE.Color("#ffd23a"), LOOP = new THREE.Color("#fff3b0");

  // edges as 0.04 m tubes: unit cylinder, base at the origin, scaled along y by (length * progress)
  const eGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 6).translate(0, 0.5, 0), eMat = new THREE.MeshBasicMaterial({ color: GOLD, fog: false, toneMapped: false });
  const eMeshes = edges.map(([i, j]) => {
    const a = nodes[i], b = nodes[j], m = new THREE.Mesh(eGeo, eMat), d = b.clone().sub(a);
    m.position.copy(a); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); m.userData.len = d.length();
    m.scale.set(1, 0.0001, 1); m.visible = false; group.add(m); return m;
  });
  // triangles: 18% alpha gold fills
  const triPos = []; tris.forEach((tr) => tr.forEach((k) => triPos.push(nodes[k].x, nodes[k].y, nodes[k].z)));
  const tGeo = new THREE.BufferGeometry(); tGeo.setAttribute("position", new THREE.Float32BufferAttribute(triPos, 3));
  const tMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false, toneMapped: false });
  const triMesh = new THREE.Mesh(tGeo, tMat); triMesh.visible = false; group.add(triMesh);
  // THE loop: closed Catmull-Rom through the 7 nodes, 0.09 m core #fff3b0 + additive halo #ffb35a (breathing 0.7 + 0.3 sin(2 pi t / 1.5))
  const curve = new THREE.CatmullRomCurve3([...nodes], true, "catmullrom", 0.2);
  const SEG = 140, lGeo = new THREE.TubeGeometry(curve, SEG, 0.09, 6, true), hGeo = new THREE.TubeGeometry(curve, SEG, 0.3, 8, true);
  const lMat = new THREE.MeshBasicMaterial({ color: LOOP, fog: false, toneMapped: false });
  const hMat = mat(THREE, {
    additive: true, side: THREE.DoubleSide, vert: VERT_STD, uniforms: { uB: { value: 0 } },
    frag: /* glsl */ `uniform float uB; varying vec3 vW; varying vec3 vN;                   // halo: hard 2-level rim, no soft falloff
      void main(){ vec3 v=normalize(cameraPosition-vW); float f=abs(dot(normalize(vN),v)); float a=(f>.5?.42:.2)*uB; gl_FragColor=vec4(1.,.70,.35,a); }` });
  const loopMesh = new THREE.Mesh(lGeo, lMat), haloMesh = new THREE.Mesh(hGeo, hMat); loopMesh.visible = haloMesh.visible = false; haloMesh.renderOrder = 10; group.add(loopMesh, haloMesh);
  const perSegL = lGeo.index.count / SEG, perSegH = hGeo.index.count / SEG;

  // node halos: billboard hard-banded discs (cyan #3fdcff -> gold #ffd23a on ignition), 3 levels
  const nProto = mat(THREE, {
    additive: true, depthTest: true, vert: VERT_BILL, uniforms: { uSize: { value: 0.7 }, uG: { value: 0 }, uF: { value: 0 } },
    frag: /* glsl */ `uniform float uG,uF; varying vec2 vP; void main(){ float r=length(vP); if(r>1.) discard;
      vec3 cy=vec3(.25,.86,1.), go=vec3(1.,.82,.23); vec3 c=mix(cy,go,uG); float l = r<.35?1.:(r<.65?.55:.22); gl_FragColor=vec4(c,l*.6*uF); }`,
  });
  const nGeo = new THREE.PlaneGeometry(2, 2), nHalos = nodes.map((p) => {
    const m = new THREE.Mesh(nGeo, nProto.clone()); m.material.uniforms = { uSize: { value: 0.7 }, uG: { value: 0 }, uF: { value: 0 } };
    m.position.copy(p); m.renderOrder = 10; group.add(m); return m;
  });

  // territories: disc r 14, three 120-degree sectors on ONE sphere read: memory cyan #3fdcff, files gold #ffc83a, scheduler pink #ff4fa0, ~0.55 alpha.
  // sector s blooms at b0 = s*0.55 s: radial front = easeOut(b/.7)*14; hard 3-level bands behind the front, a pale seam between sectors.
  const terMat = mat(THREE, {
    vert: VERT_STD, uniforms: { uA: { value: -1 }, uPulse: { value: 0 } },
    frag: /* glsl */ `${GLSL_NOISE} uniform float uA,uPulse; varying vec3 vW;
      void main(){ float r=length(vW.xz); if(r>14.||uA<0.) discard;
        float ang=atan(vW.z,vW.x); float u=fract(ang/6.2831853+1.); float s=floor(u*3.);
        float b=uA-s*.55; float front=(1.-pow(1.-clamp(b/.7,0.,1.),3.))*14.; if(r>front) discard;
        vec3 cy=vec3(.25,.86,1.), go=vec3(1.,.78,.23), pk=vec3(1.,.31,.63);
        vec3 c= s<.5?cy:(s<1.5?go:pk);
        float lv = r>front-.5 ? 1.15 : (r>front-1.4?.9:.72); c*=lv;
        float f3=fract(u*3.); float seam=step(f3,.006)+step(.994,f3); c=mix(c,vec3(1.,.95,.69),clamp(seam,0.,1.));
        float a=.55*step(1.6,r)*(1.-.25*uPulse); a*=1.-smoothstep(12.,14.,r); gl_FragColor=vec4(c,a); }`,
  });
  terMat.polygonOffset = true; terMat.polygonOffsetFactor = -2;
  const terGeo = new THREE.CircleGeometry(14, 96).rotateX(-Math.PI / 2), ter = new THREE.Mesh(terGeo, terMat); ter.position.y = 0.06; ter.renderOrder = 2; group.add(ter);

  disposables.push(eGeo, eMat, tGeo, tMat, lGeo, hGeo, lMat, hMat, nProto, nGeo, terGeo, terMat);
  const mawC = new THREE.Vector3(), c0 = new THREE.Vector3();
  return {
    group,
    update(t, dt, cue) {
      const a = ageOf(cue, t, "lattice", 331 / 24), ma = ageOf(cue, t, "maw", MAW_T0), th = eatTheta(ma);
      sealPoint(seal, THREE, ...MAW_LOCAL, mawC); seal.chest(c0);
      const on = a >= 0, beam0 = ageOf(cue, t, "beams", 240 / 24);
      nHalos.forEach((m, i) => {
        const ba = beam0 - i * 0.12, u = m.material.uniforms;
        const flash = ba >= 0 && ba < 1.9 ? clamp01(ba / 0.1) : 0;        // gold while its beam lands
        u.uG.value = Math.max(flash, on ? clamp01((a - i * 0.12) / 0.2) : 0);
        u.uF.value = (on || ba >= 0) ? 0.55 + 0.45 * Math.sin(t * Math.PI * 2 * 1.2 + i) : 0; // pulse 1.2 Hz
        u.uSize.value = 0.7 + 0.12 * Math.sin(t * Math.PI * 2 * 1.2 + i);
        m.visible = u.uF.value > 0.01 && !eaten(m.position, c0, mawC, th);
      });
      // edges draw on 6 f each (0.25 s) in near-neighbour order, after the nodes ignite (0.9 s)
      eMeshes.forEach((m, k) => {
        const p = clamp01((a - 0.9 - k * 0.25) / 0.25);
        m.visible = p > 0 && !eaten(m.position, c0, mawC, th); m.scale.y = Math.max(m.userData.len * p, 1e-4);
      });
      const tt = clamp01((a - 0.9 - eMeshes.length * 0.25) / 0.6);   // triangles fill after all edges: 18% gold
      tMat.opacity = 0.18 * tt; triMesh.visible = tt > 0 && th < 0.3;
      const lp = clamp01((a - 0.9 - ring.length * 0.25) / 0.9);       // the loop draws, then breathes
      loopMesh.visible = haloMesh.visible = lp > 0 && th < 0.3;
      lGeo.setDrawRange(0, Math.floor(SEG * lp) * perSegL); hGeo.setDrawRange(0, Math.floor(SEG * lp) * perSegH);
      hMat.uniforms.uB.value = 0.7 + 0.3 * Math.sin(Math.PI * 2 * t / 1.5);
      const sa = a - (0.9 + ring.length * 0.25 + 0.4);                 // territories bloom sector by sector once the loop closes
      terMat.uniforms.uA.value = sa; terMat.uniforms.uPulse.value = 0.5 + 0.5 * Math.sin(Math.PI * 2 * t / 1.5);
      ter.visible = sa > 0 && th < 0.55;
    },
    dispose() { disposables.forEach((d) => d.dispose && d.dispose()); nHalos.forEach((m) => m.material.dispose()); },
  };
}
