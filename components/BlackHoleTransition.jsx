"use client";

import { useEffect, useRef } from "react";

const BLACKHOLE_RADIUS = 0.4;

const STAR_NEST_FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;

  #define ITERATIONS 15
  #define FORMUPARAM 0.53
  #define VOLSTEPS 12
  #define STEPSIZE 0.08
  #define ZOOM 0.800
  #define TILE 0.850
  #define SPEED 0.016
  #define BRIGHTNESS 0.0017
  #define DARKMATTER 0.300
  #define DISTFADING 0.730
  #define SATURATION 0.85
  #define BLACKHOLE_CENTER vec3(0.0, 0.0, -2.0)
  #define BLACKHOLE_RADIUS 0.4
  #define BLACKHOLE_INTENSITY 1.08

  vec3 rotateField(vec3 v, vec2 r) {
    vec4 t = sin(vec4(r, r + 1.5707963268));
    float g = dot(v.yz, t.yw);
    return vec3(v.x * t.z - g * t.x, v.y * t.w - v.z * t.y, v.x * t.x + g * t.z);
  }

  vec3 intersectPlane(vec3 ro, vec3 rd, vec3 po, vec3 pd) {
    float d = dot(po - ro, pd) / dot(rd, pd);
    return d * rd + ro;
  }

  void main() {
    vec2 uvScreen = gl_FragCoord.xy / uResolution.xy - 0.5;
    vec2 uv = uvScreen;
    uv.y *= uResolution.y / uResolution.x;

    float mobileZoom = 1.0;
    if (uResolution.y > uResolution.x) mobileZoom = 0.62;

    vec3 dir = vec3(uv * ZOOM * mobileZoom, 1.0);
    float time = uTime * SPEED + 0.25;
    vec3 from = vec3(0.0, 0.0, -15.0);

    vec2 mouseRot = uMouse.xy / uResolution.xy;
    float passiveSpin = time * 0.12;
    if (mouseRot.x == 0.0 && mouseRot.y == 0.0) {
      mouseRot = vec2(passiveSpin, 0.3);
    } else {
      mouseRot.x += passiveSpin;
    }

    from = rotateField(from, mouseRot);
    dir = rotateField(dir, mouseRot);

    vec3 bhCenter = BLACKHOLE_CENTER;
    vec3 normal = normalize(bhCenter - from);
    vec3 pos = intersectPlane(from, dir, bhCenter, normal);
    pos = bhCenter - pos;
    float intensity = dot(pos, pos);

    // gravitational lensing bends the star nest around the singularity.
    intensity = 1.0 / intensity;
    dir = mix(dir, pos * sqrt(intensity), BLACKHOLE_INTENSITY * intensity);

    float s = 0.1;
    float fade = 1.0;
    vec3 v = vec3(0.0);

    for (int rayStep = 0; rayStep < VOLSTEPS; rayStep++) {
      vec3 p = from + s * dir * 0.5;
      p = abs(vec3(TILE) - mod(p, vec3(TILE * 2.0)));
      float previousLength = 0.0;
      float accumulator = 0.0;
      for (int i = 0; i < ITERATIONS; i++) {
        p = abs(p) / dot(p, p) - FORMUPARAM;
        accumulator += abs(length(p) - previousLength);
        previousLength = length(p);
      }
      float darkMatter = max(0.0, DARKMATTER - accumulator * accumulator * 0.001);
      accumulator *= accumulator * accumulator;
      if (rayStep > 6) fade *= 1.0 - darkMatter;

      v += fade;
      v += vec3(s, s * s, s * s * s * s) * accumulator * BRIGHTNESS * fade;
      fade *= DISTFADING;
      s += STEPSIZE;
    }

    v = mix(vec3(length(v)), v, SATURATION);
    v *= 2.8;

    float distToSingularity = sqrt(1.0 / max(intensity, 0.0001));
    float edge = smoothstep(BLACKHOLE_RADIUS, BLACKHOLE_RADIUS + 0.3, distToSingularity);
    vec3 col = v * 0.014 * edge;
    float vignette = 1.0 - smoothstep(0.34, 0.75, length(uvScreen));
    col *= vignette;
    col = pow(col, vec3(1.28));

    gl_FragColor = vec4(col, 1.0);
  }
`;

const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const HALL_OF_FAME = [
  {
    title: "lambda-topo",
    text: "Topology-first memory and functional experiments indexed as source evidence.",
  },
  {
    title: "topoflow",
    text: "Persistent homology as a flow model for technical archive traversal.",
  },
  {
    title: "topoml",
    text: "A topology-aware ML lane for manifolds, neighborhoods, and signal structure.",
  },
  {
    title: "phi-mem",
    text: "Phase-space memory experiments staged as a black-hole archive shelf.",
  },
];

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function BlackHoleTransition({ active, onClose }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef([0, 0]);

  useEffect(() => {
    if (!active) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!gl) return undefined;

    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, STAR_NEST_FRAGMENT_SHADER);
    if (!vertex || !fragment) return undefined;

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      mouse: gl.getUniformLocation(program, "uMouse"),
      resolution: gl.getUniformLocation(program, "uResolution"),
      time: gl.getUniformLocation(program, "uTime"),
    };
    const startedAt = performance.now();
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (now) => {
      gl.uniform1f(uniforms.time, (now - startedAt) * 0.001);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.mouse, mouseRef.current[0], mouseRef.current[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event) => {
      mouseRef.current = [event.clientX, event.clientY];
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    raf = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="black-hole-transition" role="dialog" aria-label="Topology Hall of Fame black hole">
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="black-hole-panel">
        <span>archive event / radius {BLACKHOLE_RADIUS.toFixed(1)}</span>
        <h2>Topology Hall of Fame</h2>
        <p>
          The archive wall folds into a black hole: persistent homology, topology-aware ML,
          phase-space memory, and source trails orbit as the long-term record.
        </p>
        <div className="black-hole-grid">
          {HALL_OF_FAME.map((item) => (
            <article key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <button type="button" onClick={onClose}>
          Return to topology land
        </button>
      </div>
    </div>
  );
}
