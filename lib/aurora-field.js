/**
 * The aurora field: a Gross-Pitaevskii / nonlinear Schrodinger field evolved by
 * Strang split-step Fourier on the CPU, sampled by one fullscreen fragment pass.
 *
 * Full derivation, the alternatives that were rejected, and the executable form
 * of every claim below: docs/research/aurora-field-math.md.
 * Every assertion id (A1..A25) names a row of that document's section 6 and a
 * contract in scripts/check-aurora-field.mjs.
 *
 *   i d(psi)/dt = [ -1/2 grad^2 + V(x,y,t) + g|psi|^2/(1 + |psi|^2/nSat) ] psi
 *
 * Three things about this file are load-bearing and easy to undo by accident:
 *
 * 1. It imports nothing. The check script runs it under plain node, and the
 *    browser runs the same functions, so there is no reference implementation
 *    to drift away from the shipped one. Adding a `three` import here would
 *    break the check and quietly create that gap. The GLSL is exported as a
 *    string for the same reason.
 *
 * 2. The field evolved on the grid is the ENVELOPE, not the wavefunction. With
 *    psi = phi * exp(i(k0.x - w0 t)) and w0 = |k0|^2/2, the envelope obeys the
 *    same equation in the frame co-moving at the group velocity, and the
 *    carrier is evaluated analytically per pixel in the fragment shader. That
 *    is the only reason a 256x32 grid can produce ~22px ray fringes at 1440
 *    without looking like a stretched texture: the grid never has to resolve
 *    them.
 *
 * 3. Grid spacing is isotropic (nx/ny == lx/ly) so k_max is a single number and
 *    the stability bound in auroraStabilityBound is a single number. A13 asserts
 *    it for every tier; changing one of nx, ny, lx, ly alone will fail there.
 */

/** One circuit of the auroral oval by lx; the curtain's altitude span by ly. */
export const AURORA_BOX = Object.freeze({ lx: 2 * Math.PI, ly: Math.PI / 4 });

/**
 * Physical parameters, identical at every tier so the tiers show one world at
 * three resolutions rather than three worlds.
 *
 * g and nSat are tied together by what they have to produce. The modulational
 * instability that breaks a flat sheet into filaments grows fastest at
 * k_MI = sqrt(2|g_eff|n) with g_eff = g/(1+n/nSat)^2 for the saturable form, so
 * the filament spacing and the growth rate are one choice, not two: fine
 * filaments imply fast growth. At g=-360, nSat=2 and a core density near 1,
 * g_eff = -160 and k_MI = 17.9, i.e. 18 filaments across the frame (~80 CSS px
 * at 1440) reached in about 5s of wall time. What the visitor watches
 * afterwards is not the instability but the trap sloshing, at a ~32s period.
 *
 * dt is 0.21 of the stability bound at the finest tier (A13 asserts <= 0.25).
 */
export const AURORA_PHYSICS = Object.freeze({
  /** exp(-i(V+F)dt) must not wrap: see auroraStabilityBound. */
  dt: 8e-5,
  /**
   * Two incommensurate fold modes displacing the trap centre along the arc.
   *
   * The omegas are small against trapOmega on purpose, and this is the single
   * most important number in the block. A Hamiltonian field has nothing that
   * removes energy, so a trap driven at anything near its own frequency heats
   * without bound: measured at omega = 110 and -180 against trapOmega = 240,
   * the field climbed out of the trap and reached 56% of peak density at the
   * y-boundary within 33 minutes of wall time. At 12 and -19 -- ratios of 0.05
   * and 0.08, adiabatic -- the same run stays at 1e-3 and the field never
   * escapes. A14 asserts the boundary; the ratio assertion beside it is the
   * root cause rather than the symptom.
   *
   * Nothing is lost visually, because the drift a viewer reads as the curtain
   * travelling along the oval is a rigid translation, and a rigid translation
   * on a periodic axis is exactly a texture-coordinate offset (uDrift) -- free,
   * exact, and not something the field has to be driven into doing.
   */
  folds: Object.freeze([
    Object.freeze({ amplitude: 0.03, mode: 3, omega: 12 }),
    Object.freeze({ amplitude: 0.015, mode: 7, omega: -19 }),
  ]),
  /**
   * Negative: focusing. Defocusing smooths, which is the blob failure mode.
   *
   * Magnitude set by scale separation rather than by taste. At -880 the MI
   * band came out at k_MI = 28, i.e. 28 filaments across the frame against the
   * carrier's 64 fringes -- a ratio of 2.3, close enough that the two read as
   * one texture. At -360, k_MI = 17.9 gives 18 filaments to 64 fringes, a ratio
   * of 3.6: each filament is a bundle of three or four rays, which is what a
   * curtain actually is.
   */
  g: -360,
  /**
   * Carrier wavevector. |k0| sets the ray fringe pitch, its tilt their rake.
   *
   * 80 and not the original 64 because of what the shell's framing does to it.
   * The veil lays a whole box across 1440px, where 64 rays are 22 CSS px apart;
   * the shell shows 80% of a box in a sky strip 84px tall, where the same 64
   * became 28px and each ray was only three times taller than it was wide. A
   * ray that stout is a lozenge. At 80 it is 22px on the shell and the striation
   * reads. A25 asserts the ratio against the curtain's own height.
   *
   * This costs the field nothing: the carrier is evaluated analytically per
   * pixel and never touches the split-step, so k0 has no bearing on stability,
   * on the norm, or on the modulational instability that sets the filaments.
   * The one thing it does move is the scale separation, from 64/17.9 = 3.6 to
   * 80/17.9 = 4.5 -- each filament a bundle of four or five rays instead of
   * three or four, which is if anything closer to a curtain.
   */
  k0: Object.freeze([80, 10]),
  /**
   * The SECOND resonator harmonic, and the reason the rays are not a barcode.
   *
   * The ionospheric Alfven resonator is a cavity between the E region and the
   * Alfven-speed gradient above it, so it supports a BAND of field-aligned
   * wavenumbers rather than one. One carrier is a comb of a single pitch, and a
   * comb of a single pitch is a ruled screen. Two of them superposed interleave:
   * the local ray spacing alternates, and their beat -- 11 cycles across the
   * arc against the carrier's 80 -- gathers the rays into brighter and fainter
   * BUNDLES, which is the structure a curtain actually shows.
   *
   * 91 and not 90: gcd(80, 91) = 1, so the combined comb repeats only over the
   * full circuit of the oval and never inside a frame. And 11 beats against the
   * 18 modulational-instability filaments is a 1.6x separation -- close enough
   * to reinforce, far enough not to moire. A22 asserts both.
   *
   * The two advance at different omega = |k|^2/2 (3250 against 4253), so the
   * bundles drift through the rays instead of riding along with them.
   */
  k0b: Object.freeze([91, 15]),
  /**
   * The THIRD mode, and the one that puts structure where the frame had none.
   *
   * Measured off the shipped render rather than reasoned about: the spectrum of
   * the aurora's own contribution across the sky strip has the envelope at
   * 96-288px, the modulational filaments at 48-90px, and then a hole -- rms
   * 1.90 at 29-46px against 10.18 at the blobs. A real curtain is filamented at
   * two or three frequencies at once and the finest of them is the one that
   * makes it read as light rather than as gradient. This is that frequency.
   *
   * 137 and not 160, which is the arithmetic octave. The pitch floor is the
   * one that binds: the veil lays a whole box across the frame at dpr 0.5 on
   * the low tier, where 160 fringes are 4.5 device px and shimmer. 137 lands
   * at 5.26, which is the same window A19 and A22 hold the other two carriers
   * to, and gives 12.8 CSS px on the shell against the first carrier's 21.9.
   * A ratio of 1.71, set by aliasing rather than by preference.
   *
   * gcd(137, 80) = gcd(137, 91) = 1 -- 137 is prime, so the three-comb
   * superposition repeats only over the full circuit of the oval. And the two
   * new beats it makes, |137-80| = 57 and |137-91| = 46, sit far above both the
   * existing 11-cycle bundle beat and the 18 modulational filaments, so the new
   * comb cannot moire with either of the scales already in the picture. A30
   * asserts all four of those separations.
   *
   * The tilt keeps the rake: 22/137 = 0.161 against 15/91 = 0.165. Rays that
   * leaned differently from each other would not read as one field.
   */
  k0c: Object.freeze([137, 22]),
  /** Saturation. Arrests the 2D critical collapse a cubic focusing term has. */
  nSat: 2,
  /**
   * Harmonic altitude confinement; ground-state width sigma = 1/sqrt(omega).
   *
   * Set by what the curtain has to look like rather than by what is easiest to
   * confine. At 240 the ground state was sigma = ly/12, so the field occupied
   * about three cells of a 16-cell altitude axis and every filament rendered as
   * a lozenge roughly as tall as it was wide -- structurally correct, visually a
   * caterpillar. At 162 it is sigma = ly/10, the curtain spans most of the
   * rendered altitude band, and the four emission windows land on genuinely
   * different parts of it instead of all sampling the same three cells.
   *
   * Lower still would look better and stops being confinement: at 162 the box
   * edge sits 4.4 sigma out, which is what keeps A14 true.
   */
  trapOmega: 162,
});

/**
 * Grid per quality tier. nx/ny is pinned to lx/ly so the spacing is isotropic.
 * Both extents are powers of two because the transform is radix-2.
 *
 * The cost that matters is CPU: one tick is two 2D transforms plus two O(N)
 * passes. Everything the GPU does is one fullscreen pass with a single texture
 * tap, which is why the grid can be this small without the frame noticing.
 */
export const AURORA_TIERS = Object.freeze({
  high: Object.freeze({ dpr: 0.75, nx: 256, ny: 32, tickHz: 15 }),
  low: Object.freeze({ dpr: 0.5, nx: 128, ny: 16, tickHz: 8 }),
  medium: Object.freeze({ dpr: 0.6, nx: 128, ny: 16, tickHz: 15 }),
});

