# lib/world/heat

Pure maths of the topological shader harness: the D7 latch and D8 region type (`latch.js`), the D5 frame-time governor (`governor.js`), and the hex grid, persistence filter and heat field as they are ported in. The specification is `docs/topological-shader/README.md`.

Belongs here: functions over typed arrays and numbers, with no THREE, no DOM and no timers.

Does not belong here: shaders, texture uploads, draw calls, scene setup or any code that reads the renderer. Those stay in the rendering code, which calls into this folder.
