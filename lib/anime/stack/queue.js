// Smooth compile of many shaders. Cap in-flight so the main thread does not hitch.

export const COMPLETION_STATUS_KHR = 0x91B1;

export const QUEUE_LAW = Object.freeze({
  concurrency: 2,
  reason: "WebGL compile is main-thread; 2 in flight avoids hitch + starvation",
});

export function pollReady(gl, program, ext) {
  if (!gl || !program) return false;
  if (!ext) return !!gl.getProgramParameter(program, gl.LINK_STATUS);
  return !!gl.getProgramParameter(program, COMPLETION_STATUS_KHR);
}

export function compileSoon(fn) {
  if (typeof requestIdleCallback === "function") return requestIdleCallback(fn);
  return setTimeout(fn, 0);
}

export function makeQueue({ concurrency = 2 } = {}) {
  const cap = Math.max(1, concurrency | 0);
  const wait = [];
  let flying = 0;

  function pump() {
    while (flying < cap && wait.length) {
      const job = wait.shift();
      flying += 1;
      Promise.resolve()
        .then(job.task)
        .then(job.ok, job.fail)
        .then(() => {
          flying -= 1;
          pump();
        });
    }
  }

  function enqueue(task) {
    return new Promise((ok, fail) => {
      wait.push({ task, ok, fail });
      pump();
    });
  }

  return Object.freeze({ enqueue, pump });
}
