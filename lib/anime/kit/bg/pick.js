// The kit's door into the shader table (lib/anime/tools/catalog.json, 2,004 tools). Both calls load lazily: nothing ships until a builder asks.
//   await bg.pick("sky", "dusk")   the real, compiling tools filed for that need (sky water ground interior city atmosphere foreground light), optional text filter
//   await bg.shader("tgDuskSky")   loads the tool's pack and returns { glsl, uniforms, tool } to drop into a plate or card (ctx.bake.plateLayer(glsl, { tools: [name] }))
export async function pick(need, q = "") {
  const { default: picks } = await import("../../tools/bg-picks.js");
  const re = q ? new RegExp(q, "i") : null;
  return picks.filter((p) => p.need === need && (!re || re.test(p.name) || re.test(p.draws)));
}

export async function shader(pull, opts = {}) {
  const { default: picks } = await import("../../tools/bg-picks.js");
  const rec = picks.find((p) => p.pull === pull || p.name === pull);
  const { loadPack } = await import("../../tools/packs.js");
  const tools = await import("../../tools/index.js");
  if (rec && rec.pack !== "core") await loadPack(rec.pack);
  return { glsl: tools.glslFor([pull]), uniforms: tools.uniformsFor([pull], opts), tool: tools.tool(pull), rec };
}
