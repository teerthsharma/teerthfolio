/* global document, requestAnimationFrame */

import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_RENDER_URL || "http://127.0.0.1:5273";

function chromeExecutable() {
  const localAppData = process.env.LOCALAPPDATA;
  return [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    localAppData && path.join(localAppData, "Google/Chrome/Application/chrome.exe"),
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ]
    .filter(Boolean)
    .find((candidate) => existsSync(candidate));
}

async function sampleFrameDrawCalls(page, query) {
  await page.goto(`${baseUrl}/?${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 25000 });
  await page.waitForTimeout(2200);

  return page.evaluate(async () => {
    const canvas = Array.from(document.querySelectorAll("canvas")).find(
      (candidate) => !candidate.classList.contains("igloo-atmosphere-canvas"),
    );
    if (!canvas) throw new Error("WebGL canvas was not found");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL context was not available");

    const methods = ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"];
    const originals = new Map();
    let calls = 0;
    for (const method of methods) {
      if (typeof gl[method] !== "function") continue;
      const original = gl[method].bind(gl);
      originals.set(method, original);
      gl[method] = (...args) => {
        calls += 1;
        return original(...args);
      };
    }

    const samples = [];
    await new Promise((resolve) => {
      const capture = () => {
        requestAnimationFrame(() => {
          samples.push(calls);
          calls = 0;
          if (samples.length >= 30) resolve();
          else capture();
        });
      };
      capture();
    });

    for (const [method, original] of originals) gl[method] = original;
    const activeSamples = samples.filter((value) => value > 0).sort((a, b) => a - b);
    if (activeSamples.length === 0) throw new Error("No WebGL draw calls were observed");
    const median = activeSamples[Math.floor(activeSamples.length / 2)];

    return {
      max: activeSamples.at(-1),
      median,
      min: activeSamples[0],
      quality: canvas.dataset.quality || "unknown",
      samples: activeSamples.length,
    };
  });
}

const browser = await chromium.launch({
  args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
  executablePath: chromeExecutable(),
  headless: true,
});

try {
  for (const tier of ["high", "low"]) {
    const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const qualityQuery = tier === "low" ? "&qa-low=1" : "";
    const full = await sampleFrameDrawCalls(page, `qa-sdf=1${qualityQuery}&qa=probe-dome-${tier}`);
    const withoutDome = await sampleFrameDrawCalls(
      page,
      `qa-sdf=1${qualityQuery}&qa-no-dome=1&qa=probe-no-dome-${tier}`,
    );
    console.log(
      JSON.stringify({
        domeMedianDrawCalls: full.median - withoutDome.median,
        full,
        tier,
        withoutDome,
      }),
    );
    await context.close();
  }
} finally {
  await browser.close();
}
