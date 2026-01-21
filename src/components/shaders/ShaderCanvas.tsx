'use client';

import { useEffect, useRef } from 'react';

interface ShaderCanvasProps {
  scrollProgress: number;
  onReady?: () => void;
}

const fragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uScroll;
  uniform vec2 uMouse; 
  
  // --- STAR NEST + LENSING (High Fidelity) ---

  #define ITERATIONS 15 // Sharper fractal details
  #define FORMUPARAM 0.53

  #define VOLSTEPS 12 // Deeper volume sampling
  #define STEPSIZE 0.08 // Finer step increments

  #define ZOOM   0.800
  #define TILE   0.850
  #define SPEED  0.010 

  #define BRIGHTNESS 0.0015
  #define DARKMATTER 0.300
  #define DISTFADING 0.730
  #define SATURATION 0.85

  // Tweak Radius
  #define BLACKHOLE_CENTER vec3(0.0, 0.0, -2.0)
  #define BLACKHOLE_RADIUS 0.4 
  #define BLACKHOLE_INTENSITY 1.0

  float iSphere(vec3 ray, vec3 dir, vec3 center, float radius)
  {
    vec3 rc = ray-center;
    float c = dot(rc, rc) - (radius*radius);
    float b = dot(dir, rc);
    float d = b*b - c;
    float t = -b - sqrt(abs(d));
    float st = step(0.0, min(t,d));
    return mix(-1.0, t, st);
  }

  vec3 iPlane(vec3 ro, vec3 rd, vec3 po, vec3 pd){
    float d = dot(po - ro, pd) / dot(rd, pd);
    return d * rd + ro;
  }

  // Rotation function
  vec3 r(vec3 v, vec2 r)
  {
    vec4 t = sin(vec4(r, r + 1.5707963268));
    float g = dot(v.yz, t.yw);
    return vec3(v.x * t.z - g * t.x,
                v.y * t.w - v.z * t.y,
                v.x * t.x + g * t.z);
  }

  void main() {
    // 1. Coordinates
    vec2 uv = gl_FragCoord.xy / uResolution.xy - 0.5;
    uv.y *= uResolution.y / uResolution.x;
    
    vec3 dir = vec3(uv * ZOOM, 1.0);
    
    // ACCELERATION: Speed up with Scroll
    float time = uTime * SPEED + 0.25 + uScroll * 0.5;

    // 2. Camera / Mouse Rotation
    vec3 from = vec3(0.0, 0.0, -15.0);
    
    // Add scroll drift
    from.z += uScroll * 5.0; 
    
    // Mouse interactivity + CONSTANT PASSIVE ROTATION
    vec2 mouseRot = uMouse.xy / uResolution.xy;
    
    // Always add a slow spin (time based) to the rotation
    // This makes it feel alive even when not interacting
    float passiveSpin = time * 0.1; 
    
    if (mouseRot.x == 0.0 && mouseRot.y == 0.0) {
        mouseRot = vec2(passiveSpin, 0.3);
    } else {
        mouseRot.x += passiveSpin;
    }
    
    from = r(from, mouseRot);
    dir = r(dir, mouseRot);
    
    vec3 bhCenter = BLACKHOLE_CENTER;
    
    // 3. Gravitational Lensing
    vec3 nml = normalize(bhCenter - from);
    vec3 pos = iPlane(from, dir, bhCenter, nml);
    pos = bhCenter - pos;
    float intensity = dot(pos, pos);
    
    // Lensing Calculation
    intensity = 1.0 / intensity;
    dir = mix(dir, pos * sqrt(intensity), BLACKHOLE_INTENSITY * intensity);
    
    // 4. Volumetric Rendering (Star Nest) with BENT ray
    float s = 0.1;
    float fade = 1.0;
    vec3 v = vec3(0.0);
    
    for (int r = 0; r < VOLSTEPS; r++) {
        vec3 p = from + s * dir * 0.5;
        p = abs(vec3(TILE) - mod(p, vec3(TILE * 2.0))); 
        float pa, a = pa = 0.0;
        for (int i = 0; i < ITERATIONS; i++) { 
            p = abs(p) / dot(p, p) - FORMUPARAM; 
            a += abs(length(p) - pa); 
            pa = length(p);
        }
        float dm = max(0.0, DARKMATTER - a * a * 0.001); 
        a *= a * a; 
        if (r > 6) fade *= 1.0 - dm; 
        
        v += fade;
        v += vec3(s, s*s, s*s*s*s) * a * BRIGHTNESS * fade; 
        fade *= DISTFADING; 
        s += STEPSIZE;
    }
    
    v = mix(vec3(length(v)), v, SATURATION); 
    
    // BLOOM: Boost brightness
    v *= 2.5; 
    
    float distToSingularity = sqrt(1.0 / max(intensity, 0.0001));
    float edge = smoothstep(BLACKHOLE_RADIUS, BLACKHOLE_RADIUS + 0.3, distToSingularity);
    
    vec3 col = v * 0.01 * edge;
    
    // CINEMATIC VIGNETTE (Fixed)
    float dist = length(uv);
    // Tighter fade: Starts at 0.1, fully black by 0.65 (Consumes corners)
    float vig = 1.0 - smoothstep(0.1, 0.65, dist);
    
    col *= vig;
    
    // EXTRA CONTRAST (Deep Black Polish)
    // Crush shadows aggressively to remove grey wash
    col = pow(col, vec3(1.35)); 

    gl_FragColor = vec4(col, 1.0);    
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
  const mouseRef = useRef<[number, number]>([0,0]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2.0;
        const y = (e.clientY / window.innerHeight - 0.5) * 2.0;
        mouseRef.current = [x, y];
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
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
        scroll: gl.getUniformLocation(p, 'uScroll'),
        mouse: gl.getUniformLocation(p, 'uMouse')
    };

    if (onReady) onReady();

    return () => { gl.deleteProgram(p); };
  }, []);

  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current && glRef.current) {
            // MAX RESOLUTION: Uncapped for retina sharpness
            const dpr = window.devicePixelRatio || 1; 
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
        gl.uniform2f(locs.mouse, ...mouseRef.current);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        frameIdRef.current = requestAnimationFrame(render);
    };
    frameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [scrollProgress]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" style={{width:'100vw', height:'100vh'}} />;
}
