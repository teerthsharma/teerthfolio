# Aurora field: the equation, the integrator, and the emission map

Status: specification. Written before `scripts/check-aurora-field.mjs`, which is
written before `lib/aurora-field.js`. Every numbered claim below is restated at
the end as an executable assertion; if a claim has no assertion it is not in the
spec.

---

## 1. What the field has to produce

Three statements about what an auroral curtain looks like, each of which is a
constraint on the generator rather than a note about art direction.

1. **It is filamentary across, smooth along.** A curtain is a sheet of
   precipitating electrons following the geomagnetic field. Structure across the
   sheet (the ray spacing, a few hundred metres to a few km) is three orders of
   magnitude finer than structure along it (arcs run for hundreds of km). Any
   generator with isotropic correlation length produces blobs, and value noise is
   exactly such a generator.
2. **The fine structure is a standing pattern, not a drifting texture.** Auroral
   rays are the field-aligned current maxima of the ionospheric Alfvén resonator:
   an upgoing Alfvén wave and its ionospheric reflection interfere, and the nodes
   of that interference are stationary in the frame of the curtain while the
   curtain itself drifts. So the correct construction is `ψ + ψ*`, not a scrolled
   texture.
3. **The colours are four spectral lines, not a ramp.** O I 557.7 nm, O I 630.0
   nm, N₂⁺ 1NG 427.8 nm and N₂ 1P (~670 nm). Their relative strength is set by
   the energy of the precipitating electrons and by collisional quenching, both of
   which are functions of altitude. A gradient picker cannot produce the
   green-core/red-mantle/violet-hem stratification because that stratification is
   an altitude-resolved excitation problem.

---

## 2. The field equation

$$
i\,\partial_t \psi \;=\; \hat H \psi,
\qquad
\hat H \;=\; -\tfrac12 \nabla^2 \;+\; V(x,y,t) \;+\; F\!\left(|\psi|^2\right)
$$

with a **saturable focusing** nonlinearity

$$
F(n) \;=\; \frac{g\,n}{1 + n/n_s}, \qquad g < 0 .
$$

This is the Gross–Pitaevskii / nonlinear Schrödinger field the brief names, with
one modification and one geometric choice, both forced:

**Why saturable and not cubic.** The 2D cubic focusing NLS is $L^2$-critical.
Above the Townes threshold $\|\psi\|_2^2 > N_c \approx 11.7$ it blows up in finite
time: the peak density diverges while the norm is conserved. A background that
runs for minutes cannot contain a singularity. Saturation at $n_s$ arrests
collapse and produces *stable* 2D filaments — this is the standard saturable-Kerr
system in which 2D spatial solitons are experimentally stable. It also bounds the
nonlinear phase per step at $|g| n_s \Delta t$, which is what makes the stability
condition in §5 a finite number rather than a hope.

**Why focusing ($g<0$) and not defocusing.** Focusing NLS is modulationally
unstable: a uniform background of density $n$ is unstable to perturbations with
$k < 2\sqrt{|g|n}$, fastest-growing at

$$
k_{\mathrm{MI}} \;=\; \sqrt{2|g_{\mathrm{eff}}|\,n}, \qquad
\sigma_{\max} \;=\; |g_{\mathrm{eff}}|\,n , \qquad
g_{\mathrm{eff}} = rac{g}{(1+n/n_s)^2}
$$

where $g_{\mathrm{eff}} = F'(n)$ is the derivative of the saturable term, not
$g$ itself — using $g$ overestimates $k_{\mathrm{MI}}$ by $(1+n/n_s) = 1.5$ here,
and A15 fails if the code and the spec disagree about which one it is.

That is the mechanism. A featureless sheet spontaneously breaks into a train of
filaments at a *selected* spacing $2\pi/k_{\mathrm{MI}}$, without being told to.
Defocusing NLS does the opposite — it smooths, and produces exactly the blobs we
are trying to avoid.

**Why periodic in $x$.** The auroral oval is topologically a circle. Periodic
boundary conditions in the along-arc direction are the physical boundary
condition, not a numerical convenience, and they are what makes the Fourier
method exact rather than an approximation with boundary error.

**Why the trap in $y$.** $V$ contains a harmonic confinement in altitude,

$$
V(x,y,t) \;=\; \tfrac12 \Omega^2 \bigl(y - y_c(x,t)\bigr)^2 ,
\qquad
y_c(x,t) \;=\; y_0 + \sum_{j=1,2} a_j \sin(m_j x - \omega_j t) ,
$$

which is the magnetic-mirror confinement of the precipitating population to a
narrow altitude band, with the arc's fold structure carried by a drifting,
two-mode displacement of the band centre. The two incommensurate fold modes
$(m_1,\omega_1)$ and $(m_2,\omega_2)$ are what produce curtain folds that never
repeat. The trap also makes the $y$-periodicity harmless: $|\psi|^2$ at the
$y$-boundary is bounded by the Gaussian tail of the trap ground state, asserted
below (A14) to be $<10^{-4}$ of peak after 2000 steps — 2.2 minutes of wall time,
longer than a visit, where it measures $2.2	imes10^{-5}$.

**The fold frequencies must stay adiabatic**, and this is the one place the
Hamiltonian character bites back. Nothing here removes energy, so a trap driven
anywhere near its own frequency heats without bound. Measured at
$\omega = 110, -180$ against $\Omega = 240$, the field climbed out of the trap
and reached 56% of peak density at the $y$-boundary within 33 minutes. At
$\omega = 12, -19$ against $\Omega = 162$ — ratios of 0.07 and 0.12 — it stays
near $10^{-3}$ and never escapes; at 3.7 hours it is $4.6	imes10^{-3}$, and
non-monotonic, so the field is sloshing rather than leaking. A14 asserts the
ratio as well as the boundary, because the ratio is the cause.

Nothing is lost visually by giving up the fast fold drift: the motion a viewer
reads as the curtain travelling along the oval is a rigid translation, and a
rigid translation on a periodic axis is exactly a texture-coordinate offset —
free, exact, and not something the field has to be driven into doing.

### 2.1 Envelope / carrier decomposition

Write

$$
\psi(\mathbf x, t) \;=\; \phi(\mathbf x, t)\, e^{\,i(\mathbf k_0\cdot\mathbf x - \omega_0 t)},
\qquad \omega_0 = \tfrac12|\mathbf k_0|^2 .
$$

Substituting and using $\omega_0 = |\mathbf k_0|^2/2$:

$$
i\,\partial_t \phi \;=\; -\tfrac12\nabla^2\phi \;-\; i\,\mathbf k_0\cdot\nabla\phi \;+\; \bigl(V + F\bigr)\phi .
$$

The extra term is pure advection at the group velocity $\mathbf k_0$. Moving to
the frame co-moving with the curtain ($\boldsymbol\xi = \mathbf x - \mathbf k_0 t$,
with $V$ co-moving because the current sheet moves with the plasma) removes it and
leaves the brief's equation verbatim:

$$
i\,\partial_t \phi \;=\; -\tfrac12\nabla^2\phi + \bigl(V + F(|\phi|^2)\bigr)\phi .
$$

This is not cosmetic. It is the single decision that makes the whole thing
affordable and the single decision that makes it look like an aurora:

- **$\phi$ is slowly varying**, so it can be sampled on a coarse grid and
  interpolated without visible stepping.
- **The carrier is analytic**, so the fine fringe structure — the rays — is
  evaluated *per pixel* in the fragment shader at full resolution, from a closed
  form, not upsampled from the grid. The grid never has to resolve the ray
  spacing. This is what defeats the "128×128 texture stretched to 1080p looks
  like a smooth haze" failure mode.
- $|\psi|^2 = |\phi|^2$ exactly, so the density observable is unaffected by the
  decomposition; only phase-dependent observables see the carrier.

### 2.2 The three observables

All emission is a function of exactly three fields, each with a physical name:

| symbol | definition | physical reading |
|---|---|---|
| $n$ | $\lvert\phi\rvert^2$ | flux of precipitating electrons |
| $q$ | $\lvert\operatorname{Im}(\bar\phi\nabla\phi)\rvert / n$ | local envelope wavenumber ≈ **hardness** of the precipitation |
| $S$ | $\bigl(\operatorname{Re}\psi\bigr)^2 = n\cos^2\!\bigl(\arg\phi + \mathbf k_0\!\cdot\!\mathbf x - \omega_0 t\bigr)$ | field-aligned current of the standing Alfvén mode |