/**
 * The four auroral emission lines.
 *
 * `rgb` is the CIE 1931 2-degree colour-matching functions evaluated at the
 * line's wavelength (Wyman-Sloan-Ludwig 2013 multi-lobe Gaussian fit), through
 * the sRGB D65 matrix, gamut-mapped by mixing toward the white point until no
 * channel is negative, and NOT normalised -- see cieLineDisplayRgb for the two
 * orders of magnitude that normalisation used to cost the violet. A17
 * recomputes all of it. It is a weight, not a colour: the channels run past 1
 * because these are linear-light contributions per unit column rate, and 630.0
 * really does put 1.87 units of red on a display for every unit of Y it has.
 *
 * `photopic` is ybar(lambda), `scotopic` is V'(lambda). Their ratio spans three
 * orders of magnitude across these four lines and that ratio is the colour
 * model: rods are 21x more sensitive to 427.8 than cones are and effectively
 * blind to both reds, which is why a faint aurora is pale blue-white to the eye
 * and only a bright one is green. A18 asserts the ordering. They are the ROD
 * reweighting and the mesopic crossover only; neither scales the cone sum any
 * more, because `rgb` already carries the line's luminance.
 *
 * `altitude` is where the line peaks across the rendered altitude range and
 * `scaleHeight` is the H of the Chapman production layer it emits in, both set
 * by where the exciting electrons stop and by collisional quenching: O(1D) at
 * 630.0 has a 110s lifetime so it survives only above ~200km, O(1S) at 557.7
 * has 0.7s and fills the core, 427.8 needs ionising electrons that reach
 * ~110km, and N2 1P needs the hardest precipitation of all, deepest and rarest.
 *
 * scaleHeight is NOT a Gaussian sigma and the difference is the whole hem. A
 * Chapman layer falls off as a double exponential below its peak and a single
 * exponential above it, so 2H below the peak is 1% and 5H above it is still 2%.
 * Read as a picture: each line switches on abruptly at the altitude its
 * electrons stop at and bleeds away slowly overhead. See chapman() in the GLSL.
 *
 * The windows barely overlap, and that separation is doing real work. Green is
 * 550x brighter than 427.8 in luminance -- ybar(557.7)=0.996 against
 * ybar(427.8)=0.0089 -- so anywhere the two windows overlap, the violet is
 * invisible on arithmetic alone. The violet fringe on a real curtain is visible
 * for the same reason it is visible here: it sits BELOW the green, where there
 * is no green to swamp it.
 *
 * WHERE THE FOUR WINDOWS SIT, AND WHY THEY MOVED.
 *
 * `altitude` is a coordinate on the shell band, not a kilometre, and the band
 * is 11 degrees of sky of which only part is ever rasterised. That mapping was
 * never written down, and it was wrong in exactly the way A25 was created to
 * catch one geometry earlier -- three of the four windows peaked outside the
 * strip any camera renders:
 *
 *   line        was          renderable?
 *   670.5       -2.64 deg    no: under the terrain, occluded before shading
 *   427.8       -1.21 deg    no: under the terrain
 *   557.7       +1.43 deg    yes
 *   630.0       +5.17 deg    no at five of eight stations, and cut to 0.394 by
 *                            the shader's own top feather at its own peak
 *
 * So the curtain was green top to bottom because the only line whose window was
 * on screen was the green one. The other three were correct, and nowhere.
 *
 * The strip every station renders is 0 degrees (below it the depth-tested shell
 * is rejected by the terrain) to 4.0 degrees (the observatory plaque's top of
 * frame, the tightest of the twenty-four station/tier framings). The windows
 * are now laid out inside it, bottom to top, keeping the ordering and the
 * spacing that the separation argument above depends on:
 *
 *   670.5   0.385 -> +0.39 deg   the deep scallop the ridges cut into
 *   427.8   0.425 -> +0.83 deg   the violet hem, 1.92 green scale heights below
 *                                the green peak, which is where green has
 *                                fallen to 2% and stops swamping it
 *   557.7   0.550 -> +2.20 deg   the core, with 1.8 deg of headroom to the
 *                                tightest frame's top edge (A26 wants 8px)
 *   630.0   0.740 -> +4.29 deg   the mantle, its lower tenth-of-peak edge at
 *                                3.2 deg so the observatory sees the bottom of
 *                                it and qpu-ice-bridge sees all of it
 *
 * Every scaleHeight is untouched, so the emission HEIGHT in pixels -- the
 * quantity A25 and A26 measure their anisotropy against -- is exactly what it
 * was; a Chapman layer's q(peak) is 1 wherever the peak is put. Nothing here
 * costs a pixel of fill either: the band geometry is unchanged and these bands
 * were already being rasterised and shaded to nearly zero.
 *
 * `rate` is the column emission rate relative to 557.7, at the ratios observed
 * in a bright discrete arc (roughly 100 kR green, 20 kR 427.8, 10-15 kR 630.0).
 * It is separate from the luminous efficiency on purpose: one is how many
 * photons the atmosphere makes, the other is how well an eye answers them.
 */
export const AURORA_EMISSION_LINES = Object.freeze([
  Object.freeze({
    altitude: 0.425,
    id: "n2plus-427.8",
    name: "N2+ 1NG",
    nm: 427.8,
    photopic: 0.0089,
    rate: 0.22,
    rgb: Object.freeze([0.333, 0.0, 1.4803]),
    scotopic: 0.1869,
    scaleHeight: 0.045,
  }),
  Object.freeze({
    altitude: 0.55,
    id: "oi-557.7",
    name: "O I green line",
    nm: 557.7,
    photopic: 0.9956,
    rate: 1,
    rgb: Object.freeze([0.4606, 1.4889, 0.0]),
    scotopic: 0.4472,
    scaleHeight: 0.065,
  }),
  Object.freeze({
    altitude: 0.74,
    id: "oi-630.0",
    name: "O I red line",
    nm: 630.0,
    photopic: 0.2639,
    rate: 0.14,
    rgb: Object.freeze([1.8651, 0.0, 0.1245]),
    scotopic: 0.0133,
    scaleHeight: 0.11,
  }),
  Object.freeze({
    altitude: 0.385,
    id: "n2-1p-670.5",
    name: "N2 first positive",
    nm: 670.5,
    photopic: 0.0351,
    rate: 0.18,
    rgb: Object.freeze([0.2102, 0.0, 0.0073]),
    scotopic: 0.0009,
    scaleHeight: 0.025,
  }),
]);

/* -------------------------------------------------------------------------- */
/* Colour                                                                      */
/* -------------------------------------------------------------------------- */

const cieLobe = (nm, mu, sigmaLow, sigmaHigh) =>
  Math.exp(-0.5 * ((nm - mu) / (nm < mu ? sigmaLow : sigmaHigh)) ** 2);

const CIE_X = (nm) =>
  1.056 * cieLobe(nm, 599.8, 37.9, 31.0) +
  0.362 * cieLobe(nm, 442.0, 16.0, 26.7) -
  0.065 * cieLobe(nm, 501.1, 20.4, 26.2);
const CIE_Y = (nm) => 0.821 * cieLobe(nm, 568.8, 46.9, 40.5) + 0.286 * cieLobe(nm, 530.9, 16.3, 31.1);
const CIE_Z = (nm) => 1.217 * cieLobe(nm, 437.0, 11.8, 36.0) + 0.681 * cieLobe(nm, 459.0, 26.0, 13.8);

const XYZ_TO_SRGB = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.969266, 1.8760108, 0.041556],
  [0.0556434, -0.2040259, 1.0572252],
];

/** Photopic luminous efficiency ybar(lambda), normalised to 1 at its peak. */
export function photopicEfficiency(nm) {
  return CIE_Y(nm);
}

/** CIE 1951 scotopic luminous efficiency V'(lambda), linearly interpolated. */
const SCOTOPIC_TABLE = [
  [380, 0.000589], [400, 0.00929], [420, 0.0966], [440, 0.3281], [460, 0.567],
  [480, 0.793], [500, 0.982], [507, 1.0], [520, 0.935], [540, 0.71],
  [560, 0.413], [580, 0.1852], [600, 0.0655], [620, 0.02074], [640, 0.00586],
  [660, 0.001497], [680, 0.000348],
];

export function scotopicEfficiency(nm) {
  if (nm <= SCOTOPIC_TABLE[0][0]) return SCOTOPIC_TABLE[0][1];
  for (let i = 1; i < SCOTOPIC_TABLE.length; i += 1) {
    const [upper, upperValue] = SCOTOPIC_TABLE[i];
    if (nm <= upper) {
      const [lower, lowerValue] = SCOTOPIC_TABLE[i - 1];
      return lowerValue + ((upperValue - lowerValue) * (nm - lower)) / (upper - lower);
    }
  }
  return 0;
}

