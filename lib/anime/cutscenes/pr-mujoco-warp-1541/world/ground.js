// NAMEK GROUND (bible 3.2 sea, 3.3 ground): the turquoise sea to the horizon, the grass island under the playfield, painted rock spires,
// and the five-arm ground fissure decal revealed at the crack (layer 1, cutout).
//
//  island  CylinderGeometry r 9 (flared to 9.6) centred on the floor centre, top y = 0, wall down to the sea (y = -1.3). surface() shade:
//          grass: three value masses from fbm (lit #58d4e0 above 0.58, shadow #2a8f9c below 0.38, deep #1d6676 in rare pockets), hard
//          edges only; brushGrass strokes modulate (root darker, tip lit); cast shadow = blobShadow(rocks) + the analytic floor-cell
//          bars: a gutter point P is shadowed if P + sunXZ * d (d = 0.025, 0.055, 0.086 m, i.e. 0.04 m / tan 25 deg) lies in a cell.
//          Violet cast during the charge: c = mix(c, c * (.82,.72,1.05), 0.45 uPow).
//          cliff wall: vertical brush bands #3fb8c0 / #1d6676 / deep #103a4a, a #e9f7a8 foam line at the waterline.
//  sea     CircleGeometry r 360 at y = -1.2: horizontal streak = fbm(vec2(x*0.05 + s, z*1.3)) split at 0.5 into #2fa88a / #1d7a74,
//          streaks slide on threes (s = 0.25 * floor(t*8)/8), sun glitter dashes cream toward the suns, haze posterised into 4 bands.
//  rocks   16 kit stones (spires 0.6..1.8 m) at r 6.2..8.4 round the floor centre (clear of the soldier ring at 4.6 and the commander sector),
//          stoneMaterial in the bible rock ramp, 2 px #103a4a ink hull, blobshadow occluders.
//  fissure 5 arms (the five-minute countdown egg), meander y += (fbm(2.2x)-0.5)*0.5, width 0.085*(1-along)^.8 + 0.012, one fork per arm;
//          colour: inside deep #103a4a with a #ffd84a seam fading with uGlow, lip #58d4e0 on the sun side / #1d6676 away, 1.2 px #103a4a edge;
//          arms reach 3.6..4.4 m, revealed over 6 frames on twos; a scorched crater lip at r 1.05.
import { CircleGeometry, CylinderGeometry, Mesh, PlaneGeometry } from "three";
import { surface } from "../../../kit/surface.js";
import { stones, stoneMaterial, occluderList } from "../../../kit/stones.js";
import { inkHull } from "../../../kit/inkline.js";
import { occluders } from "../../../tools/blobshadow.js";
import { V, FLOOR, SUN, sm, sealSpots } from "./common.js";

const SUN_GLSL = SUN.map((v) => v.toFixed(4)).join(", ");