$S$ is the resonator construction from §1.2: $\psi + \psi^* = 2\operatorname{Re}\psi$
is the superposition of the downgoing wave and the wave returning from the
conjugate hemisphere, and its square is the standing current pattern whose maxima
are the rays. It carries three spatial scales at once — the envelope's filaments
($n$), the carrier's fringes ($\cos^2$), and their beat.

---

## 3. The discrete update

Split $\hat H = \hat T + \hat W$ with $\hat T = -\tfrac12\nabla^2$ and
$\hat W = V + F(|\phi|^2)$.

$\hat T$ is diagonal in Fourier space: on the grid, $\widehat{(-\tfrac12\nabla^2\phi)}_{\mathbf k} = \tfrac12|\mathbf k|^2\hat\phi_{\mathbf k}$.

$\hat W$ is diagonal in real space, and — this is why the nonlinear substep is
*exact* rather than approximate — $|\phi|^2$ is invariant under it, because
$\phi \mapsto e^{-i\theta}\phi$ with real $\theta$ preserves the modulus. So
$\hat W$ is constant along its own flow and the substep integrates in closed form.

**Strang splitting** (the brief's Lie form is first order; this is second and
costs nothing extra when steps are chained):

$$
\boxed{\;
\phi^{n+1} \;=\; e^{-\frac{i}{2}\hat W\Delta t}\;
\mathcal F^{-1}\!\Bigl[\, e^{-\frac{i}{2}|\mathbf k|^2\Delta t}\;
\mathcal F\bigl[\, e^{-\frac{i}{2}\hat W\Delta t}\,\phi^n \,\bigr]\Bigr]\;}
$$

where $\hat W$ in the first half-kick is evaluated at $|\phi^n|^2$ and in the
second at the density after the kinetic step.

**Order.** By Baker–Campbell–Hausdorff,

$$
e^{-\frac{i}{2}W\Delta t}e^{-iT\Delta t}e^{-\frac{i}{2}W\Delta t}
= \exp\Bigl(-i(T+W)\Delta t
- \tfrac{i\Delta t^3}{24}\bigl(2[W,[W,T]] - [T,[T,W]]\bigr) + O(\Delta t^5)\Bigr)
$$

so the local error is $O(\Delta t^3)$ and the global error over a fixed interval
is $O(\Delta t^2)$. The Lie form the brief sketches has local $O(\Delta t^2)$,
global $O(\Delta t)$. The symmetric form is also *time-symmetric*, hence
symplectic for this Hamiltonian, which is why §5 can assert that the energy error
is bounded rather than merely small.

**Discrete wavenumbers.** With $N_x \times N_y$ points, box $L_x \times L_y$, and
grid spacing $h = L_x/N_x = L_y/N_y$ (isotropic spacing — see §7):

$$
k_x^{(m)} = \frac{2\pi}{L_x}\,\hat m, \quad
\hat m = \begin{cases} m & m < N_x/2\\ m-N_x & m \ge N_x/2\end{cases}
$$

and likewise for $k_y$. The signed wrap is where the two most common bugs live:
an unwrapped index makes $|\mathbf k|^2$ monotonically increasing across the
array, which is wrong for the upper half, and it is invisible in the norm.
§6 catches it with the group-velocity test.

**Transform convention.** Unnormalised forward DFT
$X_k = \sum_n x_n e^{-2\pi i k n/N}$, inverse carrying the $1/N$. Then Parseval is
$\sum_n |x_n|^2 = \frac1N \sum_k |X_k|^2$, which is the form asserted in §6.

---

## 4. Conserved quantities

**Norm.** $\mathcal N = \sum_{j} |\phi_j|^2 h^2$.

Both substeps are multiplication by a unit-modulus complex number, pointwise in
their own basis; the DFT pair is unitary up to the stated normalisation. So

$$
\mathcal N^{n+1} = \mathcal N^{n} \quad \text{to floating-point rounding, for \emph{every} } \Delta t .
$$

This is stronger than the brief's "invariant to within the splitting error" — the
splitting error does not enter the norm at all. It is stated as the stronger claim
because the stronger claim is the one that catches bugs: a wrong sign in the
kinetic exponent still conserves the norm, but a $k^2$ that is real-multiplied
instead of phase-multiplied does not, a mis-normalised inverse transform does not,
and a transform that reads its input strided wrongly does not.

**Energy.**

$$
E[\phi] = \sum_{\mathbf k} \tfrac12 |\mathbf k|^2 \frac{|\hat\phi_{\mathbf k}|^2}{N_xN_y}\,h^2
\;+\; \sum_j \Bigl( V_j |\phi_j|^2 + g\,n_s\bigl[\,|\phi_j|^2 - n_s\ln(1+|\phi_j|^2/n_s)\,\bigr]\Bigr) h^2
$$

The nonlinear energy density is $\int_0^{n} F(s)\,ds$, which for the saturable
form integrates to $g n_s\bigl[n - n_s\ln(1+n/n_s)\bigr]$; differentiating it with
respect to $n$ returns $F(n)$, which is the consistency the check asserts
numerically rather than by eye.

Because the integrator is symmetric and symplectic, backward error analysis says
it exactly conserves a modified Hamiltonian $\tilde H = H + O(\Delta t^2)$, so $E$
**oscillates within an $O(\Delta t^2)$ band and does not drift secularly**. The
assertion is therefore on the band, not on a per-step tolerance: over $M$ steps,
$\max_n |E^n - E^0| / |E^0| < \varepsilon_E$ with $\varepsilon_E$ independent of
$M$.

---

## 5. Stability and the honest negative control

The brief asks for a $\Delta t$ at which "the norm must blow up". For this
integrator **there is no such $\Delta t$**, and saying so is the point rather than
a dodge: both substeps are exactly unitary, so the norm is conserved at any step
size, including absurd ones. A negative control that expects norm blow-up from a
unitary scheme would pass for the wrong reason forever.

So the stability contract is stated in the three places it actually bites, and
each gets its own control.

**(a) Kinetic phase resolution.** The kinetic multiplier $e^{-i|\mathbf k|^2\Delta t/2}$
is the *exact* propagator for every $\Delta t$ — it cannot alias in time. What it
can do is advance the phase of the highest-resolved mode by more than $\pi$ per
step, at which point the *spatial* phase field is under-resolved between
neighbouring grid points and the splitting-error commutators are $O(1)$. With
$k_{\max} = \pi/h$:

$$
\Delta t_{\text{kin}} \;=\; \frac{2\pi}{k_{\max}^2} \;=\; \frac{2h^2}{\pi}.
$$

**(b) Nonlinear phase resolution.** $|\hat W|$ is bounded because the
nonlinearity saturates: $\max|\hat W| \le \max V + |g|\,n_s$. Require the
per-step nonlinear phase below $\pi$:

$$
\Delta t_{\text{nl}} \;=\; \frac{\pi}{\max V + |g| n_s}.
$$

**Stated bound:** $\Delta t \le \Delta t_{\max} = \min(\Delta t_{\text{kin}}, \Delta t_{\text{nl}})$,
and the shipped configuration is asserted to run at $\Delta t \le 0.25\,\Delta t_{\max}$.

**Control 1 — the norm assertion has teeth.** Integrate the identical right-hand
side with forward Euler, $\phi^{n+1} = \phi^n - i\Delta t\,\hat H\phi^n$, at the
*same* $\Delta t$. Forward Euler applied to a skew-Hermitian generator has
amplification factor $|1 - i\lambda\Delta t| = \sqrt{1+\lambda^2\Delta t^2} > 1$
for every non-zero eigenvalue: it is unconditionally unstable, and the norm grows
monotonically. Assert that it does. This proves the norm test can detect an
unstable configuration, which is the thing the brief actually wants proved.

**Control 2 — the accuracy bound has teeth.** Run split-step at
$\Delta t = 20\,\Delta t_{\max}$. Norm stays conserved (as predicted). Assert
instead that the energy band and the deviation from a reference trajectory
integrated at $\Delta t_{\max}/20$ both exceed the in-bound values by more than
two orders of magnitude, and that the fraction of spectral power above
$k_{\max}/2$ rises — the signature of a solution decohering into grid-scale
noise.

---

## 6. The assertions

Each is a line in `scripts/check-aurora-field.mjs`, run against the CPU
implementation in `lib/aurora-field.js` — which is the same code the browser
runs, not a parallel reference model. There is no shipped-vs-tested gap to drift.

