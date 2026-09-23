/* global window */
// What does one more per-fragment contact caster cost on the ground?
//
// The terrain is the largest surface in frame and this machine is fill-bound, so
// the question that decides whether the local geography props can cast a contact
// skirt is not "does it look right" but "how many ALU per ground fragment". The
// eight station casters are emitted as unrolled GLSL constants; props cannot be,
// because which 32 props exist changes with the docked station, so they have to
// come in as a uniform array and be walked in a loop.
//
// Same instrument as probe-fill-calibration: a page with nothing in it but N
// full-screen quads and a known fragment shader, timed with
// EXT_disjoint_timer_query_webgl2. Each variant is measured against the null
// shader in the same run, so the reported per-fragment cost is a difference and
// not an absolute the GPU's clock drift can move.
import { chromium } from "playwright";

const WIDTH = 1440;
const HEIGHT = 900;
const QUADS = 16;
const MEGAPIXELS = ((WIDTH * HEIGHT) / 1e6) * QUADS;

// The loop body under test, verbatim in shape with lib/polar-ground.js's
// polarContactOcclusion: squared distance, one smoothstep, one multiply, no
// sqrt and no light term. uProps[i].xy is the prop's world XZ, .z its squared
// skirt radius.
const CONTACT_BODY = `
    vec2 d = p - uProps[i].xy;
    float d2 = dot(d, d);
    shadow = max(shadow, 0.5 * (1.0 - smoothstep(0.0, uProps[i].z, d2)));`;

const CONTACT_BODY_REJECTED = `
    vec2 d = p - uProps[i].xy;
    float d2 = dot(d, d);
    if (d2 < uProps[i].z) {
      shadow = max(shadow, 0.5 * (1.0 - smoothstep(0.0, uProps[i].z, d2)));
    }`;

const shader = (count, body, gated) => `#version 300 es
precision highp float;
uniform vec3 uProps[32];
uniform vec2 uField;
uniform float uGate;
out vec4 o;
void main() {
  vec2 p = gl_FragCoord.xy * 0.01;
  float shadow = 0.0;
${
  count === 0
    ? ""
    : `${gated ? `  vec2 fd = p - uField;\n  if (dot(fd, fd) < uGate) {\n` : ""}  for (int i = 0; i < ${count}; i += 1) {${body}
  }
${gated ? "  }\n" : ""}`
}
  o = vec4(0.004 * (1.0 - shadow), 0.0, 0.0, 1.0);
}`;

const CASES = [
  { name: "null (no loop)", source: shader(0) },
  { name: "8 props, branchless", source: shader(8, CONTACT_BODY, false) },
  { name: "16 props, branchless", source: shader(16, CONTACT_BODY, false) },
  { name: "32 props, branchless", source: shader(32, CONTACT_BODY, false) },
  { name: "32 props, per-prop reject", source: shader(32, CONTACT_BODY_REJECTED, false) },
  {
    name: "32 props, field gate closed",
    source: shader(32, CONTACT_BODY, true),
    gate: 0,
  },
  {
    name: "32 props, field gate open",
    source: shader(32, CONTACT_BODY, true),
    gate: 1e9,
  },
];

const PAGE = `<!doctype html><html><body style="margin:0">
<canvas id="c" width="${WIDTH}" height="${HEIGHT}"></canvas>
<script>
const gl = document.getElementById("c").getContext("webgl2", { antialias: false });
const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
const VS = "#version 300 es\\nconst vec2 p[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));void main(){gl_Position=vec4(p[gl_VertexID],0.,1.);}";
function build(fsSource) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VS); gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource); gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs));
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  return prog;
}
window.__measure = (fsSource, quads, gate) => new Promise((resolve, reject) => {
  let prog;
  try { prog = build(fsSource); } catch (error) { reject(String(error)); return; }
  gl.useProgram(prog);
  const props = new Float32Array(32 * 3);
  for (let i = 0; i < 32; i += 1) {
    props[i * 3] = 3.1 + i * 0.41;
    props[i * 3 + 1] = 2.7 + i * 0.29;
    props[i * 3 + 2] = 0.42;
  }
  const loc = gl.getUniformLocation(prog, "uProps");
  if (loc) gl.uniform3fv(loc, props);
  const fieldLoc = gl.getUniformLocation(prog, "uField");
  if (fieldLoc) gl.uniform2f(fieldLoc, 7.0, 4.5);
  const gateLoc = gl.getUniformLocation(prog, "uGate");
  if (gateLoc) gl.uniform1f(gateLoc, gate);
  const samples = [];
  const pool = [];
  const step = () => {
    const q = pool.pop() || gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (let i = 0; i < quads; i += 1) gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    const poll = () => {
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) { requestAnimationFrame(poll); return; }
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) samples.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      pool.push(q);
      if (samples.length < 30) requestAnimationFrame(step);
      else { samples.sort((a,b)=>a-b); resolve(samples[15]); }
    };
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(step);
});
</script></body></html>`;

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-gpu"],
});
try {
  const page = await browser.newPage({ viewport: { width: WIDTH + 60, height: HEIGHT + 60 } });
  await page.setContent(PAGE);
  await page.waitForTimeout(1200);

  console.log(
    `${QUADS} full-screen quads at ${WIDTH}x${HEIGHT} = ${MEGAPIXELS.toFixed(2)} Mpx, ` +
      `median of 30 timed frames\n`,
  );
  // Two null runs first: the spread between them is the floor below which no
  // row below means anything.
  const nullA = await page.evaluate(
    ([source, quads, gate]) => window.__measure(source, quads, gate),
    [CASES[0].source, QUADS, 0],
  );
  const rows = [];
  for (const testCase of CASES) {
    const ms = await page.evaluate(
      ([source, quads, gate]) => window.__measure(source, quads, gate),
      [testCase.source, QUADS, testCase.gate ?? 0],
    );
    rows.push({ ...testCase, ms });
  }
  const nullB = rows[0].ms;
  const nullControl = Math.abs(nullB - nullA);
  console.log(
    `null control: ${nullA.toFixed(2)} vs ${nullB.toFixed(2)} ms — spread ${nullControl.toFixed(2)} ms ` +
      `(${((nullControl / MEGAPIXELS) * 1000).toFixed(2)} us/Mpx)\n`,
  );
  for (const row of rows) {
    const delta = row.ms - nullB;
    console.log(
      `${row.name.padEnd(30)} ${row.ms.toFixed(2).padStart(7)} ms  ` +
        `${(delta >= 0 ? "+" : "") + delta.toFixed(2).padStart(6)} ms over null  ` +
        `${((delta / MEGAPIXELS) * 1000).toFixed(1).padStart(7)} us/Mpx`,
    );
  }
  console.log(
    `\nfor scale: a 1440x900 frame is ${((WIDTH * HEIGHT) / 1e6).toFixed(2)} Mpx of ground at most.`,
  );
} finally {
  await browser.close();
}
