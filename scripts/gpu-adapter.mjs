/* global document */
// Chrome flags that pin one adapter of a hybrid laptop by its LUID, read
// from chrome://gpu. Windows' per-app GPU preference and
// --force_low_power_gpu both lose to it; no system setting is touched.
//   const flags = await adapterFlags(chromium, chromePath, "intel" | "nvidia" | "amd")
// Linux (the GPU host): one NVIDIA adapter, so no LUID pin; ANGLE over Vulkan instead of D3D11
export const BASE_FLAGS = process.platform === "win32" ? ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] : ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=vulkan"];

export async function adapterFlags(chromium, executablePath, vendor) {
  if (!vendor) return [];
  if (process.platform !== "win32") return ["--use-gl=angle"]; // single adapter on Linux: nothing to pin
  const probe = await chromium.launch({ executablePath, headless: true, args: BASE_FLAGS });
  try {
    const page = await probe.newPage();
    await page.goto("chrome://gpu");
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => {
      const walk = (n) => (n.shadowRoot ? walk(n.shadowRoot) : "") + Array.from(n.childNodes || []).map(walk).join(" ") + (n.nodeType === 3 ? n.textContent : "");
      return walk(document.body);
    });
    const line = text.split(/GPU\d/).find((l) => l.toLowerCase().includes(vendor.toLowerCase()) && /LUID=\{/.test(l));
    const luid = line?.match(/LUID=\{(\d+),(\d+)\}/);
    if (!luid) throw new Error(`no ${vendor} adapter in chrome://gpu`);
    return [`--use-adapter-luid=${luid[1]},${luid[2]}`];
  } finally {
    await probe.close();
  }
}
