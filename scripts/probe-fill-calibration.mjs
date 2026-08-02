/* global window */
// What is this machine's actual fill rate?
//
// The scene measures ~2.6 megapixels of shaded fragments in about 18ms, and the
// conclusion drawn from that — that the timer must be measuring stalls rather
// than execution — was asserted rather than tested. This tests it: the same
// EXT_disjoint_timer_query_webgl2 path, on a page with nothing in it but a
// known number of full-screen quads running a trivial fragment shader.
//
// If a known workload times as expected, the instrument is sound and the scene
// is genuinely that slow. If it does not, every GPU number in this repository
// needs re-reading.
import { chromium } from "playwright";

const PAGE = `<!doctype html><html><body style="margin:0">
<canvas id="c" width="1440" height="900"></canvas>
<script>
const gl = document.getElementById("c").getContext("webgl2", { antialias: false });
const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
const vs = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vs, "#version 300 es\\nconst vec2 p[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));void main(){gl_Position=vec4(p[gl_VertexID],0.,1.);}");
gl.compileShader(vs);
const fs = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fs, "#version 300 es\\nprecision highp float;out vec4 o;void main(){o=vec4(0.004,0.,0.,1.);}");
gl.compileShader(fs);
const prog = gl.createProgram();
gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
gl.useProgram(prog);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
window.__cal = { runs: [] };
window.__measure = (quads) => new Promise((resolve) => {
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
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});
const context = await browser.newContext({ viewport: { width: 1500, height: 960 } });
const page = await context.newPage();
await page.setContent(PAGE);
await page.bringToFront();
await page.waitForTimeout(1200);

const megapixelsPerQuad = (1440 * 900) / 1e6;
console.log("trivial full-screen quads at 1440x900, median of 30 timed frames:\n");
const rows = [];
for (const quads of [1, 4, 16, 64, 128]) {
  const ms = await page.evaluate((n) => window.__measure(n), quads);
  const megapixels = megapixelsPerQuad * quads;
  rows.push({ quads, megapixels, ms });
  console.log(
    `${String(quads).padStart(4)} quads  ${megapixels.toFixed(2).padStart(7)} Mpx  ` +
      `${ms.toFixed(2).padStart(7)} ms  ${(megapixels / (ms / 1000) / 1000).toFixed(2).padStart(7)} Gpx/s`,
  );
}
const big = rows.at(-1);
const small = rows[0];
const rate = (big.megapixels - small.megapixels) / ((big.ms - small.ms) / 1000) / 1000;
console.log(`\nmarginal fill rate: ${rate.toFixed(2)} Gpx/s`);
console.log(
  `the scene shades ~2.6 Mpx per frame, which at this rate is ${((2.6 / rate) * 1000).toFixed(2)} ms of fill`,
);
await browser.close();