/**
 * Linear sRGB of a monochromatic stimulus, gamut-mapped toward D65.
 *
 * THE MISSING LINE HERE IS THE ONE THAT MADE THE CURTAIN GREEN. This used to
 * end with `channel / peak` -- normalise to unit maximum -- and the shader then
 * multiplied the result by ybar(lambda) to restore the line's brightness. Two
 * defensible-looking steps that compose into a two-order-of-magnitude error,
 * because ybar is the line's LUMINANCE and luminance is almost none of what the
 * sRGB encoding of a saturated short-wavelength line contains:
 *
 *   427.8 nm has Y = 0.0089 and Z = 1.2295, a ratio of 138:1.
 *
 * Dividing by the peak channel threw that Z away; multiplying by ybar put back
 * a number 138 times too small. Measured against the correct weighting, the
 * violet line lost 111x in the blue channel, 630.0 lost 4.7x in red, and 670.5
 * lost 4.0x -- while GREEN LOST NOTHING, because ybar peaks at 557.7 by
 * definition and there the chromaticity and the luminance are the same number.
 * The old path was exact for the one line that did not need it and wrong by two
 * orders of magnitude for the one that needed it most, which is why a four-line
 * emission map rendered as a single green.
 *
 * The correct weighting is the simplest one available and it is what is left
 * after the deletion: sum the lines' column rates against their CMF triples,
 * convert once, and do not scale by anything else. The luminance then comes out
 * right on its own, because it was never removed.
 *
 * The gamut map is a real distortion and it is doing real work. 427.8 nm is far
 * outside sRGB, so no display can show it; lifting the negative channel toward
 * D65 trades saturation for lightness and raises this line's luminance 19.9x
 * over its true Y. That is not a cheat, it is the unavoidable cost of putting a
 * spectral violet on a display -- and it is the same cost a camera and a print
 * pay, which is exactly why a photograph shows a violet hem that the naked eye
 * can barely find. A26b bounds the lift per line so it cannot grow unnoticed.
 */
export function cieLineDisplayRgb(nm) {
  const xyz = [CIE_X(nm), CIE_Y(nm), CIE_Z(nm)];
  const rgb = XYZ_TO_SRGB.map((row) => row[0] * xyz[0] + row[1] * xyz[1] + row[2] * xyz[2]);
  const lift = Math.min(0, ...rgb);
  return rgb.map((channel) => Number((channel - lift).toFixed(4)));
}

/** Rec.709 relative luminance of a linear sRGB triple. */
export const srgbLuminance = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

/* -------------------------------------------------------------------------- */
/* Transform                                                                   */
/* -------------------------------------------------------------------------- */

const twiddleCache = new Map();

function twiddles(n) {
  let table = twiddleCache.get(n);
  if (table) return table;
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i += 1) {
    const angle = (-2 * Math.PI * i) / n;
    cos[i] = Math.cos(angle);
    sin[i] = Math.sin(angle);
  }
  table = { cos, sin };
  twiddleCache.set(n, table);
  return table;
}

/**
 * In-place radix-2 Cooley-Tukey over a strided view. Twiddles come from a table
 * rather than a recurrence: the recurrence loses about log2(n) digits by the
 * last stage, which shows up as an energy drift that looks like a physics
 * result and is not one.
 */
function fft1(re, im, n, sign, offset, stride) {
  if (n < 2) return;
  const { cos, sin } = twiddles(n);
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const a = offset + i * stride;
      const b = offset + j * stride;
      let swap = re[a];
      re[a] = re[b];
      re[b] = swap;
      swap = im[a];
      im[a] = im[b];
      im[b] = swap;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const step = n / len;
    for (let start = 0; start < n; start += len) {
      for (let k = 0; k < half; k += 1) {
        const wr = cos[k * step];
        const wi = sign < 0 ? sin[k * step] : -sin[k * step];
        const a = offset + (start + k) * stride;
        const b = offset + (start + k + half) * stride;
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
}

/**
 * 2D transform, rows then columns, in place. sign < 0 is forward and carries no
 * scaling; sign > 0 is inverse and carries the whole 1/(nx*ny). That convention
 * is what makes Parseval read sum|x|^2 == sum|X|^2 / N (A1), which is the
 * assertion that catches a normalisation bug before it can hide inside a
 * physics result.
 */
export function fft2(re, im, nx, ny, sign) {
  for (let j = 0; j < ny; j += 1) fft1(re, im, nx, sign, j * nx, 1);
  for (let i = 0; i < nx; i += 1) fft1(re, im, ny, sign, i, nx);
  if (sign > 0) {
    const scale = 1 / (nx * ny);
    for (let i = 0; i < re.length; i += 1) {
      re[i] *= scale;
      im[i] *= scale;
    }
  }
}

/** Signed wavenumber for FFT bin `index`. The wrap is the bug A7 exists for. */
export function signedWavenumber(index, n, length) {
  return ((2 * Math.PI) / length) * (index < n / 2 ? index : index - n);
}

/* -------------------------------------------------------------------------- */
/* Stability                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Two bounds, both about phase resolution rather than about blow-up.
 *
 * The kinetic multiplier exp(-i k^2 dt/2) is the EXACT propagator at any dt, so
 * it cannot go unstable; what it can do is turn the phase of the highest
 * resolved mode by more than pi per step, at which point the spatial phase
 * field is under-resolved between neighbouring cells and the splitting
 * commutators stop being small. Same argument for the potential.
 *
 * There is no dt at which this integrator's norm blows up, because both
 * substeps are unit-modulus. See the header of check-aurora-field.mjs for why
 * the negative control is split in two rather than waiting for that.
 */
export function auroraStabilityBound(field) {
  const kMax = Math.PI / field.h;
  const dtKinetic = (2 * Math.PI) / (kMax * kMax);
  const dtNonlinear = Math.PI / (field.maxPotential + Math.abs(field.g) * field.nSat);
  return { dtKinetic, dtMax: Math.min(dtKinetic, dtNonlinear), dtNonlinear };
}

/* -------------------------------------------------------------------------- */
/* Field                                                                       */
/* -------------------------------------------------------------------------- */

/** Deterministic unit hash. No Math.random anywhere in this file. */
const hash01 = (value) => {
  const raw = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
};

export function createAuroraField(options = {}) {
  const nx = options.nx ?? AURORA_TIERS.high.nx;
  const ny = options.ny ?? AURORA_TIERS.high.ny;
  const lx = options.lx ?? AURORA_BOX.lx;
  const ly = options.ly ?? AURORA_BOX.ly;
  const g = options.g ?? AURORA_PHYSICS.g;
  const nSat = options.nSat ?? AURORA_PHYSICS.nSat;
  const trapOmega = options.trapOmega ?? AURORA_PHYSICS.trapOmega;
  const folds = options.folds ?? AURORA_PHYSICS.folds;
  const seed = options.seed ?? 1;
  const count = nx * ny;
  const h = lx / nx;

  const re = new Float64Array(count);
  const im = new Float64Array(count);
  const scratchRe = new Float64Array(count);
  const scratchIm = new Float64Array(count);
  const densityBuffer = new Float64Array(count);
  const centreLine = new Float64Array(nx);
  const k2 = new Float64Array(count);

  for (let j = 0; j < ny; j += 1) {
    const ky = signedWavenumber(j, ny, ly);
    for (let i = 0; i < nx; i += 1) {
      const kx = signedWavenumber(i, nx, lx);
      k2[j * nx + i] = kx * kx + ky * ky;
    }
  }

  const foldReach = folds.reduce((total, fold) => total + Math.abs(fold.amplitude), 0);
  // Worst case over all x, all t and every cell: the trap centre pushed as far
  // as the folds can push it, the cell as far from it as the box allows.
  const maxPotential = 0.5 * trapOmega * trapOmega * (ly / 2 + foldReach) ** 2;

  function writeCentreLine(time) {
    for (let i = 0; i < nx; i += 1) {
      const x = i * h;
      let centre = ly / 2;
      for (const fold of folds) centre += fold.amplitude * Math.sin(fold.mode * x - fold.omega * time);
      centreLine[i] = centre;
    }
  }

  /** V at one cell. The x-dependence is hoisted into centreLine once per step. */
  function potentialAt(i, j) {
    const dy = j * (ly / ny) - centreLine[i];
    return 0.5 * trapOmega * trapOmega * dy * dy;
  }

  /**
   * exp(-i (V + F(n)) dt) applied pointwise. |phi| is invariant under this by
   * construction (A9): it is multiplication by a unit-modulus number, which is
   * also why the substep is exact rather than approximate -- the density it
   * depends on cannot change during it.
   */
  function applyKick(dt) {
    for (let j = 0; j < ny; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        const index = j * nx + i;
        const a = re[index];
        const b = im[index];
        const density = a * a + b * b;
        const phase = -(potentialAt(i, j) + (g * density) / (1 + density / nSat)) * dt;
        const c = Math.cos(phase);
        const s = Math.sin(phase);
        re[index] = a * c - b * s;
        im[index] = a * s + b * c;
      }
    }
  }

  function applyKinetic(dt) {
    fft2(re, im, nx, ny, -1);
    for (let index = 0; index < count; index += 1) {
      const phase = -0.5 * k2[index] * dt;
      const c = Math.cos(phase);
      const s = Math.sin(phase);
      const a = re[index];
      const b = im[index];
      re[index] = a * c - b * s;
      im[index] = a * s + b * c;
    }
    fft2(re, im, nx, ny, 1);
  }

  const field = {
    g,
    h,
    im,
    lx,
    ly,
    maxPotential,
    nSat,
    nx,
    ny,
    re,
    time: 0,

    /**
     * Strang: half kick, full kinetic, half kick. Local error O(dt^3), global
     * O(dt^2), and time-symmetric -- which is why the energy oscillates in a
     * band instead of drifting (A5). Both half kicks read the potential at the
     * step midpoint, keeping the second order under a time-dependent V.
     */
    step(dt = AURORA_PHYSICS.dt) {
      writeCentreLine(field.time + dt / 2);
      applyKick(dt / 2);
      applyKinetic(dt);
      applyKick(dt / 2);
      field.time += dt;
    },

    /** The potential substep alone. Exists so A9 can assert it is a pure phase. */
    kick(dt = AURORA_PHYSICS.dt) {
      writeCentreLine(field.time);
      applyKick(dt);
    },

    /**
     * Negative control (A11). Forward Euler on the same right-hand side has
     * amplification |1 - i*lambda*dt| = sqrt(1 + lambda^2 dt^2) > 1 for every
     * non-zero eigenvalue of a skew-Hermitian generator: unconditionally
     * unstable, at any step size. Its job is to prove the norm assertion can
     * detect an unstable configuration at all, since split-step never provides
     * one.
     */
    eulerStep(dt = AURORA_PHYSICS.dt) {
      writeCentreLine(field.time);
      scratchRe.set(re);
      scratchIm.set(im);
      fft2(scratchRe, scratchIm, nx, ny, -1);
      for (let index = 0; index < count; index += 1) {
        scratchRe[index] *= 0.5 * k2[index];
        scratchIm[index] *= 0.5 * k2[index];
      }
      fft2(scratchRe, scratchIm, nx, ny, 1);
      for (let j = 0; j < ny; j += 1) {
        for (let i = 0; i < nx; i += 1) {
          const index = j * nx + i;
          const a = re[index];
          const b = im[index];
          const density = a * a + b * b;
          const w = potentialAt(i, j) + (g * density) / (1 + density / nSat);
          // H psi
          const hr = scratchRe[index] + w * a;
          const hi = scratchIm[index] + w * b;
          // psi <- psi - i dt H psi
          re[index] = a + dt * hi;
          im[index] = b - dt * hr;
        }
      }
      field.time += dt;
    },

    density() {
      for (let index = 0; index < count; index += 1) {
        densityBuffer[index] = re[index] * re[index] + im[index] * im[index];
      }
      return densityBuffer;
    },

    norm() {
      let total = 0;
      for (let index = 0; index < count; index += 1) {
        total += re[index] * re[index] + im[index] * im[index];
      }
      return total * h * h;
    },

    /**
     * E = kinetic (by Parseval, in the basis where it is diagonal) + trap +
     * the antiderivative of the nonlinear term. A10 asserts the last of those
     * really is the antiderivative; if it is not, A5 is watching a quantity the
     * integrator was never conserving.
     */
    energyTerms() {
      scratchRe.set(re);
      scratchIm.set(im);
      fft2(scratchRe, scratchIm, nx, ny, -1);
      let kinetic = 0;
      for (let index = 0; index < count; index += 1) {
        kinetic += 0.5 * k2[index] * (scratchRe[index] ** 2 + scratchIm[index] ** 2);
      }
      kinetic = (kinetic / count) * h * h;

      writeCentreLine(field.time);
      let potential = 0;
      let nonlinear = 0;
      for (let j = 0; j < ny; j += 1) {
        for (let i = 0; i < nx; i += 1) {
          const index = j * nx + i;
          const density = re[index] * re[index] + im[index] * im[index];
          potential += potentialAt(i, j) * density;
          nonlinear += g * nSat * (density - nSat * Math.log(1 + density / nSat));
        }
      }
      return { kinetic, nonlinear: nonlinear * h * h, potential: potential * h * h };
    },

    energy() {
      const terms = field.energyTerms();
      return terms.kinetic + terms.potential + terms.nonlinear;
    },

    /**
     * A scale for the energy that cannot pass through zero.
     *
     * The total does: the focusing term is negative and the kinetic term is
     * positive, and for this configuration they very nearly cancel -- seeding
     * the envelope phase moved E from -55.0 to -1.2 while the ABSOLUTE energy
     * error over 400 steps improved from 0.10 to 0.013. Normalising a drift
     * bound by |E| therefore reports the integrator getting eight times worse
     * at the moment it got eight times better, which is a property of the
     * denominator and not of the physics. The sum of the magnitudes of the
     * three terms is a real scale of the problem and stays bounded away from
     * zero.
     */
    energyScale() {
      const terms = field.energyTerms();
      return Math.abs(terms.kinetic) + Math.abs(terms.potential) + Math.abs(terms.nonlinear);
    },

    /**
     * Pack for the GPU: (Re phi, Im phi, n, q) per cell, row-major, into a
     * caller-owned Float32Array of 4*nx*ny.
     *
     * n and q are computed here rather than in the shader so the fragment pass
     * needs exactly one texture tap. q = |Im(conj(phi) grad phi)| / n is the
     * local envelope wavenumber, which stands in for the hardness of the
     * precipitating electrons: the 630.0 red mantle is suppressed where it is
     * large (soft electrons stop high) and the 427.8 rays are driven by it
     * (hard electrons ionise N2).
     */
    pack(out) {
      const dyStep = ly / ny;
      for (let j = 0; j < ny; j += 1) {
        const up = ((j + 1) % ny) * nx;
        const down = ((j - 1 + ny) % ny) * nx;
        const row = j * nx;
        for (let i = 0; i < nx; i += 1) {
          const index = row + i;
          const a = re[index];
          const b = im[index];
          const density = a * a + b * b;
          const right = row + ((i + 1) % nx);
          const left = row + ((i - 1 + nx) % nx);
          const dxRe = (re[right] - re[left]) / (2 * h);
          const dxIm = (im[right] - im[left]) / (2 * h);
          const dyRe = (re[up + i] - re[down + i]) / (2 * dyStep);
          const dyIm = (im[up + i] - im[down + i]) / (2 * dyStep);
          const jx = a * dxIm - b * dxRe;
          const jy = a * dyIm - b * dyRe;
          const wavenumber = Math.sqrt(jx * jx + jy * jy) / Math.max(density, 1e-8);
          const base = index * 4;
          out[base] = a;
          out[base + 1] = b;
          out[base + 2] = density;
          out[base + 3] = wavenumber;
        }
      }
      return out;
    },
  };

  // Initial state: the instantaneous trap ground state, modulated along the arc
  // by a deterministic band-limited seed. Starting in the ground state rather
  // than displaced from it matters -- a displaced harmonic state is a coherent
  // state whose width is invariant, so the fold-driven motion moves the curtain
  // without broadening it, which is what keeps the y-periodic wrap negligible
  // (A14) while the field is alive.
  writeCentreLine(0);
  const sigma = 1 / Math.sqrt(trapOmega || 1);
  let peak = 0;
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const index = j * nx + i;
      const x = i * h;
      let value;
      if (options.initial) {
        const [a, b] = options.initial(x, j * (ly / ny), { lx, ly });
        re[index] = a;
        im[index] = b;
        peak = Math.max(peak, a * a + b * b);
        continue;
      }
      const dy = j * (ly / ny) - centreLine[i];
      value = trapOmega > 0 ? Math.exp(-(dy * dy) / (2 * sigma * sigma)) : 1;
      // Broadband seed in BOTH amplitude and phase. Phase is not decoration
      // here: arg(phi) offsets the standing-wave fringes, so a purely real seed
      // leaves arg(phi) in {0, pi} and every ray lands on the same regular
      // comb. Seeding the phase is what makes the ray spacing irregular, and
      // irregular is what separates a curtain from a barcode.
      let amplitudeMode = 0;
      let phaseMode = 0;
      for (let mode = 1; mode <= 40; mode += 1) {
        amplitudeMode += Math.cos(mode * x + hash01(mode * 7.13 + seed) * 2 * Math.PI);
        phaseMode += Math.cos(mode * x + hash01(mode * 3.71 + seed * 5) * 2 * Math.PI) / mode;
      }
      const amplitude = value * (1 + 0.06 * (amplitudeMode / Math.sqrt(40)));
      const phase = 1.1 * phaseMode;
      re[index] = amplitude * Math.cos(phase);
      im[index] = amplitude * Math.sin(phase);
      peak = Math.max(peak, amplitude * amplitude);
    }
  }
  if (!options.initial && peak > 0) {
    // Core density near 1 so g_eff, k_MI and the growth rate are the values the
    // spec quotes rather than whatever the seed happened to normalise to.
    const scale = 1 / Math.sqrt(peak);
    for (let index = 0; index < count; index += 1) re[index] *= scale;
  }

  return field;
}

