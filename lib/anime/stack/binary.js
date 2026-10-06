// WEBGL program binary cache. Memory Map only — no DOM, no network.
// Key = permKey string. Missing ext → null, never throw.

export const WEBGL_GET_PROGRAM_BINARY = "WEBGL_get_program_binary";
export const COMPLETION_STATUS_KHR = 0x91B1;

function asPacked(got, format) {
  if (!got) return null;
  if (got.bytes != null) return Object.freeze({ format: got.format ?? format, bytes: got.bytes });
  if (got.binary != null) {
    return Object.freeze({ format: got.format ?? got.binaryFormat ?? format, bytes: got.binary });
  }
  if (got instanceof ArrayBuffer) return Object.freeze({ format, bytes: got });
  if (ArrayBuffer.isView(got)) {
    return Object.freeze({ format, bytes: got.buffer.slice(got.byteOffset, got.byteOffset + got.byteLength) });
  }
  return null;
}

export function binaryExt(gl) {
  if (!gl) return null;
  try {
    const ext =
      gl.getExtension(WEBGL_GET_PROGRAM_BINARY) ||
      gl.getExtension("GL_OES_get_program_binary") ||
      null;
    if (ext) return ext;
    if (typeof gl.getProgramBinary === "function" && typeof gl.programBinary === "function") {
      return gl;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBinary(gl, program) {
  if (!gl || !program) return null;
  try {
    const ext = binaryExt(gl);
    if (!ext) return null;
    const host = typeof ext.getProgramBinary === "function" ? ext : gl;
    if (typeof host.getProgramBinary !== "function") return null;
    let format = 0;
    try {
      const formats = gl.PROGRAM_BINARY_FORMATS != null ? gl.getParameter(gl.PROGRAM_BINARY_FORMATS) : null;
      if (formats && formats.length) format = formats[0];
    } catch {
      format = 0;
    }
    return asPacked(host.getProgramBinary(program), format);
  } catch {
    return null;
  }
}

export function loadBinary(gl, vsSrc, fsSrc, packed) {
  if (!gl || !packed?.bytes) return null;
  void vsSrc;
  void fsSrc;
  let program = null;
  try {
    const ext = binaryExt(gl);
    if (!ext) return null;
    const host = typeof ext.programBinary === "function" ? ext : gl;
    if (typeof host.programBinary !== "function") return null;
    program = gl.createProgram();
    if (!program) return null;
    host.programBinary(program, packed.format, packed.bytes);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    return program;
  } catch {
    if (program) {
      try {
        gl.deleteProgram(program);
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

export function memoryStore() {
  const bag = new Map();
  const store = {
    get(key) {
      return bag.get(key) ?? null;
    },
    set(key, packed) {
      bag.set(key, packed);
      return packed;
    },
    clear() {
      bag.clear();
    },
  };
  Object.defineProperty(store, "size", {
    get() {
      return bag.size;
    },
    enumerable: true,
  });
  return Object.freeze(store);
}