| # | claim | assertion |
|---|---|---|
| A1 | Parseval / transform normalisation | $\bigl\lvert\sum_n\lvert x_n\rvert^2 - \tfrac1N\sum_k\lvert X_k\rvert^2\bigr\rvert / \sum\lvert x\rvert^2 < 10^{-12}$ |
| A2 | transform round-trip | $\lVert \mathcal F^{-1}\mathcal F x - x\rVert_\infty < 10^{-12}$ |
| A3 | norm conservation, full nonlinear | $\lvert \mathcal N^M/\mathcal N^0 - 1\rvert < 10^{-12}$ over $M=400$ |
| A4 | norm conservation is $\Delta t$-independent | A3 holds at $\Delta t$ and at $20\Delta t_{\max}$ |
| A5 | energy band, no secular drift | $\max_n\lvert E^n-E^0\rvert/\lvert E^0\rvert < 10^{-3}$ over $M=400$, and the band over the second half is not larger than over the first by more than 2× |
| A6 | free Gaussian spreads at the analytic rate | $V=g=0$, $\phi_0=e^{-r^2/2\sigma_0^2}$: density RMS width $w(t)=\tfrac{\sigma_0}{\sqrt2}\sqrt{1+t^2/\sigma_0^4}$ to $<0.5\%$ |
| A7 | wave packet translates at the group velocity | $V=g=0$, $\phi_0 = e^{-(x-x_0)^2/2\sigma_0^2}e^{ik_0x}$: centroid $\langle x\rangle(t) = x_0 + k_0 t$ to $<0.5\%$; **catches the signed-wavenumber wrap and the sign of the kinetic exponent** |
| A8 | linear limit equals direct diagonalisation | $V=g=0$: $M$ split steps $=\mathcal F^{-1}[e^{-i k^2 M\Delta t/2}\mathcal F\phi_0]$ to $<10^{-12}$ |
| A9 | nonlinear substep is exactly a phase | $\lVert\,\lvert e^{-i\hat W\Delta t}\phi\rvert - \lvert\phi\rvert\,\rVert_\infty < 10^{-14}$ |
| A10 | saturable energy density is the antiderivative of $F$ | $\frac{d}{dn}\bigl(gn_s[n-n_s\ln(1+n/n_s)]\bigr) = F(n)$ numerically, $<10^{-7}$ |
| A11 | negative control 1 | forward Euler at the same $\Delta t$ grows the norm by $>10\times$ within $M$ steps |
| A12 | negative control 2 | at $20\Delta t_{\max}$, energy band and reference deviation each exceed the in-bound value by $>100\times$, and high-$k$ power fraction rises |
| A13 | shipped config respects the bound | for every tier, $\Delta t \le 0.25\Delta t_{\max}$ computed from that tier's $h$ and its $V,g,n_s$ |
| A14 | $y$-periodicity is harmless | after $M$ steps, $\max_x n(x, y_{\text{edge}}) < 10^{-6}\max n$ |
| A15 | modulational instability selects the stated band | seeded with broadband noise on a flat background, the fastest-growing mode over the first 200 steps lies within 15% of $k_{\mathrm{MI}}=\sqrt{2\lvert g\rvert n}$ |
| A16 | determinism | two evolutions from the same seed agree bitwise |
| A17 | emission display weights are the CIE values | recomputing from the CMF fit **with no normalisation** reproduces the pinned constants to $<10^{-3}$, and the gamut map's luminance lift is in $[1, 25)$ per line |
| A18 | the four lines are ordered by rod/cone ratio | $V'/\bar y$ strictly decreasing over (427.8, 557.7, 630.0, 670.5) |
| A19 | the carrier reaches the screen at a visible pitch | per tier: ray pitch in 5–40 device px, ≥24 fringes across frame, filament pitch > 2.5× ray pitch, band height > 5× filament pitch |
| A20 | the shader consumes the derived uv-space carrier | `AURORA_CARRIER_UV` equals $\mathbf k_0$ scaled by the box extents, and the shader dots it against bare uv with no ad-hoc rescale |
| A21 | the veil cannot swallow the site's clicks | the Canvas overrides R3F's inline `pointerEvents: "auto"`, and every descendant is pointer-inert in CSS |
| A22 | the second resonator harmonic interleaves rather than moires | $\mathbf k_{0b}$ derived through the same box scaling; $\gcd(k_{0x}, k_{0bx}) = 1$; the beat $|k_{0bx}-k_{0x}|$ is $>1.4	imes$ coarser than the MI band; both carriers in the visible pitch window at every tier |
| A23 | the emission layers are Chapman layers | the 2%-of-peak reach above each line's peak exceeds the reach below it by $>2.4	imes$ (Chapman gives 2.55, a Gaussian gives exactly 1); the three hem-forming lines reach 2% within 0.14 of the band |
| A24 | the shell delivers the pitch to the CAMERA, not just to the box | per carrier, ray pitch 16-60 CSS px through the world's own field of view, filaments $>2.5	imes$ coarser, and the frame spans $<1$ tile of the periodic box |
| A25 | the curtain is IN THE FRAME | the green core and its hem land inside the measured sky strip, the upper tail leaves the top edge, and the curtain stands $>3	imes$ taller than its ray pitch |
| A26 | …and in the other seven frames | for all 8 stations × 3 tiers, solved through `solvePolarCameraComposition`: $>60$ px of sky above the horizon, the green core inside that strip, the hem within $0.6^\circ$ of the horizon, the curtain $>3	imes$ its ray pitch **and taller than its filament pitch**, and the frame inside one tile of the box |
| A27 | the emission map is STRATIFIED | every line peaks above the horizon and reaches a tenth of peak inside the tightest of the 24 framings; the four windows stack by penetration depth; the violet clears the green peak by $\ge1.9$ scale heights; and over the lit strip the blue-fraction argmax sits $>0.5^\circ$ below the green-fraction argmax, which sits $>0.5^\circ$ below the red-fraction argmax, each channel owning $>50\%$ of its own band; top feather starts at or above the 630.0 window; intensity $\le 0.9$ |
| A28 | the cone sum weights each line ONCE | the shader's cone sum contains no `LINE_PHOTOPIC` and each $i_k$ multiplies its own `LINE_RGB_k`; each `LINE_CHROMA_k` has unit luminance and is what the rod sum uses; alpha follows $\mathrm{luma}(\mathbf{colour})$ |
| A29 | the rarest layer is rare, not absent | evolving the shipped medium field 300 steps, the N₂ 1P gate opens on 2–25% of the sampled cells and its upper edge lies below the distribution's maximum |

A19 and A21 were both added after the thing they assert had already shipped
broken, which is the honest reason they exist:

- **A19.** The first render had no fringes at any brightness and every other
  assertion passed. The shader consumed $\mathbf k_0$ — a wavenumber in box
  units — against a uv coordinate running 0..1 across the box, losing a factor
  of $L_x = 2\pi$ and putting the ray pitch at 141 device px, which reads as no
  rays at all. Nothing could catch it because the number existed only inside
  GLSL. The fix was to derive it in the module, which is what made it
  assertable; the lesson is that a constant only a GPU ever sees is a constant
  no test can reach.
- **A21.** R3F's container div hard-codes `pointerEvents: "auto"` inline, which
  beats `pointer-events: none` inherited from the wrapper. The veil was a
  transparent sheet over the entire document that swallowed every click on the
  site, including ENTER THE WORLD. It survived several capture runs because
  those clicked via `element.click()`, which bypasses hit-testing; a real
  Playwright click found it in one run.

---

## 7. Grid, box, and the tier ladder

Domain $L_x = 2\pi$ (one circuit of the oval), $L_y = \pi/4$. Aspect ratio 8:1,
matching the curtain's own anisotropy — the resolution is spent across the sheet,
where the structure is, and not along it, where the field is smooth. This is
*cheaper* than a square grid of the same across-sheet resolution by the aspect
ratio.

Grid spacing is isotropic in both directions ($h_x = h_y$) so that $k_{\max}$ and
the Laplacian are direction-independent and §5's bound is a single number.

| tier | $N_x\times N_y$ | points | $h$ | tick | dpr | CPU per tick | duty |
|---|---|---|---|---|---|---|---|
| high | 256 × 32 | 8192 | $2\pi/256$ | 15 Hz | 0.75 | 1.39–1.93 ms | 2.1% of a core |
| medium | 128 × 16 | 2048 | $2\pi/128$ | 15 Hz | 0.60 | 0.53 ms | 0.8% |
| low | 128 × 16 | 2048 | $2\pi/128$ | 8 Hz | 0.50 | 0.48 ms | 0.4% |

Physical parameters, identical at every tier so the tiers show the same world at
different resolution:

$$
\Omega = 162,\quad g = -360,\quad n_s = 2,\quad \Delta t = 8\times10^{-5},
\quad \mathbf k_0 = (80,\,10),\quad \mathbf k_{0b} = (91,\,15)
$$