/* -------------------------------------------------------------------------- */
/* GLSL                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * LINE_CHROMA is LINE_RGB divided by its own luminance, so it carries the
 * line's hue at unit brightness. The rod channel needs it and the cone channel
 * must not have it: rods have ONE spectral sensitivity and therefore no
 * chromaticity at all, so the rod vector is a fiction whose only job is to be
 * blended 62% away toward grey -- and a fiction has to be scale-matched to the
 * scotopic scalar it is blended against, or the mix means nothing. Dividing the
 * luminance out makes luma(rod) == scotopic identically, which is the property
 * that mix() is relying on and which nothing used to guarantee.
 */
const emissionConstants = () =>
  AURORA_EMISSION_LINES.map((line, index) => {
    const chroma = line.rgb.map((c) => c / srgbLuminance(line.rgb));
    return (
      `const vec3 LINE_RGB_${index} = vec3(${line.rgb.map((c) => c.toFixed(4)).join(", ")});\n` +
      `  const vec3 LINE_CHROMA_${index} = vec3(${chroma.map((c) => c.toFixed(4)).join(", ")});\n` +
      `  const float LINE_PHOTOPIC_${index} = ${line.photopic.toFixed(6)};\n` +
      `  const float LINE_SCOTOPIC_${index} = ${line.scotopic.toFixed(6)};\n` +
      `  const float LINE_RATE_${index} = ${line.rate.toFixed(4)};\n` +
      `  const float LINE_ALT_${index} = ${line.altitude.toFixed(4)};\n` +
      `  const float LINE_H_${index} = ${line.scaleHeight.toFixed(4)};`
    );
  }).join("\n  ");

export const AURORA_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * One fullscreen pass. One texture tap. No lighting, no environment, no shadow
 * lookup -- which is why the scene's measured 13.9ms/megapixel is an upper
 * bound on this and not a prediction of it.
 *
 * The carrier is evaluated here, per pixel, from a closed form. Everything the
 * grid carries is the slowly varying envelope, so nothing in this shader is
 * limited by the 256x32 texture behind it except the envelope itself, which is
 * smooth by construction.
 */
