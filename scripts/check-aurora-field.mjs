/**
 * Aurora field contract.
 *
 * Asserted against lib/aurora-field.js, which is the code the browser runs —
 * not a parallel reference model. There is no shipped-vs-tested gap here to
 * drift apart.
 *
 * The spec these assertions come from is docs/research/aurora-field-math.md.
 * Assertion ids (A1..A25) are the rows of its table in section 6.
 *
 * One deliberate departure from the brief that commissioned this file. The
 * brief asks for a negative control in which an over-large timestep makes the
 * norm blow up. For a split-step integrator no such timestep exists: both
 * substeps are multiplication by a unit-modulus phase, so the norm is conserved
 * at every step size including absurd ones, and a control that waited for norm
 * blow-up would pass for the wrong reason forever. The control is split in two
 * instead (A11, A12): forward Euler on the same right-hand side, which is
 * unconditionally unstable and does grow the norm — proving the norm assertion
 * can detect instability at all — and split-step past its accuracy bound, which
 * is caught on energy and on spectral decoherence rather than on norm.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AURORA_ARC_REPEATS,
  AURORA_BOX,
  AURORA_CAMERA_SKY,
  AURORA_CARRIER_NORM,
  AURORA_CARRIER_UV,
  AURORA_CARRIER_UV_B,
  AURORA_CARRIER_UV_C,
  AURORA_EMISSION_LINES,
  AURORA_FRAGMENT_SHADER,
  AURORA_LAYOUT,
  AURORA_PHYSICS,
  AURORA_RENDER,
  AURORA_SHELL_ELEVATION,
  AURORA_TIERS,
  auroraFilamentPitch,
  auroraFringePitch,
  auroraShellAltitudeToScreenY,
  auroraShellPitch,
  auroraStabilityBound,
  auroraStationSky,
  horizontalFov,
  cieLineDisplayRgb,
  createAuroraField,
  fft2,
  photopicEfficiency,
  scotopicEfficiency,
  srgbLuminance,
} from "../lib/aurora-field.js";
import { solvePolarCameraComposition } from "../lib/polar-camera-composition.js";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world.js";

const failures = [];
let checked = 0;

function contract(id, label, body) {
  checked += 1;
  try {
    body();
  } catch (error) {
    failures.push(`${id} ${label}: ${error.message.split("\n")[0]}`);
  }
}

const relative = (value, reference) => Math.abs(value - reference) / Math.abs(reference || 1);
const maxAbs = (array) => array.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);

// ---------------------------------------------------------------------------
// A1, A2 — the transform. A mis-normalised inverse and a mis-strided 2D pass
// are the two silent defects that every later assertion would inherit, so they
// are established before anything is evolved.
// ---------------------------------------------------------------------------

function seededPair(count, salt) {
  const re = new Float64Array(count);
  const im = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    re[i] = Math.sin((i + 1) * 12.9898 + salt) * 43758.5453;
    im[i] = Math.sin((i + 1) * 78.233 + salt * 3) * 12345.6789;
    re[i] -= Math.floor(re[i]);
    im[i] -= Math.floor(im[i]);
    re[i] = re[i] * 2 - 1;
    im[i] = im[i] * 2 - 1;
  }
  return { im, re };
}

contract("A1", "Parseval holds for the 2D transform at both aspect ratios", () => {
  for (const [nx, ny] of [
    [64, 64],
    [128, 16],
    [256, 32],
  ]) {
    const { re, im } = seededPair(nx * ny, 7);
    let real = 0;
    for (let i = 0; i < re.length; i += 1) real += re[i] * re[i] + im[i] * im[i];
    fft2(re, im, nx, ny, -1);
    let spectral = 0;
    for (let i = 0; i < re.length; i += 1) spectral += re[i] * re[i] + im[i] * im[i];
    assert.ok(
      relative(spectral / (nx * ny), real) < 1e-12,
      `${nx}x${ny}: |x|^2=${real} vs |X|^2/N=${spectral / (nx * ny)}`,
    );
  }
});

contract("A2", "forward then inverse transform is the identity", () => {
  const nx = 128;
  const ny = 16;
  const { re, im } = seededPair(nx * ny, 11);
  const re0 = Float64Array.from(re);
  const im0 = Float64Array.from(im);
  fft2(re, im, nx, ny, -1);
  fft2(re, im, nx, ny, 1);
  let worst = 0;
  for (let i = 0; i < re.length; i += 1) {
    worst = Math.max(worst, Math.abs(re[i] - re0[i]), Math.abs(im[i] - im0[i]));
  }
  assert.ok(worst < 1e-12, `round trip drifted by ${worst}`);
});

// ---------------------------------------------------------------------------
// A3, A4, A9 — norm. The single highest-value assertion: a wrong sign on the
// kinetic exponent survives it, but a k^2 multiplied instead of phased, an
// unnormalised inverse, and a mis-indexed transform all die here.
// ---------------------------------------------------------------------------

const evolutionConfig = {
  g: AURORA_PHYSICS.g,
  nSat: AURORA_PHYSICS.nSat,
  nx: 128,
  ny: 16,
  seed: 20260808,
  trapOmega: AURORA_PHYSICS.trapOmega,
};

contract("A3", "norm is conserved under the full nonlinear update", () => {
  const field = createAuroraField(evolutionConfig);
  const before = field.norm();
  for (let i = 0; i < 400; i += 1) field.step(AURORA_PHYSICS.dt);
  assert.ok(before > 0, "seeded field must carry norm");
  assert.ok(
    relative(field.norm(), before) < 1e-12,
    `norm moved by ${relative(field.norm(), before)} over 400 steps`,
  );
});

contract("A4", "norm conservation does not depend on the timestep", () => {
  const bound = auroraStabilityBound(createAuroraField(evolutionConfig));
  const field = createAuroraField(evolutionConfig);
  const before = field.norm();
  for (let i = 0; i < 400; i += 1) field.step(bound.dtMax * 20);
  assert.ok(
    relative(field.norm(), before) < 1e-12,
    `norm moved by ${relative(field.norm(), before)} at 20x the accuracy bound`,
  );
});

contract("A9", "the nonlinear substep is exactly a phase", () => {
  const field = createAuroraField(evolutionConfig);
  const before = Float64Array.from(field.density());
  field.kick(AURORA_PHYSICS.dt);
  const after = field.density();
  let worst = 0;
  for (let i = 0; i < after.length; i += 1) worst = Math.max(worst, Math.abs(after[i] - before[i]));
  assert.ok(worst < 1e-14, `density moved by ${worst} under a pure phase kick`);
});

// ---------------------------------------------------------------------------
// A5 — energy. The claim is not that the error is small, it is that it is
// BOUNDED: a symmetric splitting is symplectic, so it conserves a modified
// Hamiltonian exactly and the energy error oscillates instead of accumulating.
// The structural half of this (no secular growth) is the part that is
// timestep-independent and is therefore the part worth asserting hardest.
// ---------------------------------------------------------------------------

// Normalised by the energy SCALE (sum of the magnitudes of the kinetic, trap
// and nonlinear terms), never by the total. The focusing term is negative and
// nearly cancels the kinetic one, so the total passes close to zero and a bound
// divided by it measures the denominator instead of the integrator. See
// field.energyScale().
function energyBand(field, steps, dt) {
  const start = field.energy();
  const scale = field.energyScale();
  let firstHalf = 0;
  let secondHalf = 0;
  for (let i = 0; i < steps; i += 1) {
    field.step(dt);
    const drift = Math.abs(field.energy() - start) / scale;
    if (i < steps / 2) firstHalf = Math.max(firstHalf, drift);
    else secondHalf = Math.max(secondHalf, drift);
  }
  return { firstHalf, peak: Math.max(firstHalf, secondHalf), secondHalf };
}

const ENERGY_BAND_CEILING = 5e-3;

// Symplecticity is a statement about an AUTONOMOUS Hamiltonian, so the energy
// assertions freeze the fold phases. With them moving the Hamiltonian is
// explicitly time-dependent and the energy genuinely changes, because the
// moving trap does work on the field -- that is physics, not integrator error,
// and asserting conservation there would be asserting the wrong thing.
// Measured: 1.9e-3 band with the folds frozen, 8.8e-1 with them driven at the
// trap frequency. AURORA_PHYSICS.folds runs adiabatically for that reason.
const staticConfig = {
  ...evolutionConfig,
  folds: AURORA_PHYSICS.folds.map((fold) => ({ ...fold, omega: 0 })),
};

contract("A5", "energy stays in a band and does not drift secularly", () => {
  const band = energyBand(createAuroraField(staticConfig), 400, AURORA_PHYSICS.dt);
  assert.ok(
    band.peak < ENERGY_BAND_CEILING,
    `energy band ${band.peak} exceeds ${ENERGY_BAND_CEILING}`,
  );
  assert.ok(
    band.secondHalf < band.firstHalf * 2.5 + 1e-9,
    `energy is drifting, not oscillating: ${band.firstHalf} then ${band.secondHalf}`,
  );
});

// ---------------------------------------------------------------------------
// A6, A7, A8 — ground truth against closed forms. A6 catches a wrong overall
// scale on the Laplacian. A7 catches the two bugs A3 cannot see: the sign of
// the kinetic exponent (the packet runs backwards) and an unwrapped
// wavenumber index (the upper half of the spectrum gets the wrong k, so the
// packet moves at the wrong speed).
// ---------------------------------------------------------------------------

const FREE = { g: 0, nSat: AURORA_PHYSICS.nSat, trapOmega: 0 };

function moments(field) {
  const density = field.density();
  const { h, nx, ny } = field;
  let mass = 0;
  let mx = 0;
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const value = density[j * nx + i];
      mass += value;
      mx += value * (i * h);
    }
  }
  const centroid = mx / mass;
  let second = 0;
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const dx = i * h - centroid;
      second += density[j * nx + i] * dx * dx;
    }
  }
  return { centroid, mass, width: Math.sqrt(second / mass) };
}

contract("A6", "a free Gaussian spreads at the analytic rate", () => {
  const sigma0 = 0.5;
  const nx = 64;
  const ny = 64;
  const field = createAuroraField({
    ...FREE,
    initial: (x, y, box) => {
      const dx = x - box.lx / 2;
      const dy = y - box.ly / 2;
      return [Math.exp(-(dx * dx + dy * dy) / (2 * sigma0 * sigma0)), 0];
    },
    lx: 2 * Math.PI,
    ly: 2 * Math.PI,
    nx,
    ny,
  });
  const w0 = moments(field).width;
  assert.ok(relative(w0, sigma0 / Math.SQRT2) < 5e-3, `initial width ${w0} vs ${sigma0 / Math.SQRT2}`);
  const dt = 1e-4;
  const steps = 1500;
  for (let i = 0; i < steps; i += 1) field.step(dt);
  const t = dt * steps;
  const expected = (sigma0 / Math.SQRT2) * Math.sqrt(1 + (t * t) / sigma0 ** 4);
  const measured = moments(field).width;
  assert.ok(
    relative(measured, expected) < 5e-3,
    `spread ${measured} vs analytic ${expected} at t=${t}`,
  );
});

contract("A7", "a wave packet translates at its group velocity", () => {
  const sigma0 = 0.5;
  const carrier = 4; // integer: exactly periodic on lx = 2*pi
  const field = createAuroraField({
    ...FREE,
    initial: (x, y, box) => {
      const dx = x - box.lx / 2;
      const dy = y - box.ly / 2;
      const envelope = Math.exp(-(dx * dx + dy * dy) / (2 * sigma0 * sigma0));
      return [envelope * Math.cos(carrier * x), envelope * Math.sin(carrier * x)];
    },
    lx: 2 * Math.PI,
    ly: 2 * Math.PI,
    nx: 64,
    ny: 64,
  });
  const start = moments(field).centroid;
  const dt = 1e-4;
  const steps = 1500;
  for (let i = 0; i < steps; i += 1) field.step(dt);
  const t = dt * steps;
  const measured = moments(field).centroid - start;
  assert.ok(
    Math.abs(measured - carrier * t) < 5e-3 * Math.abs(carrier * t),
    `centroid moved ${measured}, group velocity predicts ${carrier * t}`,
  );
  assert.ok(measured > 0, "packet moved the wrong way: kinetic exponent sign");
});

contract("A8", "the g=0 limit equals direct diagonalisation in the Fourier basis", () => {
  const nx = 64;
  const ny = 32;
  const steps = 200;
  const dt = 2e-4;
  const initial = (x, y, box) => {
    const dx = x - box.lx / 2;
    const dy = y - box.ly / 2;
    return [Math.exp(-(dx * dx + dy * dy) / 0.5), 0.2 * Math.sin(3 * x) * Math.exp(-dy * dy * 4)];
  };
  const box = { lx: 2 * Math.PI, ly: Math.PI };
  const field = createAuroraField({ ...FREE, ...box, initial, nx, ny });
  for (let i = 0; i < steps; i += 1) field.step(dt);

  const reference = createAuroraField({ ...FREE, ...box, initial, nx, ny });
  const re = Float64Array.from(reference.re);
  const im = Float64Array.from(reference.im);
  fft2(re, im, nx, ny, -1);
  const total = dt * steps;
  for (let j = 0; j < ny; j += 1) {
    const ky = (2 * Math.PI / box.ly) * (j < ny / 2 ? j : j - ny);
    for (let i = 0; i < nx; i += 1) {
      const kx = (2 * Math.PI / box.lx) * (i < nx / 2 ? i : i - nx);
      const phase = -0.5 * (kx * kx + ky * ky) * total;
      const c = Math.cos(phase);
      const s = Math.sin(phase);
      const index = j * nx + i;
      const a = re[index];
      const b = im[index];
      re[index] = a * c - b * s;
      im[index] = a * s + b * c;
    }
  }
  fft2(re, im, nx, ny, 1);
  let worst = 0;
  for (let i = 0; i < re.length; i += 1) {
    worst = Math.max(worst, Math.abs(re[i] - field.re[i]), Math.abs(im[i] - field.im[i]));
  }
  assert.ok(worst < 1e-11, `split-step diverged from the exact propagator by ${worst}`);
});

// ---------------------------------------------------------------------------
// A10 — the energy functional and the equation must be the same physics. If the
// saturable energy density is not the antiderivative of the nonlinear term,
// A5 is measuring a quantity the integrator was never conserving.
// ---------------------------------------------------------------------------

contract("A10", "saturable energy density is the antiderivative of the nonlinear term", () => {
  const { g, nSat } = AURORA_PHYSICS;
  const density = (n) => g * nSat * (n - nSat * Math.log(1 + n / nSat));
  const term = (n) => (g * n) / (1 + n / nSat);
  for (const n of [0.05, 0.4, 1, 2.5, 6]) {
    const eps = 1e-6;
    const numeric = (density(n + eps) - density(n - eps)) / (2 * eps);
    assert.ok(relative(numeric, term(n)) < 1e-7, `dE/dn=${numeric} vs F(n)=${term(n)} at n=${n}`);
  }
});

// ---------------------------------------------------------------------------
// A11, A12 — negative controls.
// ---------------------------------------------------------------------------

contract("A11", "forward Euler on the same right-hand side blows the norm up", () => {
  const field = createAuroraField(evolutionConfig);
  const before = field.norm();
  for (let i = 0; i < 400; i += 1) field.eulerStep(AURORA_PHYSICS.dt);
  const growth = field.norm() / before;
  assert.ok(
    growth > 10,
    `an unconditionally unstable integrator only grew the norm ${growth}x: the norm assertion has no teeth`,
  );
});

contract("A12", "past the accuracy bound the solution decoheres", () => {
  const bound = auroraStabilityBound(createAuroraField(staticConfig));
  const inBound = energyBand(createAuroraField(staticConfig), 200, bound.dtMax * 0.2);
  const overBound = energyBand(createAuroraField(staticConfig), 200, bound.dtMax * 20);
  assert.ok(
    overBound.peak > inBound.peak * 100,
    `energy band only grew from ${inBound.peak} to ${overBound.peak} at 100x the timestep`,
  );

  const highK = (field) => {
    const re = Float64Array.from(field.re);
    const im = Float64Array.from(field.im);
    fft2(re, im, field.nx, field.ny, -1);
    let all = 0;
    let upper = 0;
    for (let j = 0; j < field.ny; j += 1) {
      const my = j < field.ny / 2 ? j : j - field.ny;
      for (let i = 0; i < field.nx; i += 1) {
        const mx = i < field.nx / 2 ? i : i - field.nx;
        const power = re[j * field.nx + i] ** 2 + im[j * field.nx + i] ** 2;
        all += power;
        if (Math.abs(mx) > field.nx / 4 || Math.abs(my) > field.ny / 4) upper += power;
      }
    }
    return upper / all;
  };
  const calm = createAuroraField(staticConfig);
  const wild = createAuroraField(staticConfig);
  for (let i = 0; i < 200; i += 1) calm.step(bound.dtMax * 0.2);
  for (let i = 0; i < 200; i += 1) wild.step(bound.dtMax * 20);
  assert.ok(
    highK(wild) > highK(calm) * 5,
    `grid-scale power fraction ${highK(wild)} vs ${highK(calm)}: an unstable run must decohere`,
  );
});

// ---------------------------------------------------------------------------
// A13, A14, A16 — the shipped configuration, not a test configuration.
// ---------------------------------------------------------------------------

contract("A13", "every shipped tier runs inside a quarter of its stability bound", () => {
  for (const [tier, profile] of Object.entries(AURORA_TIERS)) {
    const field = createAuroraField({ nx: profile.nx, ny: profile.ny });
    const bound = auroraStabilityBound(field);
    assert.ok(
      AURORA_PHYSICS.dt <= bound.dtMax * 0.25,
      `${tier}: dt=${AURORA_PHYSICS.dt} against dtMax=${bound.dtMax} (kin ${bound.dtKinetic}, nl ${bound.dtNonlinear})`,
    );
    assert.ok(profile.tickHz > 0 && profile.tickHz <= 20, `${tier}: tick rate must stay bounded`);
    assert.ok(
      Number.isInteger(Math.log2(profile.nx)) && Number.isInteger(Math.log2(profile.ny)),
      `${tier}: radix-2 transform needs power-of-two extents`,
    );
    assert.ok(
      relative(profile.nx / profile.ny, AURORA_BOX.lx / AURORA_BOX.ly) < 1e-9,
      `${tier}: grid spacing must stay isotropic so k_max is one number`,
    );
  }
});

contract("A14", "the altitude trap makes the y-periodicity harmless", () => {
  // Root cause first. Nothing in a Hamiltonian field removes energy, so a trap
  // driven near its own frequency heats until the field climbs out of it. This
  // is the assertion that keeps the field trapped; the boundary measurement
  // below is the symptom it protects.
  for (const fold of AURORA_PHYSICS.folds) {
    assert.ok(
      Math.abs(fold.omega) < 0.15 * AURORA_PHYSICS.trapOmega,
      `fold mode ${fold.mode} drives at omega=${fold.omega} against trapOmega=${AURORA_PHYSICS.trapOmega}: ` +
        "resonant driving heats the field out of the trap (measured: 56% of peak at the boundary in 33 minutes)",
    );
  }

  // 2000 steps is 2.2 minutes of wall time at the 15 Hz tick, which is longer
  // than a visit. Measured 2.2e-5 here; it reaches 6e-4 at 9 minutes and 4.6e-3
  // at 3.7 hours, non-monotonically -- the field sloshes rather than escaping.
  const field = createAuroraField(evolutionConfig);
  for (let i = 0; i < 2000; i += 1) field.step(AURORA_PHYSICS.dt);
  const density = field.density();
  const peak = maxAbs(density);
  let edge = 0;
  for (let i = 0; i < field.nx; i += 1) {
    edge = Math.max(edge, density[i], density[(field.ny - 1) * field.nx + i]);
  }
  assert.ok(edge < peak * 1e-4, `boundary density ${edge / peak} of peak: the field is wrapping in y`);
});

contract("A16", "evolution is deterministic", () => {
  const a = createAuroraField(evolutionConfig);
  const b = createAuroraField(evolutionConfig);
  for (let i = 0; i < 50; i += 1) {
    a.step(AURORA_PHYSICS.dt);
    b.step(AURORA_PHYSICS.dt);
  }
  for (let i = 0; i < a.re.length; i += 1) {
    if (a.re[i] !== b.re[i] || a.im[i] !== b.im[i]) {
      assert.fail(`fields diverged at index ${i}: the seed is not the only input`);
    }
  }
});

// ---------------------------------------------------------------------------
// A15 — the mechanism itself. Modulational instability has to select the band
// the spec predicts, or the filaments are an accident rather than a result.
// ---------------------------------------------------------------------------

contract("A15", "modulational instability selects the predicted band", () => {
  const nx = 256;
  const ny = 8;
  const background = 1;
  const { g, nSat } = AURORA_PHYSICS;
  const gEffective = g / (1 + background / nSat) ** 2;
  const predicted = Math.sqrt(2 * Math.abs(gEffective) * background);

  const field = createAuroraField({
    g,
    initial: (x) => [Math.sqrt(background) * (1 + 1e-4 * Math.cos(37 * x) * Math.cos(11 * x)), 0],
    lx: 2 * Math.PI,
    ly: (2 * Math.PI * ny) / nx,
    nSat,
    nx,
    ny,
    trapOmega: 0,
  });
  // Broadband seed: every resolved x mode gets equal, deterministic amplitude,
  // so the band that grows is selected by the equation and not by the seed.
  for (let i = 0; i < field.re.length; i += 1) {
    const hash = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    field.re[i] += (hash - Math.floor(hash) - 0.5) * 2e-4;
  }

  for (let i = 0; i < 400; i += 1) field.step(AURORA_PHYSICS.dt);

  const re = Float64Array.from(field.re);
  const im = Float64Array.from(field.im);
  fft2(re, im, nx, ny, -1);
  let bestMode = 0;
  let bestPower = 0;
  for (let i = 1; i < nx / 2; i += 1) {
    let power = 0;
    for (let j = 0; j < ny; j += 1) power += re[j * nx + i] ** 2 + im[j * nx + i] ** 2;
    if (power > bestPower) {
      bestPower = power;
      bestMode = i;
    }
  }
  assert.ok(
    relative(bestMode, predicted) < 0.15,
    `fastest-growing mode k=${bestMode}, spec predicts sqrt(2|g_eff|n)=${predicted.toFixed(2)}`,
  );
});

// ---------------------------------------------------------------------------
// A17, A18 — colour. The four emission colours must be the CIE values for the
// four wavelengths, recomputed here rather than trusted from the library.
// ---------------------------------------------------------------------------

contract("A17", "emission chromaticities are the CIE values for the four lines", () => {
  const lobe = (x, mu, s1, s2) => Math.exp(-0.5 * ((x - mu) / (x < mu ? s1 : s2)) ** 2);
  const xBar = (l) =>
    1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2);
  const yBar = (l) => 0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1);
  const zBar = (l) => 1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8);
  const matrix = [
    [3.2404542, -1.5371385, -0.4985314],
    [-0.969266, 1.8760108, 0.041556],
    [0.0556434, -0.2040259, 1.0572252],
  ];

  assert.equal(AURORA_EMISSION_LINES.length, 4, "the map is four spectral lines");
  for (const line of AURORA_EMISSION_LINES) {
    const xyz = [xBar(line.nm), yBar(line.nm), zBar(line.nm)];
    let rgb = matrix.map((row) => row[0] * xyz[0] + row[1] * xyz[1] + row[2] * xyz[2]);
    const lift = Math.min(0, ...rgb);
    rgb = rgb.map((channel) => channel - lift);
    // NO `channel / peak` HERE, and its absence is the assertion. Normalising
    // to unit maximum discards the line's luminance, and the shader then put a
    // different one back by multiplying through ybar -- exact for 557.7, wrong
    // by 111x in blue for 427.8, which is why the curtain rendered green top to
    // bottom. If a future pass reintroduces a normalisation, this fails.
    for (let i = 0; i < 3; i += 1) {
      assert.ok(
        Math.abs(rgb[i] - line.rgb[i]) < 1e-3,
        `${line.id}: channel ${i} pinned at ${line.rgb[i]}, CMFs give ${rgb[i].toFixed(4)}`,
      );
    }
    // The luminance has to SURVIVE the trip, because losing it silently is the
    // whole defect. The gamut map is allowed to raise it -- an out-of-gamut
    // line cannot be shown and is traded toward the white point, which is what
    // makes 427.8 visible at all -- but only within a stated bound, so the lift
    // cannot grow into a brightness knob unnoticed.
    const lumaLift = srgbLuminance(line.rgb) / xyz[1];
    assert.ok(
      lumaLift >= 1 && lumaLift < 25,
      `${line.id}: the gamut map moved its luminance by ${lumaLift.toFixed(2)}x`,
    );
    assert.ok(
      Math.abs(photopicEfficiency(line.nm) - line.photopic) < 1e-3,
      `${line.id}: photopic weight drifted from ybar`,
    );
    assert.ok(
      Math.abs(scotopicEfficiency(line.nm) - line.scotopic) < 1e-3,
      `${line.id}: scotopic weight drifted from V'`,
    );
    const direct = cieLineDisplayRgb(line.nm);
    for (let i = 0; i < 3; i += 1) {
      assert.ok(Math.abs(direct[i] - line.rgb[i]) < 1e-6, `${line.id}: pinned rgb is not what the library computes`);
    }
  }
});

contract("A18", "the lines are ordered by rod/cone ratio, which is the colour model", () => {
  const order = ["n2plus-427.8", "oi-557.7", "oi-630.0", "n2-1p-670.5"];
  const byId = Object.fromEntries(AURORA_EMISSION_LINES.map((line) => [line.id, line]));
  let previous = Infinity;
  for (const id of order) {
    const line = byId[id];
    assert.ok(line, `missing emission line ${id}`);
    const ratio = line.scotopic / line.photopic;
    assert.ok(ratio < previous, `${id}: rod/cone ratio ${ratio} is not below ${previous}`);
    previous = ratio;
  }
  assert.ok(
    byId["n2plus-427.8"].scotopic / byId["n2plus-427.8"].photopic > 10,
    "rods must be an order of magnitude more sensitive to 427.8 than cones: this is what makes faint aurora pale blue",
  );
  assert.ok(
    Math.abs(byId["oi-557.7"].photopic - 1) < 0.01,
    "557.7 must sit at the peak of the photopic curve: this is why green is the dominant material",
  );
});

// ---------------------------------------------------------------------------
// A19, A20 — does the carrier reach the screen?
//
// These exist because the first render had no fringes at all and every other
// assertion passed. A15 proves the modulational instability picks the right
// band; nothing proved the carrier -- the entire reason for the envelope/carrier
// split -- was visible. It was not: the shader consumed k0 (a wavenumber in box
// units) against a uv coordinate that runs 0..1 across the box, losing a factor
// of lx = 2*pi and putting the ray pitch at 141 device px, which reads as no
// fringes and leaves the MI filaments as isotropic blobs.
//
// A number that only exists inside a shader is a number nothing can check. The
// fix was to derive it in the module, which is what makes these assertable.
// ---------------------------------------------------------------------------

contract("A19", "the ray fringes land at a visible pitch at every tier", () => {
  const cssWidth = 1440;
  for (const [tier, profile] of Object.entries(AURORA_TIERS)) {
    const fringe = auroraFringePitch({ cssWidth, dpr: profile.dpr });
    const filament = auroraFilamentPitch({ cssWidth, dpr: profile.dpr });

    assert.ok(
      fringe.pitchDevicePx > 5 && fringe.pitchDevicePx < 40,
      `${tier}: ray fringes at ${fringe.pitchDevicePx.toFixed(1)} device px — ` +
        "below ~5 they alias into shimmer, above ~40 they stop reading as rays",
    );
    assert.ok(
      fringe.fringes >= 24,
      `${tier}: only ${fringe.fringes.toFixed(1)} fringes across the frame`,
    );
    // Two structural scales across the sheet, not one. Within a factor of two
    // they merge into a single texture and the result is a row of blobs.
    assert.ok(
      filament.pitchDevicePx > fringe.pitchDevicePx * 2.5,
      `${tier}: filaments ${filament.pitchDevicePx.toFixed(1)}px vs fringes ` +
        `${fringe.pitchDevicePx.toFixed(1)}px — the two scales have merged`,
    );
    // And the anisotropy claim from section 1: structure ALONG the sheet must
    // be far coarser than structure across it. The along-sheet coherence length
    // is the rendered band height, because the field is smooth over it.
    const bandHeightPx = (AURORA_LAYOUT.north[1] - AURORA_LAYOUT.north[0]) * 900 * profile.dpr;
    assert.ok(
      bandHeightPx > filament.pitchDevicePx * 5,
      `${tier}: band ${bandHeightPx.toFixed(0)}px against ${filament.pitchDevicePx.toFixed(0)}px ` +
        "filaments — the curtain is as coarse along the sheet as across it, which is a blob",
    );
  }
});

contract("A20", "the shader consumes the derived uv-space carrier, not k0", () => {
  const expected = [
    AURORA_PHYSICS.k0[0] * AURORA_BOX.lx,
    AURORA_PHYSICS.k0[1] * AURORA_BOX.ly * (AURORA_LAYOUT.fieldHigh - AURORA_LAYOUT.fieldLow),
  ];
  for (let i = 0; i < 2; i += 1) {
    assert.ok(
      Math.abs(AURORA_CARRIER_UV[i] - expected[i]) < 1e-9,
      `AURORA_CARRIER_UV[${i}] is not k0 scaled by the box extent`,
    );
  }
  assert.match(
    AURORA_FRAGMENT_SHADER,
    /float theta = dot\(uCarrier, vec2\(u, altitude\)\) - uCarrierPhase;/,
    "the carrier must be dotted with the bare uv coordinate: any extra scale here is a factor " +
      "that lives only in GLSL and that nothing outside the GPU can check",
  );
  assert.doesNotMatch(
    AURORA_FRAGMENT_SHADER,
    /uCarrier\s*\*/,
    "no ad-hoc rescaling of the carrier inside the shader",
  );
});

