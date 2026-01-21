'use client';

import { useEffect, useRef, useState } from 'react';

interface ShaderCanvasProps {
  scrollProgress: number;
  onReady?: () => void;
}

// Hyperspace Shader: Twinkling 3D Stars + Mobile Optimized Drift
const fragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uScroll;
  
  #define PI 3.14159265359
  #define PIXEL_SIZE 1.0 
  
  // --- 3D NOISE ---
  vec3 hash( vec3 p ) {
    p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
              dot(p,vec3(269.5,183.3,246.1)),
              dot(p,vec3(113.5,271.9,124.6)));

    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
  }
  
  float noise( in vec3 p ) {
    vec3 i = floor( p );
    vec3 f = fract( p );
    
    vec3 u = f*f*(3.0-2.0*f);

    return mix( mix( mix( dot( hash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ), 
                          dot( hash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ), 
                          dot( hash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                mix( mix( dot( hash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ), 
                          dot( hash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ), 
                          dot( hash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
  }

  // --- 2D FBM ---
  float hash2d(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
  }

  float noise2d(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash2d(i), hash2d(i + vec2(1.0, 0.0)), f.x),
                 mix(hash2d(i + vec2(0.0, 1.0)), hash2d(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise2d(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
  }
  
  float warpedFbm(vec2 p, float time) {
    vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
    vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.15 * time),
                  fbm(p + 2.0 * q + vec2(8.3, 2.8) + 0.126 * time));
    return fbm(p + 2.0 * r);
  }
  
  void main() {
    // Mobile optimization: Use gl_FragCoord directly but consider lower precision effect
    vec2 pixelUv = gl_FragCoord.xy;
    vec2 uv = pixelUv / uResolution.xy;
    
    // Correct Aspect Ratio
    vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    
    float time = uTime * 0.15; // Speed up slightly for more kinetic feel
    float scroll = uScroll;

    // --- HYPERSPACE LATERAL DRIFT ---
    float lateralNoise = noise(vec3(0.0, scroll * 0.8, time * 0.2)); 
    p.x += lateralNoise * 1.5; 
    p.y += scroll * 1.5;

    vec3 finalColor = vec3(0.0);
    
    // --- PHASE 1: TWINKLING 3D NOISE STARS ---
    vec3 voidColor = vec3(0.005, 0.005, 0.012);
    
    vec3 stars_direction = normalize(vec3(p, 1.0)); 
    float stars_threshold = 8.0; 
    float stars_exposure = 200.0; 
    
    float baseStar = pow(clamp(noise(stars_direction * 200.0), 0.0, 1.0), stars_threshold) * stars_exposure;
    
    // Twinkle Logic: High frequency flickering
    float twinkle = noise(stars_direction * 150.0 + vec3(time * 5.0)); // Increased time scale
    twinkle = mix(0.2, 1.8, twinkle); // Wider range (dimmer lows, brighter highs)
    
    float starVal = baseStar * twinkle;
    
    float starFade = 1.0 - smoothstep(0.0, 0.5, scroll);
    finalColor = voidColor + vec3(starVal) * starFade;
    
    // --- PHASE 2: ETHEREAL NEBULA ---
    float nebulaMask = smoothstep(0.1, 0.3, scroll) * (1.0 - smoothstep(0.7, 0.9, scroll));
    
    float n = warpedFbm(p * 1.5 - vec2(0.0, time * 0.2), time);
    vec3 colA = vec3(0.0, 0.5, 0.6); 
    vec3 colB = vec3(0.4, 0.0, 0.6);
    vec3 neb = mix(colB, colA, n);
    
    vec3 nebulaLayer = neb * n * 0.6 + neb * smoothstep(0.4, 0.6, n) * 0.4;
    finalColor += nebulaLayer * nebulaMask;
    
    // --- PHASE 3: EVENT HORIZON ---
    float accMask = smoothstep(0.7, 0.9, scroll);
    
    vec2 bhP = p; 
    float len = length(bhP);
    float angle = atan(bhP.y, bhP.x);
    
    float spiral = warpedFbm(vec2(len * 8.0 - time * 10.0, angle * 4.0), time);
    vec3 hot = vec3(1.0, 0.3, 0.05); 
    
    vec3 accretionLayer = hot * spiral * (0.25 / len);
    finalColor = mix(finalColor, finalColor + accretionLayer, accMask);
    
    float voidEdge = smoothstep(0.2, 0.5, len); 
    float voidInfluence = accMask; 
    finalColor = mix(finalColor, finalColor * voidEdge, voidInfluence);

    // --- POST PROCESSING ---
    finalColor *= 1.1 - length(uv - 0.5); 
    
    float aber = length(uv - 0.5) * 0.005;
    finalColor.r += aber;
    finalColor.b -= aber;

    float grain = hash2d(uv + time * 10.0) * 0.03;
    finalColor += grain;
    
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
  const frameIdRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());
  const locationsRef = useRef<any>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Mobile Loop Fix: Use webgl1 for broader compatibility if webgl2 fails, 
    // but try high-performance.
    const gl = canvas.getContext('webgl', { 
        powerPreference: "high-performance",
        antialias: false,
        alpha: false,
        preserveDrawingBuffer: false 
    });
    if (!gl) return;
    glRef.current = gl;

    const createShader = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s));
            return null;
        }
        return s;
    };

    const vs = createShader(gl.VERTEX_SHADER, vertexShader);
    const fs = createShader(gl.FRAGMENT_SHADER, fragmentShader);
    if (!vs || !fs) return;

    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.useProgram(p);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    
    const pos = gl.getAttribLocation(p, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    locationsRef.current = {
        time: gl.getUniformLocation(p, 'uTime'),
        resolution: gl.getUniformLocation(p, 'uResolution'),
        scroll: gl.getUniformLocation(p, 'uScroll')
    };

    // Warm-up
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(locationsRef.current.time, 0);
    gl.uniform2f(locationsRef.current.resolution, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (onReady) onReady();

    return () => { gl.deleteProgram(p); };
  }, []);

  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current && glRef.current) {
            // Cap pixel ratio at 1.5 to prevent overheating on high-res mobile/laptops
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

  useEffect(() => {
    const gl = glRef.current;
    const locs = locationsRef.current;
    const render = () => {
        if (!gl) return;
        gl.uniform1f(locs.time, (Date.now() - startTimeRef.current) * 0.001);
        gl.uniform1f(locs.scroll, scrollProgress);
        if (canvasRef.current) gl.uniform2f(locs.resolution, canvasRef.current.width, canvasRef.current.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        frameIdRef.current = requestAnimationFrame(render);
    };
    frameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [scrollProgress]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" style={{width:'100vw', height:'100vh'}} />;
}