export const AURORA_FRAGMENT_SHADER = `
  precision highp float;

  uniform sampler2D uField;
  uniform vec2 uCarrier;        // k0, in box units
  uniform float uCarrierPhase;  // omega0 * t, advanced continuously
  uniform vec2 uCarrierB;       // the second resonator harmonic
  uniform float uCarrierPhaseB; // its own omega0 * t: the beat drifts
  uniform float uCarrierMix;    // weight of the second harmonic
  uniform vec2 uCarrierC;       // the third, and the finest comb in the picture
  uniform float uCarrierPhaseC;
  uniform float uCarrierNorm;   // holds the mean current across the three combs
  uniform float uFilamentMix;   // share of the current the third mode carries
  uniform float uCoreGain;      // additive delivery of the light above the knee
  uniform float uCoreKnee;      // exposure at which the alpha ceiling stops
  uniform float uDrift;         // co-moving frame offset along the arc
  uniform float uArcRepeats;    // circuits of the periodic box across the host's arc
  uniform float uArcFeather;    // fraction of the host's arc faded at each end
  uniform float uIntensity;
  uniform float uHardness;      // q0: the soft/hard precipitation split
  uniform float uRayDepth;      // standing fraction of the field-aligned current
  uniform float uAlphaCeiling;
  uniform float uMesoLow;
  uniform float uMesoHigh;
  uniform float uRodAchromatic;
  uniform vec2 uNorthBand;      // screen v range of the boreal curtain
  uniform vec2 uSouthBand;      // screen v range of its conjugate
  varying vec2 vUv;

  ${emissionConstants()}

  // The slice of the field's altitude axis that is ever drawn. Outside it are
  // the trap's Gaussian tails and the periodic seam in y, neither of which is
  // physical and neither of which is now renderable.
  const float FIELD_LOW = 0.40;
  const float FIELD_HIGH = 0.60;

  // THE HEM. This function is the single most recognisable feature of an
  // aurora and it used to be a Gaussian, which cannot produce it at any width.
  //
  // Chapman (1931): the energy a beam deposits per unit altitude while stopping
  // in an atmosphere whose density rises exponentially downward.
  //
  //   q(s) = exp(1 - s - exp(-s)),   s = (y - peak) / H,   q(0) = 1
  //
  // Two different exponentials, and the asymmetry between them is the picture.
  // ABOVE the peak only the air is running out, so q falls as exp(-s) -- 32% of
  // peak two scale heights up, still 2% at five. BELOW it the electrons
  // themselves are spent, so q falls as exp(-exp(-s)), a DOUBLE exponential:
  // 1% one and a half scale heights down, 1e-7 at three. Crisp underneath, soft
  // overhead. That is what an auroral curtain looks like, and it is not an art
  // decision -- it is where the precipitating electrons stop.
  //
  // The clamp is arithmetic hygiene, not physics: below s = -8 the value is
  // e^-2972 and the un-clamped exp(-s) would overflow fp32 on the way there.
  float chapman(float y, float peakAltitude, float scaleHeight) {
    float s = max((y - peakAltitude) / scaleHeight, -8.0);
    return exp(1.0 - s - exp(-s));
  }

  // Emission from one hemisphere. parity = +1 boreal, -1 austral: the southern
  // curtain is the same field conjugated and mirrored in altitude, because the
  // two hemispheres are the two ends of one flux tube and the map between them
  // reverses the field-aligned current, which acts on the wavefunction as
  // complex conjugation. One field, one texture, one sign.
  //
  // The altitude argument is the position across the rendered band; the field
  // is sampled from the INTERIOR of its own y range (FIELD_LOW..FIELD_HIGH), so
  // the trap's Gaussian tails and the periodic seam in y are never drawn.
  vec4 curtain(float u, float altitude, float parity) {
    vec2 uv = vec2(u, mix(FIELD_LOW, FIELD_HIGH, altitude));
    vec4 f = texture2D(uField, uv);
    float n = max(f.z, 0.0);
    float q = f.w;

    // psi = phi * exp(i(k0.x - w0 t)); S = (Re psi)^2 is the field-aligned
    // current of the standing Alfven mode -- the upgoing wave interfering with
    // its ionospheric reflection. Its maxima are the rays. Invariant under the
    // hemisphere conjugation, which is the physically correct statement about a
    // resonator bounded by both ionospheres.
    //
    // k0 is nearly horizontal, so the fringes it makes are nearly vertical:
    // the rays come out field-aligned without being told to be.
    //
    // uCarrier arrives already in uv space (AURORA_CARRIER_UV = k0 scaled by
    // the box extents). It has to: k0 is a wavenumber in box units and uv runs
    // 0..1 across the box, so using k0 directly here costs a factor of lx and
    // makes the fringes 2*pi times too coarse to see -- which is exactly what
    // it did. A19 pins the resulting pitch in device pixels.
    //
    // TWO harmonics, not one. A cavity has a band of modes, and the resonator
    // is a cavity; a single carrier is a comb of one pitch, which reads as a
    // ruled screen. Superposing the second harmonic interleaves the ray
    // spacings, and because the two advance at different omega = |k|^2/2 their
    // beat -- 11 cycles across the arc against 64 rays -- travels through the
    // curtain gathering the rays into brighter and fainter bundles.
    //
    // THREE, and the third is the fine one. Two combs interleave into bundles
    // at one ray pitch; a curtain is filamented at two or three pitches at
    // once, and the frame proved the finest of them was missing -- measured
    // rms 1.90 at 29-46px against 10.18 in the envelope. uCarrierC is 1.71x
    // the first, bounded above by the veil's aliasing floor rather than by
    // taste, and coprime with both so the three-comb superposition never
    // repeats inside a frame. See AURORA_PHYSICS.k0c; A30 pins the ratios.
    //
    // A convex mix, RENORMALISED. standing is the square of this, and combs at
    // different wavenumbers are uncorrelated, so a convex mix preserves the
    // peak -- where they happen to align -- and loses 34% of the mean square
    // everywhere else. Measured as a 23% dimmer curtain before uCarrierNorm
    // existed. See AURORA_CARRIER_NORM; A30 asserts the mean square is held.
    float theta = dot(uCarrier, vec2(u, altitude)) - uCarrierPhase;
    float thetaB = dot(uCarrierB, vec2(u, altitude)) - uCarrierPhaseB;
    float thetaC = dot(uCarrierC, vec2(u, altitude)) - uCarrierPhaseC;
    float im = f.y * parity;
    float rePsi = uCarrierNorm * mix(
      mix(
        f.x * cos(theta) - im * sin(theta),
        f.x * cos(thetaB) - im * sin(thetaB),
        uCarrierMix),
      f.x * cos(thetaC) - im * sin(thetaC),
      uFilamentMix);
    float standing = rePsi * rePsi;

    // THE FLUX, and the correction that turned a green slab into a curtain.
    //
    // The standing pattern is the field-aligned CURRENT, and every line is
    // excited by the electrons that current carries -- so the ray structure
    // belongs in the flux that drives all four, not in one channel. Driving
    // only 427.8 with it (which is what the first version did) puts the rays
    // exclusively in the dimmest line on the list, 550x below green in
    // luminance, and the result is a flat green band with invisible rays in it.
    //
    // uRayDepth is the standing fraction of the current: 0 is a smooth sheet,
    // 1 is a pure standing wave with hard nulls between rays.
    float flux = n * (1.0 - uRayDepth) + 2.0 * uRayDepth * standing;

    float hardness = q / uHardness;

    // Brighter filaments reach further in altitude, because harder, denser
    // precipitation deposits over a longer column. This is what makes ray
    // HEIGHTS vary along the arc instead of the curtain having one flat top.
    float reach = 0.75 + 0.5 * min(n, 1.5);

    // And harder precipitation stops LOWER, so the hem it lights sits lower.
    // Without this the lower edge is a ruled line across the sky; with it the
    // edge dips exactly where the hard filaments are, which is why a real hem
    // is scalloped rather than straight. Bounded so the layers cannot cross.
    float stop = 0.05 * clamp(hardness - 0.8, -1.0, 1.2);

    float i0 = LINE_RATE_0 * flux * clamp(hardness, 0.0, 3.0) * chapman(altitude, LINE_ALT_0 - stop, LINE_H_0 * reach);
    float i1 = LINE_RATE_1 * flux * chapman(altitude, LINE_ALT_1 - stop, LINE_H_1 * reach);
    // 630.0 keeps most of the smooth flux rather than the ray structure, and
    // that is not a softening choice: O(1D) has a 110-second radiative
    // lifetime, so the red mantle time-averages over everything the current
    // does on ray timescales. A real red aurora is diffuse for this reason.
    float i2 = LINE_RATE_2 * mix(flux, n, 0.6) * exp(-hardness) * chapman(altitude, LINE_ALT_2, LINE_H_2 * reach);
    // N2 1P needs the hardest precipitation of all, so it is gated on the
    // product of the flux and the hardness rather than on either alone -- the
    // rarest layer, firing only in the stiffest filaments.
    //
    // THE GATE WAS 0.5 TO 1.7 AND THE FIELD'S MAXIMUM IS 1.031. It never opened
    // once, anywhere, at any tier: mean gate value 0.0012, fully open in 0.00%
    // of the sampled cells. "Deepest and rarest" was not rare, it was dead
    // code, and it is why the hem rendered blue instead of violet-PINK -- the
    // classic magenta hem is 427.8 and this line together, and only one of them
    // was arriving. Measured against the distribution: p50 0.037, p90 0.191,
    // p99 0.517. 0.15 opens just above the hardest tenth and 0.7 saturates in
    // the top 0.6%, which is the same sentence the comment always made, now
    // true. A29 pins it to the distribution so it cannot silently close again.
    float i3 = LINE_RATE_3 * smoothstep(0.15, 0.7, flux * hardness) * chapman(altitude, LINE_ALT_3 - stop, LINE_H_3);

    // Cone and rod channels accumulated separately. The rod channel is what
    // makes a faint curtain pale blue-white instead of dim green: rods are 21x
    // more sensitive to 427.8 than cones and blind to both reds, so the
    // low-intensity limit is dominated by the violet line whatever the flux is
    // doing. Saturation is earned by intensity rather than applied everywhere.
    //
    // ONE WEIGHTING PER SUM, AND THAT IS THE WHOLE COLOUR FIX. The cone line
    // used to read i * LINE_PHOTOPIC * LINE_RGB against an LINE_RGB that had
    // been normalised to unit maximum -- a luminance removed and a DIFFERENT
    // luminance put back, which cost the violet 111x in blue and the red 4.7x
    // in red while leaving green exact. LINE_RGB now carries the line's own
    // display weight, so the intensity is the only thing multiplying it and the
    // luminance is simply never lost. See cieLineDisplayRgb.
    vec3 cone = i0 * LINE_RGB_0 + i1 * LINE_RGB_1 + i2 * LINE_RGB_2 + i3 * LINE_RGB_3;
    float photopic = i0 * LINE_PHOTOPIC_0 + i1 * LINE_PHOTOPIC_1
                   + i2 * LINE_PHOTOPIC_2 + i3 * LINE_PHOTOPIC_3;
    // Rods keep their reweighting, against the unit-luminance hue rather than
    // against the same double-counted triple, so luma(rod) == scotopic holds.
    vec3 rod = i0 * LINE_SCOTOPIC_0 * LINE_CHROMA_0
             + i1 * LINE_SCOTOPIC_1 * LINE_CHROMA_1
             + i2 * LINE_SCOTOPIC_2 * LINE_CHROMA_2
             + i3 * LINE_SCOTOPIC_3 * LINE_CHROMA_3;
    float scotopic = i0 * LINE_SCOTOPIC_0 + i1 * LINE_SCOTOPIC_1
                   + i2 * LINE_SCOTOPIC_2 + i3 * LINE_SCOTOPIC_3;

    float meso = smoothstep(uMesoLow, uMesoHigh, photopic);
    vec3 colour = mix(mix(rod, vec3(scotopic), uRodAchromatic), cone, meso);
    // Alpha follows the light this fragment ACTUALLY ADDS, which is colour.
    // mix(scotopic, photopic, meso) is the light the sky emits, and the two
    // stopped being the same number the moment the gamut map started lifting
    // out-of-gamut lines: 427.8 arrives 19.9x brighter on a display than its Y,
    // so keying alpha off Y delivered a correct violet and then multiplied it
    // by nothing. That is a second way to lose a channel after paying to fix
    // the first one.
    float luminance = dot(colour, vec3(0.2126, 0.7152, 0.0722));
    return vec4(colour, luminance);
  }

  void main() {
    // The curtain occupies altitude bands, so it occupies screen bands. The gap
    // between them is not empty space to fill: it is where the page's own text
    // lives, and it is the contrast protection.
    float north = (vUv.y - uNorthBand.x) / (uNorthBand.y - uNorthBand.x);
    float south = (uSouthBand.y - vUv.y) / (uSouthBand.y - uSouthBand.x);

    vec4 total = vec4(0.0);
    if (north > 0.0 && north < 1.0) {
      // Feather both ends of the band, and the two ends are NOT symmetric.
      //
      // The top is a long fade because a curtain with a hard cut at the top of
      // frame reads as a wipe, and because the red mantle really does bleed
      // away over that whole distance. The bottom is barely feathered at all:
      // it exists only to hide the rim of the geometry, and anything longer
      // eats the hem the Chapman layers just built. The previous 0.40 bottom
      // ramp was doing exactly that -- dissolving the lower edge over 40% of
      // the band, which is why the curtain read as haze from below.
      //
      // The fade STARTS at 0.74 and not 0.58 because 0.58 began 0.16 below the
      // 630.0 window and multiplied the red mantle by 0.394 AT ITS OWN PEAK --
      // a feather written to hide a rim, deleting the layer nearest the rim.
      // 0.74 is the red peak itself, so the mantle is whole where it is
      // brightest and the fade spends its whole length on the tail that really
      // is bleeding away. What it protects is unchanged: zero at the rim, over
      // 2.9 degrees, which is 60px at qpu-ice-bridge -- the only station whose
      // frame contains the rim at all.
      float fade = smoothstep(0.0, 0.06, north) * smoothstep(1.0, 0.74, north);
      total += fade * curtain(fract(vUv.x * uArcRepeats + uDrift), north, 1.0);
    }
    if (south > 0.0 && south < 1.0) {
      // Conjugate and mirrored: same physics, opposite hemisphere. Kept as a
      // low hem rather than a second curtain -- from any one place on Earth you
      // see one of these, and the other is a claim about the flux tube rather
      // than about the view.
      float fade = smoothstep(0.0, 0.30, south) * smoothstep(1.0, 0.55, south);
      total += 0.22 * fade * curtain(fract(vUv.x * uArcRepeats + uDrift * 0.86), south, -1.0);
    }

    // Ends of the arc, and how far they reach is the HOST's business.
    //
    // On the veil the arc is laid across the frame, so this is chrome
    // protection: the curtain must not touch the frame edges, where the site's
    // own furniture lives. On the shell the arc is wrapped around the compass,
    // where the same 10% is a 36-degree dead zone at whatever bearing the
    // geometry's seam happens to fall on -- and it fell inside the shot. The
    // curtain survived only on the left third of the frame, which no assertion
    // could see and which reads exactly like a curtain that is too faint.
    //
    // So the width is a uniform. A shell that rings the compass has no ends to
    // feather and passes zero; the floor keeps smoothstep's two edges apart.
    float feather = max(uArcFeather, 1e-4);
    total *= smoothstep(0.0, feather, vUv.x) * smoothstep(1.0, 1.0 - feather, vUv.x);

    vec3 colour = total.rgb * uIntensity;

    // Naka-Rushton, R = I/(I + 1), applied PER CONE CLASS.
    //
    // This used to run on the peak channel only, on the reasoning that a single
    // divisor cannot rotate the hue the CIE constants produced. True, and it is
    // also why nothing in the frame ever read as bright: a hue-preserving curve
    // has no white to compress toward, so the core of the curtain came out as
    // more of the same green rather than as light.
    //
    // Per channel is the photoreceptor model rather than the graphics
    // convenience -- each cone class saturates on its own stimulus. Green
    // reaches its ceiling first, red and blue keep climbing into it, and the
    // brightest part of the ribbon goes near-white with colour surviving only
    // in the wings. That is what the middle of a bright arc looks like, and it
    // is why an aurora photograph has a white core and green edges.
    colour /= (1.0 + colour);

    // The renderer's OUTPUT TRANSFORM, which a raw ShaderMaterial never gets.
    //
    // three injects <colorspace_fragment> into the materials it builds and not
    // into this one, so without this line the curtain writes LINEAR values into
    // a framebuffer in which every other pixel is sRGB-encoded. The effect is
    // not a uniform dimming, it is a crush of exactly the wrong end: a linear
    // 0.5 lands within 15% of where it belongs, a linear 0.1 lands at 26/255
    // where it should be 89. The skirt, the diffuse mantle and the whole
    // low-intensity two thirds of the emission were being deleted, which left
    // the bright bundles standing alone as detached lozenges with nothing
    // joining them. A curtain is the joining.
    colour = mix(colour * 12.92,
                 1.055 * pow(max(colour, 0.0), vec3(1.0 / 2.4)) - 0.055,
                 step(0.0031308, colour));

    // Alpha follows luminance, not the tone-mapped colour: the curtain has to
    // stay translucent where it is faint, or it stops being light in the sky
    // and becomes paint over the page. The ceiling is the single most effective
    // contrast protection this shader has, and it is unchanged: this fragment
    // covers exactly as much of what is behind it as it always did.
    float exposure = total.a * uIntensity;
    float alpha = clamp(exposure, 0.0, 1.0);
    alpha = clamp(uAlphaCeiling * (alpha / (1.0 + alpha)) * 2.0, 0.0, uAlphaCeiling);

    // THE CORE. Not more exposure -- the exposure that was already there and
    // could not be transported.
    //
    // alpha saturates at its ceiling when exposure reaches 1, and the field
    // runs to 5 (see AURORA_RENDER.coreKnee for the measured distribution). So
    // everything from the knee to the peak -- the hem, the core, and every ray
    // inside them -- used to arrive at ONE opacity, which is why a curtain with
    // 70% modulation in its own current rendered as a smooth smudge.
    //
    // Delivered additively so the ceiling does not bound it, and only above the
    // knee, so the faint two thirds of the curtain are untouched to the bit.
    // The colour is the fragment's own; nothing here is blurred, spread or
    // invented, which is what separates this from a bloom.
    float core = uCoreGain * smoothstep(uCoreKnee, uCoreKnee * 4.0, exposure);

    // PREMULTIPLIED, and that is the whole mechanism.
    //
    // Both hosts multiply rgb by alpha in the blend (SRC_ALPHA/ONE on the
    // shell, SRC_ALPHA/ONE_MINUS_SRC_ALPHA on the veil), so an additive term
    // written into rgb would have been divided by the very ceiling it has to
    // escape. Multiplying here instead and asking three for the premultiplied
    // blend functions (ONE/ONE and ONE/ONE_MINUS_SRC_ALPHA) leaves the body
    // term algebraically identical and puts the core term outside the product.
    // Both materials set premultipliedAlpha: true; without it the curtain
    // renders at 0.4 of itself and the core does nothing.
    gl_FragColor = vec4(colour * (alpha + core), alpha);
  }
`;

