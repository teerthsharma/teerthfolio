// node lib/anime/kit/bg/bg.check.mjs : compiles every kit shader (the vertex and fragment of each material, and each sky preset) with glslangValidator,
// built the way three r178 builds a ShaderMaterial. Exit 1 on any failure. No GPU, no browser.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Group } from "three";
import { sharedUniforms } from "../../material.js";
import { bgLook } from "./look.js";
import { facadeMaterial } from "./city.js";
import { groundMaterial, stoneMaterial } from "./ground.js";
import { bgMaterial } from "./material.js";
import { skyGLSL, SKY_PRESETS } from "./sky.js";
import { WATER, WOOD } from "./surfaces.js";
import { PAINT } from "./glsl.js";
import { glslFor } from "../../tools/index.js";
import { CARD_KINDS, cardGLSL } from "./cards.js";
import { paintOverMaterialGLSL } from "./paintover.js";

const PRE = (st) => `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
${st === "frag" ? "#define varying in\nlayout(location = 0) out highp vec4 pc_fragColor;\n#define gl_FragColor pc_fragColor\n#define texture2D texture\nuniform mat4 viewMatrix;\nuniform vec3 cameraPosition;\n" :
  "#define attribute in\n#define varying out\nuniform mat4 modelMatrix; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform mat4 viewMatrix; uniform mat3 normalMatrix; uniform vec3 cameraPosition;\nattribute vec3 position; attribute vec3 normal; attribute vec2 uv;\n"}`;

const bin = [
  "glslangValidator", ...(existsSync("C:/VulkanSDK") ? readdirSync("C:/VulkanSDK").map((v) => `C:/VulkanSDK/${v}/Bin/glslangValidator.exe`) : []),
].find((b) => { try { execFileSync(b, ["--version"], { stdio: "ignore" }); return true; } catch { return false; } });
if (!bin) { console.log("glslangValidator not found"); process.exit(1); }

const dir = mkdtempSync(path.join(os.tmpdir(), "bg-check-"));
let bad = 0, n = 0;
function compile(name, src, stage) {
  const f = path.join(dir, `${name.replace(/[^\w]/g, "_")}.${stage === "frag" ? "frag" : "vert"}`);
  writeFileSync(f, PRE(stage) + src);
  n++;
  try { execFileSync(bin, ["-S", stage, f], { stdio: "pipe" }); }
  catch (e) { bad++; const out = String(e.stdout ?? e); console.log(`FAIL ${name} ${stage}\n${out.split(/\r?\n/).filter((l) => /ERROR/.test(l)).slice(0, 6).join("\n").replace(f, "src")}`); }
}
const engine = { shared: sharedUniforms(), ink() {} };
const ctx = { engine, rng: () => () => 0.5 };
const look = bgLook(ctx, {});
const fromMat = (name, m) => { compile(name, m.fragmentShader, "frag"); compile(name, m.vertexShader, "vert"); };
fromMat("facade", facadeMaterial(look));
for (const k of ["asphalt", "grass", "sand", "snow", "paving"]) fromMat(`ground-${k}`, groundMaterial(look, { kind: k, road: { half: 10, zebra: [0, 4], stripe: 1 } }));
fromMat("stone", stoneMaterial(look));
fromMat("water", bgMaterial(look, { frag: WATER, uniforms: {} }));
fromMat("wood", bgMaterial(look, { frag: WOOD, uniforms: {} }));
for (const p of SKY_PRESETS) {
  const src = `precision highp float;\n${glslFor(["noise"])}\n${PAINT}\n${skyGLSL(p)}\nvoid main() { gl_FragColor = vec4(sky(0.1, 0.2), 1.0); }`;
  compile(`sky-${p}`, src, "frag");
}
for (const k of CARD_KINDS) compile(`card-${k}`, `precision highp float;\nuniform float uAsp; varying vec2 vUv;\n${glslFor(["noise"])}\n${PAINT}\n${cardGLSL(k, {})}\nvoid main() { gl_FragColor = paint(vUv * vec2(uAsp, 1.0)); }`, "frag");
fromMat("paintover-card", paintOverMaterialGLSL(look));
rmSync(dir, { recursive: true, force: true });
console.log(bad ? `${bad} of ${n} FAILED` : `bg.check: ${n} shaders compile`);
process.exit(bad ? 1 : 0);