For the saturable form the instability is governed by the *effective* coupling
$g_{\mathrm{eff}} = g/(1+n/n_s)^2$, which at a core density $n\approx1$ is
$-160$, so

$$
k_{\mathrm{MI}} = \sqrt{2|g_{\mathrm{eff}}|n} = 17.9
$$

— 18 filaments across the frame, one every 80 CSS px at 1440 (60 device px at
the high tier's 0.75 ratio). The carrier gives 64 fringes across the same frame,
one every 22.5 CSS px (16.9 device px). **The ratio of those two, 3.6, is the
number that decides whether this looks like a curtain.** At the first attempt it
was 2.3 and the two scales merged into a single texture, which renders as a row
of isotropic pills. A19 asserts the separation now.

Four scales in total: fold modes at $m_1,m_2 = 3,7$ (3 and 7 undulations across
the frame), MI filaments at 18, carrier rays at 64, and the along-sheet
coherence length, which is the whole rendered band — that last one is the
anisotropy from §1 and A19 asserts it is at least 5× the filament pitch.

Timescales at 15 Hz: MI e-folding $1/(|g_{\mathrm{eff}}|n\,\Delta t \cdot 15)
\approx 5$ s (the transient that gets the field into its interesting state),
trap sloshing period $2\pi/(\Omega\Delta t\cdot 15) \approx 32$ s (the sustained
motion the visitor sees), carrier drift $\approx 9$ px/s. Slow, deliberate,
stateful.

Stability margin at the finest tier: $\Delta t_{\text{kin}} = 3.84\times10^{-4}$,
$\Delta t_{\text{nl}} = 9.72\times10^{-4}$, so
$\Delta t/\Delta t_{\max} = 0.21$ against A13's ceiling of 0.25.

---

## 8. Emission: field observables to spectral lines

### 8.1 Altitude windows

Each line emits in an altitude band set by where the exciting electrons stop and
by collisional quenching. In field coordinates altitude is $y$; the windows are
smooth bands $w_\lambda(y)$:

| line | altitude | window | why that band |
|---|---|---|---|
| N₂ 1P ~670 nm | 80–100 km | lowest, narrow | needs the hardest electrons, which penetrate deepest |
| N₂⁺ 427.8 nm | 90–130 km | low, narrow | ionisation threshold — requires energetic electrons |
| O I 557.7 nm | 100–200 km | broad, the core | O(¹S) lifetime 0.7 s survives quenching down to ~95 km |
| O I 630.0 nm | 200–400 km | high, diffuse | O(¹D) lifetime 110 s — collisionally quenched below ~200 km, so it survives *only* high up |

### 8.2 The map

With $n$, $q$, $S$ from §2.2:

$$
\begin{aligned}
I_{557} &= n \; w_{557}(y) &&\text{green core follows the flux}\\
I_{630} &= n \; e^{-q/q_0}\; w_{630}(y) &&\text{red mantle needs \emph{soft} electrons: suppressed where } q \text{ is large}\\
I_{428} &= S \; \bigl(q/q_0\bigr)\; w_{428}(y) &&\text{violet rays: standing current} \times \text{hardness}\\
I_{670} &= \mathrm{smoothstep}(a,b,\,n\,q)\; w_{670}(y) &&\text{crimson hem: only the hardest, brightest events}
\end{aligned}
$$

The important structural consequence: $I_{630}$ and $I_{428}$ have *opposite*
dependence on $q$. The red mantle is where the field is smooth; the violet rays
are where the phase gradient is steep. They therefore occupy different pixels for
a reason, and that separation is the thing a hand-authored gradient cannot fake.

### 8.3 Colour from the CMFs, and rod intrusion

Each line's display weight is the CIE 1931 2° colour-matching functions evaluated
at its wavelength (Wyman–Sloan–Ludwig 2013 multi-lobe Gaussian fit), converted
through the sRGB (D65) matrix and gamut-mapped by mixing toward the white point
until no channel is negative. It is **not** normalised, and §11.7 is the two
orders of magnitude that normalisation used to cost:

| line | λ (nm) | linear sRGB | $Y_{\text{XYZ}}$ | luma(sRGB) | lift | $\bar y(\lambda)$ | $V'(\lambda)$ | $V'/\bar y$ |
|---|---|---|---|---|---|---|---|---|
| N₂⁺ 1NG | 427.8 | (0.3330, 0.0000, 1.4803) | 0.0089 | 0.1777 | 19.9× | 0.0089 | 0.1869 | 20.89 |
| O I | 557.7 | (0.4606, 1.4889, 0.0000) | 0.9956 | 1.1628 | 1.17× | 0.9956 | 0.4472 | 0.449 |
| O I | 630.0 | (1.8651, 0.0000, 0.1245) | 0.2639 | 0.4055 | 1.54× | 0.2639 | 0.0133 | 0.050 |
| N₂ 1P | 670.5 | (0.2102, 0.0000, 0.0073) | 0.0351 | 0.0452 | 1.29× | 0.0351 | 0.0009 | 0.025 |

The channels run past 1 because these are linear-light contributions per unit
column rate, not colours. The **lift** column is the gamut map's doing: 427.8 nm
is far outside sRGB, no display can show it, and trading its saturation toward
D65 raises its luminance 19.9× over its true $Y$. That distortion is unavoidable
and it is load-bearing — it is the reason a photograph shows a violet hem the
naked eye can barely find, and the reason this render can show one at all. A17
bounds it per line so it cannot grow into a brightness knob unnoticed.

$\bar y$ is the photopic luminous efficiency; $V'$ is the CIE 1951 scotopic
efficiency, interpolated from the standard table. Two facts fall straight out:

1. **557.7 nm sits 2.7 nm from the peak of $\bar y$.** Aurora looks green not
   only because O(¹S) is strongly excited but because the eye is at maximum
   sensitivity exactly there. That is why the green must be the dominant material
   and everything else an accent.
2. **The rod/cone ratio spans three orders of magnitude.** Rods are 21× more
   sensitive to the 427.8 line than cones are, and effectively blind to both reds.

Fact 2 is the colour model. Auroral surface brightness is mesopic, so the
displayed colour is a luminance-dependent mixture of the cone response and the
rod response:

$$
\mathbf C \;=\; m\!\!\sum_\lambda I_\lambda \mathbf c_\lambda
\;+\;(1-m)\Bigl[(1-\rho)\!\!\sum_\lambda I_\lambda V'_\lambda \hat{\mathbf c}_\lambda + \rho \mathbf W \!\!\sum_\lambda I_\lambda V'_\lambda\Bigr],
\qquad m = \mathrm{smoothstep}(L_0, L_1, L_{\text{phot}})
$$

with $\mathbf c_\lambda$ the display weight from the table above, $\hat{\mathbf
c}_\lambda = \mathbf c_\lambda / \mathrm{luma}(\mathbf c_\lambda)$ its
unit-luminance direction, and $\rho$ the rod achromaticity (the one calibration
knob, default 0.62).

Note the cone sum carries **no $\bar y_\lambda$**. It used to, against a
$\mathbf c_\lambda$ normalised to unit maximum, and that is the defect §11.7
takes apart: $\bar y$ is a luminance and the normalisation had already removed a
different one. The rod sum keeps $V'_\lambda$ because rods really are reweighted
relative to cones, but applies it to $\hat{\mathbf c}_\lambda$ so that
$\mathrm{luma}(\mathbf{rod}) = \sum_\lambda I_\lambda V'_\lambda$ identically —
which is the property the $\rho$ blend against the scalar was always assuming and
which nothing used to guarantee (A28). The
consequence, per pixel and for free: **faint parts of the curtain desaturate to a
pale blue-white** (because the rod-weighted sum is dominated by the 427.8 line)
**and only the bright filaments bloom into green with a red mantle.** That is
precisely what a naked-eye aurora does, it is why photographs look more colourful
than the real thing, and it is also the answer to the palette brief: a large
low-saturation ice-blue field with a limited saturated key landing only on the
filaments. Saturation is *earned* by intensity rather than applied everywhere.

### 8.4 Borealis and australis

The two hemispheres are the two ends of the same flux tube, so they must be the
same field, not two colour ramps. The map from north to south is a mirror in
altitude combined with a reversal of the field-aligned current direction, which
acts on the wavefunction as **complex conjugation** (time reversal — $T$ reverses
the gyration sense exactly as reflecting $\mathbf B$ does):

$$
\psi_{\text{south}}(x, y) \;=\; \psi^{*}_{\text{north}}(x,\, L_y - y).
$$

Conjugation flips $\arg\psi$, so the fringe drift and the vortex handedness
reverse while $n$, and therefore the green core, is identical. One field, one
texture, one extra sign in the shader. Note also that $S = (\operatorname{Re}\psi)^2$
is *invariant* under conjugation — the standing resonator pattern is shared
between the hemispheres, which is the physically correct statement about a
resonator bounded by both ionospheres.

---

## 9. Cost, and why not a GPU FFT

The measured frame here is fill-bound at **2.9 ms fixed + 13.9 ms per megapixel**
on the dev machine's Intel UHD (see `components/IglooScene.jsx` and
`lib/render-buckets.js`). A full-viewport pass is the most expensive single thing
that can be added, and the tier ceilings are 19–21 ms.

