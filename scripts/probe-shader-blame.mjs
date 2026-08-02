/* global document, window, WebGL2RenderingContext */
// Names the shaders whose link blocks the main thread. Maps program -> attached
// shader sources at attachShader time, then reports the source fingerprint of
// whichever program the driver made us wait on. Cold visit, real Chrome.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/shader-blame";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0", "--disable-gpu-shader-disk-cache"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.addInitScript(() => {
  const sources = new WeakMap();
  const programShaders = new WeakMap();
  const blame = [];
  window.__blame = blame;
  const proto = WebGL2RenderingContext.prototype;

  const rawShaderSource = proto.shaderSource;
  proto.shaderSource = function (shader, source) {
    sources.set(shader, source);
    return rawShaderSource.call(this, shader, source);
  };
  const rawAttach = proto.attachShader;
  proto.attachShader = function (program, shader) {
    const list = programShaders.get(program) || [];
    list.push(shader);
    programShaders.set(program, list);
    return rawAttach.call(this, program, shader);
  };
  const rawGetProgramParameter = proto.getProgramParameter;
  proto.getProgramParameter = function (program, name) {
    const start = performance.now();
    const result = rawGetProgramParameter.call(this, program, name);
    const cost = performance.now() - start;
    if (cost > 25) {
      const shaders = programShaders.get(program) || [];
      const texts = shaders.map((shader) => sources.get(shader) || "");
      const fragment = texts.find((text) => text.includes("gl_FragColor") || text.includes("pc_fragColor")) || texts[1] || "";
      const vertex = texts.find((text) => text !== fragment) || "";
      // three stamps "#define SHADER_NAME x" and materials here set
      // customProgramCacheKey strings; either identifies the program.
      const shaderName = /#define SHADER_NAME (.+)/.exec(fragment)?.[1]
        || /#define SHADER_NAME (.+)/.exec(vertex)?.[1]
        || null;
      blame.push({
        atMs: Math.round(start),
        blockedMs: Math.round(cost),
        shaderName,
        fragmentChars: fragment.length,
        vertexChars: vertex.length,
        fragmentLoops: (fragment.match(/\bfor\s*\(/g) || []).length,
        fragmentTextureTaps: (fragment.match(/texture(2D|Lod|Grad)?\s*\(/g) || []).length,
        head: fragment.slice(0, 160).replace(/\s+/g, " "),
      });
    }
    return result;
  };
});

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(1500);
await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
await page
  .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
    timeout: 150000,
  })
  .catch(() => console.log("never reached webgl"));
await page.waitForTimeout(8000);

const blame = await page.evaluate(() => window.__blame);
blame.sort((a, b) => b.blockedMs - a.blockedMs);
console.log("blocking links >25ms:", blame.length);
console.log("total blocked ms:", blame.reduce((sum, item) => sum + item.blockedMs, 0));
for (const item of blame.slice(0, 12)) {
  console.log(
    `${String(item.blockedMs).padStart(6)}ms  at ${String(item.atMs).padStart(6)}ms  ` +
      `frag=${item.fragmentChars}ch loops=${item.fragmentLoops} taps=${item.fragmentTextureTaps}  ` +
      `${item.shaderName || item.head.slice(0, 70)}`,
  );
}

await writeFile(path.join(OUT, "blame.json"), JSON.stringify(blame, null, 2));
await browser.close();
