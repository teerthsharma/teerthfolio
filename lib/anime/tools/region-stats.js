// Where shapes sit in a frame: masks from pixel bytes, share, bbox, centroid and 4-connected blobs.
const MIN_FRAC = 0.0005;

export function maskFrom(data, w, h, stride, pred) {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = pred(data, i * stride) ? 1 : 0;
  return mask;
}

function blobs(mask, w, h) {
  const seen = Uint8Array.from(mask);
  const stack = new Int32Array(w * h);
  const out = [];
  for (let start = 0; start < seen.length; start++) {
    if (!seen[start]) continue;
    let top = 0, size = 0, sx = 0, sy = 0;
    seen[start] = 0;
    stack[top++] = start;
    while (top) {
      const p = stack[--top];
      const x = p % w, y = (p - x) / w;
      size++; sx += x; sy += y;
      if (x > 0 && seen[p - 1]) { seen[p - 1] = 0; stack[top++] = p - 1; }
      if (x < w - 1 && seen[p + 1]) { seen[p + 1] = 0; stack[top++] = p + 1; }
      if (y > 0 && seen[p - w]) { seen[p - w] = 0; stack[top++] = p - w; }
      if (y < h - 1 && seen[p + w]) { seen[p + w] = 0; stack[top++] = p + w; }
    }
    out.push({ size, sx, sy });
  }
  return out;
}

function counted(mask, w, h) {
  const min = MIN_FRAC * w * h;
  return blobs(mask, w, h).filter((b) => b.size >= min);
}

export function maskStats(mask, w, h) {
  let n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1, sx = 0, sy = 0;
  for (let i = 0; i < w * h; i++) {
    if (!mask[i]) continue;
    const x = i % w, y = (i - x) / w;
    n++; sx += x; sy += y;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (!n) return { share: 0, bbox: null, centroid: null, components: 0 };
  return {
    share: n / (w * h),
    bbox: [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h],
    centroid: [(sx / n + 0.5) / w, (sy / n + 0.5) / h],
    components: counted(mask, w, h).length,
  };
}

export function regionStats(ids, w, h, id, tol = 0) {
  return maskStats(maskFrom(ids, w, h, 1, (d, o) => Math.abs(d[o] - id) <= tol), w, h);
}

export function discFit(mask, w, h) {
  const big = counted(mask, w, h);
  if (!big.length) return { count: 0, diameterH: 0, centre: null };
  const top = big.reduce((a, b) => (b.size > a.size ? b : a));
  return {
    count: big.length,
    diameterH: (2 * Math.sqrt(top.size / Math.PI)) / h,
    centre: [(top.sx / top.size + 0.5) / w, (top.sy / top.size + 0.5) / h],
  };
}