**Rejected: GPU split-step with a real FFT.** $\log_2 N$ ping-pong passes per
dimension per direction — at $256\times32$ that is 8+5 butterfly passes forward
and the same inverse, ~26 render-target passes per tick, plus 26 target swaps and
26 program binds. Even at 8192 texels a pass the bind and swap overhead alone
does not fit a 19 ms budget, and it buys nothing: the transform is not the
expensive part at this grid size.

**Chosen: CPU split-step, GPU sampling.** The grid is small enough that the
transform belongs on the CPU:

- $256\times32$: rows $32\times(128\cdot8)$ + cols $256\times(16\cdot5)$
  $= 53{,}248$ butterflies per transform, two transforms per step,
  $\approx 10^5$ butterflies per tick.
- Upload is $N_xN_y\times 4$ half-floats $= 64$ KB (high) per tick, 0.96 MB/s.
- The fragment pass takes exactly **one** texture tap — $n$ and $q$ are packed
  on the CPU alongside $\operatorname{Re}\phi$ and $\operatorname{Im}\phi$, so
  the shader needs no finite differences — evaluates the carrier analytically,
  and accumulates four emission terms. No lighting, no environment, no shadow
  lookup, so the scene's 13.9 ms/MPx is an upper bound and not a prediction.

### 9.1 Where the tick runs, measured

The CPU split-step runs **on the main thread**, in `useFrame`, at most one step
per frame. That is a decision that needs evidence rather than an assumption,
because the thread it shares is already running R3F's render, twelve
delta-integrating frame callbacks and the traversal.

**Per-tick cost**, Node 25 on the dev machine, warm JIT, 2000 iterations after
300 warm-up:

| tier | step | pack | tick | duty at its tick rate |
|---|---|---|---|---|
| high 256×32 | 1.83 ms | 0.09 ms | 1.39–1.93 ms | 2.1% of one core |
| medium 128×16 | 0.42 ms | 0.04 ms | 0.53 ms | 0.8% |
| low 128×16 | 0.47 ms | 0.05 ms | 0.48 ms | 0.4% |

(The high-tier tick is quoted as a range because the combined loop and the
isolated loops disagree by 0.5 ms across JIT tiers; the larger figure is the one
budgeted against.)

**Paired in-browser cost**, real Chrome at 1440×900 against the dev server, four
alternating warm runs per arm in one session, 9 s sampling windows, ablated with
`?no-aurora=1` (`verification/aurora-mainthread.mjs`). The auto-quality ladder
settled on `low` in every run:

| arm | frame median | p95 | p99 | long tasks | long-task total |
|---|---|---|---|---|---|
| veil off | 31.0 ms | 52.0 ms | 60.5 ms | 0 | 0 ms |
| veil on | 27.7 ms | 56.2 ms | 62.9 ms | 1 | 100 ms |

The veil measured **3.3 ms faster than its own control on the median**, which is
not a speed-up — it is the statement that the cost is below this machine's
run-to-run spread, which `IglooWorld` documents at about 5 ms from background
load alone. The p99 difference, 2.4 ms, is the same size as the tick and is
inside that spread in both directions. Across all eight warm runs the veil
contributed no systematic long task.

So the tick stays on the main thread, and the Web Worker is not built. Three
caveats, because this is the load-bearing measurement:

1. **The high tier was never reached in-browser.** The ladder settled to `low`
   on this machine every time, so the 1.4–1.9 ms tick is a Node figure, not a
   browser one. It is bounded rather than measured: 1.93 ms every 66.7 ms is
   2.9% duty against a p99 frame of 63 ms.
2. **Long tasks are the wrong instrument on their own.** The threshold is 50 ms
   and a 1.9 ms tick can never trip it, which is why the frame-interval
   percentiles are quoted beside them.
3. **Cold visits were not ablated.** The veil adds one program link. Two cold
   warm-up runs recorded single long tasks of 15.9 s and 4.6 s, but a cold visit
   links 76 programs and none of that is attributable to the veil without a
   cold ablated pair, which was not run.

The upgrade path if the high tier ever measures badly is a Web Worker: the field
module imports nothing, so it moves off-thread as-is, and the 64 KB packed
buffer transfers rather than copies.

**Measurement environment.** The paired numbers above were taken with a headed
browser. Captures and probes were switched to headless real Chrome
(`channel: "chrome", headless: true`) afterwards on instruction; the channel is
what matters for GPU fidelity, but the numbers in the table have not been
re-taken headless and should not be mixed with numbers that were.

**Resolution.** The veil renders on its own canvas at a fixed device-pixel ratio
below 1 (0.75 high / 0.6 medium / 0.5 low). At 0.6 on a 1440×900 viewport that is
0.47 MPx against the scene's 1.3 MPx. Emission is a smooth, band-limited field —
the one kind of content that upsamples without artefacts — so the resolution loss
is not visible, and the carrier fringes are the only high-frequency term, which
is why the ratio floor is 0.5 rather than 0.25.

**Reduced motion.** The field is stepped from its deterministic seed to a fixed
pose — 300 steps, past MI saturation, into the developed filamentary state — and
then frozen:
ticking stops, the carrier clock stops, the canvas switches to on-demand. What
remains is a still, fully structured curtain — a pose, not an absence. The same
code path produces it; nothing is special-cased except when to stop.

The pose is **deterministic**: the seed is fixed and there is no `Math.random`
anywhere in the field, so every reduced-motion visitor sees the same composed
curtain rather than whichever pose their machine happened to reach before it
stopped. The 300 steps are built in slices of 24 per frame so no single frame
carries the whole run, and nothing is presented until it is composed — that is
load cost, not animation.

---

## 10. Rejected alternatives

**Ginzburg–Landau (complex).** Has a phase and supports vortices, so it clears
the bar the real-valued models fail. Rejected because it is *dissipative*: it
relaxes to an attractor with a selected amplitude and a slowly coarsening defect
population. Visually that is smoothing — the exact failure mode named in the
brief — and keeping it alive for the length of a session requires an artificial
energy injection, at which point the "field equation" is a noise generator with
extra steps. GPE is Hamiltonian and never relaxes, so it stays alive for free.
This is the closest competitor and the reason it loses is a practical one.

**Swift–Hohenberg.** Band-pass around $k_c$, so it selects a single wavelength
and produces stripes, rolls and labyrinths. Wrong morphology: an aurora is not a
labyrinth, and single-wavelength selection is the opposite of the multi-scale
requirement. Also real-valued — no phase, so no fringes, no vortices, and nothing
to drive the 427.8 channel from.

**Kuramoto–Sivashinsky.** Genuinely produces filamentary chaos and would look
better than most candidates. Rejected on three counts: real-valued again (same
missing-phase problem), its 2D form is dominated by isotropic cellular chaos
rather than sheet anisotropy, and its linear term is *anti*-diffusive at low $k$
so it needs the fourth-order term to hold it — which puts a hard
$\Delta t \lesssim h^4$ stability constraint on an explicit scheme, worse than
anything here.

**Laplacian-eigenmode superposition.** The cheapest option and the one to be
honest about: it is the $g=0$ limit of the equation actually chosen, and the check
script uses it as ground truth (A8). As a generator it fails because it is linear
— a sum of many independent modes is Gaussian by the central limit theorem, its
level sets are smooth blobs, and it can never localise into a filament. This is
value noise in a Fourier costume.

**Reaction–diffusion (Gray–Scott).** Produces spots, worms and mitosis. Beautiful
and completely wrong morphology — cellular and biological, not filamentary and
field-aligned. Real-valued. Also needs many steps per visible change, so it is the
most expensive of the candidates per unit of motion.

**What would beat GPE.** A two-fluid or Alfvén-wave model with an explicit
ionospheric boundary would be more faithful to the actual current system, and it
is the honest upgrade path. It is not a background-shader-sized problem: it needs
a conductance model and a field-line mapping, and the reason it is not here is
budget, not principle.

---