// ---------------------------------------------------------------------------
// A22, A23 — the two things the art pass added that a screenshot alone cannot
// hold: the second resonator harmonic, and the Chapman hem.
//
// Both are structural claims about the emission map, so both are assertable
// outside GLSL, and both are exactly the kind of number that silently reverts
// to "looks fine" if nothing pins it. A22 is the analogue of A19 for the second
// carrier — same derivation, same pitch window, plus the two separations that
// decide whether a second comb interleaves or moires. A23 is the asymmetry: a
// Gaussian window passes every other assertion in this file and produces no hem
// at all, which is the state this pass was commissioned to fix.
// ---------------------------------------------------------------------------

contract("A22", "the second resonator harmonic interleaves rather than moires", () => {
  const expected = [
    AURORA_PHYSICS.k0b[0] * AURORA_BOX.lx,
    AURORA_PHYSICS.k0b[1] * AURORA_BOX.ly * (AURORA_LAYOUT.fieldHigh - AURORA_LAYOUT.fieldLow),
  ];
  for (let i = 0; i < 2; i += 1) {
    assert.ok(
      Math.abs(AURORA_CARRIER_UV_B[i] - expected[i]) < 1e-9,
      `AURORA_CARRIER_UV_B[${i}] is not k0b scaled by the box extent`,
    );
  }

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  assert.equal(
    gcd(AURORA_PHYSICS.k0[0], AURORA_PHYSICS.k0b[0]),
    1,
    "the two carrier pitches must be coprime, or the combined comb repeats inside the frame " +
      "and the interleaving becomes a shorter, regular comb — which is the barcode again",
  );

  // The beat is a third structural scale, and it has to stay clear of the
  // second one. If |kb - ka| lands on the MI band the bundles and the filaments
  // are the same size and the result is a moire rather than a curtain.
  const beat = Math.abs(AURORA_PHYSICS.k0b[0] - AURORA_PHYSICS.k0[0]);
  const { kMi } = auroraFilamentPitch({ cssWidth: 1440, dpr: 1 });
  const filaments = (kMi * AURORA_BOX.lx) / (2 * Math.PI);
  assert.ok(
    filaments / beat > 1.4,
    `carrier beat at ${beat} cycles against ${filaments.toFixed(1)} MI filaments: ` +
      "the ray bundles and the filaments have merged into one scale",
  );

  const cssWidth = 1440;
  for (const [tier, profile] of Object.entries(AURORA_TIERS)) {
    const b = auroraFringePitch({ carrier: AURORA_CARRIER_UV_B, cssWidth, dpr: profile.dpr });
    assert.ok(
      b.pitchDevicePx > 5 && b.pitchDevicePx < 40,
      `${tier}: second harmonic at ${b.pitchDevicePx.toFixed(1)} device px, outside the visible window`,
    );
  }

  assert.match(
    AURORA_FRAGMENT_SHADER,
    /float thetaB = dot\(uCarrierB, vec2\(u, altitude\)\) - uCarrierPhaseB;/,
    "the second carrier must be dotted with the bare uv coordinate on the same terms as the first",
  );
  assert.doesNotMatch(AURORA_FRAGMENT_SHADER, /uCarrierB\s*\*/, "no ad-hoc rescaling of the second carrier");
});

