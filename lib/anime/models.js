// HERO MODELS, in code: SDF primitives -> one watertight mesh each (sdf.js).
// Metres, +y up, the figure faces +z. Every model shares the slime blob
// (centre [0, .22, 0]) so the seal -> slime -> Rimuru morph swaps meshes at a
// moment when both are the identical blob.
import { CylinderGeometry, Group, Mesh, SphereGeometry, TorusGeometry } from "three";
import { cone, ell, paint, painted, polygonize } from "./sdf.js";

export const BLOB = { c: [0, 0.22, 0], r: [0.3, 0.25, 0.3] };

const FUR = paint("#f3f5fb", "#8f9ce2");
const BELLY = paint("#fdfaf4", "#a99ddc");
const FLIP = paint("#d6dbe8", "#7480c6", { line: 1.1 });
const FACE = paint("#f6f7fc", "#95a0e4", { id: 2, bias: 0.5, line: 0.8 });
const NOSE = paint("#1a1622", "#1a1622", { id: 3, pri: 0.03, line: 0.6 });

// the pup: plump teardrop body, big round head, short muzzle. pose: "upright" | "prone"
export function sealPrims(pose = "upright") {
  if (pose === "prone") {
    return {
      prims: [
        ell([0, 0.2, -0.02], [0.25, 0.19, 0.4], FUR, 0.04),
        ell([0, 0.12, 0.05], [0.24, 0.1, 0.32], BELLY, 0.08),
        ell([0, 0.34, 0.34], [0.19, 0.17, 0.18], FACE, 0.12),
        ell([0, 0.3, 0.5], [0.085, 0.06, 0.07], FACE, 0.05),
        ell([0, 0.325, 0.565], [0.032, 0.02, 0.018], NOSE, 0.01),
        ell([0.27, 0.07, 0.14], [0.15, 0.028, 0.075], FLIP, 0.05, [0, 0.35, -0.3]),
        ell([-0.27, 0.07, 0.14], [0.15, 0.028, 0.075], FLIP, 0.05, [0, -0.35, 0.3]),
        ell([0.09, 0.13, -0.47], [0.1, 0.028, 0.13], FLIP, 0.05, [0, 0.45, 0]),
        ell([-0.09, 0.13, -0.47], [0.1, 0.028, 0.13], FLIP, 0.05, [0, -0.45, 0]),
      ],
      head: { pos: [0, 0.34, 0.34], fwd: [0, 0, 1], right: [1, 0, 0], r: 0.19 },
      eyes: [[0.08, 0.375, 0.495], [-0.08, 0.375, 0.495]],
      eyeRot: [-0.15, 0.32],
    };
  }
  return {
    prims: [
      ell([0, 0.3, 0], [0.26, 0.31, 0.24], FUR, 0.04),
      ell([0, 0.17, 0.03], [0.29, 0.18, 0.27], BELLY, 0.12),
      ell([0, 0.63, 0.04], [0.2, 0.18, 0.185], FACE, 0.14),
      ell([0, 0.575, 0.2], [0.09, 0.062, 0.07], FACE, 0.05),
      ell([0, 0.6, 0.262], [0.034, 0.021, 0.018], NOSE, 0.01),
      ell([0.26, 0.3, 0.08], [0.05, 0.15, 0.075], FLIP, 0.05, [0.2, 0, 0.45]),
      ell([-0.26, 0.3, 0.08], [0.05, 0.15, 0.075], FLIP, 0.05, [0.2, 0, -0.45]),
      ell([0.12, 0.035, -0.26], [0.11, 0.028, 0.14], FLIP, 0.05, [0, 0.5, 0]),
      ell([-0.12, 0.035, -0.26], [0.11, 0.028, 0.14], FLIP, 0.05, [0, -0.5, 0]),
    ],
    head: { pos: [0, 0.63, 0.04], fwd: [0, 0, 1], right: [1, 0, 0], r: 0.2 },
    eyes: [[0.085, 0.655, 0.2], [-0.085, 0.655, 0.2]],
    eyeRot: [0, 0.38],
  };
}