/** Screen-space bands the two curtains occupy. See the note in the shader. */
export const AURORA_LAYOUT = Object.freeze({
  /** The slice of the field's altitude axis that is ever sampled. */
  fieldHigh: 0.6,
  fieldLow: 0.4,
  // Tall enough that a filament stays coherent over several times its own
  // width, which is the anisotropy claim in section 1 of the maths document and
  // the difference between a curtain and a row of blobs. A19 asserts the ratio.
  north: Object.freeze([0.54, 1.04]),
  south: Object.freeze([0.0, 0.16]),
});

/**
 * The carrier in uv space: k0 is a wavenumber in box units, uv runs 0..1 across
 * the box, so the shader needs k0 scaled by the box extents. Deriving it here
 * rather than typing it into the shader is the whole point -- the first version
 * of this passed k0 straight through, which made the ray fringes 2*pi times too
 * coarse and produced a row of isotropic blobs instead of a curtain. A19
 * asserts the pitch this comes out at.
 */
export const AURORA_CARRIER_UV = Object.freeze([
  AURORA_PHYSICS.k0[0] * AURORA_BOX.lx,
  AURORA_PHYSICS.k0[1] * AURORA_BOX.ly * (AURORA_LAYOUT.fieldHigh - AURORA_LAYOUT.fieldLow),
]);