export function buildGround(ctx, U) {
  const { THREE, engine } = ctx;
  const R = ctx.rng(11);
  const sh = engine.shared;
  const group = new THREE.Group(), anim = new THREE.Group();
  anim.userData.layer = 1;
  group.add(anim);

  // ---- rocks (placed first: the island shader wants their occluders) ----
  const list = [];
  const fcx = FLOOR.cx, fcz = FLOOR.cz;
  const commanderAng = Math.atan2(-1, -1);                                   // behind, camera-left
  let guard = 0;
  while (list.length < 16 && guard++ < 400) {
    const a = R() * Math.PI * 2, r = 6.2 + R() * 2.2;
    if (Math.abs(Math.atan2(Math.sin(a - commanderAng), Math.cos(a - commanderAng))) < 0.5) continue;
    const x = fcx + Math.cos(a) * r, z = fcz + Math.sin(a) * r;
    if (list.some((o) => Math.hypot(o.at[0] - x, o.at[2] - z) < 1.6)) continue;
    const h = 0.6 + R() * R() * 1.2 + (R() < 0.3 ? 0.5 : 0);                // spires 0.6..1.8 m, mostly short
    const w = 0.55 + 0.4 * R();
    list.push({ size: [w, h / 0.67, w * (0.8 + 0.4 * R())], at: [x, 0, z], seed: 3 + list.length * 7, flat: 0.15 + 0.35 * R(), sink: 0.2 + 0.1 * R(), detail: 2 });
  }
  const rockMesh = new Mesh(stones(list, 0.55), stoneMaterial(sh, { top: "#8fe8e8", light: "#3fb8c0", mid: "#2a8f9c", shadow: "#1d6676", crack: "#103a4a", bounce: "#35b6a4", id: 0.5 }));
  inkHull(rockMesh, sh, { col: "#103a4a", px: 2, id: 0.5 });
  group.add(rockMesh);

  // ---- island ----
  const islandGeo = new CylinderGeometry(9, 9.6, 1.3, 96, 1).translate(fcx, -0.65, fcz);
  const islandMat = surface(sh, /* glsl */ `
    uniform float uCellOn; uniform float uPow;
    const vec2 FC = vec2(${fcx.toFixed(3)}, ${fcz.toFixed(3)});
    float inCell(vec2 q) {
      vec2 g = (q - FC) / 0.3 + 10.5, id = floor(g + 0.5), f = (g - id) * 0.3;
      return step(max(abs(f.x), abs(f.y)), 0.0955) * step(0.0, id.x) * step(id.x, 21.0) * step(0.0, id.y) * step(id.y, 21.0);
    }
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      vec3 L = normalize(vec3(${SUN_GLSL}));
      vec3 c;
      if (N.y < 0.6) {                                                    // the cliff wall
        float a = atan(P.z - FC.y, P.x - FC.x);
        float bands = fbm(vec2(a * 60.0, P.y * 2.2));
        c = mix(${V("#1d6676")}, ${V("#3fb8c0")}, step(0.5, dot(N, L) * 0.5 + 0.5 + (bands - 0.5) * 0.3));
        c = mix(c, ${V("#103a4a")}, step(P.y, -0.62) * step(0.45, bands));
        c = mix(c, ${V("#58d4e0")}, step(-0.1, P.y));                      // grass lip
        float foam = step(P.y, -1.02 + (fbm(vec2(a * 40.0, 3.0)) - 0.5) * 0.12);
        c = mix(c, ${V("#e9f7a8")}, foam);
        return mix(c, c * vec3(0.82, 0.72, 1.05), uPow * 0.45);
      }
      vec2 w = P.xz;
      float mass = fbm(w * 0.35), mass2 = fbm(w * 1.1 + 7.0);
      c = ${V("#35b6a4")};
      c = mix(c, ${V("#58d4e0")}, step(0.58, mass));
      c = mix(c, ${V("#2a8f9c")}, step(mass, 0.38));
      c = mix(c, ${V("#1d6676")}, step(mass2, 0.2) * step(mass, 0.45));
      vec3 bg = brushGrass(w, 0.5, 0.12, 3.0);
      c = mix(c, c * (0.82 + 0.4 * bg.x), bg.y * 0.55);                 // brush strokes: root darker, tip catches the light
      float shd = blobShadow(P + vec3(0.0, 0.05, 0.0), L);
      vec2 sx = normalize(L.xz);
      float cs = max(inCell(w + sx * 0.025), max(inCell(w + sx * 0.055), inCell(w + sx * 0.086))) * uCellOn;
      c = mix(c, ${V("#1d6676")}, max(step(0.5, shd), cs) * 0.85);
      return mix(c, c * vec3(0.82, 0.72, 1.05), uPow * 0.45);
    }`, { tools: ["noise", "brushgrass", "blobshadow"], uniforms: { ...occluders(occluderList(list)), uCellOn: U.cellOn, uPow: U.pow } });
  group.add(new Mesh(islandGeo, islandMat));

  // ---- sea ----
  const seaGeo = new CircleGeometry(360, 72).rotateX(-Math.PI / 2).translate(0, -1.2, 0);
  const seaMat = surface(sh, /* glsl */ `
    uniform float uS; uniform float uPow;
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      vec2 w = P.xz;
      float st = fbm(vec2(w.x * 0.05 + uS, w.y * 1.3));
      vec3 c = mix(${V("#1d7a74")}, ${V("#2fa88a")}, step(0.5, st));
      float st2 = fbm(vec2(w.x * 0.2 - uS * 1.4, w.y * 3.5 + 11.0));
      c = mix(c, ${V("#6fd0a0")}, step(0.72, st2) * 0.7);
      vec2 toSun = normalize(vec2(0.5, -0.85)), rel = w - cameraPosition.xz;
      float gl = step(0.8, fbm(vec2(w.x * 0.08, w.y * 2.2))) * step(0.55, dot(normalize(rel), toSun));
      c = mix(c, ${V("#e9f7a8")}, gl);                                    // sun glitter dashes
      float hz = floor(smoothstep(40.0, 320.0, length(rel)) * 4.0) / 4.0;  // posterised aerial haze
      c = mix(c, ${V("#b7ec9c")}, hz);
      return mix(c, c * vec3(0.82, 0.72, 1.05), uPow * 0.45);
    }`, { tools: ["noise"], uniforms: { uS: U.sea, uPow: U.pow } });
  const sea = new Mesh(seaGeo, seaMat);
  sea.frustumCulled = false;
  group.add(sea);

  // ---- fissure decal (layer 1, cutout) ----
  const [sx, , sz] = sealSpots(ctx)[0];
  const decalGeo = new PlaneGeometry(9.2, 9.2).rotateX(-Math.PI / 2);
  const decalMat = surface(sh, /* glsl */ `
    uniform float uReveal; uniform float uGlow; uniform vec2 uCtr;
    float gD; float gY; float gS;
    const vec2 SXZ = normalize(vec2(${SUN[0].toFixed(4)}, ${SUN[2].toFixed(4)}));
    void arm(vec2 q, float ang, float len, float seed) {
      vec2 dir = vec2(cos(ang), sin(ang)), prp = vec2(-dir.y, dir.x);
      float x = dot(q, dir), y = dot(q, prp);
      y += (fbm(vec2(x * 2.2, seed)) - 0.5) * 0.5 * smoothstep(0.0, 1.5, x);          // meander
      float along = x / max(len, 1e-3);
      float w = 0.085 * pow(max(1.0 - along, 0.0), 0.8) + 0.012;                     // tapers to the tip
      float d = max(abs(y) - w, max(-x, x - len));
      if (d < gD) { gD = d; gY = y; gS = dot(prp, SXZ); }
    }
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      vec2 q = P.xz - uCtr;
      float r = length(q);
      gD = 1e3; gY = 0.0; gS = 0.0;
      for (int k = 0; k < 5; k++) {                                                   // five arms: the five-minute countdown
        float fk = float(k);
        float a = 0.35 + fk * 1.2566 + (h21(vec2(fk, 9.0)) - 0.5) * 0.35;
        float Ln = (3.6 + 0.8 * h21(vec2(fk, 4.0))) * uReveal;
        arm(q, a, Ln, fk * 3.1);
        float r0 = 1.2 + 0.3 * fk;                                                    // one fork per arm
        vec2 o = vec2(cos(a), sin(a)) * r0;
        arm(q - o, a + (mod(fk, 2.0) < 1.0 ? 0.6 : -0.6), 1.3 * uReveal * step(r0, Ln), fk * 5.7 + 2.0);
      }
      float cr = 1.05 * uReveal;                                                      // scorched crater lip
      float inScorch = 1.0 - step(cr, r);
      float lipBand = step(cr - 0.08, r) * (1.0 - step(cr, r));
      if (gD > 0.05 && inScorch < 0.5) discard;
      vec3 c;
      if (gD <= 0.0) {
        c = ${V("#103a4a")};
        float core = 1.0 - smoothstep(0.0, 0.025, abs(gY));                           // thin gold seam along the centreline
        c = mix(c, ${V("#ffd84a")}, core * uGlow);
      } else if (gD < 0.012) {
        c = ${V("#103a4a")};                                                          // 1.2 px ink edge
      } else if (gD < 0.05) {
        c = gY * gS > 0.0 ? ${V("#58d4e0")} : ${V("#1d6676")};                        // crater lip, sun side lit
      } else {
        c = mix(${V("#1d6676")}, ${V("#58d4e0")}, lipBand);                           // scorch and its lip
      }
      return c;
    }`, { tools: ["noise"], uniforms: { uReveal: U.reveal, uGlow: U.glowC, uCtr: { value: new THREE.Vector2(sx, sz) } } });
  decalMat.polygonOffset = true; decalMat.polygonOffsetFactor = -2; decalMat.polygonOffsetUnits = -2;
  const decal = new Mesh(decalGeo, decalMat);
  decal.position.set(sx, 0.014, sz); decal.frustumCulled = false;
  anim.add(decal);

  return {
    group,
    update(ts, cue, T) {
      const since = ts - T.tc;
      U.reveal.value = since < 0 ? 0 : Math.min(1, Math.floor(since * 12 + 1) / 6);  // 6 frames on twos
      U.glowC.value = since < 0 ? 0 : 1 - sm(0.4, 1.8, since);
      decal.position.y = 0.014 + 0.062 * U.cellOn.value;                              // above the cells until they are gone
    },
    dispose() {
      for (const g of [islandGeo, seaGeo, decalGeo, rockMesh.geometry]) g.dispose();
      for (const m of [islandMat, seaMat, decalMat, rockMesh.material]) m.dispose();
    },
  };
}