const SKIN = paint("#ffe8da", "#e0959c", { id: 2, bias: 0.5, line: 0.8 });
const HAND = paint("#ffe8da", "#e0959c", { line: 0.8 });
const HAIR = paint("#9ed6ff", "#4a6fd0", { id: 1, line: 1.1, pri: 0.004 });
const COAT = paint("#2a2c48", "#141230", { line: 1.1 });
const LINING = paint("#c9a440", "#7a4a18");
const SHIRT = paint("#f2f3f8", "#9aa2dc", { pri: 0.012 });
const PANTS = paint("#1f1f2e", "#0e0e1c");
const BOOT = paint("#3b2b25", "#1c1214");

// Rimuru, human form: 1.55 m, big-headed anime proportions, long sky-blue hair,
// gold eyes, dark coat with gold lining over a white shirt.
export function rimuruPrims() {
  const P = [
    ell([0, 1.375, 0.005], [0.108, 0.128, 0.112], SKIN, 0.02),
    ell([0, 1.3, 0.04], [0.06, 0.05, 0.06], SKIN, 0.05), // jaw / chin
    cone([0, 1.17, 0], [0, 1.28, 0.005], 0.042, 0.038, SKIN, 0.03),
    ell([0, 1.03, 0], [0.15, 0.19, 0.095], COAT, 0.05),
    ell([0, 1.08, 0.065], [0.06, 0.11, 0.035], SHIRT, 0.01),
    cone([0, 0.95, 0], [0, 0.52, -0.01], 0.13, 0.22, COAT, 0.06),
    cone([0.05, 1.12, 0.085], [0.12, 0.55, 0.19], 0.012, 0.016, LINING, 0.0),
    cone([-0.05, 1.12, 0.085], [-0.12, 0.55, 0.19], 0.012, 0.016, LINING, 0.0),
    cone([0.07, 0.62, 0], [0.08, 0.12, 0.02], 0.055, 0.04, PANTS, 0.03),
    cone([-0.07, 0.62, 0], [-0.08, 0.12, 0.02], 0.055, 0.04, PANTS, 0.03),
    ell([0.08, 0.055, 0.04], [0.05, 0.05, 0.09], BOOT, 0.03),
    ell([-0.08, 0.055, 0.04], [0.05, 0.05, 0.09], BOOT, 0.03),
    cone([0.16, 1.15, 0], [0.235, 0.93, 0.02], 0.05, 0.04, COAT, 0.04),
    cone([0.235, 0.93, 0.02], [0.22, 0.75, 0.08], 0.04, 0.036, COAT, 0.02),
    ell([0.22, 0.715, 0.09], [0.03, 0.045, 0.03], HAND, 0.02),
    cone([-0.16, 1.15, 0], [-0.235, 0.93, 0.02], 0.05, 0.04, COAT, 0.04),
    cone([-0.235, 0.93, 0.02], [-0.22, 0.75, 0.08], 0.04, 0.036, COAT, 0.02),
    ell([-0.22, 0.715, 0.09], [0.03, 0.045, 0.03], HAND, 0.02),
    // hair: cap set back so the face shows, long back fall, side locks, bangs
    ell([0, 1.425, -0.028], [0.122, 0.122, 0.118], HAIR, 0.01),
    ell([0, 1.16, -0.085], [0.135, 0.3, 0.055], HAIR, 0.06),
    cone([0.1, 1.42, 0.03], [0.115, 1.12, 0.05], 0.04, 0.012, HAIR, 0.02),
    cone([-0.1, 1.42, 0.03], [-0.115, 1.12, 0.05], 0.04, 0.012, HAIR, 0.02),
    cone([0.0, 1.52, 0.04], [0.0, 1.385, 0.118], 0.035, 0.008, HAIR, 0.015),
    cone([0.055, 1.51, 0.04], [0.065, 1.39, 0.11], 0.032, 0.008, HAIR, 0.015),
    cone([-0.055, 1.51, 0.04], [-0.065, 1.39, 0.11], 0.032, 0.008, HAIR, 0.015),
    cone([0.04, 1.2, -0.12], [0.07, 0.86, -0.12], 0.06, 0.012, HAIR, 0.04),
    cone([-0.04, 1.2, -0.12], [-0.07, 0.86, -0.12], 0.06, 0.012, HAIR, 0.04),
  ];
  return {
    prims: P,
    head: { pos: [0, 1.375, 0.005], fwd: [0, 0, 1], right: [1, 0, 0], r: 0.11 },
    eyes: [[0.042, 1.37, 0.1], [-0.042, 1.37, 0.1]],
  };
}

