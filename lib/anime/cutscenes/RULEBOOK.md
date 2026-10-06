# Cutscene builder rule book

Every builder agent reads this first and follows it.

## Rule 1. Keep looking for new shaders

Before you write ANY shader, material, effect or kit piece, search for one that already exists. Search again before EACH new element, not only at the start, because the toolkit keeps growing while you work. Two toolsmiths are adding about 500 modules right now. Search in this order:
1. This branch: `lib/anime/tools/`, `kit/`, `fx/`, `sky/`, `post/`, `style/`, `characters/`, `crowds/`, `sets/`, `materials/`, and `lib/anime/catalog.js` if present.
2. Toolsmith A's branch, read-only: `git -C ../engine show engine/anime:lib/anime/catalog.js`, then `git -C ../engine ls-tree -r --name-only engine/anime lib/anime`.
3. Toolsmith B's branch, read-only: `git -C ../engine-3 show engine/artist3:lib/anime/catalog.js`, then `git -C ../engine-3 ls-tree -r --name-only engine/artist3 lib/anime`.

## Rule 2. Reuse first

- If a module exists on THIS branch, import it.
- If it exists only on a toolsmith branch, DO NOT copy it. Write a thin local adapter in your layer folder with the same parameters, and add the line `// TOOLKIT: <branch>:<path>` at its top. Consolidate swaps it for the real module after the merge.
- Prefer composing common primitives (noise, SDF, blend, cel ramp, ink, glow, grade) over writing a monolithic custom shader. Most of a cutscene should be common modules, with only a little unique code.

## Rule 3. Log what's missing

If no module fits, write it locally in your layer folder, and append one line to `lib/anime/cutscenes/NEEDS.md`:

`<module-name> | <dock> | <layer> | <one-line spec> | <S|M|L>`

Use the canonical names from `teerthfolio-wt/scripts/INDEX.md`. The toolsmiths build from this list.

## Rule 4. Shader hygiene

- Write the maths in a comment at the top of every shader.
- Anti-alias steps with `fwidth`.
- No pure black (#000) ink; use the style's ink hex.
- Keep the lit luma at or below 0.92 so nothing blooms by accident.
- Expose `meta.params` with defaults.
- One file per element.

## Rule 5. Isolation

You may write only inside your dock folder and your layer. Never edit a shared module during Build. Never import another dock's folder.

## Rule 6. Cutscenes only; the base seal is untouched

All of this work is for CUTSCENES ONLY. It never replaces the site's base (roaming) seal or the island:
- Never edit `components/world/seal/*`, `D.jsx`, the island, or anything outside `lib/anime/**` and the lab route.
- The cutscene hero seal is `lib/anime/pup.js` (the locked kawaii design). It is swapped in only while a cutscene plays.

## Rule 7. Cheat like the industry; the camera is ours

Every cutscene camera is authored and fixed to the side we choose. Build ONLY what the lens sees, and use every cheap trick anime and film use:
- **Facades, not buildings.** Model only the faces toward the camera, cull backfaces, and leave sets half-built.
- **Matte paintings and cards.** Far and mid scenery are painted planes or baked plates. Multiplane parallax fakes depth. Use forced perspective.
- **Impostors and billboards** for crowds, trees, debris, far titans and far portals.
- **Baked or painted light and shadow.** Use blob or painted shadows instead of shadow maps. Light is fixed per shot.
- **Fog, DOF, vignette and darkness** hide low detail and set edges.
- **Anime's own limited-animation cheats:**
  - holds (still frames with a moving camera);
  - pans over a still painting;
  - mouth flaps only;
  - characters on twos or threes;
  - smears instead of in-betweens;
  - speed-line or flat-colour impact backgrounds that replace the whole set during action.
- **Cut on action** to hide transitions and pops. A cut every ≤ 5 s also hides what isn't built.
- **Reuse.** Mirror or flip assets, recolour instances, and reuse plates across shots with reframing.
- **Spend detail only where the eye lands:** the seal, the victim's face, and the FX core.

## Rule 8. Seals are round, never rats

The owner says the seals looked like RATS. Every seal, hero and costumed victim alike, is a CHUBBY PEAR:
- a wide, round, heavy base, about 1.3–1.5× the head width, sitting flat;
- no neck;
- a short, blunt, rounded muzzle;
- short flippers, with the rear flippers fanned flat;
- NO thin tail, long snout, narrow hips or tall skinny torso.
Reference: `teerthfolio-wt/engine-ref/locked-seal.png`. Always build seals with `kit/costumed-seal-kit.js` and `pup.js`. Never hand-model one.