## 11. The art pass, and the three coordinate mappings that were wrong

Every assertion in section 6 passed while the curtain rendered as a grey-lilac
stain with no hem, no core and no visible rays. The field was correct throughout.
What was wrong was the chain of mappings between the box and the frame, and each
link failed silently because each was an identity that nobody had to write down.
That is the same failure mode A19 and A20 were created for, three geometries
later, and it is why A22–A25 exist.

### 11.1 The emission windows were symmetric

`band()` was a Gaussian. A Gaussian has no lower edge: it falls off at the same
rate above its centre as below it, so the curtain dissolved downward over the
same distance it dissolved upward and read as haze from both directions.

The physical window is the **Chapman (1931) production function** — the energy an
incident beam deposits per unit altitude while stopping in an atmosphere whose
density rises exponentially downward:

$$
q(s) \;=\; \exp\bigl(1 - s - e^{-s}\bigr), \qquad s = \frac{y - y_\lambda}{H_\lambda},
\qquad q(0) = 1 .
$$

Above the peak only the air is running out, so $q \sim e^{1-s}$: a single
exponential, 32% of peak at $s=2$ and still 2% at $s=4.9$. Below it the electrons
themselves are spent, so $q \sim e^{-e^{-s}}$: a **double** exponential, 1% of
peak at $s=-1.9$ and $10^{-7}$ at $s=-3$. The ratio of those two reaches is
$4.91/1.92 = 2.55$, and it is a property of the function independent of $H$ — a
Gaussian gives exactly $1.0$, so the two shapes sit on opposite sides of A23's
bound by construction rather than by tuning.

Crisp underneath, diffuse overhead. That asymmetry is the single most
recognisable feature of an auroral curtain, and no width of a symmetric window
can produce it.

### 11.2 The resonator was a single wavenumber

The ionospheric Alfvén resonator is a cavity, and a cavity has harmonics. One
carrier is a comb of a single pitch, which renders as a ruled screen. The shipped
construction superposes two,

$$
\operatorname{Re}\psi \;=\; (1-m)\,\operatorname{Re}\!\left[\phi\, e^{i\theta_a}\right]
\;+\; m\,\operatorname{Re}\!\left[\phi\, e^{i\theta_b}\right],
\qquad \theta_j = \mathbf k_{j}\cdot\mathbf u - \tfrac12|\mathbf k_j|^2 t ,
$$

with $\gcd(k_{0x}, k_{0bx}) = \gcd(80, 91) = 1$, so the combined comb repeats only
over a full circuit of the oval. The local ray spacing alternates, and the beat at
$|k_{0bx} - k_{0x}| = 11$ cycles per box gathers the rays into brighter and
fainter bundles. The two advance at different $\omega = |\mathbf k|^2/2$ (3250
against 4253), so the bundles travel through the rays rather than riding with
them. $m = 0.35$ and not $0.5$: at $0.5$ the two combs cancel exactly where they
are out of phase, putting a dead band across the curtain every beat.

### 11.3 The box did not reach the camera, in three separate ways

**One circuit per compass (A24).** The veil lays the arc across the frame, so one
box is one frame and A19's pitches are what a viewer sees. The shell wraps the arc
around the whole compass, of which the world's camera sees 58 degrees. At one
circuit per shell the frame showed 16% of a box: 10 rays across 1440 px at 140 px
each, and 2.9 modulational filaments at 497 px. Both structural scales were
intact, both arrived six times too coarse to resolve, and the result is the row of
isotropic pills §7 warns about. The box is *periodic*, so tiling it is what
periodicity means rather than a liberty taken with the physics: at five circuits
the frame shows 80% of a box, 51 rays at 28 CSS px. Five and not six because the
widest station framing spans 1.07 tiles at six, and a field that repeats inside
one frame stops reading as a place.

**A dead zone pointed into the shot.** The shader feathered `vUv.x` to zero over
the outer 10% at each end. Across a frame that is chrome protection; around a
compass it is a 36-degree dead zone at whatever bearing the geometry's seam falls
on, and it fell inside the view. The curtain survived only on the left third of
the frame, which reads exactly like a curtain that is too faint. The feather width
is now a uniform, and a shell that rings the compass has no ends to feather.

**The band was above the frame (A25).** The most expensive of the three. The shell
spanned $-7^\circ$ to $+31^\circ$ of elevation, on the reasoning that a curtain
should reach well up the sky. True of a sky, false of this frame: the world's
camera looks *down* at its station, because the dome is the subject, and the sky
it shows is a strip **3.7 degrees** tall along the top edge — measured by
rendering an altitude test pattern through the shell's own band and reading back
where each decade landed. Twenty-seven of those thirty-eight degrees were above
the top edge, and they were the twenty-seven containing the curtain. What remained
in shot was the dim skirt beneath the hem.

At $-2.4^\circ$ to $+5.6^\circ$ the green core lands 53 px down a strip 88 px
tall, the hem sits at 77 px where the ridges cut into it, and the upper tail
leaves the frame rather than ending inside it. A curtain should have a very
visible bottom edge and no visible top one, and on this framing that is the only
arrangement giving both.

### 11.4 The output transform a raw ShaderMaterial never gets

three injects `<colorspace_fragment>` into the materials it builds and not into a
raw `ShaderMaterial`, so the curtain was writing **linear** values into a
framebuffer whose every other pixel is sRGB-encoded. This is not a uniform
dimming; it crushes one end. A linear $0.5$ lands within 15% of where it belongs,
a linear $0.1$ lands at $26/255$ where it should be $89$. The skirt, the diffuse
mantle and the whole low-intensity majority of the emission were being deleted,
which left the bright bundles standing alone as detached lozenges with nothing
joining them. A curtain is the joining. The transform is now applied explicitly.

The tone curve moved with it, from Reinhard on the peak channel to Naka–Rushton
**per cone class**, $R = I/(I+1)$. Peak-channel compression cannot rotate hue,
which was the argument for it, and is also why nothing ever read as bright: a
hue-preserving curve has no white to compress toward, so the core came out as more
of the same green rather than as light. Per channel is the photoreceptor model
rather than the graphics convenience — each cone class saturates on its own
stimulus, green reaches its ceiling first, and the brightest part of the ribbon
goes near-white with colour surviving in the wings. That is what the middle of a
bright arc looks like.

### 11.5 Measured

Sky strip (rows 0–85, x 0–1100), aurora on against the `?no-aurora=1` ablation,
same server and same build, real Chrome headless with GPU, 1440×900:

| tier | sat on | sat off | luma delta | R−B delta |
|---|---|---|---|---|
| low | 0.217 | 0.285 | +0.045 | +13.0 |
| medium | 0.250 | 0.283 | +0.059 | +13.7 |
| high | 0.263 | 0.283 | +0.045 | +11.8 |

Saturation *falls* in the sky strip at every tier: the curtain is greener than the
sky it sits on but far less saturated than the sky's own gradient, so it cleans
the band rather than tinting it. Over the distant-mountain band (x 300–700,
y 120–200) every delta is $0.000$ — the geography keeps its desaturated blue-grey
and its aerial perspective, because the band no longer reaches down there at all.

**Cost.** Paired frame-interval sampling, alternating arms in one browser, two
9-second windows per arm:

| tier | median on | median off | delta median | delta p95 |
|---|---|---|---|---|
| low | 6.1 ms | 6.2 ms | −0.10 ms | −0.00 ms |
| medium | 12.1 ms | 12.1 ms | 0.00 ms | +0.30 ms |
| high | 18.2 ms | 18.2 ms | 0.00 ms | −0.00 ms |

Free within the run-to-run spread, and for a reason rather than by luck: the band
shrank from 38 degrees of elevation to 8, which is 190 px of fill instead of 900,
so the pass covers 4.7 times fewer fragments than before. The added arithmetic — a
second exponential per emission line for the Chapman layer, one extra sine and
cosine for the second carrier, one power for the output transform — is spent on a
fifth of the pixels.

**Limits.** The 3.7-degree sky strip is measured at one station, the observatory
plaque, at 1440×900; §11.6 carries the other seven and supersedes the gap this
paragraph used to record. The frame-cost table is this machine's Intel UHD, which
is fill-bound and low-tier, so the deltas bound the cost on faster parts without
predicting it; it is also taken at the observatory, which §11.6 shows is the
station where the band costs least. The spectral stratification remains a claim
the frame cannot show: 427.8 nm sits 500 times below 557.7 in luminance and its
window lands below the horizon at this band, so the violet hem and the crimson
N₂ 1P layer are both behind the terrain rather than visible above it.

### 11.6 The other seven frames, and the fourth coordinate mapping