/** The second resonator harmonic, through the identical derivation. A22. */
export const AURORA_CARRIER_UV_B = Object.freeze([
  AURORA_PHYSICS.k0b[0] * AURORA_BOX.lx,
  AURORA_PHYSICS.k0b[1] * AURORA_BOX.ly * (AURORA_LAYOUT.fieldHigh - AURORA_LAYOUT.fieldLow),
]);

/** The fine filament comb, through the identical derivation. A30. */
export const AURORA_CARRIER_UV_C = Object.freeze([
  AURORA_PHYSICS.k0c[0] * AURORA_BOX.lx,
  AURORA_PHYSICS.k0c[1] * AURORA_BOX.ly * (AURORA_LAYOUT.fieldHigh - AURORA_LAYOUT.fieldLow),
]);


/** Ray fringe pitch in device pixels, which is the number that decides whether
 *  the carrier is visible at all: too coarse and it reads as blobs, below about
 *  4 device px it aliases into shimmer. */
export function auroraFringePitch({ carrier = AURORA_CARRIER_UV, cssWidth, dpr }) {
  const fringes = carrier[0] / (2 * Math.PI);
  return { fringes, pitchDevicePx: (cssWidth * dpr) / fringes };
}

/**
 * Circuits of the periodic box the sky shell wraps around its own arc.
 *
 * THIS IS THE NUMBER THAT DECIDED WHETHER THE CURTAIN HAD RAYS, and it went
 * unwritten for exactly the reason A19 was created to catch: it existed only as
 * the identity mapping between a sphere's uv and a texture's uv, so nothing had
 * to state it and nothing could check it.
 *
 * The veil draws the arc across the frame, so one box IS the frame and A19's
 * pitches are what a viewer sees. The shell draws the arc around the whole
 * compass, and the camera's horizontal field of view is 58 degrees of that --
 * so at one circuit per shell the frame showed 16% of the box: 10 rays across
 * 1440px at 140px each, and 2.9 modulational filaments at 497px. Both scales
 * were intact and both were six times too coarse to resolve, which is not a
 * curtain with faint rays. It is a stain, and it is what the render showed.
 *
 * At five circuits the frame shows 80% of a box: 51 rays at 28 CSS px and 14
 * filaments at 100 px, which is the separation section 7 of the maths document
 * specifies. Five and not six: the count is bounded above by the widest station
 * framing the world uses, a 43-degree vertical field of view, which at six
 * circuits spans 1.07 tiles -- the same filaments twice in one shot, and a
 * field that repeats inside a frame stops reading as a place.
 *
 * Tiling is not a liberty taken with the physics -- periodic in x is the
 * boundary condition the oval actually has, so the box is a tile of the arc and
 * how many tiles span a sky is a statement about the observer, not about the
 * field. A24 pins the resulting pitch.
 */
export const AURORA_ARC_REPEATS = 5;

/**
 * Ray pitch as seen through a camera looking at a shell that carries the arc
 * around it -- which is a different question from auroraFringePitch, and the
 * difference is the entire defect above. Here the frame samples only
 * fov/arcDegrees of the shell, and `repeats` is what buys the resolution back.
 */
export function auroraShellPitch({
  arcDegrees = 360,
  carrier = AURORA_CARRIER_UV,
  cssWidth,
  horizontalFovDegrees,
  repeats = AURORA_ARC_REPEATS,
}) {
  const boxesAcrossFrame = (horizontalFovDegrees / arcDegrees) * repeats;
  const fringes = (carrier[0] / (2 * Math.PI)) * boxesAcrossFrame;
  const filaments = (auroraFilamentPitch({ cssWidth, dpr: 1 }).filaments) * boxesAcrossFrame;
  return {
    filamentPitchCssPx: cssWidth / filaments,
    filaments,
    fringes,
    pitchCssPx: cssWidth / fringes,
  };
}

/**
 * How much sky the world's camera actually shows, measured rather than assumed.
 *
 * Taken at the observatory plaque, medium tier, 1440x900, by rendering an
 * altitude test pattern through the shell's own band and reading back where
 * each decade landed: the true horizon sits at y=87 and the top of the frame is
 * 3.7 degrees above it. The camera looks DOWN at its station -- that is the
 * house framing, the dome is the subject -- so the sky is a shallow strip along
 * the top edge and everything else in the frame is ground.
 *
 * This is the number the first version of the shell did not have. It spanned
 * -7 to +31 degrees on the reasoning that a curtain should reach well up the
 * sky, which is true of a sky and false of this frame: 27 of those 38 degrees
 * were above the top edge, and they were the 27 containing the curtain. What
 * remained in shot was the dim skirt below the hem. Every symptom the art brief
 * listed -- no hem, no core, no rays, reads as a stain -- is that one fact.
 */
export const AURORA_CAMERA_SKY = Object.freeze({
  cssHeight: 900,
  /** Elevation of the top of the frame, degrees above the true horizon. */
  topDegrees: 3.7,
  verticalFovDegrees: 38,
});

/**
 * Elevations the shell's band spans. Calibration against the frame above, not
 * physics: the field has no opinion about where this world points its camera.
 *
 * Placed so the green line's Chapman peak lands just under 1.5 degrees -- a
 * third of the way down the observatory's visible strip -- its hem sits within
 * a tenth of a degree of the true horizon, where the ridges can cut it, and its
 * soft upper tail runs off the top edge rather than ending inside the frame. A
 * curtain should have a very visible bottom and no visible top, and on that
 * framing this is the only arrangement that does.
 *
 * WHY THE SPAN IS 11 DEGREES AND NOT 8, WHICH IS THE ONLY THING THAT MOVED.
 *
 * The peak stayed where it was. The band grew around it, because the sky is
 * shared and the framings are not: this elevation is a property of the world's
 * atmosphere, so it has to be one number for all eight stations, and eight
 * cameras between 5.5 and 15 degrees of downward pitch and 36 to 43 degrees of
 * vertical field show between 95 and 335 px of sky above the horizon. The same
 * band therefore arrives at very different pixel heights per station, and at 8
 * degrees the shortest of them failed the anisotropy rule A25 exists to
 * enforce. Measured off the ablation, aurora-on minus aurora-off, emission
 * height at a tenth of peak against measured ray pitch:
 *
 *   qpu-ice-bridge     69px / 25.7px = 2.68   a row of pills
 *   manifold-reactor   83px / 30.6px = 2.71   a row of pills
 *   observatory-plaque 84px / 27.7px = 3.03   passing by one pixel
 *
 * A25's own margin at the observatory was 84px against a 83px floor. That is
 * not a contract holding, it is a contract that happened to land on the right
 * side, and the two stations with fewer pixels per degree were already over it.
 *
 * The Chapman altitudes and scale heights are fractions of this band, so
 * widening it about the green peak scales the whole emission profile vertically
 * and leaves every horizontal scale, every colour and the peak brightness
 * exactly where they were: q(peak) = 1 whatever the scale height. 11 degrees
 * puts the worst station at 3.97 and the observatory at 4.2.
 *
 * The extra fill is not symmetric and that is deliberate. 1.44 degrees of the
 * 3 goes below the old hem, into elevations the terrain already occupies, where
 * a depth-tested BackSide shell rejects the fragment before shading it; the
 * 1.56 above costs 1440 x 33 px on a 900px frame. A26 pins the resulting
 * per-station geometry.
 */
export const AURORA_SHELL_ELEVATION = Object.freeze({ high: 7.15, low: -3.85 });

/**
 * The sky one station's camera shows, from that camera's own two numbers.
 *
 * This is the mapping the shell has been missing for eight stations and had
 * measured for one. IglooScene puts the lens at look + spherical(azimuth,
 * elevation, distance) and then calls lookAt(look), so the optical axis is
 * pitched down by exactly `elevationDegrees` and the top edge of the frame sits
 * halfFov above it. Everything else -- where the horizon lands, where an
 * altitude in the shell's band lands -- is that one fact in pixels.
 *
 * Written here rather than in the two callers because the whole history of this
 * file is coordinate mappings that existed only as an implicit identity and so
 * could not be checked: A19's box-to-screen, A24's box-to-compass, A25's
 * band-to-frame. This is the fourth. scripts/check-aurora-field.mjs asserts
 * against it and scripts/probe-aurora-sky-frame.mjs measures against it, and
 * the two agree to within 10px at all eight stations.
 */
export function auroraStationSky({ cssHeight = 900, elevationDegrees, verticalFovDegrees }) {
  const topDegrees = verticalFovDegrees / 2 - elevationDegrees;
  const pxPerDegree = cssHeight / verticalFovDegrees;
  const screenY = (degrees) => (topDegrees - degrees) * pxPerDegree;
  const bandDegrees = (altitude) =>
    AURORA_SHELL_ELEVATION.low +
    altitude * (AURORA_SHELL_ELEVATION.high - AURORA_SHELL_ELEVATION.low);
  return {
    /** Screen y of a shell-band altitude, px from the top of the frame. */
    altitudeY: (altitude) => screenY(bandDegrees(altitude)),
    bandDegrees,
    cssHeight,
    horizonY: screenY(0),
    pxPerDegree,
    screenY,
    /** Sky above the true horizon, in px. Zero would mean no sky at all. */
    skyPx: Math.max(0, screenY(0)),
    topDegrees,
    verticalFovDegrees,
  };
}

