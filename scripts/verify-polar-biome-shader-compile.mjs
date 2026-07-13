import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  POLAR_BIOME_FRAGMENT_SHADER,
  POLAR_BIOME_VERTEX_SHADER,
} from "../lib/polar-biome-fields.js";

const vertexPrelude = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
`;
const fragmentPrelude = "precision highp float;\n";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const results = await page.evaluate(
    ({ fragmentShader, vertexShader, vertexHeader }) => {
      const canvas = globalThis.document.createElement("canvas");
      const gl = canvas.getContext("webgl", {
        antialias: false,
        depth: true,
        failIfMajorPerformanceCaveat: false,
      });
      if (!gl) return [{ ok: false, role: "context", log: "WebGL 1 context unavailable" }];

      function compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        return {
          ok: gl.getShaderParameter(shader, gl.COMPILE_STATUS),
          log: gl.getShaderInfoLog(shader) || "",
          shader,
        };
      }

      function compileProgram(role, instanced) {
        const instanceHeader = instanced
          ? "#define USE_INSTANCING\nattribute mat4 instanceMatrix;\n"
          : "";
        const vertex = compile(gl.VERTEX_SHADER, `${instanceHeader}${vertexHeader}${vertexShader}`);
        const fragment = compile(gl.FRAGMENT_SHADER, fragmentShader);
        if (!vertex.ok || !fragment.ok) {
          return {
            ok: false,
            role,
            log: `vertex: ${vertex.log}\nfragment: ${fragment.log}`,
          };
        }
        const program = gl.createProgram();
        gl.attachShader(program, vertex.shader);
        gl.attachShader(program, fragment.shader);
        gl.linkProgram(program);
        const ok = gl.getProgramParameter(program, gl.LINK_STATUS);
        const log = gl.getProgramInfoLog(program) || "";
        gl.deleteProgram(program);
        gl.deleteShader(vertex.shader);
        gl.deleteShader(fragment.shader);
        return { ok, role, log };
      }

      return [
        compileProgram("solid-instanced", true),
        compileProgram("sky", false),
      ];
    },
    {
      fragmentShader: `${fragmentPrelude}${POLAR_BIOME_FRAGMENT_SHADER}`,
      vertexHeader: vertexPrelude,
      vertexShader: POLAR_BIOME_VERTEX_SHADER,
    },
  );

  for (const result of results) {
    assert.ok(result.ok, `${result.role} shader failed compile/link:\n${result.log}`);
    assert.equal(result.log.trim(), "", `${result.role} shader emitted compiler diagnostics`);
  }
  console.log("Polar biome shader compile verified in Chromium WebGL: solid-instanced + sky programs linked cleanly.");
} finally {
  await browser.close();
}