contract("A23", "the emission layers are Chapman layers: sharp below, diffuse above", () => {
  // The function the shader evaluates, restated here rather than parsed out of
  // the GLSL — so this asserts the SHAPE and the shader is checked separately
  // for using it.
  const chapman = (y, peak, h) => {
    const s = Math.max((y - peak) / h, -8);
    return Math.exp(1 - s - Math.exp(-s));
  };

  assert.ok(Math.abs(chapman(0.5, 0.5, 0.1) - 1) < 1e-12, "a Chapman layer peaks at 1 at its own altitude");

  for (const line of AURORA_EMISSION_LINES) {
    const { altitude: peak, scaleHeight: h } = line;
    assert.ok(h > 0 && h < 0.2, `${line.id}: scale height ${h} is not an altitude scale`);

    // The asymmetry, stated as the distance to 2% of peak on each side. Below
    // the peak the electrons are spent and the fall is a double exponential;
    // above it only the air is thinning. A Gaussian gives 1.0 here and produces
    // no hem, which is precisely the failure this replaced.
    const reach = (direction) => {
      let d = 0;
      while (d < 40 * h && chapman(peak + direction * d, peak, h) > 0.02) d += h / 64;
      return d;
    };
    const below = reach(-1);
    const above = reach(1);
    // 2.55 is a pure property of the Chapman function and does not depend on H.
    // A Gaussian — which is what this replaced — gives exactly 1.0, so the two
    // shapes are on opposite sides of this bound by construction rather than by
    // tuning, and no choice of width can move a Gaussian across it.
    assert.ok(
      above > below * 2.4,
      `${line.id}: emission reaches ${above.toFixed(3)} above the peak and ${below.toFixed(3)} below — ` +
        "a curtain's lower edge must be far sharper than its upper one, or it reads as haze",
    );

    // The three lines BELOW the mantle are the ones that draw the visible hem,
    // and for them the sharpness has to be absolute and not merely relative:
    // the edge must occupy a small fraction of the rendered band or it is a
    // gradient however asymmetric it is. 630.0 is exempt because a diffuse red
    // mantle is what O(1D)'s 110-second lifetime actually produces.
    if (line.id !== "oi-630.0") {
      assert.ok(
        below < 0.14,
        `${line.id}: the lower edge takes ${below.toFixed(3)} of the band to reach 2% — that is a fade, not a hem`,
      );
    }
  }

  // Green must be the line that owns the visible hem: it is 112x brighter per
  // photon than 427.8 and 3.8x brighter than 630.0 in luminance, so whichever
  // layer 557.7 sits in is the one the eye reads as the edge of the curtain.
  const byId = Object.fromEntries(AURORA_EMISSION_LINES.map((line) => [line.id, line]));
  assert.ok(
    byId["n2-1p-670.5"].altitude < byId["n2plus-427.8"].altitude &&
      byId["n2plus-427.8"].altitude < byId["oi-557.7"].altitude &&
      byId["oi-557.7"].altitude < byId["oi-630.0"].altitude,
    "the four layers must stack by penetration depth: N2 1P deepest, then 427.8, then the green core, then 630.0",
  );

  assert.match(
    AURORA_FRAGMENT_SHADER,
    /float chapman\(float y, float peakAltitude, float scaleHeight\) \{\s*float s = max\(\(y - peakAltitude\) \/ scaleHeight, -8\.0\);\s*return exp\(1\.0 - s - exp\(-s\)\);/,
    "the shader must evaluate the Chapman production function itself, not a symmetric window",
  );
  assert.doesNotMatch(
    AURORA_FRAGMENT_SHADER,
    /\bband\(/,
    "the symmetric Gaussian window is what produced a stain with no lower edge; it must not come back",
  );
});

// ---------------------------------------------------------------------------
// A24 — the SHELL's pitch, which is a different number from A19's and is the
// one that was wrong.
//
// A19 measures the veil, where the arc is laid across the frame and one box is
// one frame. The shell lays the same arc around the whole compass, and a camera
// with a 38-degree vertical field of view sees 58 degrees of that — 16% of a
// box. Every scale in section 7 survived intact and every one of them arrived
// six times too coarse to resolve: 10 rays across 1440px, 2.9 filaments. That
// is the stain the art pass was commissioned to fix, and no assertion in this
// file could see it, because the mapping from box to sky was the identity
// between a sphere's uv and a texture's uv and therefore was never written
// down. Same failure as A19's, one geometry later.
// ---------------------------------------------------------------------------

contract("A24", "the shell delivers the ray and filament pitch to the camera, not just to the box", () => {
  const cssWidth = 1440;
  const cssHeight = 900;
  // The world's own camera, at the widest station framing it uses.
  const fov = horizontalFov({ aspect: cssWidth / cssHeight, verticalFovDegrees: 43 });
  assert.ok(fov > 40 && fov < 80, `horizontal fov ${fov.toFixed(1)} is not a plausible camera`);

  for (const carrier of [AURORA_CARRIER_UV, AURORA_CARRIER_UV_B]) {
    const shell = auroraShellPitch({ carrier, cssWidth, horizontalFovDegrees: fov });
    // In CSS px, not device px: whether a ray reads as a ray is a question
    // about the viewer's angular resolution, and the shell's device ratio is
    // the world canvas's, which moves between 0.55 and 1.5 across the ladder.
    assert.ok(
      shell.pitchCssPx > 16 && shell.pitchCssPx < 60,
      `shell rays land at ${shell.pitchCssPx.toFixed(1)} CSS px (${shell.fringes.toFixed(1)} across the frame) — ` +
        "above ~60 they stop reading as rays at all, which is what one circuit per shell produced",
    );
    assert.ok(
      shell.filamentPitchCssPx > shell.pitchCssPx * 2.5,
      `shell filaments ${shell.filamentPitchCssPx.toFixed(0)}px against rays ${shell.pitchCssPx.toFixed(0)}px: merged`,
    );
    // The anisotropy claim, in the geometry that actually draws it: the band
    // spans the shell's whole elevation range against the vertical fov, so a
    // filament has to stay coherent over several times its own width.
    assert.ok(
      cssHeight > shell.filamentPitchCssPx * 4,
      `filaments at ${shell.filamentPitchCssPx.toFixed(0)}px against a ${cssHeight}px band — ` +
        "as coarse along the sheet as across it, which is a blob",
    );
  }

  assert.ok(
    Number.isInteger(AURORA_ARC_REPEATS) && AURORA_ARC_REPEATS >= 1,
    "the box tiles the arc a whole number of times, or the periodic seam becomes visible as a cut",
  );
  // Resolution is bought by tiling, and the price of tiling is repetition. The
  // frame must stay inside one tile, or the same filaments appear twice in one
  // shot and the field stops reading as a place.
  const boxesAcrossFrame = (fov / 360) * AURORA_ARC_REPEATS;
  assert.ok(
    boxesAcrossFrame < 1,
    `the frame spans ${boxesAcrossFrame.toFixed(2)} tiles of the box: the periodic seam repeats inside one shot`,
  );
  assert.match(
    AURORA_FRAGMENT_SHADER,
    /curtain\(fract\(vUv\.x \* uArcRepeats \+ uDrift\), north, 1\.0\)/,
    "the shader must take the repeat count from a uniform: the two hosts disagree about it, and " +
      "a constant baked into the GLSL is a constant nothing outside the GPU can check",
  );
});

// ---------------------------------------------------------------------------
// A25 — the curtain has to be IN THE FRAME.
//
// The most expensive defect of this whole pass, and the most embarrassing: the
// shell's band ran from -7 to +31 degrees of elevation while the camera shows
// 3.7 degrees of sky, so the green core sat 7 degrees above the top edge and
// what appeared on screen was the dim outer skirt beneath the hem. Every
// assertion above passed. The field was correct, the emission map was correct,
// the pitch was correct, and none of it was on screen.
//
// A19 checks the pitch in the box, A24 checks the pitch in the camera, and this
// checks the POSITION in the camera — which is the third way for a number that
// only exists as a coordinate mapping to be wrong.
// ---------------------------------------------------------------------------

contract("A25", "the curtain's hem and core land in the sky the camera actually shows", () => {
  const sky = AURORA_CAMERA_SKY;
  const pxPerDegree = sky.cssHeight / sky.verticalFovDegrees;
  const horizonY = sky.topDegrees * pxPerDegree;
  assert.ok(horizonY > 40, `only ${horizonY.toFixed(0)}px of sky above the horizon: nothing can be composed in that`);

  const green = AURORA_EMISSION_LINES.find((line) => line.id === "oi-557.7");
  // Same Chapman geometry A23 asserts, read as altitudes rather than as shape.
  const hem = green.altitude - 1.92 * green.scaleHeight; // 2% of peak below
  const top = green.altitude + 4.91 * green.scaleHeight; // 2% of peak above

  const hemY = auroraShellAltitudeToScreenY(hem);
  const coreY = auroraShellAltitudeToScreenY(green.altitude);
  const topY = auroraShellAltitudeToScreenY(top);

  // The core is the thing the eye finds. It must be on screen, and it must not
  // be jammed against the top edge, where it reads as a band of chrome.
  assert.ok(
    coreY > 12 && coreY < horizonY,
    `the green core lands at y=${coreY.toFixed(0)} against a sky of 0..${horizonY.toFixed(0)}px: ` +
      "off the top of the frame is where this spent its first version",
  );
  // The hem is the picture. It has to be above the horizon so there is sky
  // under it, and low enough that the ridges can cut into it.
  assert.ok(
    hemY > coreY && hemY <= horizonY + 24,
    `the hem lands at y=${hemY.toFixed(0)} against a horizon at ${horizonY.toFixed(0)}px`,
  );
  // And no visible top edge: the soft tail must leave the frame rather than
  // stop inside it, or the curtain reads as a band with two edges.
  assert.ok(topY < 0, `the curtain's upper tail ends at y=${topY.toFixed(0)}, inside the frame: that is a wipe`);

  // Anisotropy, in the geometry that draws it. The rays are the striation the
  // eye reads, so it is the RAYS and not the filaments that have to stand
  // taller than they are wide.
  const emissionHeightPx = hemY - topY;
  const fov = horizontalFov({ aspect: 1440 / sky.cssHeight, verticalFovDegrees: sky.verticalFovDegrees });
  const rays = auroraShellPitch({ cssWidth: 1440, horizontalFovDegrees: fov });
  assert.ok(
    emissionHeightPx > rays.pitchCssPx * 3,
    `rays ${rays.pitchCssPx.toFixed(0)}px apart in a curtain ${emissionHeightPx.toFixed(0)}px tall — ` +
      "that is a row of pills, not a curtain",
  );
});

// ---------------------------------------------------------------------------
// A26 — and at the other seven stations.
//
// A25 is true and it guards ONE framing. The observatory plaque's 3.7 degrees
// of sky was measured; the other seven were assumed to be near enough, and they
// are not. Each station authors its own vertical field of view and the rig's
// solver picks its own camera elevation inside an authored range, so the eight
// cameras sit between 5.5 and 15.0 degrees of downward pitch behind 36 to 43
// degrees of vertical field. That is between 4.0 and 16.0 degrees of sky above
// the horizon: a factor of four, and 95px against 335px on a 900px frame.
//
// A band pinned in absolute elevation is the correct answer to that -- the sky
// is shared, and an aurora that slid up and down as the visitor walked between
// stations would be a sky that slides. But "correct in the world" is not the
// same claim as "composed in the frame", and this is the assertion that the
// second one holds at every station rather than at the one that was measured.
//
// Every framing below comes from lib/polar-camera-composition.js -- the solver
// the rig itself runs, not a transcription of its output -- so a station whose
// camera is re-authored moves this contract with it. The pixel column of the
// table in section 11 of the maths document is the ablation that validated it:
// aurora-on minus aurora-off, at a noise floor of exactly zero.
// ---------------------------------------------------------------------------

contract("A26", "every station's camera shows sky, and the curtain is composed in it", () => {
  const green = AURORA_EMISSION_LINES.find((line) => line.id === "oi-557.7");
  // The same Chapman geometry A23 and A25 use, read as altitudes.
  const hemAltitude = green.altitude - 1.92 * green.scaleHeight;
  const topAltitude = green.altitude + 4.91 * green.scaleHeight;
  const cssWidth = 1440;
  const cssHeight = 900;
  const seen = [];

  for (const id of STATION_WORLD_SCHEMA.order) {
    const station = STATION_WORLD_SCHEMA.stations[id];
    // Every shipped tier, because the solver's distance bias is per tier and
    // can pick a different elevation candidate: assembly-tool-locker settles at
    // 13 degrees on low and medium and 9.5 on high, which is 81px of sky.
    for (const quality of Object.keys(AURORA_TIERS)) {
      const solved = solvePolarCameraComposition({
        height: cssHeight,
        quality,
        sealPosition: station.dock,
        station,
        velocity: { x: 0, z: 0 },
        width: cssWidth,
      });
      const sky = auroraStationSky({
        cssHeight,
        elevationDegrees: solved.camera.elevationDegrees,
        verticalFovDegrees: solved.camera.verticalFovDegrees,
      });
      const where = `${id}/${quality}`;
      seen.push(where);

      // There has to be a sky at all. A camera pitched down past its own half
      // field of view shows none, and everything below is then vacuous.
      assert.ok(
        sky.skyPx > 60,
        `${where}: ${sky.skyPx.toFixed(0)}px of sky above the horizon — nothing composes in that`,
      );

      const coreY = sky.altitudeY(green.altitude);
      const hemY = sky.altitudeY(hemAltitude);
      const topY = sky.altitudeY(topAltitude);

      // The core is the thing the eye finds, and it must be IN the frame and in
      // the SKY: above the horizon, not off the top edge. This is the assertion
      // the -7..+31 band failed at the observatory, checked everywhere.
      assert.ok(
        coreY > 8 && coreY < sky.horizonY,
        `${where}: the green core lands at y=${coreY.toFixed(0)} against a sky of 0..${sky.horizonY.toFixed(0)}px`,
      );
      // The hem is the picture: sky under it, and low enough that the ridges
      // reach it. Below the horizon is fine and is where the occlusion the
      // whole shell exists for happens; far below it is a curtain buried.
      assert.ok(
        hemY > coreY && hemY < sky.horizonY + 0.6 * sky.pxPerDegree,
        `${where}: the hem lands at y=${hemY.toFixed(0)} against a horizon at ${sky.horizonY.toFixed(0)}px`,
      );

      // ANISOTROPY, at this station's own pixels per degree rather than at the
      // observatory's. A25's ray criterion first, unchanged and unloosened.
      const fov = horizontalFov({
        aspect: cssWidth / cssHeight,
        verticalFovDegrees: sky.verticalFovDegrees,
      });
      const rays = auroraShellPitch({ cssWidth, horizontalFovDegrees: fov });
      const emissionHeightPx = hemY - topY;
      assert.ok(
        emissionHeightPx > rays.pitchCssPx * 3,
        `${where}: rays ${rays.pitchCssPx.toFixed(1)}px apart in ${emissionHeightPx.toFixed(0)}px of curtain ` +
          `(${(emissionHeightPx / rays.pitchCssPx).toFixed(2)}:1) — that is a row of pills`,
      );

      // And then the criterion that actually decides whether it reads as a
      // sheet, which the ray pitch cannot see.
      //
      // The rays are fine grain. What the eye picks out is the BUNDLES the
      // modulational instability makes -- brighter and fainter gatherings of
      // rays, spaced at the filament pitch, which is four to five times the ray
      // pitch. If the curtain is shorter than that spacing then each bundle is
      // further from its neighbour than it is tall, and a row of things wider
      // apart than they are high is a row of blobs however many rays are inside
      // each one. At the 8-degree band every station was under it: 84px of
      // emission at the observatory against 100px of filament spacing, 74px
      // against 90px at qpu-ice-bridge. All eight now sit at 1.15.
      //
      // A24 makes the same claim and cannot catch this, because it compares the
      // filament pitch to the 900px FRAME. A frame is not a curtain, and that
      // comparison stays true at any curtain height including zero.
      assert.ok(
        emissionHeightPx > rays.filamentPitchCssPx,
        `${where}: bundles ${rays.filamentPitchCssPx.toFixed(0)}px apart in ${emissionHeightPx.toFixed(0)}px ` +
          `of curtain (${(emissionHeightPx / rays.filamentPitchCssPx).toFixed(2)}:1) — wider apart than tall is a row of blobs`,
      );
      // And the frame must stay inside one tile of the periodic box at the
      // WIDEST station rather than at an assumed 43 degrees, or the same
      // filaments appear twice in one shot.
      assert.ok(
        (fov / 360) * AURORA_ARC_REPEATS < 1,
        `${where}: the frame spans ${((fov / 360) * AURORA_ARC_REPEATS).toFixed(2)} tiles of the box`,
      );
    }
  }

  // The sweep has to be the whole world, not whatever survived a filter.
  assert.equal(
    seen.length,
    STATION_WORLD_SCHEMA.order.length * Object.keys(AURORA_TIERS).length,
    `swept ${seen.length} framings: ${seen.join(", ")}`,
  );
  assert.equal(STATION_WORLD_SCHEMA.order.length, 8, "the world has eight stations");
});

// ---------------------------------------------------------------------------
// A27 — the curtain has to have COLOUR STRUCTURE, not just be in the frame.
//
// A25 and A26 ask whether the curtain is on screen. They ask it about the green
// line, because the green line is the core, and they were both true while the
// curtain rendered green from top to bottom — three of the four emission
// windows peaking outside the strip any camera renders, and the two lines that
// survived losing 111x and 4.7x of their channel weight to a normalisation that
// deleted their luminance and a ybar that put back the wrong one.
//
// Every assertion above passed. The field was right, the Chapman layers were
// right, the CIE values were right, the pitch was right, the framing was right,
// and there was one colour on screen. This is the fourth way for the emission
// map to be correct and absent, after A19's pitch, A24's camera pitch and A25's
// position: correct lines, correctly placed, weighted into nothing.
//
// The claim is the picture itself. A real curtain is stratified in altitude —
// a violet-pink hem UNDER a green core UNDER a red mantle — and that ordering
// is what the four lines exist to produce. So assert the ordering, in the sky
// the cameras actually show, from the shipped constants.
//
// The field is deliberately not evolved here. `flux` and the hardness gates
// multiply the lines pointwise along the ARC and cannot move anything in
// ALTITUDE, which is the axis this contract is about; leaving them out makes it
// deterministic and keeps it measuring the emission map rather than one pose.
// ---------------------------------------------------------------------------

contract("A27", "the emission map is stratified in altitude: violet hem, green core, red mantle", () => {
  const chapman = (y, peak, h) => {
    const s = Math.max((y - peak) / h, -8);
    return Math.exp(1 - s - Math.exp(-s));
  };
  const byId = Object.fromEntries(AURORA_EMISSION_LINES.map((line) => [line.id, line]));
  const bandDegrees = AURORA_SHELL_ELEVATION.high - AURORA_SHELL_ELEVATION.low;
  const toAltitude = (degrees) => (degrees - AURORA_SHELL_ELEVATION.low) / bandDegrees;

  // The strip every station renders: the true horizon underneath, because the
  // depth-tested shell is rejected by the terrain below it, and the TIGHTEST of
  // the twenty-four station/tier framings on top. Solved, not typed.
  let topDegrees = Infinity;
  for (const id of STATION_WORLD_SCHEMA.order) {
    for (const quality of Object.keys(AURORA_TIERS)) {
      const solved = solvePolarCameraComposition({
        height: 900,
        quality,
        sealPosition: STATION_WORLD_SCHEMA.stations[id].dock,
        station: STATION_WORLD_SCHEMA.stations[id],
        velocity: { x: 0, z: 0 },
        width: 1440,
      });
      topDegrees = Math.min(
        topDegrees,
        solved.camera.verticalFovDegrees / 2 - solved.camera.elevationDegrees,
      );
    }
  }
  assert.ok(topDegrees > 2, `the tightest station shows ${topDegrees.toFixed(2)} degrees of sky`);

  // EVERY line has to reach that strip. This is the assertion whose absence is
  // the whole defect, and it is two clauses because a line can fail it in two
  // directions. Nothing may peak UNDER the terrain, where a depth-tested shell
  // is rejected before it is ever shaded; and every line must put at least a
  // tenth of its peak INSIDE the tightest frame, or it is a layer that exists
  // for one station and not for the world.
  //
  // A Chapman layer is at a tenth of peak 0.9 scale heights below it, on the
  // double-exponential side — the same geometry A23, A25 and A26 measure with.
  // What shipped failed all three ways at once:
  //
  //   670.5 peaked at -2.64 deg, under the terrain
  //   427.8 peaked at -1.21 deg, under the terrain
  //   630.0 peaked at +5.17 deg with its tenth-edge at 4.08, above the 4.00
  //         the tightest camera shows — so its mantle began off the top edge
  //
  // The mantle's own peak is allowed to sit above the tightest frame. 630.0 is
  // emitted at 250km against the green's 120km and really is far overhead; the
  // sky is shared and qpu-ice-bridge shows all 16 degrees of it. What is not
  // allowed is for the observatory to see none of it.
  for (const line of AURORA_EMISSION_LINES) {
    const peak = AURORA_SHELL_ELEVATION.low + line.altitude * bandDegrees;
    assert.ok(
      peak > 0,
      `${line.id}: its Chapman peak is at ${peak.toFixed(2)} degrees, under the terrain that occludes it — ` +
        "a line nobody can see is not a line",
    );
    const tenth = peak - 0.9 * line.scaleHeight * bandDegrees;
    assert.ok(
      tenth < topDegrees,
      `${line.id}: it first reaches a tenth of peak at ${tenth.toFixed(2)} degrees, above the ` +
        `${topDegrees.toFixed(2)} the tightest camera shows — that station sees none of this layer`,
    );
  }

  // And the ordering, bottom to top, in kilometres of the real atmosphere:
  // N2 1P needs the hardest precipitation and stops deepest, 427.8 next, the
  // green core above them, and the 630.0 mantle far over all three.
  const stack = ["n2-1p-670.5", "n2plus-427.8", "oi-557.7", "oi-630.0"];
  for (let i = 1; i < stack.length; i += 1) {
    assert.ok(
      byId[stack[i]].altitude > byId[stack[i - 1]].altitude,
      `${stack[i]} must sit above ${stack[i - 1]}: that ordering is where the electrons stop`,
    );
  }
  // The violet has to clear the green's skirt, or it is arithmetic rather than
  // a hem. 1.92 scale heights is where a Chapman layer is at 2% of peak, which
  // is the same geometry A23, A25 and A26 measure the hem with.
  const clearance = (byId["oi-557.7"].altitude - byId["n2plus-427.8"].altitude) / byId["oi-557.7"].scaleHeight;
  assert.ok(
    clearance >= 1.9,
    `the violet peak sits only ${clearance.toFixed(2)} green scale heights below the green peak: ` +
      "inside the green's skirt the violet is invisible on arithmetic alone",
  );

  // Now the picture. Per-channel emission across the strip, from the shipped
  // rates and the shipped display weights.
  //
  // Measured as each band's FRACTION of its own R+G+B rather than as a channel
  // ratio. A ratio divides by a channel that genuinely reaches zero -- green's
  // triple has no blue in it at all, and its own Chapman skirt is a double
  // exponential -- so R/G and B/G run to five figures in the dark bands under
  // the hem and the argmax lands on a band with no light in it. That is a
  // metric reporting on its own denominator, which is the mistake energyScale
  // exists to avoid one file over. Fractions are bounded in 0..1 by
  // construction and cannot do it.
  const samples = [];
  for (let step = 0; step <= 400; step += 1) {
    const degrees = (step / 400) * topDegrees;
    const altitude = toAltitude(degrees);
    const rgb = [0, 0, 0];
    for (const line of AURORA_EMISSION_LINES) {
      const q = line.rate * chapman(altitude, line.altitude, line.scaleHeight);
      for (let c = 0; c < 3; c += 1) rgb[c] += q * line.rgb[c];
    }
    const total = Math.max(rgb[0] + rgb[1] + rgb[2], 1e-30);
    samples.push({ degrees, fraction: rgb.map((c) => c / total), luminance: srgbLuminance(rgb), rgb });
  }
  // And only where there is light to have a hue. Below 2% of peak luminance a
  // band contributes nothing a viewer can see, so its chromaticity is a
  // statement about rounding.
  const peakLuminance = Math.max(...samples.map((s) => s.luminance));
  const lit = samples.filter((s) => s.luminance >= 0.02 * peakLuminance);
  assert.ok(lit.length > 20, `only ${lit.length} of 401 bands carry light: there is no curtain to have a colour`);
  const argmax = (channel) => lit.reduce((best, s) => (s.fraction[channel] > best.fraction[channel] ? s : best));
  const violet = argmax(2);
  const green = argmax(1);
  const red = argmax(0);

  // THE ORDERING, ON SCREEN: the blue-cast band below the green core, the
  // red-cast band above it. This is the sentence the whole emission map exists
  // to write, and until now nothing checked that it was written.
  assert.ok(
    violet.degrees < green.degrees,
    `the bluest band is at ${violet.degrees.toFixed(2)} degrees and the green core at ` +
      `${green.degrees.toFixed(2)}: a hem that is not below the core is not a hem`,
  );
  assert.ok(
    green.degrees < red.degrees,
    `the green core is at ${green.degrees.toFixed(2)} degrees and the reddest band at ` +
      `${red.degrees.toFixed(2)}: the 630.0 mantle belongs over the core, not under it`,
  );
  // The three have to be genuinely apart, or "stratified" is a sampling
  // accident. Half a degree is about 12px at every station's pixels-per-degree.
  assert.ok(
    green.degrees - violet.degrees > 0.5 && red.degrees - green.degrees > 0.5,
    `the three casts sit at ${violet.degrees.toFixed(2)}/${green.degrees.toFixed(2)}/${red.degrees.toFixed(2)} ` +
      "degrees — too close together to read as separate layers",
  );
  // And each cast has to be a colour rather than a rounding difference. What
  // shipped held R/G within 0.58..0.73 and B/G within 0.06..0.17 across the
  // ENTIRE visible strip: measurably one hue, which is what "only the green
  // reads" means numerically. Each channel must own its own band outright.
  assert.ok(
    violet.fraction[2] > 0.5,
    `the bluest band is only ${(violet.fraction[2] * 100).toFixed(0)}% blue: the violet never takes the hem`,
  );
  assert.ok(
    green.fraction[1] > 0.5,
    `the greenest band is only ${(green.fraction[1] * 100).toFixed(0)}% green: the core has lost its own line`,
  );
  assert.ok(
    red.fraction[0] > 0.5,
    `the reddest band is only ${(red.fraction[0] * 100).toFixed(0)}% red: there is no mantle, only a warm edge`,
  );

  // The top feather must not cut the mantle at its own peak. It exists to hide
  // the geometry's rim; starting it below the 630.0 window made it delete the
  // layer it was supposed to be feathering, at 0.394 of peak.
  const featherStart = Number(/smoothstep\(1\.0,\s*([0-9.]+),\s*north\)/.exec(AURORA_FRAGMENT_SHADER)?.[1]);
  assert.ok(
    Number.isFinite(featherStart) && featherStart >= byId["oi-630.0"].altitude,
    `the top feather starts at ${featherStart}, below the 630.0 window at ${byId["oi-630.0"].altitude}`,
  );

  // The colour fix is not allowed to be a brightness fix. Restoring the
  // luminance the old normalisation deleted raised EVERY channel -- the green
  // core measured 64/255 against the 52.8 it shipped at -- so the intensity had
  // to come down by the same factor to hold the core where it was. If a later
  // pass raises it back toward 1.3 it is spending the colour work as light, and
  // the house rule decides that: if the aurora becomes the first thing the eye
  // finds, the pass has failed however good the curtain is.
  assert.ok(
    AURORA_RENDER.intensity <= 0.9,
    `intensity is ${AURORA_RENDER.intensity}: the display weights already carry the luminance that ` +
      "1.3 was compensating for, so this is now exposure on top of exposure",
  );
});

// ---------------------------------------------------------------------------
// A28 — the shader must spend each line's weight ONCE.
//
// The defect A27 catches on screen has one arithmetic cause, and it is worth
// catching at the source too, because it is invisible by inspection: two lines
// that each look right compose into a two-order-of-magnitude error.
//
//   cone += i * LINE_PHOTOPIC * LINE_RGB     with LINE_RGB normalised to 1
//
// LINE_RGB had had its luminance divided out; LINE_PHOTOPIC is ybar, a
// DIFFERENT luminance. For 557.7 they are the same number and the line is
// exact. For 427.8, whose Z is 138x its Y, the blue channel came out 111x
// short. So this asserts the cone sum is weighted by the display triple alone.
// ---------------------------------------------------------------------------

contract("A28", "the cone sum weights each line once, by its display triple", () => {
  const cone = /vec3 cone =([^;]+);/.exec(AURORA_FRAGMENT_SHADER);
  assert.ok(cone, "the shader has no cone sum");
  assert.ok(
    !/LINE_PHOTOPIC/.test(cone[1]),
    `the cone sum multiplies by ybar on top of the display triple, which double-counts luminance:${cone[1]}`,
  );
  for (let k = 0; k < AURORA_EMISSION_LINES.length; k += 1) {
    assert.ok(
      new RegExp(`i${k}\\s*\\*\\s*LINE_RGB_${k}`).test(cone[1]),
      `line ${k} is not weighted by its own display triple in the cone sum`,
    );
  }

  // The rod vector is a fiction — rods have one spectral sensitivity and no
  // chromaticity — whose only job is to be blended toward grey. That blend is
  // meaningless unless the fiction is scale-matched to the scalar it is blended
  // against, so luma(rod) must equal the scotopic sum identically.
  for (const line of AURORA_EMISSION_LINES) {
    const chroma = line.rgb.map((c) => c / srgbLuminance(line.rgb));
    assert.ok(
      Math.abs(srgbLuminance(chroma) - 1) < 1e-6,
      `${line.id}: its rod chroma has luminance ${srgbLuminance(chroma).toFixed(6)}, not 1`,
    );
    const emitted = new RegExp(
      `LINE_CHROMA_\\d = vec3\\(${chroma.map((c) => c.toFixed(4)).join(", ")}\\)`,
    );
    assert.ok(emitted.test(AURORA_FRAGMENT_SHADER), `${line.id}: its rod chroma is not in the shader`);
  }
  assert.ok(
    /vec3 rod =[^;]*LINE_CHROMA_0/.test(AURORA_FRAGMENT_SHADER),
    "the rod sum does not use the unit-luminance chroma",
  );

  // Alpha follows the light the fragment ADDS. Keying it off the photometric
  // luminance delivers a correct out-of-gamut violet and then multiplies it by
  // nothing, which is a second way to lose a channel after fixing the first.
  assert.ok(
    /float luminance = dot\(colour, vec3\(0\.2126, 0\.7152, 0\.0722\)\)/.test(AURORA_FRAGMENT_SHADER),
    "alpha is not following the colour the fragment actually writes",
  );
});

// ---------------------------------------------------------------------------
// A29 — a threshold no data ever crosses.
//
// The N2 1P layer is gated on flux*hardness because it needs the hardest
// precipitation in the field, and the gate read smoothstep(0.5, 1.7, ...)
// against a quantity whose MAXIMUM over the sampled rows is 1.031. It never
// opened. Not rarely: never, at any tier, in any pose — mean gate value 0.0012,
// fully open in 0.00% of cells. The line was in the emission map, in the CIE
// table, in the Chapman stack, in four assertions, and contributed nothing to
// any pixel that has ever been rendered.
//
// It cost a visible defect. A real auroral hem is violet-PINK, and the pink is
// this line sitting under the 427.8 violet; with it gated off the hem could
// only ever come out blue, which against a sky that is itself blue is no hem
// at all.
//
// A gate is a claim about a distribution, so it has to be checked against one.
// This is the only aurora contract that evolves a field, because "rare" is not
// a property of a constant.
// ---------------------------------------------------------------------------

contract("A29", "the rarest emission layer is rare, not absent", () => {
  const gate = /smoothstep\(([0-9.]+),\s*([0-9.]+),\s*flux \* hardness\)/.exec(AURORA_FRAGMENT_SHADER);
  assert.ok(gate, "the N2 1P gate is not in the shader");
  const [low, high] = [Number(gate[1]), Number(gate[2])];
  const smoothstep = (e0, e1, x) => {
    const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
    return t * t * (3 - 2 * t);
  };

  const profile = AURORA_TIERS.medium;
  const field = createAuroraField({ nx: profile.nx, ny: profile.ny });
  for (let step = 0; step < 300; step += 1) field.step(AURORA_PHYSICS.dt);
  const packed = new Float32Array(profile.nx * profile.ny * 4);
  field.pack(packed);

  // Only the rows the shader ever samples. The trap's tails carry no flux and
  // averaging them in would make any gate look shut.
  const values = [];
  const from = Math.floor(AURORA_LAYOUT.fieldLow * profile.ny);
  const to = Math.ceil(AURORA_LAYOUT.fieldHigh * profile.ny);
  for (let j = from; j <= to && j < profile.ny; j += 1) {
    for (let i = 0; i < profile.nx; i += 1) {
      const base = (j * profile.nx + i) * 4;
      const re = packed[base];
      const im = packed[base + 1];
      const density = Math.max(packed[base + 2], 0);
      const u = i / profile.nx;
      const altitude = (j / profile.ny - AURORA_LAYOUT.fieldLow) / (AURORA_LAYOUT.fieldHigh - AURORA_LAYOUT.fieldLow);
      const theta = AURORA_CARRIER_UV[0] * u + AURORA_CARRIER_UV[1] * altitude;
      const thetaB = AURORA_CARRIER_UV_B[0] * u + AURORA_CARRIER_UV_B[1] * altitude;
      const rePsi =
        (1 - AURORA_RENDER.carrierMix) * (re * Math.cos(theta) - im * Math.sin(theta)) +
        AURORA_RENDER.carrierMix * (re * Math.cos(thetaB) - im * Math.sin(thetaB));
      const flux = density * (1 - AURORA_RENDER.rayDepth) + 2 * AURORA_RENDER.rayDepth * rePsi * rePsi;
      values.push(flux * (packed[base + 3] / AURORA_RENDER.hardness));
    }
  }

  const open = values.filter((value) => smoothstep(low, high, value) > 0.05).length / values.length;
  assert.ok(
    open > 0.02,
    `the N2 1P gate opens on ${(open * 100).toFixed(2)}% of the field against a threshold of ${low}: ` +
      `the distribution tops out at ${Math.max(...values).toFixed(3)} — this layer renders nowhere`,
  );
  // And rare is the other half of the claim. A deep-red layer over a third of
  // the curtain is not the hardest precipitation, it is a red wash.
  assert.ok(
    open < 0.25,
    `the N2 1P gate opens on ${(open * 100).toFixed(1)}% of the field: the rarest layer is not rare`,
  );
  assert.ok(
    high < Math.max(...values),
    `the gate saturates at ${high}, above the field's maximum of ${Math.max(...values).toFixed(3)}: ` +
      "a ceiling nothing reaches is a layer that never renders at full strength",
  );
});

// ---------------------------------------------------------------------------
// A30 — the third comb, and the four separations that make it a filament scale
// rather than a moire.
//
// A22 is this assertion for the second carrier and its reasoning applies here
// unchanged: a comb that repeats inside a frame is a ruled screen, and a comb
// that lands on a scale already in the picture is interference rather than
// structure. What is new is that there are now THREE combs, so the coprimality
// is a three-way claim and there are two new beats instead of one.
//
// The frequency this was chosen against is measured rather than assumed. The
// spectrum of the aurora's own contribution across the sky at
// assembly-tool-locker, aurora-on minus aurora-off, medium tier, 1440x900:
// rms 10.18 in the 96-288px envelope, 6.57 at the 48-90px filaments, and 1.90
// at 29-46px. The picture had two scales and a hole under them.
// ---------------------------------------------------------------------------

contract("A30", "the third comb is a finer filament scale, not a moire with the first two", () => {
  const expected = [
    AURORA_PHYSICS.k0c[0] * AURORA_BOX.lx,
    AURORA_PHYSICS.k0c[1] * AURORA_BOX.ly * (AURORA_LAYOUT.fieldHigh - AURORA_LAYOUT.fieldLow),
  ];
  for (let i = 0; i < 2; i += 1) {
    assert.ok(
      Math.abs(AURORA_CARRIER_UV_C[i] - expected[i]) < 1e-9,
      `AURORA_CARRIER_UV_C[${i}] is not k0c scaled by the box extent`,
    );
  }

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  for (const other of [AURORA_PHYSICS.k0[0], AURORA_PHYSICS.k0b[0]]) {
    assert.equal(
      gcd(other, AURORA_PHYSICS.k0c[0]),
      1,
      `gcd(${other}, ${AURORA_PHYSICS.k0c[0]}) > 1: the three-comb superposition repeats inside the ` +
        "frame, which turns the interleaving back into a regular comb",
    );
  }

  // FINER, and by enough to be a separate scale. Two combs a few percent apart
  // are one comb with a slow beat, which is what the first two already are.
  const ratio = AURORA_PHYSICS.k0c[0] / AURORA_PHYSICS.k0[0];
  assert.ok(
    ratio > 1.5 && ratio < 2.1,
    `the third comb is ${ratio.toFixed(2)}x the first: outside that it is either the same scale again ` +
      "or past the pitch floor below",
  );

  // The pitch floor is what stops it at 1.71 rather than at 2. The veil lays a
  // whole box across the frame, so it is the tight case at every tier.
  const cssWidth = 1440;
  for (const [tier, profile] of Object.entries(AURORA_TIERS)) {
    const c = auroraFringePitch({ carrier: AURORA_CARRIER_UV_C, cssWidth, dpr: profile.dpr });
    assert.ok(
      c.pitchDevicePx > 5 && c.pitchDevicePx < 40,
      `${tier}: third comb at ${c.pitchDevicePx.toFixed(2)} device px, outside the visible window — ` +
        "below about 5 a fringe aliases into shimmer, which reads as noise rather than as filaments",
    );
  }

  // The two new beats. Both have to clear the 11-cycle bundle beat the first
  // two make AND the modulational filaments, or the new comb is drawing at a
  // scale the picture already has.
  const { kMi } = auroraFilamentPitch({ cssWidth, dpr: 1 });
  const filaments = (kMi * AURORA_BOX.lx) / (2 * Math.PI);
  const bundleBeat = Math.abs(AURORA_PHYSICS.k0b[0] - AURORA_PHYSICS.k0[0]);
  for (const [label, against] of [
    ["the first carrier", AURORA_PHYSICS.k0[0]],
    ["the second carrier", AURORA_PHYSICS.k0b[0]],
  ]) {
    const beat = Math.abs(AURORA_PHYSICS.k0c[0] - against);
    assert.ok(
      beat / filaments > 1.5 && beat / bundleBeat > 1.5,
      `the beat against ${label} is ${beat} cycles, against ${filaments.toFixed(1)} MI filaments and a ` +
        `${bundleBeat}-cycle bundle beat: too close to a scale already in the picture`,
    );
  }

  // And the rake. Rays that lean differently from each other are three fields,
  // not one.
  const rake = (k) => k[1] / k[0];
  assert.ok(
    Math.abs(rake(AURORA_PHYSICS.k0c) - rake(AURORA_PHYSICS.k0b)) < 0.05,
    "the third comb rakes differently from the second: the filaments would not read as one field",
  );

  assert.match(
    AURORA_FRAGMENT_SHADER,
    /float thetaC = dot\(uCarrierC, vec2\(u, altitude\)\) - uCarrierPhaseC;/,
    "the third carrier must be dotted with the bare uv coordinate on the same terms as the other two",
  );
  assert.doesNotMatch(AURORA_FRAGMENT_SHADER, /uCarrierC\s*\*/, "no ad-hoc rescaling of the third carrier");
  // THE STRUCTURE CHANGE IS NOT ALLOWED TO BE A BRIGHTNESS CHANGE, and this is
  // the clause the first version of this pass broke. `standing` is the square
  // of the superposition and the combs are uncorrelated, so the curtain's
  // brightness follows the sum of the squared weights. A convex mix holds the
  // peak — where the combs align, a measure-zero part of the arc — and drops
  // that sum from 0.545 to 0.357, which shipped as a curtain 23% dimmer
  // everywhere and was invisible to every per-pixel assertion in this file.
  const meanSquare = (weights) => weights.reduce((sum, w) => sum + w * w, 0);
  const pair = meanSquare([1 - AURORA_RENDER.carrierMix, AURORA_RENDER.carrierMix]);
  const trio = meanSquare([
    (1 - AURORA_RENDER.filamentMix) * (1 - AURORA_RENDER.carrierMix),
    (1 - AURORA_RENDER.filamentMix) * AURORA_RENDER.carrierMix,
    AURORA_RENDER.filamentMix,
  ]);
  assert.ok(
    Math.abs(trio * AURORA_CARRIER_NORM ** 2 - pair) < 1e-12,
    `the three combs carry ${(trio * AURORA_CARRIER_NORM ** 2).toFixed(4)} of mean current against the ` +
      `two combs' ${pair.toFixed(4)}: adding a filament scale has changed the exposure, which A27 forbids`,
  );
  assert.match(
    AURORA_FRAGMENT_SHADER,
    /float rePsi = uCarrierNorm \* mix\(/,
    "the superposition must be renormalised, or the third comb costs the curtain a third of its light",
  );
});

// ---------------------------------------------------------------------------
// A31 — the core term has to fire on the field the browser actually renders.
//
// This is A29's lesson applied to the thing A29's lesson was learned on. The
// N2 1P gate was set at 0.5 against a distribution whose maximum was 1.031 and
// opened nowhere; mesoHigh was 0.55 against a curtain that almost never reached
// it, so everything rendered from the rod channel and came out sage. Both were
// thresholds nobody had compared to a distribution.
//
// The core term is a third threshold on the same shader, so it gets the same
// treatment, and it has TWO failure directions rather than one. A knee above
// the field is a term that never fires and a fix that does nothing. A knee
// below the body of the curtain is a wash — the whole band delivered past the
// alpha ceiling, which is the house rule's own failure condition: the aurora
// becomes the first thing the eye finds and the building the second.
//
// The knee is not free either. It is pinned to the exposure at which alpha
// stops responding, because the claim the term makes is precisely "this is the
// light the ceiling was discarding" — if the knee drifts off that point the
// term is either double-counting light the body already delivered or leaving a
// gap where neither does.
// ---------------------------------------------------------------------------

contract("A31", "the additive core covers exactly the exposure the alpha ceiling discards", () => {
  const smoothstep = (e0, e1, x) => {
    const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
    return t * t * (3 - 2 * t);
  };
  const chapman = (y, peak, h) => {
    const s = Math.max((y - peak) / h, -8);
    return Math.exp(1 - s - Math.exp(-s));
  };
  const alphaOf = (exposure) => {
    const a = Math.min(Math.max(exposure, 0), 1);
    return Math.min(AURORA_RENDER.alphaCeiling, AURORA_RENDER.alphaCeiling * (a / (1 + a)) * 2);
  };

  // THE KNEE IS THE SATURATION POINT, asserted against the alpha curve in the
  // shader rather than against a number in a comment.
  assert.ok(
    AURORA_RENDER.alphaCeiling - alphaOf(AURORA_RENDER.coreKnee) < 1e-9,
    `alpha at the core knee is ${alphaOf(AURORA_RENDER.coreKnee).toFixed(4)} against a ceiling of ` +
      `${AURORA_RENDER.alphaCeiling}: the knee is not where the ceiling stops responding, so the core ` +
      "term is either double-counting the body or leaving a gap under itself",
  );

  // Now the distribution, from a posed field at the shipped tier, through the
  // shader's own emission arithmetic. The altitude axis is sampled far finer
  // than the grid because every altitude dependence in the emission map is
  // analytic — the Chapman layers — and the grid only carries the envelope.
  const profile = AURORA_TIERS.medium;
  const field = createAuroraField({ nx: profile.nx, ny: profile.ny });
  for (let step = 0; step < 300; step += 1) field.step(AURORA_PHYSICS.dt);
  const packed = new Float32Array(profile.nx * profile.ny * 4);
  field.pack(packed);

  const chroma = AURORA_EMISSION_LINES.map((line) => line.rgb.map((c) => c / srgbLuminance(line.rgb)));
  // The strip the cameras show: the true horizon underneath, the widest sky
  // above it. Below the horizon the depth-tested shell is rejected by the
  // terrain and nothing there is ever shaded, so averaging it in would report a
  // curtain that is mostly dark.
  const bandDegrees = AURORA_SHELL_ELEVATION.high - AURORA_SHELL_ELEVATION.low;
  const horizon = -AURORA_SHELL_ELEVATION.low / bandDegrees;
  let widest = 0;
  for (const id of STATION_WORLD_SCHEMA.order) {
    const solved = solvePolarCameraComposition({
      height: 900,
      quality: "medium",
      sealPosition: STATION_WORLD_SCHEMA.stations[id].dock,
      station: STATION_WORLD_SCHEMA.stations[id],
      velocity: { x: 0, z: 0 },
      width: 1440,
    });
    widest = Math.max(widest, solved.camera.verticalFovDegrees / 2 - solved.camera.elevationDegrees);
  }
  const top = Math.min(1, (widest - AURORA_SHELL_ELEVATION.low) / bandDegrees);

  const exposures = [];
  for (let stepIndex = 0; stepIndex <= 80; stepIndex += 1) {
    const altitude = horizon + (stepIndex / 80) * (top - horizon);
    const row = Math.min(
      profile.ny - 1,
      Math.round((AURORA_LAYOUT.fieldLow + altitude * (AURORA_LAYOUT.fieldHigh - AURORA_LAYOUT.fieldLow)) * profile.ny),
    );
    const fade = smoothstep(0, 0.06, altitude) * smoothstep(1, 0.74, altitude);
    for (let i = 0; i < profile.nx; i += 1) {
      const base = (row * profile.nx + i) * 4;
      const re = packed[base];
      const im = packed[base + 1];
      const density = Math.max(packed[base + 2], 0);
      const u = i / profile.nx;
      const dot2 = (k) => k[0] * u + k[1] * altitude;
      const wave = (k) => re * Math.cos(dot2(k)) - im * Math.sin(dot2(k));
      const rePsi =
        AURORA_CARRIER_NORM *
        ((1 - AURORA_RENDER.filamentMix) *
          ((1 - AURORA_RENDER.carrierMix) * wave(AURORA_CARRIER_UV) +
            AURORA_RENDER.carrierMix * wave(AURORA_CARRIER_UV_B)) +
          AURORA_RENDER.filamentMix * wave(AURORA_CARRIER_UV_C));
      const flux = density * (1 - AURORA_RENDER.rayDepth) + 2 * AURORA_RENDER.rayDepth * rePsi * rePsi;
      const hardness = packed[base + 3] / AURORA_RENDER.hardness;
      const reach = 0.75 + 0.5 * Math.min(density, 1.5);
      const stop = 0.05 * Math.min(1.2, Math.max(-1, hardness - 0.8));
      const [violet, green, red, deepRed] = AURORA_EMISSION_LINES;
      const intensities = [
        violet.rate * flux * Math.min(3, Math.max(0, hardness)) * chapman(altitude, violet.altitude - stop, violet.scaleHeight * reach),
        green.rate * flux * chapman(altitude, green.altitude - stop, green.scaleHeight * reach),
        red.rate * (0.4 * flux + 0.6 * density) * Math.exp(-hardness) * chapman(altitude, red.altitude, red.scaleHeight * reach),
        deepRed.rate * smoothstep(0.15, 0.7, flux * hardness) * chapman(altitude, deepRed.altitude - stop, deepRed.scaleHeight),
      ];
      const cone = [0, 0, 0];
      const rod = [0, 0, 0];
      let photopic = 0;
      let scotopic = 0;
      intensities.forEach((value, k) => {
        const line = AURORA_EMISSION_LINES[k];
        for (let c = 0; c < 3; c += 1) {
          cone[c] += value * line.rgb[c];
          rod[c] += value * line.scotopic * chroma[k][c];
        }
        photopic += value * line.photopic;
        scotopic += value * line.scotopic;
      });
      const meso = smoothstep(AURORA_RENDER.mesoLow, AURORA_RENDER.mesoHigh, photopic);
      const colour = cone.map((value, c) => {
        const rodMixed =
          rod[c] * (1 - AURORA_RENDER.rodAchromatic) + scotopic * AURORA_RENDER.rodAchromatic;
        return rodMixed * (1 - meso) + value * meso;
      });
      exposures.push(fade * srgbLuminance(colour) * AURORA_RENDER.intensity);
    }
  }

  const above = (knee) => exposures.filter((value) => value > knee).length / exposures.length;
  const peak = Math.max(...exposures);
  assert.ok(
    peak > 2 * AURORA_RENDER.coreKnee,
    `the curtain's peak exposure is ${peak.toFixed(3)} against a knee of ${AURORA_RENDER.coreKnee} and a ` +
      "smoothstep that saturates at 4x it: the core term never opens, which is mesoHigh at 0.55 again",
  );
  const fraction = above(AURORA_RENDER.coreKnee);
  assert.ok(
    fraction > 0.01,
    `the core term fires on ${(fraction * 100).toFixed(2)}% of the visible strip: a hem nobody can see`,
  );
  // AND NARROW. This is the house rule as a number. A curtain delivered past
  // the ceiling over a fifth of the sky is not a hem with a core in it, it is
  // a brighter aurora, and a brighter aurora takes the frame off the building.
  assert.ok(
    fraction < 0.12,
    `the core term fires on ${(fraction * 100).toFixed(1)}% of the visible strip: past the knee the ` +
      "curtain is no longer bounded by the alpha ceiling, so this much of it is a light show",
  );
  // The gain is bounded for the same reason, and stated against the ceiling it
  // is escaping rather than as a bare number.
  assert.ok(
    AURORA_RENDER.coreGain > 0 && AURORA_RENDER.coreGain <= 4 * AURORA_RENDER.alphaCeiling,
    `coreGain ${AURORA_RENDER.coreGain} is more than four times the alpha ceiling it bypasses: ` +
      "at that point the ceiling is decoration and the curtain is exposed by this constant alone",
  );

  // THE TRANSPORT. The core term is additive only because the shader writes
  // premultiplied rgb and both hosts ask three for the premultiplied blend
  // functions. Miss either half and the term is multiplied by the very ceiling
  // it exists to escape — silently, because the curtain still renders.
  assert.match(
    AURORA_FRAGMENT_SHADER,
    /gl_FragColor = vec4\(colour \* \(alpha \+ core\), alpha\);/,
    "the fragment must write premultiplied rgb with the core outside the alpha product",
  );
  for (const file of ["components/AuroraSkyShell.jsx", "components/AuroraFieldCurtain.jsx"]) {
    assert.match(
      readFileSync(file, "utf8"),
      /premultipliedAlpha/,
      `${file} does not declare premultipliedAlpha: its curtain renders at ${AURORA_RENDER.alphaCeiling} ` +
        "of itself and the core term does nothing",
    );
  }
  // Nothing time-dependent may enter the core term. Reduced motion freezes the
  // field and pins the carrier phases; a core keyed off anything else would
  // animate under a preference that promises stillness.
  assert.doesNotMatch(
    /float core = .*/.exec(AURORA_FRAGMENT_SHADER)?.[0] ?? "",
    /uCarrierPhase|uDrift|time/i,
    "the core term reads a clock: reduced motion would no longer resolve to a still curtain",
  );
});

// ---------------------------------------------------------------------------
// A21 — the veil must not be able to swallow the site's clicks.
//
// A fullscreen fixed layer over the whole document is one CSS mistake away from
// being an invisible sheet that eats every click on the portfolio. This one was
// real: R3F's container div hard-codes pointerEvents: "auto" inline, which beats
// pointer-events: none inherited from the wrapper, and the veil intercepted the
// ENTER THE WORLD button. It survived several capture runs because those clicked
// through element.click(), which bypasses hit-testing entirely.
// ---------------------------------------------------------------------------

contract("A21", "the veil is inert to pointer events at every level", () => {
  const curtain = readFileSync(new URL("../components/AuroraFieldCurtain.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(
    curtain,
    /<Canvas[\s\S]{0,600}style=\{\{ pointerEvents: "none" \}\}/,
    "the Canvas must override R3F's inline pointerEvents: auto",
  );
  const flattened = styles.replace(/\s+/g, " ");
  assert.ok(
    flattened.includes(".aurora-field-veil, .aurora-field-veil * { pointer-events: none !important; }"),
    "every descendant of the veil must be pointer-inert, not just the wrapper",
  );
});

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`Aurora field contract failed (${failures.length} of ${checked}):\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Aurora field contract passed: ${checked} assertions — unitary split-step, ` +
    "energy bounded without drift, free-packet spread and group velocity against closed forms, " +
    "MI band selection, two negative controls, CIE emission colour.",
);
