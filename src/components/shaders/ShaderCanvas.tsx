'use client';

import { useEffect, useRef, useState } from 'react';

interface ShaderCanvasProps {
  scrollProgress: number;
  onReady?: () => void;
}

// Optimized multi-stage cosmic shader
const fragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uScroll;
  uniform vec2 uMouse;
  
  #define PI 3.14159265359
  #define PIXEL_SIZE 4.0
  
  // Hash function for pseudo-random
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  // Smooth noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  
  // FBM with fewer octaves for performance
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 4; i++) { // Reduced from 6 to 4 for performance
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }
  
  // Domain warping
  float warpedFbm(vec2 p, float time) {
    vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
    vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.15 * time),
                  fbm(p + 2.0 * q + vec2(8.3, 2.8) + 0.126 * time));
    return fbm(p + 2.0 * r);
  }
  
  // Simple Star field
  float stars(vec2 uv, float density, float twinkleSpeed) {
    vec2 grid = floor(uv * density);
    vec2 gridUv = fract(uv * density);
    float starValue = hash(grid);
    float star = 0.0;
    if (starValue > 0.98) { // Fewer stars for cleanliness
      vec2 center = vec2(0.5); 
      float d = length(gridUv - center);
      star = smoothstep(0.15, 0.05, d); // Softer stars
      star *= 0.7 + 0.3 * sin(uTime * twinkleSpeed + starValue * 100.0);
    }
    return star;
  }
  
  void main() {
    // Pixelation and UV setup
    vec2 pixelUv = floor(gl_FragCoord.xy / PIXEL_SIZE) * PIXEL_SIZE;
    vec2 uv = pixelUv / uResolution.xy;
    vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    
    // Storytelling Phases based on scroll
    // 0.0 - 0.2: Deep Space (Calm)
    // 0.2 - 0.5: Nebula (Warmth)
    // 0.5 - 0.8: Accretion (Energy)
    // 0.8 - 1.0: Singularity (Void)
    
    float time = uTime * 0.2;
    float scroll = uScroll;
    
    // --- STAGE 1: DEEP SPACE (Base Layer) ---
    vec3 colDeepSpace = vec3(0.01, 0.01, 0.03);
    float starLayer = stars(p + vec2(scroll * 0.1, 0.0), 30.0, 2.0);
    colDeepSpace += vec3(0.8, 0.9, 1.0) * starLayer;
    
    // --- STAGE 2: NEBULA (Cloud Layer) ---
    // Appears around 0.2, peaks around 0.4
    float nebulaMask = smoothstep(0.1, 0.4, scroll) * (1.0 - smoothstep(0.6, 0.9, scroll));
    vec3 colNebula = vec3(0.0);
    if (nebulaMask > 0.01) {
        float n = warpedFbm(p * 2.0 + vec2(0.0, -time * 0.5), time);
        vec3 nebColor1 = vec3(0.5, 0.0, 0.2); // Purple/Red
        vec3 nebColor2 = vec3(0.0, 0.2, 0.6); // Blue
        colNebula = mix(nebColor2, nebColor1, n) * n * 2.0;
    }
    
    // --- STAGE 3: ACCRETION (Energy Layer) ---
    // Appears around 0.5, energetic streaks
    float accretionMask = smoothstep(0.4, 0.7, scroll);
    vec3 colAccretion = vec3(0.0);
    if (accretionMask > 0.01) {
        vec2 ap = p;
        float angle = atan(ap.y, ap.x);
        float dist = length(ap);
        // Swirling effect
        float swirl = warpedFbm(vec2(dist * 5.0 - time * 5.0, angle * 2.0), time);
        vec3 hotColor = vec3(1.0, 0.6, 0.1); // Orange/Gold
        colAccretion = hotColor * swirl * (1.0/dist) * 0.2;
    }

    // --- STAGE 4: EVENT HORIZON (Void Layer) ---
    // Near 1.0, screen gets consumed
    float voidMask = smoothstep(0.8, 1.0, scroll);
    
    // BLENDING
    vec3 finalColor = colDeepSpace;
    finalColor = mix(finalColor, finalColor + colNebula, nebulaMask); // Additive nebula
    finalColor = mix(finalColor, finalColor + colAccretion, accretionMask); // Additive energy
    
    // Singularity consumes all light
    if (voidMask > 0.0) {
        float vignette = length(p);
        float darkness = smoothstep(0.8 * (1.0 - voidMask), 1.5, vignette);
        finalColor = mix(finalColor, vec3(0.0), voidMask * 0.95);
        // Rim light at the end
        finalColor += vec3(0.5) * smoothstep(0.95, 1.0, scroll) * hash(p * time); 
    }

    // Scanlines for retro feel
    finalColor *= 0.9 + 0.1 * sin(uv.y * uResolution.y * 0.5);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const vertexShader = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

export function ShaderCanvas({ scrollProgress, onReady }: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const frameIdRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());
  
  // Cached Uniform Locations
  const locationsRef = useRef<{
    time: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    scroll: WebGLUniformLocation | null;
    mouse: WebGLUniformLocation | null;
  }>({ time: null, resolution: null, scroll: null, mouse: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      powerPreference: "high-performance",
      antialias: false,
      alpha: false,
    });

    if (!gl) return;
    glRef.current = gl;

    // --- Shader Compilation ---
    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vertexShader);
    const fs = createShader(gl.FRAGMENT_SHADER, fragmentShader);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    
    gl.useProgram(program);
    programRef.current = program;

    // --- Buffers ---
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // --- Uniform Caching ---
    locationsRef.current = {
      time: gl.getUniformLocation(program, 'uTime'),
      resolution: gl.getUniformLocation(program, 'uResolution'),
      scroll: gl.getUniformLocation(program, 'uScroll'),
      mouse: gl.getUniformLocation(program, 'uMouse'),
    };

    // --- Warm-up Draw ---
    // Force a draw call immediately so the pipeline is ready
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(locationsRef.current.time, 0);
    gl.uniform2f(locationsRef.current.resolution, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Signal ready
    if (onReady) onReady();

    // Cleanup
    return () => {
      gl.deleteProgram(program);
    };
  }, []); // Run once on mount

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && glRef.current) {
        // Lower resolution for better performance on high DPI
        const dpr = Math.min(window.devicePixelRatio, 1.5); 
        canvasRef.current.width = window.innerWidth * dpr;
        canvasRef.current.height = window.innerHeight * dpr;
        glRef.current.viewport(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render Loop
  useEffect(() => {
    const gl = glRef.current;
    const locs = locationsRef.current;
    
    const render = () => {
      if (!gl) return;
      const time = (Date.now() - startTimeRef.current) * 0.001;
      
      gl.uniform1f(locs.time, time);
      // Resolution is handled in resize, but good to ensure match if needed, 
      // though typically we don't need to re-upload if it hasn't changed. 
      // For safety/simplicity we can skip uploading resolution every frame if we trust resize.
      // But let's keep it safe.
      if (canvasRef.current) {
          gl.uniform2f(locs.resolution, canvasRef.current.width, canvasRef.current.height);
      }
      gl.uniform1f(locs.scroll, scrollProgress);
      // Mouse uniform could be added if we tracked it, skipping for pure perf now or adding later
      
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frameIdRef.current = requestAnimationFrame(render);
    };

    frameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [scrollProgress]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