// Ainz's cloak, collar and staff, as SDF prims added to the upright pup
const CLOAK = paint("#221838", "#0c0820", { line: 1.2 });
const PURPLE = paint("#6a33b0", "#2c1060");
const GOLD = paint("#f0bf3c", "#a2561a", { line: 1.1 });
// Ainz's cloak, collar and staff, as extra SDF prims on the hero pup
export function ainzExtra() {
  return [
    cone([0, 0.52, -0.1], [0, 0.0, -0.16], 0.27, 0.4, CLOAK, 0.05),
    cone([0, 0.5, -0.07], [0, 0.03, -0.1], 0.25, 0.35, PURPLE, 0.0),
    cone([0.14, 0.5, -0.12], [0.27, 0.92, -0.2], 0.05, 0.012, GOLD, 0.03),
    cone([-0.14, 0.5, -0.12], [-0.27, 0.92, -0.2], 0.05, 0.012, GOLD, 0.03),
    cone([0.05, 0.5, -0.17], [0.09, 0.98, -0.26], 0.05, 0.012, GOLD, 0.03),
    cone([-0.05, 0.5, -0.17], [-0.09, 0.98, -0.26], 0.05, 0.012, GOLD, 0.03),
    ell([0, 0.47, -0.02], [0.3, 0.045, 0.26], GOLD, 0.03),
  ];
}

export function buildFigure(engine, spec, h = 0.014, o = {}) {
  const geo = polygonize(spec.prims, h, BLOB);
  const fig = engine.figure(geo, { head: spec.head, ...o });
  // eyes: separate unlit shapes so their edges stay crisp (vertex colours would blur them)
  const eyes = new Group();
  for (const [i, p] of (spec.eyes ?? []).entries()) {
    const big = o.eye ?? "#0c0d1c";
    const e = engine.prop(painted(new SphereGeometry(1, 20, 14), paint(big, big, { id: 3 })), 1);
    const sz = o.eyeSize ?? [0.036, 0.046, 0.016];
    e.scale.set(...sz);
    e.position.set(...p);
    e.rotation.set(spec.eyeRot?.[0] ?? 0, (i ? -1 : 1) * (spec.eyeRot?.[1] ?? 0.38), 0);
    const hl = engine.prop(painted(new SphereGeometry(1, 10, 8), paint("#ffffff", "#ffffff", { id: 3 })), 1);
    hl.scale.setScalar(0.3);
    hl.position.set(0.28, 0.35, 0.8);
    e.add(hl);
    if (o.pupil) {
      const pu = engine.prop(painted(new SphereGeometry(1, 12, 10), paint(o.pupil, o.pupil, { id: 3 })), 1);
      pu.scale.set(0.45, 0.62, 0.5);
      pu.position.set(0, -0.08, 0.62);
      e.add(pu);
      e.userData.pupil = pu;
    }
    eyes.add(e);
  }
  fig.add(eyes);
  fig.userData.eyes = eyes;
  fig.userData.geo = geo;
  return fig;
}

// the Staff of Ainz Ooal Gown, cartoon-simplified: gold shaft, ring, seven gems
export function staff(engine) {
  const g = new Group();
  const gold = paint("#f0bf3c", "#a2561a");
  const add = (geo, p, pos, rot) => { const m = engine.figure(painted(geo, p), { lineMul: 0.8 }); m.position.set(...pos); if (rot) m.rotation.set(...rot); g.add(m); return m; };
  add(new CylinderGeometry(0.018, 0.022, 0.9, 10), gold, [0, 0.45, 0]);
  add(new TorusGeometry(0.11, 0.018, 8, 28), gold, [0, 0.98, 0]);
  const gems = ["#ff3b3b", "#ffb02e", "#ffe14a", "#3ee07a", "#2ec5ff", "#4a5bff", "#c04bff"];
  gems.forEach((c, i) => { const a = (i / 7) * Math.PI * 2; add(new SphereGeometry(0.03, 12, 10), paint(c, "#2a1050"), [Math.cos(a) * 0.11, 0.98 + Math.sin(a) * 0.11, 0]); });
  const orb = engine.prop(painted(new SphereGeometry(0.05, 16, 12), paint("#c04bff", "#c04bff", { id: 3 })), 1);
  orb.position.set(0, 0.98, 0);
  orb.material.uniforms.uEmit.value.set(0.9, 0.3, 1.4);
  g.add(orb);
  g.userData.orb = orb;
  return g;
}

export { Mesh };