/** Where a shell altitude lands on screen, in px from the top of the frame. */
export function auroraShellAltitudeToScreenY(altitude, sky = AURORA_CAMERA_SKY) {
  const pxPerDegree = sky.cssHeight / sky.verticalFovDegrees;
  const elevation =
    AURORA_SHELL_ELEVATION.low +
    altitude * (AURORA_SHELL_ELEVATION.high - AURORA_SHELL_ELEVATION.low);
  return (sky.topDegrees - elevation) * pxPerDegree;
}

/** Horizontal field of view of a camera specified by its vertical one. */
export function horizontalFov({ aspect, verticalFovDegrees }) {
  const half = Math.atan(Math.tan((verticalFovDegrees * Math.PI) / 360) * aspect);
  return (half * 360) / Math.PI;
}

/** Filament pitch from the modulational instability, in the same units. */
export function auroraFilamentPitch({ cssWidth, density = 1, dpr }) {
  const gEffective = AURORA_PHYSICS.g / (1 + density / AURORA_PHYSICS.nSat) ** 2;
  const kMi = Math.sqrt(2 * Math.abs(gEffective) * density);
  const filaments = (kMi * AURORA_BOX.lx) / (2 * Math.PI);
  return { filaments, kMi, pitchDevicePx: (cssWidth * dpr) / filaments };
}

/**
 * Render-time knobs. These are calibration, not physics: the field does not
 * know how bright a browser is or where a page keeps its text.
 */
export const AURORA_RENDER = Object.freeze({
  /**
   * Opacity ceiling. A curtain that reaches 0.85 stops reading as light in the
   * sky and starts reading as paint on the page -- measured over the dark
   * project index, where the first pass rendered as a flat green slab across
   * the headline. 0.46 keeps it translucent everywhere.
   */
  alphaCeiling: 0.4,
  /**
   * THE CORE, and the number that decides whether this reads as a photograph.
   *
   * The ceiling above is honest and it is also, on its own, an instrument that
   * cannot see the brightest part of its own subject. Measured over a posed
   * medium field across the strip the cameras show, the shader's own exposure
   * -- luminance(colour) * intensity, the quantity alpha is keyed off -- runs:
   *
   *   p50 0.017   p90 0.660   p99 2.137   p99.9 3.644   max 4.986
   *
   * and alpha = ceiling * 2a/(1+a) reaches the ceiling at a = 1. So the top
   * 5.2% of the visible strip -- a factor of FIVE in emitted light, the entire
   * hem and core -- is delivered at one single opacity. The curtain has no
   * internal value structure above the knee because the transport saturates
   * before the subject does. That is the airbrush: not a wrong colour, not a
   * wrong physics, a response curve that is flat exactly where the picture is.
   *
   * The frame agrees. Spectrum of the aurora-on minus aurora-off luma across
   * the sky at assembly-tool-locker, by band:
   *
   *   k 5-15    96-288px   rms 10.18   the envelope, the blobs
   *   k 16-30   48-90px    rms  6.57   the MI filaments
   *   k 51-80   18-28px    rms  0.85   the rays
   *   k 111-150 10-13px    rms  1.41   the standing pattern's own harmonic
   *
   * The fine structure is not missing. It is seven times weaker than the
   * blobs, because everything above the knee arrives at the same brightness.
   *
   * So: the body keeps the ceiling, and the light ABOVE the knee is delivered
   * as a separate additive term that the ceiling does not bound. It is the
   * same colour and the same photons -- nothing here invents light, and there
   * is no blur anywhere in it, so it is not a bloom. It is the exposure the
   * transport was discarding.
   *
   * coreKnee = 1.0 is not a taste: it is exactly the exposure at which alpha
   * stops responding, so the additive term covers precisely the range the
   * ceiling throws away and nothing else. Below it the curtain is unchanged to
   * the last bit.
   *
   * coreGain 1.5 against a ceiling of 0.4: at full core the fragment delivers
   * 0.4 + 1.5 = 1.9x its own colour, so the green and red channels of 557.7
   * both clip and the core goes white against the sky's blue -- which is where
   * the white in a photographed core comes from, since 557.7's display triple
   * has no blue in it at all and never can. The wings are untouched, so this
   * is contrast rather than exposure, which is the only version of it the
   * house rule permits: the building still has to win the frame.
   */
  coreGain: 1.5,
  coreKnee: 1,
  /**
   * Weight of the second resonator harmonic in the carrier superposition.
   *
   * Not 0.5: at 0.5 the two combs cancel exactly wherever they are out of
   * phase, which puts a dead band across the curtain every beat. At 0.35 the
   * bundle contrast is (1+0.35)/(1-0.35) = 2.1x -- rays that brighten and
   * fade along the arc, none of which ever go out.
   */
  carrierMix: 0.35,
  /**
   * Share of the field-aligned current the third mode carries.
   *
   * A structure change is not allowed to be a brightness change -- A27's last
   * clause, and the first attempt at this broke it in the direction nobody
   * checks for. A convex mix of combs at DIFFERENT frequencies preserves the
   * peak, which is where two cosines happen to align, and not the mean square,
   * which is everywhere else: sum of squared weights falls from 0.545 to 0.357,
   * and the measured aurora-on minus aurora-off delta at assembly-tool-locker
   * fell with it, 0.0536 to 0.0412. A curtain 23% dimmer is not a filament
   * pass, and it is invisible to every assertion that looks at one pixel.
   *
   * So the superposition is normalised by AURORA_CARRIER_NORM, which restores
   * the mean square exactly. The third comb then costs the first two contrast,
   * which is what it was supposed to cost, and costs the curtain nothing.
   */
  filamentMix: 0.3,
  /** q0 -- above this the precipitation counts as hard. Order of k_MI. */
  hardness: 22,
  /**
   * The Chapman layers concentrate the same photons into about a third of the
   * altitude they used to cover, so this is not more exposure -- it is the
   * gain that puts the hem and the core over the Naka-Rushton knee while the
   * sky between them keeps the emission it always had, which was nearly none.
   *
   * 0.80 and not 1.3 because the colour fix is not allowed to be a brightness
   * fix. Restoring the luminance the old normalisation deleted raised every
   * channel, and the green core -- the thing the eye finds -- came out at 64/255
   * against the 52.8 it shipped at. The house rule decides that: if the aurora
   * becomes the first thing the eye finds, the pass has failed however good the
   * colour is.
   *
   * Solved against the ablation rather than chosen. At 0.85 the measured peak
   * green delta at qpu-ice-bridge was 32.5/255 against the 30.8 it shipped at,
   * a 5.4% overshoot; 0.80 lands it at parity. The integrated light over the
   * whole band is still up about 14%, and that part is not exposure -- it is
   * the 630.0 mantle occupying three degrees of sky that previously rendered
   * to nothing. New light from a layer that was invisible is the entire point;
   * new light at the core would be the failure.
   */
  intensity: 0.8,
  /**
   * Standing fraction of the field-aligned current. This is the ray contrast:
   * at 0 the curtain is a smooth sheet, at 1 it is pure standing wave with hard
   * nulls. The nulls are what make it read as light rather than as a smear,
   * because a bright thing with dark gaps has local contrast and a uniform
   * wash has none.
   */
  rayDepth: 0.7,
  /**
   * Rod/cone crossover in photopic units.
   *
   * mesoHigh was 0.55, which sat above almost every pixel the curtain
   * produces, so the whole thing rendered from the rod channel -- and the rod
   * channel is 62% achromatic by construction. That is the desaturated sage:
   * not a wrong green, a green that was never being asked for. At 0.14 the
   * crossover lands inside the curtain instead of above it, so the faint
   * wings stay pale blue-white (correct, and what a naked eye sees) and the
   * hem and core go to the cone response, which is where 557.7 lives.
   */
  mesoHigh: 0.14,
  mesoLow: 0.012,
  /** Field-time the reduced-motion pose is stepped to before it freezes. */
  reducedMotionPose: 0.06,
  /** How achromatic the rod channel is rendered. The one perceptual knob. */
  rodAchromatic: 0.62,
});

/**
 * What the three-comb superposition is divided by so that adding the third comb
 * changed the STRUCTURE and not the exposure.
 *
 * Combs at different wavenumbers are uncorrelated over the arc, so the mean
 * square of a weighted sum of them is the sum of the squared weights -- and
 * `standing` is that square, so the curtain's brightness follows it directly.
 * Two combs weighted (1-m, m) give 0.545. Adding a third convexly gives
 * weights (1-f)(1-m), (1-f)m, f, whose squares sum to 0.357: a 34% loss of mean
 * current that shows up as a uniformly dimmer curtain and as nothing a
 * per-pixel assertion can see. Measured, before this existed: the ablation
 * delta at assembly-tool-locker fell from 0.0536 to 0.0412.
 *
 * Peak-preserving is the wrong invariant, which is what made the mistake easy:
 * the peak is where the combs align, and that is a measure-zero part of the
 * arc. A30 asserts the ratio rather than the constant, so a later change to
 * either mix stays honest.
 */
export const AURORA_CARRIER_NORM = (() => {
  const pair = (1 - AURORA_RENDER.carrierMix) ** 2 + AURORA_RENDER.carrierMix ** 2;
  const trio = (1 - AURORA_RENDER.filamentMix) ** 2 * pair + AURORA_RENDER.filamentMix ** 2;
  return Math.sqrt(pair / trio);
})();
