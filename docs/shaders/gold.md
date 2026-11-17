# gold

51 tools. Pull one: await loadPack("gold"), then glslFor(["<name>"]) from lib/anime/tools/index.js.

| name | what it draws | use | suits | inputs | rated | compiles | how to pull it |
|---|---|---|---|---|---|---|---|
| goldAnisoGilt | A gold plate with brushed streaks that shimmer diagonally across it. | surface | any | p: surface position (centre 0.72,0.50); t: slow streak drift; fixed: spec power  | real | yes | glslFor(["goldAnisoGilt"]) |
| goldArenaMotes | Gold dust specks drift only inside a slanted shaft of light, dark umber everywhere else. | screen | any | p: position (shaft centred at x 0.58); t: dust drift speed; fixed: 20-cell mote  | alias | yes | glslFor(["goldArenaMotes"]) |
| goldArrowGlint | A gold chevron arrow whose bright highlight slides from tip to tail on a loop. | card | any | p: arrow position; t: highlight sweep (fract(t*0.35)) | real | yes | glslFor(["goldArrowGlint"]) |
| goldArrowPupil | A gold iris with a dark diamond-shaped pupil and a cream star glint on it. | card | any | p: eye centre (0.72,0.52); t: unused, static | real | yes | glslFor(["goldArrowPupil"]) |
| goldAtticShaft | A trapezoid beam of gold light falls through dark ink, with motes drifting down inside it. | screen | any | p: position; t: mote fall speed | real | yes | glslFor(["goldAtticShaft"]) |
| goldBeetleShell | A glossy gold-rimmed beetle shell ellipse with pink spotted pits across its face. | surface | any | p: position (ellipse centre 0.72,0.50); t: unused, static | real | yes | glslFor(["goldBeetleShell"]) |
| goldCelIngot | A rounded gold bar with three flat metal bands and small pink flakes on its face. | card | any | p: position; t: unused, static | real | yes | glslFor(["goldCelIngot"]) |
| goldClaimGlow | Magenta and gold side bands glow at the left and right edges with bright slots scrolling through them. | screen | any | p: x picks magenta (left) or gold (right); t: slot scroll speed | thin | yes | glslFor(["goldClaimGlow"]) |
| goldDustDrift | Gold specks drift sideways along a wavy current over a dark ground. | card | any | p: position; t: drift speed and current wave | alias | yes | glslFor(["goldDustDrift"]) |
| goldDustMote | Sparse gold specks flicker on and off across a dark ground. | card | any | p: position; t: flicker rate | real | yes | glslFor(["goldDustMote"]) |
| goldEraseFresco | A gold-leafed fresco peels away in noise-shaped patches, revealing the red sketch beneath. | plate | any | p: position; t: peel drift and cut threshold sweep | real | yes | glslFor(["goldEraseFresco"]) |
| goldFlakeVoronoi | Gold discs sit inside Voronoi cells over a pink field, with pink walls between them. | plate | any | p: position; t: slow scroll | real | yes | glslFor(["goldFlakeVoronoi"]) |
| goldFloraBurst | Branching gold veins grow through an umber and sap-green field. | plate | any | p: position; t: vein drift speed | real | yes | glslFor(["goldFloraBurst"]) |
| goldFrescoLeaf | A cream plaster surface cracked with fine lines and dotted with gold-leaf patches. | plate | any | p: position; t: unused, static | real | yes | glslFor(["goldFrescoLeaf"]) |
| goldGerCorona | Concentric purple and gold rings spiral outward from a centre in a dark void. | plate | p-separatrix | p: centre (0.72,0.52); t: ring drift speed | real | yes | glslFor(["goldGerCorona"]) |
| goldGerGaze | Two green-irised eyes with gold highlights look sideways, joined by a magenta streak. | card | p-separatrix | p: position; t: unused, static | real | yes | glslFor(["goldGerGaze"]) |
| goldGerIris | A green iris with a twelve-spoke star pattern, a gold ring and a dark pupil. | card | p-separatrix | p: centre (0.72,0.55); t: slow spoke rotation | real | yes | glslFor(["goldGerIris"]) |
| goldGerMitre | Stacked gold chevrons with a magenta line running through them. | card | p-separatrix | p: position (0.72,0.42); t: unused, static | real | yes | glslFor(["goldGerMitre"]) |
| goldGerSeal | A cream disc with a gold ring, a gold arrow, a pink dot and a few gold flakes. | card | p-separatrix | p: position; t: unused, static | real | yes | glslFor(["goldGerSeal"]) |
| goldGildCrest | Four gold concentric rings with uneven thickness. | card | any | p: position (centre 0.72,0.50); t: unused, static | thin | yes | glslFor(["goldGildCrest"]) |
| goldGildRing | A single soft gold ring with a slightly wavy edge. | card | any | p: position; t: slow hue shift around the ring | thin | yes | glslFor(["goldGildRing"]) |
| goldHoldTick | A cream disc that flashes gold on a stepped beat and returns to cream between beats. | card | any | p: position; t: beat rate (8 steps per second, on twos) | thin | yes | glslFor(["goldHoldTick"]) |
| goldHourGrade | A gold-toned ramp across the frame with a long diagonal shadow cut. | grade | any | p: position; t: slow shadow sway | thin | yes | glslFor(["goldHourGrade"]) |
| goldKit | A shared helper with no picture of its own, supplying the gold, ink, noise and shape functions the other gold tools call. | helper | p-separatrix | no uniforms; functions gGold, gCel3, gCut, gFbm, gVor, gFlake, gFill, gLine, gOu | real | yes | glslFor(["goldKit"]) |
| goldLadybugFlake | A pink field dotted with gold discs, each switching on and off over time. | plate | p-separatrix | p: position; t: rate of flake changes | real | yes | glslFor(["goldLadybugFlake"]) |
| goldLadybugSplit | A split ladybug ellipse with a magenta seam and seven gold dots. | card | p-separatrix | p: centre (0.72,0.48); t: unused, static | real | yes | glslFor(["goldLadybugSplit"]) |
| goldLadybugTile | A repeating pattern of split-ellipse ladybugs with gold spots. | plate | p-separatrix | p: position; t: unused, static | real | yes | glslFor(["goldLadybugTile"]) |
| goldLeafScatter | Scattered gold-leaf diamonds at random angles over a dark ground. | plate | any | p: position; t: unused, static | real | yes | glslFor(["goldLeafScatter"]) |
| goldLifeBloom | A seven-petal flower in pink with a gold centre that pulses with sap. | card | any | p: centre (0.72,0.50); t: petal rotation speed | real | yes | glslFor(["gold/goldLifeBloom"]) |
| goldLifePulse | A gold ring expands outward with a magenta echo one beat behind it. | card | any | p: centre (0.72,0.50); t: pulse rate (0.28 cycles per second) | thin | yes | glslFor(["goldLifePulse"]) |
| goldMetalFlakeCel | A three-step gold cel shading with small pink flake pits across it. | grade | any | p: position; t: unused, static | real | yes | glslFor(["goldMetalFlakeCel"]) |
| goldMitreInlay | A dark mitre shape with gold hairline inlays across it. | card | p-separatrix | p: position (0.72,0.40); t: unused, static | real | yes | glslFor(["goldMitreInlay"]) |
| goldNullHold | A cream plate with a gold tick fixed at the top of its rim. | card | any | p: centre (0.72,0.50); t: unused, static | thin | yes | glslFor(["goldNullHold"]) |
| goldPetalWhorl | Pink discs arranged in a golden-angle spiral, with gold centres in the outer ones. | card | any | p: position; t: spiral rotation speed | real | yes | glslFor(["goldPetalWhorl"]) |
| goldPulseClaim | A gold disc grows and shrinks over a noise-textured red-brown field, outlined in magenta. | plate | any | p: position; t: pulse rate of the disc radius | real | yes | glslFor(["goldPulseClaim"]) |
| goldPurpleGrade | A gold gradient on the left blends into a crimson tone on the right. | grade | pr-tensorflow-124410 | p: x and y position; t: slow noise drift | thin | yes | glslFor(["goldPurpleGrade"]) |
| goldRequiemArrow | A tapering gold arrow with a cream head. | card | any | p: position (arrow from 0.22,0.74 to 1.08,0.36); t: unused, static | real | yes | glslFor(["goldRequiemArrow"]) |
| goldRequiemShard | Gold wedges pointing inward around a ring, with magenta lips on their edges. | card | any | p: centre (0.72,0.50); t: unused, static | real | yes | glslFor(["goldRequiemShard"]) |
| goldResetWash | A cream flood expands from the centre over a faded red sketch, leaving sinopia at the edge. | plate | any | p: centre (0.72,0.50); t: flood front speed | real | yes | glslFor(["goldResetWash"]) |
| goldReturnToZero | An expanding cream ring erases a gold-tinted fresco as it passes. | plate | any | p: centre (0.72,0.50); t: ring growth rate (fract(t*0.22)) | alias | yes | glslFor(["goldReturnToZero"]) |
| goldSaddleGilt | A cel-shaded umber and gold surface with a bright gold band tracing a saddle-shaped hyperbolic ridge. | plate | any | p: screen coords; t: time (unused, static); ridge centre fixed at (0.72, 0.48);  | real | yes | glslFor(["goldSaddleGilt"]) |
| goldSapPulse | Fbm branching veins on a dark sap field, with a pulse of brighter gold travelling along the veins. | plate | any | p: coords; t: pulse speed (3.2 rad/s), pulse wave frequency 18 over fbm value f; | real | yes | glslFor(["goldSapPulse"]) |
| goldSpectrumBias | A horizontal gradient of gold whose wavelength weights shift slowly across the frame, with two thin magenta tick lines. | grade | any | p: x sets position across 1.44 width; t: drift speed 0.2; weights fixed (1.16, 0 | thin | yes | glslFor(["goldSpectrumBias"]) |
| goldSpotLattice | A staggered grid of pink tiles, each holding a gold spot or none, like ladybug shell spots. | plate | any | p: coords scaled by 7.2 grid density; hash threshold 0.4 chooses spotted cells;  | thin | yes | glslFor(["goldSpotLattice"]) |
| goldStandAura | A soft gold glow radiating from the centre over black, with a purple-crimson corona ring pulsing at its edge. | card | p-separatrix | p: coords; t: corona pulse rate 2.0 with 0.02 amplitude; glow falloff 7.2; emit  | thin | yes | glslFor(["goldStandAura"]) |
| goldTbcHold | A cel-shaded gold plate that updates on twos and then freezes, with a cream ring framing the centre. | screen | any | t: quantised to 12 steps per second (on-twos hold); ndl light 0.50 plus 0.28 y;  | real | yes | glslFor(["goldTbcHold"]) |
| goldTruthNever | Two drifting fbm gold fields that partly cancel, leaving a dark void where they disagree and a faint cream halo at centre. | plate | any | t: drift 0.11 on two offset fields; cancel = \|a-b\| threshold 0.12; void tint c | real | yes | glslFor(["goldTruthNever"]) |
| goldVineCoil | A thin gold-ringed coil winding out from the centre, shaded in three steps of sap gold and wig brown. | line | any | t: spiral rotation 0.15; spacing 0.055 per radian; band half-width 0.018; note t | real | yes | glslFor(["goldVineCoil"]) |
| goldWaveGrade | A vertical luminance ramp from dark to bright gold, with faint fbm drift. | grade | any | p.y: ramp height; t: fbm drift 0.04; fbm amplitude 0.08; wavelength bias 1.16 /  | thin | yes | glslFor(["goldWaveGrade"]) |
| goldZeroDisc | A cream disc with a noisy wobbling edge and a bright gold rim fading into the dark. | card | any | p: coords centred at (0.72, 0.50); t: edge wobble drift 0.1; disc radius 0.30 wi | real | yes | glslFor(["goldZeroDisc"]) |
| goldZeroRipple | Five thin cream rings spreading from a point on a dark ground, fading as they widen, the newest ring in gold. | plate | any | p: plate-space position, centre (0.72, 0.50); t: time, ring speed 0.18 per secon | real | yes | glslFor(["goldZeroRipple"]) |
