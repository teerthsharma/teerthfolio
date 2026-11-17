# jjk

37 tools. Pull one: await loadPack("jjk"), then glslFor(["<name>"]) from lib/anime/tools/index.js.

| name | what it draws | use | suits | inputs | rated | compiles | how to pull it |
|---|---|---|---|---|---|---|---|
| jjkBeatClock | The three Gojo stitch beats in order: an empty void, then the domain with the figure, then the Hollow Purple kill. | screen | p-aether-lang | p: uv 0..1; t: seconds, hold at 12fps picks the beat (under 3.0s void, under 6.4 | thin | yes | glslFor(["jjkBeatClock"]) |
| jjkBlueBolt | A blue Lapse orb with jagged cyan lightning spikes and rays flickering around it. | card | p-aether-lang | p: uv; t: seconds, animates bolt jitter and ray rotation; orb fixed at (0.58,0.4 | real | yes | glslFor(["jjkBlueBolt"]) |
| jjkCastAuraSeal | The Gojo figure wrapped in a blue Infinity halt shell around the pear head. | screen | p-aether-lang | p: uv; t: seconds, drives the aura dust hold | alias | yes | glslFor(["jjkCastAuraSeal"]) |
| jjkCastCloth | A dark gakuran body under the pear head with a thin cyan outline on its hull. | surface | p-aether-lang | p: uv; t unused | thin | yes | glslFor(["jjkCastCloth"]) |
| jjkCastGojo | The composed Gojo hero figure with Six Eyes, Gojo mudra and Infinity aura. | screen | p-aether-lang | p: uv; t: seconds, passed to the aura | alias | yes | glslFor(["jjkCastGojo"]) |
| jjkCastHighCollar | The Gojo figure with a dark high-collar band under the pear head and a faint cyan line. | screen | p-aether-lang | p: uv; t: seconds, passed to the figure's aura | real | yes | glslFor(["jjkCastHighCollar"]) |
| jjkCastInk | A dark indigo outline around the pear head, never pure black. | surface | p-aether-lang | p: uv; t unused; ink mix and line width fixed | thin | yes | glslFor(["jjkCastInk"]) |
| jjkCastSix | Two cyan Six Eyes marks on the pear face over soft skin tones. | surface | p-aether-lang | p: uv; t unused; eye centres at JJK_C plus (-0.06,0.04) and (0.06,0.04) | thin | yes | glslFor(["jjkCastSix"]) |
| jjkCastSkin | The pear face in soft skin tones over a dark plate. | surface | p-aether-lang | p: uv; t unused; plate mix fixed | thin | yes | glslFor(["jjkCastSkin"]) |
| jjkCastWhiteHair | The Gojo figure with a row of cool white hair spikes across its upper head and Six Eyes. | screen | p-aether-lang | p: uv; t: seconds, passed to the domain behind | real | yes | glslFor(["jjkCastWhiteHair"]) |
| jjkHollowKill | The Blue and Red collision still, with the Hollow Purple sphere at the pear's left. | screen | p-aether-lang | p: uv; t: seconds, passed to the aura and purple swirl | thin | yes | glslFor(["jjkHollowKill"]) |
| jjkInfAura | A blue-cyan Infinity halt shell around the figure with frozen dust ticks resting on its surface. | card | p-aether-lang | p: uv; t: seconds, dust tick hold at 12fps; centre JJK_C | real | yes | glslFor(["jjkInfAura"]) |
| jjkInfBlindfoldOff | The Gojo figure with its face unmasked inside a full blue aura. | card | p-aether-lang | p: uv; t: seconds, aura timing | thin | yes | glslFor(["jjkInfBlindfoldOff"]) |
| jjkInfDust | Cyan dust specks frozen on a sphere over a dim blue field. | card | p-aether-lang | p: uv; t: seconds, dust hold at 12fps; sphere radius 0.28 | real | yes | glslFor(["jjkInfDust"]) |
| jjkInfHalt | Blue-cyan halt rings that stop at a sphere around the pear head. | card | p-aether-lang | p: uv; t unused; ring radius 0.28 about JJK_C | thin | yes | glslFor(["jjkInfHalt"]) |
| jjkInfOnCast | An aura that wraps only the figure and leaves the rest of the set clear. | card | p-aether-lang | p: uv; t: seconds, passed to the aura | thin | yes | glslFor(["jjkInfOnCast"]) |
| jjkInfPulse | Halt rings that jump in radius in steps at 12fps around the pear. | card | p-aether-lang | p: uv; t: seconds; radius steps 0.12 to 0.30 in 0.045 steps | thin | yes | glslFor(["jjkInfPulse"]) |
| jjkInfShell | Two concentric blue rings around the pear, the inner one smaller. | card | p-aether-lang | p: uv; t unused; outer radius 0.28, inner 0.72 of it | thin | yes | glslFor(["jjkInfShell"]) |
| jjkInfSixRim | A thin cyan contour line tracing the pear silhouette. | card | p-aether-lang | p: uv; t: seconds, passed to the domain behind | thin | yes | glslFor(["jjkInfSixRim"]) |
| jjkKit | Nothing alone: the shared black-blue void, black hole, white dots, Six Eyes, Gojo mudra and kill grammar every jjk shader calls. | helper | p-aether-lang | none; a library of functions with p and t arguments, and jjkStitchTimed as its d | real | yes | glslFor(["jjkKit"]) |
| jjkLapseBlue | A blue orb with a soft attraction well and a blue rim on the domain. | card | p-aether-lang | p: uv; t unused; orb at (0.58,0.48) radius 0.12 | thin | yes | glslFor(["jjkLapseBlue"]) |
| jjkPurpleCollide | A blue orb and a red orb with a purple sphere born at their midpoint and a violet seam between them. | screen | p-aether-lang | p: uv; t: seconds, drives the purple swirl; orbs at x 0.58 and 0.86, midpoint 0. | real | yes | glslFor(["jjkPurpleCollide"]) |
| jjkPurpleCore | A purple naming sphere at the centre, banded into four tones. | card | p-aether-lang | p: uv; t: seconds, purple swirl phase | thin | yes | glslFor(["jjkPurpleCore"]) |
| jjkPurpleFlare | A violet star-burst with a flare ring and dusted specks around it. | card | p-aether-lang | p: uv; t: seconds, dust hold at 12fps; ring radius 0.18 | real | yes | glslFor(["jjkPurpleFlare"]) |
| jjkPurpleTunnel | Violet concentric rings pulling inward over the domain. | card | p-aether-lang | p: uv; t: seconds, ring phase (r*8 - 2.2t) | real | yes | glslFor(["jjkPurpleTunnel"]) |
| jjkReversalRed | A red repulsion orb with a flare rim on the domain. | card | p-aether-lang | p: uv; t unused; orb at (0.86,0.48) radius 0.12 | alias (use core/flare) | yes | glslFor(["jjkReversalRed"]) |
| jjkStitchDomain | The domain with the Gojo figure and its aura, beat 1 of the stitch. | screen | p-aether-lang | p: uv; t: seconds | thin | yes | glslFor(["jjkStitchDomain"]) |
| jjkStitchFlood | The empty set: void, eye and white information cards, with no figure. | screen | p-aether-lang | p: uv; t: seconds | thin | yes | glslFor(["jjkStitchFlood"]) |
| jjkStitchKill | The domain with the Hollow Purple sphere left of the pear. | screen | p-aether-lang | p: uv; t: seconds | thin | yes | glslFor(["jjkStitchKill"]) |
| jjkVoidBarrier | A dark glassy sphere with a hole through which the domain shows. | plate | pr-triton-kernels-22 | p: uv; t: seconds, drives the fbm drift of the dark shell | real | yes | glslFor(["jjkVoidBarrier"]) |
| jjkVoidDomain | The full Unlimited Void interior: starfield, galaxies, black-hole eye and white cards. | plate | pr-triton-kernels-22 | p: uv; t: seconds | thin | yes | glslFor(["jjkVoidDomain"]) |
| jjkVoidEye | A giant black-hole eye filling most of the frame with a glass rim. | plate | pr-triton-kernels-22 | p: uv; t: seconds, passed to the eye's accretion | thin | yes | glslFor(["jjkVoidEye"]) |
| jjkVoidFloor | A small stand plate under the caster while the rest of the void floats. | plate | pr-triton-kernels-22 | p: uv; t unused; stand at (0.72,0.18) | thin | yes | glslFor(["jjkVoidFloor"]) |
| jjkVoidGalaxies | Two faint spiral galaxies over the black-blue starfield. | plate | pr-triton-kernels-22 | p: uv; t unused; galaxy centres (0.16,0.80) and (1.22,0.22) | thin | yes | glslFor(["jjkVoidGalaxies"]) |
| jjkVoidPatches | White information cards floating over the void. | plate | pr-triton-kernels-22 | p: uv; t: seconds, passed to the starfield | thin | yes | glslFor(["jjkVoidPatches"]) |
| jjkVoidSpace | A black-blue starfield with small white dots. | plate | pr-triton-kernels-22 | p: uv; t: seconds, passed to the starfield | thin | yes | glslFor(["jjkVoidSpace"]) |
| jjkVoidWorm | White rings pulled inward toward a well at the centre of the frame. | plate | pr-triton-kernels-22 | p: uv; t: seconds, ring speed 2.2 | thin | yes | glslFor(["jjkVoidWorm"]) |
