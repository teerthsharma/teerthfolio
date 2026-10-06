# Information theory of an anime still vs a photoreal game frame (AnimeEngine)

Theory for builders of teerthfolio's existing compositor. Not a new renderer. Constants below are from files or specs; uniforms not in the tree are not invented. Live Web fetch of ITU/Shannon PDFs was blocked in this session; Shannon / Cover–Thomas / ITU / GLSL / Loop–Blinn citations are the canonical publications.

## A still as a random field \(I(x,y)\): entropy and mutual information with the show

### Takeaway

A HUD-off still is a colour field \(I:[0,1]^2\to\mathbb{R}^3\). Pixel Shannon entropy of that field is the wrong objective. The useful quantity is mutual information between the still and a discrete homage label (does a watcher who has seen *Jujutsu Kaisen* name “Unlimited Void”?). teerthfolio already scores that as a 0–1 naming tick, not as MSE.

### Cited Findings

- Shannon defines the entropy of a discrete source \(X\) as \(H(X)=-\sum_x p(x)\log p(x)\) and mutual information as \(I(X;Y)=H(X)-H(X\mid Y)=H(Y)-H(Y\mid X)\). — [Shannon, *A Mathematical Theory of Communication*, Bell Syst. Tech. J. 27, 1948](https://doi.org/10.1002/j.1538-7305.1948.tb01338.x)
- For a continuous random variable the differential entropy is \(h(X)=-\int p(x)\log p(x)\,dx\). It is only defined up to the choice of measure; a pixel field needs a quantizer before \(H\) is a bit count. — [Cover & Thomas, *Elements of Information Theory*, ch. 8–9](https://doi.org/10.1002/047174882X)
- Issue #12 states the naming test in English: “A watcher who has seen the show does not name the homage from a HUD-off still.” The 3 s Aether still on `460bafd` is mean RGB \(45,18,57\) (“type-on-purple”), not flood/core. — [teerthfolio#12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Issue #10 makes the same test a ledger row: T78 fail = “Aether 3 s is still type-on-purple… Not flood/core as the subject.” Earn: “3 s: flood or white-violet core occupies ≥ 40% of the frame.” T93 fail = “Aether 8 s is still a koan on dark purple, not a domain you could draw.” — [teerthfolio#10](https://github.com/teerthsharma/teerthfolio/issues/10)
- The quality-gap note opens with the same observer: “A watcher who has seen the show scratches their eye.” Live `p-aether-lang` “have” is a koan on a dark card; “see” is Unlimited Void. — [research_notes/anime-quality-gap.md](https://github.com/teerthsharma/teerthfolio/blob/main/research_notes/anime-quality-gap.md)
- The 2D stitch that *would* name Void is already a short program: `jjkStitch` beat 0 = `jjkDomain`, beat 1 = domain+hero, beat 2 = kill; timed by `jjkHold(t, 12.0)` at \(t<3\), \(t<6.4\), else kill. — [lib/anime/tools/jjk/kit.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/jjk/kit.glsl.js)

### Inferences

Treat the still as a random field and the show as a discrete label \(S\in\{\text{Void},\text{COTE},\text{Gordius},\ldots,\text{none}\}\).

\[
I\colon [0,1]^2\to\mathbb{R}^3,\qquad
L(x,y)=0.2126\,I_R+0.7152\,I_G+0.0722\,I_B.
\]

If the frame is sampled at \(W\times H\) and each channel is quantized to \(b\) bits, the naive iid bound is

\[
H(I)\;\le\; 3b\,WH
\]

(e.g. \(24WH\) bits at 8-bit RGB). Natural-image sources sit far below that because of spatial correlation (Shannon’s “redundancy”). That number still does not decide whether \(S=\) Unlimited Void.

Let \(Y=\mathbf{1}\{\text{watcher names the homage HUD-off}\}\). Then

\[
I(I;Y)=H(Y)-H(Y\mid I),\qquad
H(Y\mid I=i)=h_2\!\bigl(P(Y=1\mid I=i)\bigr)
\]

with binary entropy \(h_2\). A cream aisle (`p-planimeter` mean \(195,185,184\)) and a magenta plate (`pr-polychrom-79` \(155,25,89\) at both 3 s and 8 s) have plenty of pixel entropy and \(P(Y=1\mid I)\approx 0\), so \(I(I;Y)\approx 0\). A stitch whose hole occupies \(\ge 40\%\) of the frame drives \(P(Y=1\mid I)\to 1\) for watchers who know the show, so \(H(Y\mid I)\to 0\) and \(I(I;Y)\to H(Y)\).

The naming channel is therefore a *soft classifier* on a few graphic atoms (hole, circled 50, wheel, iris, three faces, torn page, gold rings), not a pixel codebook. Issue #12’s “drawable domain” is exactly “a short sufficient statistic for \(S\)”.

### Gaps

- No committed numerical estimate of \(H(I)\) or \(I(I;S)\) exists in the tree. The 1% / 10% figures are craft judgments, not computed entropies.
- The watcher’s prior \(P(S)\) is not modeled (a JJK fan vs a first-time visitor). \(I(I;Y)\) depends on that prior.
- Live Web fetch of the Shannon PDF was blocked here; the entropy formulae are the standard 1948 definitions.

## Rate-distortion for “names the homage HUD-off”

### Takeaway

Shannon’s \(R(D)\) says: spend bits only to hold distortion under a threshold. For AnimeEngine the distortion is 0–1 *naming* loss, not \(\ell_2\) to a MAPPA plate. Twenty disconnected wash cards have high rate and near-zero naming MI. One stitch (domain + hero + halt + kill) is a short description that sits under the naming threshold.

### Cited Findings

- The rate-distortion function is \(R(D)=\min_{p(\hat x\mid x):\,\mathbb{E}[d(X,\hat X)]\le D} I(X;\hat X)\). — [Shannon 1948 (continuous sources / future notes)](https://doi.org/10.1002/j.1538-7305.1948.tb01338.x); [Cover & Thomas, ch. 10](https://doi.org/10.1002/047174882X)
- Under Hamming / 0–1 loss \(d(x,\hat x)=\mathbf{1}\{x\neq\hat x\}\), \(R(D)\) for a Bernoulli source is the inverse of the binary entropy (you may “spend” \(D\) error probability). — [Cover & Thomas, §10.3](https://doi.org/10.1002/047174882X)
- Issue #12: “A dock that ships 20 named slots that all draw the same wash is 20 ugly cards. Aether’s 20 slots already alias three beats on purpose. That is the pattern.” Control table: `CUTS_A` 160 + `CUTS_D` 160 = 320 named slots across 16 folders (20 each). — [teerthfolio#12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Issue #12 acceptance: parity on a dock is true only when “One composed stitch (WORLD + CAST + optional FX kill + GRADE). Not 20 disconnected cards,” and “The script’s 3 s still names the homage with HUD ignored.” — [teerthfolio#12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Issue #12: 5% of site-wide anime means **four** HUD-off stills a watcher can name (planimeter, Aether, Caustic or Triton, Polychrom or Mujo) plus CAST dress. “That is not 8.5 and not 750 wallpaper plates.” — [teerthfolio#12](https://github.com/teerthsharma/teerthfolio/issues/12)
- The gap note: “Wallpaper = more hex on `voidMaterial` / Stage night. That is how we stayed at 1%.” Pocket budget: \(\le 8\) draws, \(\le 12\)k env tris, \(\ge 1\) naming shader, 0 extra PBR cities. — [research_notes/anime-quality-gap.md](https://github.com/teerthsharma/teerthfolio/blob/main/research_notes/anime-quality-gap.md)
- `jjkStitch` / `jjkStitchTimed` is the existence proof of a low-rate code: three beats, one kit, held at 12 fps. — [lib/anime/tools/jjk/kit.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/jjk/kit.glsl.js)

### Inferences

Define naming distortion against show-memory \(M\) (the watcher’s recall of the episode, not a PNG):

\[
d_{\mathrm{name}}(I,M)=\mathbf{1}\{\text{HUD-off still does not name }M\},\qquad
D^\star=\mathbb{E}[d_{\mathrm{name}}].
\]

The operational problem is: find the shortest program \(p\) such that \(d_{\mathrm{name}}(U(p),M)=0\). That is rate-distortion at \(D=0\) on a 0–1 distortion, i.e. a lossless code *for the naming features*, allowing arbitrary \(\ell_2\) error on everything else (paper tooth, star hash, pear silhouette).

Twenty ugly cards are twenty independent encodings \(I_1,\ldots,I_{20}\) of nearly the same wash. If each satisfies \(I(I_k;Y)\approx 0\), the union still has

\[
I(I_1,\ldots,I_{20};Y)\;\le\;\sum_k I(I_k;Y)\;\approx\;0
\]

while the description length scales like \(20\times L(\text{plate}+\text{overlay})\). High rate, low MI.

One stitch \(I=f(\text{domain},\text{hero},\text{halt},\text{kill})\) is a *single* source with a shared hypothesis. The bits that matter are the bits that move \(P(Y=1)\): hole \(\ge 40\%\), Six Eyes, halt ring, Blue+Red collision. Extra hex families with no CAST are rate spent off the \(R(D)\) curve — they reduce pixel distortion to a wallpaper and leave \(D_{\mathrm{name}}=1\).

Builder rule: do not buy rate (more slots, more tris, more MeshStandard cities) unless it flips a naming tick. Issue #10 already prices each tick at \(0.1\).

### Gaps

- No measured \(R(D)\) curve (bits vs naming rate) is in the repo. The 20-slot packs are counted; their per-slot naming MI is not.
- “Show-memory” \(M\) is not a stored embedding. The probe is a human / Chrome still, not an automatic \(d_{\mathrm{name}}\).

## Kolmogorov / MDL complexity: Void still vs GTA street vs WAAPI tween

### Takeaway

Kolmogorov complexity \(K(x)\) is the length of the shortest program that emits \(x\). A MAPPA Unlimited Void still is a short program (space + hole SDF + glass patches + pear cover + halt + grade). A GTA street is a long program (city + PBR + shadows + GI). A WAAPI opacity tween is a 1-D path \(\gamma(t)\) — shortest of the three, and almost no naming MI.

### Cited Findings

- Kolmogorov complexity \(K_U(x)=\min\{\lvert p\rvert:U(p)=x\}\). It is uncomputable but is the right idealization of “how long is the shader / the city / the tween.” Prefix complexity and the MDL two-part code \(L(H)+L(D\mid H)\) are the practical stand-ins. — [Kolmogorov 1965, *Three approaches to the quantitative definition of information*](https://doi.org/10.1007/BF01156704); [Cover & Thomas, ch. 14](https://doi.org/10.1002/047174882X); [Rissanen MDL](https://doi.org/10.1214/aos/1176344136)
- The Void program in-tree is explicit and short: `jjkSpace` (hash stars on `JJK_DEEP`/`JJK_VOID`), `jjkEye` (ellipse SDF at `JJK_EYE=(0.48,0.54)` with radii \(0.56\times 0.66\)), `jjkPatches` (seven `jjkFrame`s mixed toward the eye), `jjkCover` (disc \(r=\sqrt{0.13}\) at `JJK_C=(0.84,0.30)`), `jjkHalt` (two rings), `jjkHeroOn` / `jjkKillOn`, `jjkOut` = lift+cap. Comment: “Black hole. Thin white accretion. Core ≥ 40% of frame.” — [lib/anime/tools/jjk/kit.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/jjk/kit.glsl.js)
- Issue #12 records a 2026-10-06 unofficial GTA V-in-Chrome incident: a tab *can* raster a city (~700 MB compressed assets). “The remaining problem on this site is whether a 3 s still names the show.” The port is cited as capability, not a method. — [teerthfolio#12](https://github.com/teerthsharma/teerthfolio/issues/12); [Beebom report](https://beebom.com/rockstar-shuts-down-free-gta-5-browser-port/)
- Issue #10 / #12 law: polygons are silhouette; maps are frequency; shaders are light and name. Stock `MeshStandard` as the only light is below floor. Pocket: \(\le 8\) draws, \(\le 12\)k env tris, 0 extra PBR cities. — [teerthfolio#10](https://github.com/teerthsharma/teerthfolio/issues/10)
- Web Animations represent a property as a timed keyframe effect: a 1-D interpolant, not a field. — [W3C Web Animations Level 1](https://www.w3.org/TR/web-animations-1/)
- teerthfolio hold is the opposite of a WAAPI ease: time is quantized, `floor(t*fps)/fps`, default 12. — [lib/anime/stack/law.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/stack/law.js); [lib/anime/layers/graphic-stack.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/graphic-stack.js)

### Inferences

Write \(K(I)\) for the still as a program in the AnimeEngine language (GLSL kit + stash + hold), not as a PNG.

**Void (short \(K\), high naming MI).** An MDL two-part code:

\[
L(\text{Void})
= L(\texttt{jjkDomain})
+ L(\texttt{jjkHeroOn})
+ L(\texttt{jjkHalt})
+ L(\texttt{jjkKillOn})
+ L(\texttt{jjkOut}).
\]

The hypothesis \(H\) is “MAPPA digital void: ethereal black-blue, white information frames, black hole, Infinity halt, Blue+Red collide.” The data \(D\mid H\) are a handful of centres and radii (`JJK_EYE`, `JJK_C`, seven frame sites, halt rad \(0.26\)). \(K(I_{\mathrm{Void}})\) is on the order of the kit, not the framebuffer.

Ellipse area vs the 40% floor (unit square frame, \(p\in[0,1]^2\)):

\[
A=\pi\cdot 0.56\cdot 0.66\approx 1.161
\quad(>100\%\text{ of the square}).
\]

The authored hole is *larger than the frame*, so the visible intersection is a dominant core. T78’s “\(\ge 40\%\)” is an acceptance floor, not the ellipse’s raw area. Pear cover disc: \(r=\sqrt{0.13}\approx 0.361\), \(A=\pi\cdot 0.13\approx 0.41\) of the square (clips the right edge at \(x=0.84+0.36=1.20\)).

**GTA street (long \(K\), high pixel fidelity, low homage MI on this site).** A photoreal frame’s shortest program includes: city mesh, materials (Cook–Torrance / PBR), shadow maps, GI, weather. That is a long \(H\). It buys low \(\ell_2\) to a photograph and almost no bits for \(S\in\{\text{Void},\text{COTE},\ldots\}\). Issue #12’s surviving fact after the takedown: a browser *can* pay that \(K\). AnimeEngine must not, because the naming code is a *different* program class (compositor stack, not a city).

**WAAPI opacity tween (tiny \(K\), zero naming MI).**

\[
\gamma:[0,1]\to[0,1],\qquad
I_t(x,y)=\gamma(t)\cdot I_0(x,y).
\]

A linear opacity keyframe is a few scalars. \(K(\gamma)=O(1)\). It cannot carry a hole, a 50, or a wheel. Using WAAPI as the “animation” of a dock is a 1-D path through appearance, not a 2-D still that names a show. The engine’s hold, `skTwos(t)=skHold(t,12)`, is a 0-D *sample-and-hold* of a drawing, which is the sakuga hypothesis: new information arrives at 12 Hz, not as a \(C^1\) tween.

**Relative order (idealized, not measured):**

\[
K(\gamma_{\mathrm{WAAPI}})
\;\ll\;
K(I_{\mathrm{Void\ stitch}})
\;\ll\;
K(I_{\mathrm{GTA\ street}}),
\]

\[
I(\gamma;Y)
\;\approx\;
0
\;\ll\;
I(I_{\mathrm{Void}};Y)
\;\gtrsim\;
I(I_{\mathrm{GTA}};Y_{\mathrm{homage}})
\quad\text{on this site's }Y.
\]

GTA can have huge \(I(I;\text{Los Santos})\) and still lose \(I(I;Y_{\mathrm{Void}})\). Complexity that does not serve the naming distortion is wasted rate.

### Gaps

- \(K\) is uncomputable; the “short program” claim is MDL-length of the committed GLSL, not a Kolmogorov number.
- No GTA renderer lives in this tree. The GTA comparison is capability + complexity class, from #12’s news citation, not from a local frame dump.
- WAAPI is not referenced as a library in the AnimeEngine kits; the 1-D path is the *contrast class* the user asked for, not a teerthfolio uniform.

## teerthfolio maths already in the tree (derive and cite)

### Takeaway

The engine already encodes Rec.709 luma, a \(0.92\) cap, ink lift off `#000`, `fwidth` analytic AA, SDF coverage, 3-tone cel as a 2-threshold quantizer, hold-on-twos at 12 fps, a Genshin chunk stack with `ALU_BUDGET = 64`, and a camera law \(\theta=2\arctan(R/d)\) with \(R=84\). `PULL_FAR = 44` is in the #10 spec, not as a JS identifier in this checkout. Do not invent uniforms beyond those listed.

### Cited Findings

**Rec.709 luma and the 0.92 cap**

- ITU-R BT.709-6 gives the luma coefficients for linear \(R,G,B\) as \(Y=0.2126R+0.7152G+0.0722B\). — [ITU-R BT.709-6](https://www.itu.int/rec/R-REC-BT.709-6-201506-I/en)
- Protocol (JS, the law the compositor names):

```
LUMA_W = [0.2126, 0.7152, 0.0722]
LUMA_MAX = 0.92
lumaOf(rgb) = 0.2126 R + 0.7152 G + 0.0722 B
lumaCap: s = min(1, 0.92 / max(L, 1e-4)); return s * rgb
```

Comment: “Rec.709 cap. Lit luma never above 0.92.” — [lib/anime/layers/protocol.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/protocol.js)

- Same weights and cap in GLSL kits: `JJK_LUMA` / `JJK_CAP` 0.92; `LY_LUMA` / `LY_CAP` 0.92; `BK_LUMA` / `BK_LUMA_MAX` 0.92; `SK_LUMA` / `SK_CAP` 0.92; `SC_LUMA` / `SC_CAP` 0.92; `O_LUMA` / `O_LUMA_MAX` 0.92. Cap is a *uniform RGB scale*, chromaticity-preserving: \(c' = c\cdot\min(1, 0.92/\max(L,10^{-4}))\). — [lib/anime/tools/jjk/kit.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/jjk/kit.glsl.js); [lib/anime/layers/stash.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/stash.glsl.js); [lib/anime/tools/basic/kit.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/basic/kit.glsl.js)
- P4: “luma police: floor off #000, cap 0.92.” GRADE is last; `lumaCap` after. — [lib/anime/layers/improve.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/improve.js); [lib/anime/layers/protocol.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/protocol.js)
- Glow is isolated: `emitGate(albedo, glow, uEmit)` adds `glow * uEmit` then `lumaCap`. P5: “glow only via uEmit. Albedo never blooms itself.” Issue #12: “Bloom only on `uEmit` above the luma cap.” — [lib/anime/layers/protocol.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/protocol.js); [lib/anime/layers/improve.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/improve.js); [teerthfolio#12](https://github.com/teerthsharma/teerthfolio/issues/12)

**Ink lift off `#000`**

- `inkLift`: `max(rgb, INK)` with `INK = [0.08, 0.09, 0.18]`. Comment: “Lift crushed ink off #000 so the print still has air.” — [lib/anime/layers/protocol.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/protocol.js)
- Kit floors (do not unify them): `JJK_INK = (0.055, 0.072, 0.110)`; `LY_INK = (0.08, 0.09, 0.18)`; `SK_INK = (0.078, 0.055, 0.090)`; `BK_INK = (0.08, 0.09, 0.18)`. `jjkOut = jjkCap(jjkLift(c))`, `lyPolice = lyCap(lyLift(c))`, `skOut = skCap(skFloor(c))`. — the kit files above
- Rec.709 digital coding of 8-bit limited-range luma uses a footroom: reference black is code 16, not code 0 (superblack). — [ITU-R BT.709-6 §3](https://www.itu.int/rec/R-REC-BT.709-6-201506-I/en)
- BT.1886 reference EOTF is \(L=a(\max[(V+b),0])^\gamma\) with a non-zero black offset \(b\) when display black is not zero. — [ITU-R BT.1886](https://www.itu.int/rec/R-REC-BT.1886-0-201103-I/en)

**`fwidth` / analytic AA**

- GLSL `fwidth(p) = abs(dFdx(p))+abs(dFdy(p))` is the screen-space gradient magnitude in pixels. — [Khronos `fwidth`](https://registry.khronos.org/OpenGL-Refpages/gl4/html/fwidth.xhtml)
- Analytic coverage from a signed field, then a smoothstep of width \(\propto\) that gradient, is the GPU-gems / implicit-curve family (Loop–Blinn evaluate an implicit \(f=0\); Green’s alpha-tested magnification uses a distance field + screen derivative). — [Loop & Blinn, SIGGRAPH 2005](https://doi.org/10.1145/1073204.1073303); [Green, *Improved Alpha-Tested Magnification*, SIGGRAPH sketches 2007](https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-24-importance-being-linear) (related derivative-AA practice); [Quilez, 2-D distance functions](https://iquilezles.org/articles/distfunctions2d/)
- In-tree kernels (note the \(k\) differs; do not invent a single `k`):

\[
\begin{aligned}
\texttt{jjkAA}(v,t)&=\mathrm{smoothstep}(t-w,t+w,v),& w&=0.75\,\mathrm{fwidth}(v)+10^{-5},\\
\texttt{lyAA}(v,t)&=\mathrm{smoothstep}(t-w,t+w,v),& w&=\mathrm{fwidth}(v)+10^{-5},\\
\texttt{jjkFill}(d)&=1-\mathrm{smoothstep}(-w,w,d),& w&=0.8\,\mathrm{fwidth}(d)+10^{-5},\\
\texttt{lyFill}(d)&=1-\mathrm{smoothstep}(-w,w,d),& w&=\mathrm{fwidth}(d)+10^{-5}.
\end{aligned}
\]

— [lib/anime/tools/jjk/kit.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/jjk/kit.glsl.js); [lib/anime/layers/stash.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/stash.glsl.js)

- P1 cel uses the same \(k=0.75\) on the *quantizer coordinate* \(t=h\cdot(n-1)\). P2 ink: \(w=\mathrm{fwidth}(d)\cdot px\cdot\mathrm{mix}(0.65,2.7,\mathrm{clamp}(\mathrm{concave}\cdot 8,0,1))\). — [lib/anime/layers/improve.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/improve.js)

**SDF disc / ellipse coverage; `JJK_EYE`**

- Ellipse SDF: `length((p-c)/rad)-1` with `JJK_EYE = (0.48, 0.54)`, `rad = (0.56, 0.66)`. Shared helper `lyEllipse` is the same formula. — [lib/anime/tools/jjk/kit.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/jjk/kit.glsl.js); [lib/anime/layers/stash.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/stash.glsl.js)
- Coverage is `jjkFill(jjkEyeD(p))` (analytic AA on the SDF), not a rasterized mesh. Disc cover for the pear: `jjkAA(0.13 - dot(q,q), 0)`. — same JJK kit
- T78 earn and the kit comment both require core \(\ge 40\%\) of frame. — [teerthfolio#10](https://github.com/teerthsharma/teerthfolio/issues/10); [lib/anime/tools/jjk/kit.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/jjk/kit.glsl.js)

**3-tone cel as a 2-threshold quantizer**

- `jjkCel3(v, t1, t2, dark, mid, lit) = mix(mix(dark, mid, jjkAA(v,t1)), lit, jjkAA(v,t2))`. Cloth uses \((t_1,t_2)=(0.28,0.64)\); skin \((0.44,0.78)\). `bkCel3` uses \((0.38,0.72)\). `gsRamp3` shifts thresholds by material row: \(t_0=\mathrm{mix}(0.30,0.46,r/4)\), \(t_1=\mathrm{mix}(0.60,0.78,r/4)\). — [lib/anime/tools/jjk/kit.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/jjk/kit.glsl.js); [lib/anime/tools/basic/kit.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/basic/kit.glsl.js); [lib/anime/stack/genshin.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/stack/genshin.glsl.js)
- P1 `lyCel` generalizes to \(n\in\{2,3,5\}\) plates with fwidth at each cut. — [lib/anime/layers/improve.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/improve.js)

**Hold on twos / temporal Nyquist**

- `holdTime(t, fps=12) = floor(t*fps + 1e-5)/fps` in JS (`law.js`, `graphic-stack.js`). GLSL: `jjkHold`, `lyHold`, `bkHold`, `skHold` are the same; `skTwos(t) = skHold(t, 12.0)`. — [lib/anime/stack/law.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/stack/law.js); [lib/anime/tools/sakuga/kit.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/sakuga/kit.glsl.js)
- P8: “12 / 24 fps. Same law as engine floor(t*fps)/fps.” Catalog: `holdStep12`, `holdOnTwos12`. Grain locks to the held drawing (`holdTwosGrain`). — [lib/anime/layers/improve.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/improve.js); [lib/anime/layers/index.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/index.js); [lib/anime/tools/sakuga/hold.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/tools/sakuga/hold.js)
- Nyquist: a signal with highest frequency \(B\) hertz is determined by samples at \(>2B\). — [Nyquist 1928](https://doi.org/10.1109/T-AIEE.1928.5055024); [Shannon 1948, sampling](https://doi.org/10.1002/j.1538-7305.1948.tb01338.x)

**Genshin chunk stack / `ALU_BUDGET` 64**

- `ALU_BUDGET = 64`, `PREFETCH_BUDGET = 24`, `CORE_CHUNKS = [outline, ramp, faceSdf, rimEdge, hold, print]`. Chunk `cost` is an integer in \(1..32\). `must` chunks cannot be dropped; overflow of `must` throws. — [lib/anime/stack/law.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/stack/law.js)
- Costs (from `chunks.js`): outline 6 must, ramp 8 must, faceSdf 12 must, rimEdge 10, hold 4 must, hairRing 8, paper 4, print 6, night 6, gold 6, hatch 7, emit 8, wash 5, fluoro 6, benday 6, grey 5, invert 5. — [lib/anime/stack/chunks.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/stack/chunks.js)
- `planDock` concatenates `CORE_CHUNKS + paper + hairRing + extras`. Aether extras: `night, emit, invert`. `pickChunks` sorts non-must by `pri` desc, then cost, and drops when `cost + c.cost > 64`. — [lib/anime/stack/plan.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/stack/plan.js); [lib/anime/stack/load.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/stack/load.js)
- Genshin lighting comments: half-Lambert → 5-row ramp; face is `FdotL` vs cheek SDF, not \(N\cdot L\) facets; rim is `fwidth(cover)*10`, not Fresnel. — [lib/anime/stack/genshin.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/stack/genshin.glsl.js)

**Camera \(\theta = 2\arctan(R/d)\)**

- Island radius `ISLAND_RADIUS = 84` in `places.js`. — [lib/world/places.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/world/places.js)
- Director spec / #10 T08: “`PULL_FAR = 44`. Island \(\theta = 2\arctan(84/44)\approx 125^\circ\). Still the dock.” Floor \(d\ge 420\) (\(\theta\le 23^\circ\)). Prefer 900 on myth docks. Table: 35.5 m → 134°; 44 → 125°; 190 → 48°; 420 → 23°; 900 → 11°; 1600 → 6°. — [docs/superpowers/specs/2026-10-05-director-epic-design.md](https://github.com/teerthsharma/teerthfolio/blob/main/docs/superpowers/specs/2026-10-05-director-epic-design.md); [teerthfolio#10](https://github.com/teerthsharma/teerthfolio/issues/10)
- Per-dock *cards* in this tree: Aether `d: 900`, `eyeH: 0.4`, `from: 1`; most others `d: 420` (planimeter 380, highway 500, epsilon 480). These are `SEAL_CAMERAS` metres, not a `PULL_FAR` identifier. — [lib/anime/kit/seal-camera.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/kit/seal-camera.js)
- **This checkout has no `lib/world/cutscene/camera.js` and no JS symbol `PULL_FAR`.** The 44 m figure is spec / issue text about live pull on the #10 SHA, not a constant you can grep in `lib/` here.

**Uniforms that *do* exist (stash kit) — do not add others**

- `uRes`, `uEmit`, `uPlateOn`, `uPlateFallback`, `uFps`, and optionally `sampler2D uPlate` behind `LY_HAS_PLATE`. — [lib/anime/layers/stash.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/stash.glsl.js)

### Inferences

**Why 0.92 not 1.0.** The files do not write a closed-form derivation of \(0.92\). What they *do* write: Rec.709 luma, a hard cap, GRADE last, emit added then re-capped, “print still has air,” “glow via mix not bloom.” The operational meaning is a knee:

\[
L'=\min(L,0.92),\qquad
c' = c\cdot\frac{L'}{\max(L,10^{-4})}.
\]

Headroom \(1-0.92=0.08\) is reserved for `uEmit` add-clamped and for print/night remaps that would otherwise hit `#fff` paper or a bloom plate. Setting the cap to \(1.0\) would make “bloom as the look” (the Honkai/ZZZ anti-pattern in #12) the default. The number \(0.92\) is house law, not an ITU constant.

**Why ink \(\neq \#000\).** Limited-range Rec.709 never codes reference black at 0. CRT/TV composite also sat above gun cutoff (NTSC 7.5 IRE setup is the historical cousin). The house translation is a per-kit floor `max(c, INK_* )`. True `#000` in a WebGL framebuffer is a *superblack* relative to that print, which is why Nerve’s black-share \(0.53\) can still pass playback (T60) while looking like a cellar: crush is not the same as Obata ink.

**AA as a coverage random variable.** Let \(d(x)\) be an SDF. The pixel integral of \(\mathbf{1}\{d\le 0\}\) is approximated by a logistic/smoothstep of width \(w\propto\lVert\nabla_{\mathrm{screen}} d\rVert_1\). That is a 1-bit occupancy source plus a sub-pixel likelihood. Jagged aliasing is high-frequency noise that *burns rate without adding naming MI*. The kit spends a cheap gradient, not MSAA, to keep \(K\) small.

**Cel as information loss that *is* the style.** A continuous half-Lambert \(h\in[0,1]\) has infinite differential entropy. A 2-threshold quantizer

\[
Q_3(h)=\begin{cases}
\mathrm{dark}& h<t_1\\
\mathrm{mid}& t_1\le h<t_2\\
\mathrm{lit}& h\ge t_2
\end{cases}
\]

yields at most \(\log_2 3\approx 1.585\) bits/pixel of *tone label*. The discarded bits are the photoreal gradient. MAPPA/Lerche *want* that discard. Buying PBR back (GTA-class \(K\)) re-inserts bits that *lower* \(I(I;Y_{\mathrm{anime}})\). Genshin’s 5-row ramp is the same idea with a material-dependent \((t_0,t_1)\).

**Hold as temporal Nyquist of “on twos.”** Film at 24 fps drawn on twos is 12 distinct images per second. The hold

\[
t\mapsto \frac{\lfloor 12t+10^{-5}\rfloor}{12}
\]

is an ideal zero-order hold: the temporal spectrum is a sinc comb with replicas at 12 Hz. A \(C^1\) WAAPI tween reconstructs *between* drawings and is the wrong codebook (in-betweening without a drawing). 24 fps (`holdStep24`) doubles the drawing rate; it does not interpolate. Grain hashed by `hold` (not by raw \(t\)) keeps paper tooth from swimming — i.e. locks the high-frequency source to the 12 Hz clock so it does not look like video noise.

**ALU 64 as a description-length budget.** Must-set cost: \(6+8+12+4=30\). `planDock` then asks for rimEdge(10)+print(6)+paper(4)+hairRing(8)+family extras. School extras `{fluoro, paper, hold, print}` add fluoro(6) after dedup → \(30+10+6+4+8+6=64\) on the nose. Aether extras `{night, emit, invert}` push the asked set over 64; `pickChunks` will drop lowest `pri` first (`invert` is pri 3, then paper/night at 5). That is MDL in the compiler: when the program would exceed 64 ALU-units, delete the least-prior enhancement layer. If Aether’s OCCLUDE invert is dropped, the stitch *loses a naming layer* — budget and naming \(R(D)\) can fight.

**Angular diameter.** For a disc of radius \(R\) at distance \(d\) along the axis,

\[
\theta=2\arctan\!\Bigl(\frac{R}{d}\Bigr),\quad R=84.
\]

Recomputed (radians → degrees):

| \(d\) | \(\theta=2\arctan(84/d)\) | spec label |
|---:|---:|---|
| 35.5 | \(134.2^\circ\) | follow |
| 44 | \(124.6^\circ\) | shrug (`PULL_FAR` in #10) |
| 190 | \(47.7^\circ\) | fog far |
| 420 | \(22.6^\circ\) | left the dock |
| 900 | \(10.7^\circ\) | coin / Aether card |
| 1600 | \(6.0^\circ\) | speck |

`SEAL_CAMERAS["p-aether-lang"].d = 900` is the *card* that matches the coin. Live pull remaining at 44 m (if still true on the deployed SHA) is a high-\(\theta\) still of the *island*, which cannot be Void. Camera is part of the source code of the still: wrong \(d\) makes \(K\) pay for the wrong scene.

### Gaps

- No file derives \(0.92\) from a print density or a bloom knee equation. Treat “print / bloom knee” as an inference, not a committed formula.
- `PULL_FAR` and `camera.js` are **not in this tree**. Cite #10 / the director spec for 44 m; cite `places.js` + `seal-camera.js` for \(R=84\) and per-dock \(d\).
- `fwidth` \(k\) is not one house uniform: 0.75 (jjkAA, P1), 0.8 (jjkFill), 1.0 (lyAA). Do not invent `uAAK`.
- Live ALU drop list per dock is not logged; the Aether-over-64 inference is from adding the published costs, not from a runtime dump.
- Green 2007 / GPU Gems chapter numbers are the standard derivative-AA citations; this session could not re-fetch the PDFs.

## Channel coding: WORLD / CAST / FX / OCCLUDE / GRADE as layered source coding

### Takeaway

The five stashes are a successive-refinement stack (base plate + enhancement layers), not twenty i.i.d. sources. That is why one stitch beats twenty cards: the decoder (the watcher) sees one composed codeword.

### Cited Findings

- Successive refinement: a source can be described at distortion \(D_1\) and then refined to \(D_2<D_1\) with no rate loss iff the \(R(D)\) curve is successively refinable (Equitz–Cover). Scalable video (base + enhancement) is the engineering form. — [Equitz & Cover 1991](https://doi.org/10.1109/18.104322); [Cover & Thomas §13.5](https://doi.org/10.1002/047174882X)
- Protocol stash table (frozen):

| id | order | blend | when |
|---|---:|---|---|
| WORLD | 0 | replace | shot |
| CAST | 1 | replace | frame |
| FX | 2 | add-clamped | frame |
| OCCLUDE | 3 | multiply | frame |
| GRADE | 4 | replace | frame |

OCCLUDE “never covers the hero seal.” GRADE is last; luma police after. CAST time is stepped (P8). FX glow only through `uEmit`. WORLD is compiled at `build(ctx)` and redrawn when the shot changes. — [lib/anime/layers/protocol.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/protocol.js)

- GLSL blend: mode 0 replace, 1 multiply, 2 screen, 3 add-clamped; every mix goes through `lyPolice`. — [lib/anime/layers/stash.glsl.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/layers/stash.glsl.js)
- Issue #12 draws the same stack as a TV compositor and as a nest of enhancement layers, and gives the Void worked example: beat 0 WORLD `jjkDomain`; beat 1 CAST hero + FX halt; beat 2 FX Blue+Red; then GRADE. “Every other dock copies this *shape*, not this palette.” — [teerthfolio#12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Chunks bind to those stashes (`outline` CAST, `rimEdge` FX, `print` GRADE, `invert` OCCLUDE, `paper` WORLD). `byStash` groups the permutation. — [lib/anime/stack/chunks.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/stack/chunks.js); [lib/anime/stack/load.js](https://github.com/teerthsharma/teerthfolio/blob/main/lib/anime/stack/load.js)

### Inferences

Write the composed still as

\[
\begin{aligned}
X_0&=\mathrm{WORLD}&&\text{(base, replace, per shot)},\\
X_1&=\mathrm{replace}(X_0,\mathrm{CAST})&&\text{(figure, on twos)},\\
X_2&=\mathrm{addClamped}(X_1,\mathrm{FX};u_{\mathrm{Emit}})&&\text{(kill / aura)},\\
X_3&=\mathrm{multiply}(X_2,\mathrm{OCCLUDE})&&\text{(iris / tear / invert; not the seal)},\\
X_4&=\mathrm{police}_{0.92}(\mathrm{replace}(X_3,\mathrm{GRADE})).
\end{aligned}
\]

This is layered source coding: \(X_0\) is a coarse description of *place*; each later layer is an enhancement that is useless without the base (a Hollow Purple caption on a night hex is FX without WORLD — T91 / T93). Twenty cards are twenty \(X_0\)'s with no jointly designed \(X_{1..4}\).

Rate allocation that matches the law:

- Spend WORLD bits on the naming place (flood, classroom, road), not on a second PBR city.
- Spend CAST bits on silhouette + 3-tone + sign (MDL-short figure).
- Spend FX bits only on the kill sufficient statistic (collision, not type).
- Spend OCCLUDE bits on a screen-glued operator (iris, tear, invert beat).
- Spend GRADE bits on a studio curve under the 0.92 cap.

Genshin `pri` is the drop order of enhancement layers when the channel (ALU 64) is too narrow — the same as scalable video dropping the upper FGS layer.

### Gaps

- No formal Equitz–Cover test is in the repo; the analogy is structural, not a theorem proved for these blends.
- Live Stage / `voidMaterial` still may not sample this stitch (#12: “Live 3D player does not consume [the JJK kit]”). The protocol is the codebook; the on-screen still may be a different codeword.

## What “15% parity” / “1% overall / 10% school” means as MI or as failed ticks

### Takeaway

Those percentages are **not** computed mutual informations. In this tree they are craft grades plus a 100-tick ledger. Formalize them either as a mean naming indicator \(\hat\rho=N^{-1}\sum_d \mathbf{1}\{\mathrm{name}(d)\}\) or as the #10 score \(10-0.1\times(\#\text{fails})\). “15%” as a parity figure is **not in the repo**; the nearby “15” is “15 fails left” at the 8.5 target.

### Cited Findings

- Gap note, first line: “**~1% overall. ~10% on school.**” Later: “10% = the tools exist. The still does not.” School: 50 named shaders + `classroom-kit`; live 3 s is cream `195,185,184`. “This is why 10% not 40%.” Faraday is “~5% picture, not 10%.” — [research_notes/anime-quality-gap.md](https://github.com/teerthsharma/teerthfolio/blob/main/research_notes/anime-quality-gap.md)
- Issue #10 instrument: **Score \(= 10.0 - 0.1 \times\) (failed ticks).** 100 authored ticks T01–T100. Live on `460bafd`: **4.8 / 10.0 = 10.0 − 0.1 × 52 fails** (48 pass). “There is no ‘feels better +0.3.’” — [teerthfolio#10](https://github.com/teerthsharma/teerthfolio/issues/10); [docs/superpowers/specs/2026-10-05-director-epic-design.md](https://github.com/teerthsharma/teerthfolio/blob/main/docs/superpowers/specs/2026-10-05-director-epic-design.md)
- #10: “0.1 = one still, one number, or one law.” Highway 8 s black \(0.85\to 0.03\) earned **T66 only**. 24/24 playing is T54–T77 = **2.4 of 10**. — [teerthfolio#10](https://github.com/teerthsharma/teerthfolio/issues/10)
- #10 targets: 8.5 = \(\le 15\) fails (flip 37 of 52). 9.0 = \(\le 10\) fails. 10.0 = 0 authored fails and every filled moderator row. If the mod fills \(k\) M-rows, Score \(= 10\times(\mathrm{pass})/(100+k)\). — [teerthfolio#10](https://github.com/teerthsharma/teerthfolio/issues/10)
- Issue #12: picture grade on that SHA is 4.8; “5% of site-wide anime means four HUD-off stills… That is ~4/75 required stills + one costume law.” Site-wide parity = 24/24 docks plus spawn. — [teerthfolio#12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Picture-naming band T78–T85: 2 pass (T82 Highway chroma, T83 Nazarick title) / 6 fail (Aether flood, Caustic LOW, Polychrom gates, Mujo faces, Epsilon iris, Monodromy tear). Playback T54–T77 is 24/24 and is *not* naming. — [teerthfolio#10](https://github.com/teerthsharma/teerthfolio/issues/10)
- A search of `research_notes/` and the #12/#10 bodies finds **no** “15% parity” phrase. The gap note’s only percents are ~1% overall, ~10% school, Faraday ~5%, and the 5% four-still target.

### Inferences

**As failed still-naming ticks (the committed formalization).** Let \(F\) be the number of failed T-rows. Then

\[
\mathrm{Score}=10-0.1\,F,\qquad
F=52\ \text{on }460bafd\ \Rightarrow\ \mathrm{Score}=4.8.
\]

Each fail is a Bernoulli observation of a *named* predicate (camera \(\theta\), RGB equality, “names the homage,” …), not a soft MI. The closest thing to “naming MI” on the ledger is T78–T85 plus T21/T91/T93: six picture fails and the “shader names the place / bubble is the subject / drawable domain” rows.

**As an empirical naming rate.** For \(N\) docks (24 + spawn \(=25\), or 75 required stills if 3 stills × 25):

\[
\hat\rho=\frac1N\sum_{d=1}^{N}\mathbf{1}\{d\text{ names HUD-off}\}.
\]

On the gap note’s own reading, \(\hat\rho_{\mathrm{overall}}\approx 0.01\) (almost no dock names) and \(\hat\rho_{\mathrm{school}}\approx 0.10\) *as toolkit readiness*, not as \(\hat\rho\) of the live still (the live school still fails). The 5% target is \(\hat\rho\approx 4/75\approx 0.053\) of required stills, or \(4/25=0.16\) of docks if one still per dock is enough.

**If one forced an MI reading.** Let \(Y_d\) be the naming bit for dock \(d\) and \(I_d\) the still. A first-order plugin is

\[
\widehat{I}(I;Y)
\approx
h_2(\hat\rho)
-
\frac1N\sum_d h_2\!\bigl(\hat P(Y_d=1\mid I_d)\bigr).
\]

With a deterministic human probe, \(\hat P(Y_d=1\mid I_d)\in\{0,1\}\), so the second term is 0 and \(\widehat{I}=h_2(\hat\rho)\). Then “1% overall” \(\Rightarrow h_2(0.01)\approx 0.08\) bits/dock; “10% school” as a *true* naming rate would be \(h_2(0.10)\approx 0.47\) bits; four named stills of 25 docks is \(h_2(0.16)\approx 0.63\) bits. These are **not** numbers the project uses. They only show that percent-parity is already an MI of a Bernoulli naming bit, and that moving \(1\%\to 16\%\) of docks is a large information gain on that bit — while moving playback \(0\to 24/24\) added \(2.4\) score points and \(\approx 0\) naming bits.

**What “15%” can honestly mean (without inventing a house metric).**

1. **Not found** as “15% parity.”
2. **15 fails remaining** at the 8.5 target: \(15/100=15\%\) of *ticks* still allowed to fail. That is a residual error rate \(D=0.15\) on the 0–1 tick channel, i.e. \(R(D)\) at a high leftover distortion — not “the site is 15% anime.”
3. **Do not** equate 15% with school 10% or overall 1%. Those are different denominators (craft feel vs toolkit vs ledger).

Builder implication: flip ticks that raise \(\hat\rho\) (T78-class naming stills, T08 camera so the still is of the *pocket*), not ticks that only raise playback entropy (already 24/24). Score and naming MI are aligned only when the \(0.1\) you earn is a naming predicate.

### Gaps

- “15% parity” is not a committed phrase in #10, #12, or `anime-quality-gap.md`. If it came from chat, it is not a file constant.
- \(h_2(\hat\rho)\) is an inference in this note, not a formula in the repo.
- The 1% / 10% numbers have no measurement protocol (no \(N\), no inter-rater). The 4.8 / 52-fail score does.
- Moderator rows M01–M20 are empty; a filled set would change the denominator and break a naive “percent of 100.”