One measured framing was never eight. Each station authors its own vertical field
of view and the rig's solver picks its own camera elevation from an authored
range, so the eight cameras pitch down between $5.5^\circ$ and $15.0^\circ$ behind
$36^\circ$ to $43^\circ$ of vertical field. `IglooScene` places the lens at
$\text{look} + \text{spherical}(\text{azimuth}, \text{elevation}, \text{distance})$
and then calls `lookAt(look)`, so the optical axis is pitched down by exactly the
solved elevation and

$$\theta_{\text{top}} = \tfrac12\,\mathrm{fov}_v - \text{elevation},\qquad
  \text{px per degree} = H/\mathrm{fov}_v .$$

That is `auroraStationSky`, and it is the fourth coordinate mapping in this
document that existed only as an implicit identity until something had to check
it. At 1440×900, medium tier, screen $y$ measured down from the top of frame:

| station | fov$_v$ | fov$_h$ | cam. elev. | top of frame | sky | horizon $y$ | band top $y$ | green core $y$ | hem $y$ |
|---|---|---|---|---|---|---|---|---|---|
| observatory-plaque | 38° | 57.7° | 15.0° | 4.00° | 95 px | 95 | −75 | 61 | 93 |
| assembly-tool-locker | 39° | 59.1° | 13.0° | 6.50° | 150 px | 150 | −15 | 117 | 149 |
| s2-kernel-core | 36° | 54.9° | 10.5° | 7.50° | 188 px | 188 | 9 | 152 | 186 |
| upstream-radio-mast | 39° | 59.1° | 11.0° | 8.50° | 196 px | 196 | 31 | 163 | 195 |
| manifold-reactor | 38° | 57.7° | 10.0° | 9.00° | 213 px | 213 | 44 | 179 | 212 |
| topology-archive-wall | 36° | 54.9° | 8.0° | 10.00° | 250 px | 250 | 71 | 214 | 249 |
| field-chamber-coils | 40° | 60.4° | 8.5° | 11.50° | 259 px | 259 | 98 | 227 | 257 |
| qpu-ice-bridge | 43° | 64.4° | 5.5° | 16.00° | 335 px | 335 | 185 | 305 | 334 |

A factor of 3.5 in sky, from 95 px to 335 px on the same 900 px frame. The green
core lands inside the strip at every one of them, so the $-7^\circ$ to $+31^\circ$
defect has no second instance hiding at another station — but the band arrives at
a very different size in each, and that is what had never been checked.

**Ablation.** Aurora on against `?no-aurora=1`, same server and same build, real
Chrome headless with GPU, 1440×900, medium tier, `prefers-reduced-motion: reduce`
so the field freezes to its pose and the rig stops breathing. Mean absolute RGB
difference per row, averaged over the sky strip; the noise column is the residual
between **two aurora-on captures** of the same frame, which is the floor the
signal has to beat:

| station | sky Δ (mean) | sky Δ (peak) | peak at $y$ | core predicted at $y$ | noise floor | SNR |
|---|---|---|---|---|---|---|
| observatory-plaque | 0.0452 | 0.0684 | 50 | 61 | 0.00000 | ∞ |
| assembly-tool-locker | 0.0359 | 0.0702 | 122 | 117 | 0.00000 | ∞ |
| s2-kernel-core | 0.0221 | 0.0461 | 147 | 152 | 0.00000 | ∞ |
| upstream-radio-mast | 0.0283 | 0.0778 | 156 | 163 | 0.00002 | 1537 |
| manifold-reactor | 0.0220 | 0.0578 | 170 | 179 | 0.00000 | ∞ |
| topology-archive-wall | 0.0238 | 0.0752 | 210 | 214 | 0.00000 | ∞ |
| field-chamber-coils | 0.0193 | 0.0687 | 227 | 227 | 0.00097 | 20 |
| qpu-ice-bridge | 0.0146 | 0.0731 | 299 | 305 | 0.00000 | ∞ |

Two things fall out of this table. Every station renders the curtain — no second
instance of the invisible-curtain defect exists. And the *predicted* core position
lands within 10 px of the measured delta peak at all eight, which is the first
independent confirmation that `auroraStationSky` describes the camera the rig
actually builds rather than a plausible model of it.

**What the sweep found: a row of blobs at three stations.** A25 requires the
curtain to stand more than three ray pitches tall, and it reads that off the
observatory's pixels per degree. The other stations have their own. Measured off
the same ablation — emission height at a tenth of peak, against ray pitch counted
as local maxima along the peak row:

| station | height | ray pitch | ratio at $8^\circ$ | ratio at $11^\circ$ |
|---|---|---|---|---|
| qpu-ice-bridge | 69 → 96 px | 25.7 → 31.3 px | **2.68** | 3.07 |
| manifold-reactor | 83 → 113 px | 30.6 → 30.0 px | **2.71** | 3.77 |
| observatory-plaque | 84 → 94 px | 27.7 → 29.4 px | 3.03 | 3.20 |
| topology-archive-wall | 85 → 116 px | 26.2 → 26.2 px | 3.25 | 4.43 |
| assembly-tool-locker | 79 → 151 px | 23.2 → 20.6 px | 3.40 | 7.34 |
| upstream-radio-mast | 76 → 112 px | 21.8 → 22.9 px | 3.48 | 4.90 |
| s2-kernel-core | 92 → 124 px | 20.0 → 18.7 px | 4.60 | 6.63 |

Two stations were under A25's own floor and the station A25 was written against
was over it by one pixel. A contract that lands on the right side by a pixel is
not a contract holding.

A26's second criterion is the one that decides the picture, and the ray pitch
cannot see it. The rays are fine grain; what the eye picks out is the *bundles*
the modulational instability makes, spaced at the filament pitch, four to five
times coarser. A curtain shorter than that spacing has each bundle further from
its neighbour than it is tall, which is a row of blobs however many rays are
inside one. At $8^\circ$ every station was under it — 84 px of emission against
100 px of filament spacing at the observatory, 74 px against 90 px at the ice
bridge. A24 makes the same anisotropy claim and cannot catch this, because it
compares the filament pitch to the 900 px **frame**; a frame is not a curtain and
that comparison stays true at any curtain height including zero.

**The fix, and what it deliberately does not touch.** The band grew from
$8^\circ$ to $11^\circ$ **about the green peak**, which stays at $1.44^\circ$:
$-3.85^\circ$ to $+7.15^\circ$. Nothing else moved. The Chapman altitudes and
scale heights are fractions of the band, so widening it scales the whole emission
profile vertically and leaves every horizontal scale, every colour, and the peak
brightness exactly where they were — $q(\text{peak}) = 1$ whatever the scale
height. All eight now sit at 1.15 on the filament criterion and between 3.07 and
7.34 on the ray criterion.

The band stays pinned in **absolute** elevation rather than tracking each camera.
The shell follows the eye, so its elevations are shared by all eight stations, and
that is the only honest arrangement: an aurora re-aimed per station would slide up
and down the sky as the visitor walked between them, which is a sky that slides.
The consequence is accepted rather than hidden — at the observatory the curtain's
upper tail leaves the top of a $4^\circ$ frame, and at the ice bridge it ends
inside a $16^\circ$ one with dark sky above it. That is what one distant arc looks
like from two cameras, and both readings are correct.

**Cost.** Median of 180 presented frame intervals, real Chrome headless with GPU,
vsync and frame-rate limit off so the interval does not quantise to the refresh
period. Measured at **qpu-ice-bridge**, which has the most band above its horizon
and is therefore the worst case; the observatory, where the band is clipped by the
frame above and by ground below, shows $\le 0.2$ ms at every tier:

| tier | band | aurora on | aurora off | Δ |
|---|---|---|---|---|
| low | $8^\circ$ | 6.1 ms | 6.1 ms | 0.0 ms |
| low | $11^\circ$ | 6.1 ms | 6.2 ms | −0.1 ms |
| medium | $8^\circ$ | 10.3 ms | 10.0 ms | +0.3 ms |
| medium | $11^\circ$ | 10.8 ms | 10.2 ms | +0.6 ms |
| high | $8^\circ$ | 17.7 ms | 17.5 ms | +0.2 ms |
| high | $11^\circ$ | 17.9 ms | 17.4 ms | +0.5 ms |

The widening costs about **+0.3 ms at medium and high at the worst station, and
nothing at low** — 2.9% and 1.7% of those frames. The band did not grow by 37% of
its fill: $1.44^\circ$ of the added $3^\circ$ sits below the old hem, where a
depth-tested `BackSide` shell meets ground the terrain has already written and the
fragment is rejected before it is shaded, and at the observatory the $1.56^\circ$
above leaves the top of the frame entirely. Only a station with a tall sky pays,
and only for the $1.56^\circ$: 33 px × 1440 at the ice bridge.

