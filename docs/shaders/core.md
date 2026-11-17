# core

17 tools. These are in TOOLS already: glslFor([name]).

| name | what it draws | use | suits | inputs | rated | compiles | how to pull it |
|---|---|---|---|---|---|---|---|
| blend | a grey ramp recoloured by a red-to-teal layer under multiply, screen, overlay, dodge, soft light and burn bands. | helper | any | bMultiply/bScreen/bOverlay/bDodge/bBurn/bSoftLight/bLinearLight take (base a, la | real | yes | glslFor(["blend"]) |
| blobshadow | soft lavender cast shadows falling from rocks onto grass along the key light. | mask | any | uOcc[48] occluder spheres (xyz centre, w radius in metres); uOccN occluder count | real | yes | glslFor(["blobshadow"]) |
| brushgrass | a field of tapered painted grass blades in three layers of different sizes, drooping and darker at the root. | plate | home (Vinland Saga) | p plate coordinates; size stroke length; ang lean from vertical in radians; seed | real | yes | glslFor(["brushgrass"]) |
| cel | a sphere-like gradient broken into flat toon bands with crisp shadow edges. | surface | any | v input value; n number of flat tones for celSteps; t1, t2 thresholds for cel3;  | thin | yes | glslFor(["cel"]) |
| flare | an anamorphic lens flare with a horizontal streak, vertical spike, diagonal star and white-hot core blooming over the frame. | screen | any | q offset from the flare centre in frame-height units; returns additive intensity | real | yes | glslFor(["flare"]) |
| glow | a soft coloured light pooling on nearby walls and surfaces, lifting their texture like a lantern in the dark. | surface | any | glowFall: P surface point, N normal, G light (xyz position, w radius); glowDodge | thin | yes | glslFor(["glow"]) |
| grade | the whole frame remapped to a shadow-mid-highlight colour ramp with silver film grain and dark corners. | grade | any | gradientMap: a, b, c shadow, mid, light colours; filmGrain: amount strength and  | real | yes | glslFor(["grade"]) |
| grunge | a mottled concrete or plaster stain with pits and run-down streaks across a surface. | noise | any | Q or p scaled position; contrast how strong the blotches are; streak how much th | real | yes | glslFor(["grunge"]) |
| huegrade | a whole frame pushed toward one hue by brightness while a single accent hue keeps its colour. | grade | any | accentMask: hue 0..1 and width of the protected hue; hueGrade: dark, mid, light  | real | yes | glslFor(["huegrade"]) |
| ink | constant-width black ink contours tracing where a field crosses a level, optionally broken into tapered jagged clumps. | line | any | f field value; level contour value; px line width in pixels; jag frequency of th | real | yes | glslFor(["ink"]) |
| kuwahara | a photo or render turned into painterly flat brush dabs that keep hard edges between regions. | screen | any | t source texture; uv position; res texture size; R kernel radius in pixels (4-qu | real | yes | glslFor(["kuwahara"]) |
| lightning | a thin jagged electric bolt running from a top point to a strike point, with a branch below the midpoint and a soft glow. | card | p-faraday (Railgun) | a top point; b strike point; seed changes the shape; col colour, scale it to dim | real | yes | glslFor(["lightning"]) |
| mist | soft drifting haze banks that fade out at the left, right and bottom edges of the frame. | card | any | uv position; aspect frame width over height; seed; mistCard takes w, h, colour,  | real | yes | glslFor(["mist"]) |
| noise | the base textures of every painted tool: fbm clouds, ridged folds, Voronoi cracks and brush strokes. | helper | any | p 2D position; k warp strength; a angle; len and wid stroke size; t gradient pos | real | yes | glslFor(["noise"]) |
| puffs | cumulus clouds as lit rounded billows seen from the front, with soft edges. | plate | any | uPuff[96] sphere list (xy centre, z radius, w depth); uN count; erode edge break | real | yes | glslFor(["puffs"]) |
| storm | a boiling black storm cloud with light pockets that catch only the rims of billows facing them. | plate | p-caustic (JJK Sukuna sky) | uStormScale feature size; uStormAspect stretch; bias coverage shift in stormDens | real | yes | glslFor(["storm"]) |
| veins | thin branching blood-mist filaments drifting through a faint smoke body, with a soft red halo. | card | pr-triton-kernels-22 (JJK Malevolent Shrine) | p position; scale feature size; warpK domain-warp strength; seed. Returns x vein | real | yes | glslFor(["veins"]) |
