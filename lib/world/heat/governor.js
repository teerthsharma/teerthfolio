// D5 governor of the topological shader: a shift u <= 0 that only moves down. Once per stepS seconds, if the mean frame
// time of that window is over budget, u drops by one step (less LIVE); otherwise it is held. The step size is not
// fixed by the report; 0.05 is a placeholder until the pre-registered run sets it.
export function makeGovernor({ stepS = 10, budgetMs = 1000 / 30, step = 0.05 } = {}) {
  let u = 0;
  let since = null;
  let sum = 0;
  let n = 0;
  return {
    update(frameMs, t) {
      if (since === null) since = t;
      sum += frameMs;
      n += 1;
      if (t - since >= stepS) {
        if (sum / n > budgetMs) u -= step;
        since = t;
        sum = 0;
        n = 0;
      }
      return u;
    },
  };
}