**Limits.** The frame numbers are headless on this machine's Intel UHD; headless
does not reproduce the compositor, and the observatory arm reads 1.4–2.0 ms total,
which is not a fill-bound number and is why the cost table is taken at the ice
bridge instead. Δ is quoted from single 180-frame medians, and the low-tier arms
returned 0.0 and −0.1 ms for the same configuration, so ±0.2 ms is the honest
resolution and +0.3 ms is a small multiple of it rather than a precise figure. The
per-station framings are solved rather than photographed: they assume the docked
pose, which the sweep enforces by waiting on the rig's own published chase
distance, and they ignore the sub-degree idle breath and pointer parallax the rig
adds, which is the residual between the predicted core and the measured peak. The
ray-pitch column counts local maxima above a quarter of the row peak, so it
undercounts faint rays and drifts upward as the curtain gets brighter — which
makes the "after" ratios in the table above understatements.

## 12. Only the green read, and the two reasons

Four emission lines were in the map, in the CIE table, in the Chapman stack and
in four assertions. On screen the curtain was green from top to bottom. Every
assertion passed.

This is the fourth time this file has shipped a correct quantity that no pixel
carried — after A19's pitch, A24's pitch through the camera and A25's position
in the frame — and the first time the lost quantity was a *colour channel*.

### 12.1 Three of the four windows were outside the frame

`altitude` is a coordinate on the 11° shell band, not a kilometre, and the map
from one to the other existed only as an implicit identity. Measured against the
strip every camera renders — the true horizon underneath, where a depth-tested
`BackSide` shell is rejected by terrain that has already written depth, and
$4.0^\circ$ on top, the tightest of the 24 station/tier framings:

| line | peak was | tenth-of-peak edge | renderable? |
|---|---|---|---|
| N₂ 1P 670.5 | $-2.64^\circ$ | — | no: under the terrain |
| N₂⁺ 427.8 | $-1.21^\circ$ | — | no: under the terrain |
| O I 557.7 | $+1.43^\circ$ | $-0.36^\circ$ | yes |
| O I 630.0 | $+5.17^\circ$ | $+4.08^\circ$ | no: begins above the tightest frame, and the shader's own top feather multiplied its peak by 0.394 |

The windows now sit at $+0.39$, $+0.83$, $+2.20$ and $+4.29$ degrees. Every
scale height is untouched, so the emission *height* in pixels — the quantity A25
and A26 measure anisotropy against — is exactly what it was: $q(\text{peak}) = 1$
wherever the peak is put. The band geometry is unchanged, so the fill is too.

### 12.2 The cone sum spent each line's luminance twice

$\mathbf c_\lambda$ was gamut-mapped and then **normalised to unit maximum**,
which divides out the line's luminance; the shader then multiplied by
$\bar y_\lambda$, which is a *different* luminance. Two defensible-looking steps
composing into a two-order-of-magnitude error, because $\bar y$ is almost none of
what the sRGB encoding of a saturated short-wavelength line contains — 427.8 nm
has $Y = 0.0089$ against $Z = 1.2295$, a ratio of 138:1.

Channel weight per line, scaled by column rate, relative to green's green:

| line | shipped R / G / B | colorimetric R / G / B | loss |
|---|---|---|---|
| N₂⁺ 427.8 | 0.0004 / 0 / **0.00197** | 0.0492 / 0 / **0.2187** | **111× in blue** |
| O I 557.7 | 0.3094 / 1.0000 / 0 | 0.3094 / 1.0000 / 0 | **none** |
| O I 630.0 | **0.0371** / 0 / 0.0025 | **0.1754** / 0 / 0.0117 | 4.7× in red |
| N₂ 1P 670.5 | **0.0063** / 0 / 0.0002 | **0.0254** / 0 / 0.0009 | 4.0× in red |

Green lost nothing, because $\bar y$ peaks at 557.7 by definition and there the
chromaticity and the luminance are the same number. **The weighting was exact
for the one line that did not need it and wrong by two orders of magnitude for
the one that needed it most.** The fix is a deletion: one weighting per sum.

Two consequences had to be followed through. The rod vector is a fiction — rods
have one spectral sensitivity and no chromaticity — so it is now built on the
unit-luminance direction, making $\mathrm{luma}(\mathbf{rod})$ equal the scotopic
scalar it is blended against. And alpha now follows $\mathrm{luma}(\mathbf
{colour})$ rather than the photometric luminance: with the gamut map lifting
427.8 by 19.9×, keying alpha off $Y$ delivered a correct violet and then
multiplied it by nothing.

### 12.3 A threshold no data ever crossed

The N₂ 1P layer is gated on $\text{flux}\times\text{hardness}$ at
$\mathrm{smoothstep}(0.5, 1.7, \cdot)$, against a quantity whose maximum over
the sampled rows is **1.031**. Mean gate value 0.0012; fully open in 0.00% of
cells. "Deepest and rarest" was not rare, it was dead code. Measured percentiles
are p50 0.037, p90 0.191, p99 0.517, so the gate is now $(0.15, 0.7)$: open in
7.5% of the field, saturated in 0.6%. A29 pins it to the distribution.

### 12.4 Measured

Ablation (aurora on − aurora off), medium tier, 1440×900, per-channel *fraction*
of the curtain's own added light, by elevation band. Null control — two aurora-on
frames of the same build — is 0.00–0.07 in every band, so everything below is
signal. `qpu-ice-bridge`, 335 px of sky:

| elev | before r / g / b | after r / g / b |
|---|---|---|
| $0.5^\circ$ | 0.443 / 0.549 / **0.007** | 0.336 / 0.486 / **0.178** |
| $1.0^\circ$ | 0.452 / 0.517 / 0.031 | 0.375 / 0.460 / 0.165 |
| $2.0^\circ$ | 0.453 / 0.524 / 0.023 | 0.425 / 0.458 / 0.117 |
| $3.0^\circ$ | 0.447 / 0.561 / −0.007 | 0.447 / 0.454 / 0.099 |
| $4.0^\circ$ | **0.498** / 0.590 / −0.087 | 0.480 / 0.462 / 0.058 |
| $5.5^\circ$ | — | **0.633** / 0.428 / −0.061 |

Before, the blue fraction peaks in the *middle* of the curtain at 0.031 and goes
negative at the top, and red spans 0.420→0.498 — a 1.19× spread over the whole
strip. That is one hue, which is what "only the green reads" means numerically.
After, blue falls monotonically 0.178→−0.061 and red climbs monotonically
0.336→0.633, with green peaking between them. The same ordering holds at
`observatory-plaque` (blue 0.205→0.114, red 0.332→0.444 across its 4° of sky)
and at low tier (blue 0.198→−0.089, red 0.413→0.662).

Brightness held at parity by construction: peak green delta 31.45/255 after
against 30.80 before, +2.1%. Intensity came down 1.3 → 0.80 to pay for the
restored luminance. Integrated light over the band is up ~14%, all of it the
630.0 mantle occupying three degrees of sky that previously rendered to nothing.

Cost, `qpu-ice-bridge`, vsync off, median of 180 presented intervals:

| tier | aurora on | aurora off | Δ |
|---|---|---|---|
| low | 5.1 ms | 5.0 ms | +0.1 ms |
| medium | 9.2 ms | 8.6 ms | +0.6 ms |
| high | 16.6 ms | 17.2 ms | −0.6 ms |

**Limits.** The Δ column brackets zero and its spread (−0.6 to +0.6 ms) exceeds
any plausible signal; a second sweep at the observatory returned −4.2, +0.3 and
−0.4 ms for the same build, so ±0.6 ms is the honest resolution here and the
right reading is "unchanged". There is no mechanism for it to have moved: the
band geometry, elevations and fill are byte-identical, and the shader lost four
scalar multiplies from the cone sum and gained one dot product. All frame numbers
are headless Chrome on this machine's Intel UHD and are fill-bound, low-tier
readings. The violet hem is real in the numbers but stays subordinate in the
picture, and that is the sky's doing rather than the emission map's: this world's
sky sits at R77 G110 B137 under the curtain, so the blue channel has both the
least headroom and receives the least light — a violet hem reads against a
near-black sky and can only ever be a cast against this one. The per-band figures
average the full 1440 px width, so they mix ray cores with the gaps between them;
they understate the peak hue on any single filament. §12.2's channel-weight table
is exact arithmetic, not a measurement, and carries no error bar.
