'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const CHAINSAWMAN_RIGHT_PROFILE_Y = 0.905;
const CHAINSAWMAN_SCENE_OFFSET_X = -0.18;
const SHADER_BASE_HEX = "#161f19";
const SHADER_NEON_HEX = "#6ca600";

const shaderVertex = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const shaderFragment = `
  precision highp float;

  #define MAXDIST 34.0
  #define CANOPY_ITERATIONS 8
  #define RAYMARCH_STEPS 20
  #define VMARCH_STEPS 6
  #define DETAIL_CONTRAST 1.42

  uniform float iTime;
  uniform vec3 iResolution;
  varying vec2 vUv;

  struct Ray {
    vec3 ro;
    vec3 rd;
  };

  vec3 hue(vec3 color, float shift) {
    const vec3 kRGBToYPrime = vec3(0.299, 0.587, 0.114);
    const vec3 kRGBToI = vec3(0.596, -0.275, -0.321);
    const vec3 kRGBToQ = vec3(0.212, -0.523, 0.311);
    const vec3 kYIQToR = vec3(1.0, 0.956, 0.621);
    const vec3 kYIQToG = vec3(1.0, -0.272, -0.647);
    const vec3 kYIQToB = vec3(1.0, -1.107, 1.704);

    float yPrime = dot(color, kRGBToYPrime);
    float i = dot(color, kRGBToI);
    float q = dot(color, kRGBToQ);
    float hueValue = atan(q, i) + shift;
    float chroma = sqrt(i * i + q * q);
    q = chroma * sin(hueValue);
    i = chroma * cos(hueValue);
    vec3 yIQ = vec3(yPrime, i, q);

    return vec3(dot(yIQ, kYIQToR), dot(yIQ, kYIQToG), dot(yIQ, kYIQToB));
  }

  float opU(float d1, float d2) {
    return min(d1, d2);
  }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  float length6(vec3 p) {
    p = p * p * p;
    p = p * p;
    return pow(p.x + p.y + p.z, 1.0 / 6.0);
  }

  float fPlane(vec3 p, vec3 n, float distanceFromOrigin) {
    return dot(p, n) + distanceFromOrigin;
  }

  void pR(inout vec2 p, float a) {
    p = cos(a) * p + sin(a) * vec2(p.y, -p.x);
  }

  float treeCanopy(vec3 p) {
    float d = iTime * 3.7 - p.z;
    p = p.yxz;
    pR(p.yz, 1.570795);
    p.x += 6.5;
    p.yz = mod(abs(p.yz), 20.0) - 10.0;
    float scale = 1.25;
    p.xy /= 1.0 + d * d * 0.0005;
    float l = 0.0;

    for (int i = 0; i < CANOPY_ITERATIONS; i++) {
      p.xy = abs(p.xy);
      p = p * scale + vec3(-3.0 + d * 0.0095, -1.5, -0.5);
      pR(p.xy, 0.35 - d * 0.015);
      pR(p.yz, 0.5 + d * 0.02);
      l = length6(p);
    }

    return l * pow(scale, -float(CANOPY_ITERATIONS)) - 0.15;
  }

  float treeTrunk(vec3 p) {
    return fPlane(p, vec3(0.0, 1.0, 0.0), 10.0);
  }

  vec2 map(vec3 pos) {
    float dist = 10.0;
    dist = opU(dist, treeCanopy(pos));
    dist = smin(dist, treeTrunk(pos), 4.6);
    return vec2(dist, 0.0);
  }

  vec3 vmarch(Ray ray) {
    vec3 p = ray.ro;
    vec3 sum = vec3(0.0);
    vec3 c = hue(vec3(0.0, 0.0, 1.0), 5.5);

    for (int i = 0; i < VMARCH_STEPS; i++) {
      vec2 r = map(p);
      if (r.x > 0.01) break;
      p += ray.rd * 0.015;
      vec3 col = c;
      col.rgb *= smoothstep(0.0, 0.15, -r.x);
      sum += abs(col) * 0.44;
    }

    return sum;
  }

  vec2 march(Ray ray) {
    vec2 res = vec2(0.0);

    for (int i = 0; i < RAYMARCH_STEPS; i++) {
      vec2 s = map(ray.ro + ray.rd * res.x);
      if (res.x > MAXDIST || s.x < 0.001) break;
      res.x += s.x;
      res.y = s.y;
    }

    return res;
  }

  vec4 render(Ray ray) {
    vec2 res = march(ray);

    if (res.x > MAXDIST) {
      return vec4(0.0, 0.0, 0.0, MAXDIST);
    }

    vec3 pos = ray.ro + res.x * ray.rd;
    ray.ro = pos;
    vec3 col = vmarch(ray);
    col = mix(col, vec3(0.0), clamp(res.x / MAXDIST, 0.0, 1.0));
    return vec4(col, res.x);
  }

  mat3 camera(in vec3 ro, in vec3 rd, float rot) {
    vec3 forward = normalize(rd - ro);
    vec3 worldUp = vec3(sin(rot), cos(rot), 0.0);
    vec3 x = normalize(cross(forward, worldUp));
    vec3 y = normalize(cross(x, forward));
    return mat3(x, y, forward);
  }

  vec3 neonGreenGrade(vec3 canopy, float alpha, vec2 uv) {
    vec3 blackGreen = vec3(0.086, 0.122, 0.098);
    vec3 deepGreen = vec3(0.025, 0.052, 0.034);
    vec3 moss = vec3(0.18, 0.34, 0.045);
    vec3 neon = vec3(0.424, 0.651, 0.0);
    vec3 mist = vec3(0.58, 0.82, 0.14);
    float skyLift = smoothstep(-0.16, 0.72, uv.y);
    float glow = pow(clamp(canopy.g, 0.0, 1.0), 1.72);
    float horizon = smoothstep(-0.48, 0.18, uv.y) * (1.0 - smoothstep(0.52, 1.0, uv.y));
    float scan = sin((uv.y + iTime * 0.012) * 230.0) * 0.01;
    vec3 color = mix(deepGreen, blackGreen, skyLift);
    color += moss * alpha * 0.56;
    color += neon * glow * (0.34 + alpha * 0.72);
    color += mist * alpha * horizon * 0.22;
    color = mix(color, deepGreen, smoothstep(-0.2, -0.86, uv.y) * 0.58);
    color = (color - 0.12) * DETAIL_CONTRAST + 0.12;
    color += scan * DETAIL_CONTRAST;
    return pow(max(color, vec3(0.0)), vec3(0.78));
  }

  vec3 fractalTreeField(vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= iResolution.x / max(iResolution.y, 1.0);
    uv.y -= uv.x * uv.x * 0.15;

    vec3 camPos = vec3(3.0, -1.5, iTime * 3.7);
    vec3 camDir = camPos + vec3(-1.25, 0.1, 1.0);
    mat3 cam = camera(camPos, camDir, 0.0);
    Ray ray;
    ray.ro = camPos;
    ray.rd = cam * normalize(vec3(uv, 0.8));
    vec4 col = render(ray);

    float alpha = clamp(1.0 - col.w / MAXDIST, 0.0, 1.0);
    vec3 canopy = clamp(1.0 - col.xyz, 0.0, 1.0);
    canopy = mix(canopy, hue(canopy, -0.18), 0.65);
    return neonGreenGrade(canopy, alpha, uv);
  }

  void main() {
    vec3 color = fractalTreeField(vUv * iResolution.xy);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function useSceneVisibility(targetRef) {
  const [sceneActive, setSceneActive] = useState(true);

  useEffect(() => {
    const node = targetRef.current;
    if (!node || !("IntersectionObserver" in window)) {
      setSceneActive(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setSceneActive(entry.isIntersecting),
      {
        rootMargin: "220px 0px",
        threshold: 0.04,
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [targetRef]);

  return sceneActive;
}

function CameraRig({ isMobile }) {
  const { camera, pointer } = useThree();

  useFrame(() => {
    const base = isMobile ? [0, 0.82, 6.4] : [0.52, 0.86, 5.8];
    const target = isMobile ? [0, -0.1, 0] : [0, -0.05, 0];
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, base[0] + pointer.x * 0.5, 0.04);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, base[1] + pointer.y * 0.32, 0.04);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, base[2], 0.04);
    camera.lookAt(target[0], target[1], target[2]);
  });

  return null;
}

function SceneShaderBackdrop() {
  const material = useRef(null);
  const uniforms = useMemo(
    () => ({
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3(1, 1, 1) },
    }),
    [],
  );

  useFrame(({ clock, size }) => {
    uniforms.iTime.value = clock.elapsedTime;
    uniforms.iResolution.value.set(size.width, size.height, 1);
  });

  return (
    <mesh position={[0, 0.05, -3.6]} scale={[12, 7, 1]} renderOrder={-20}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={shaderVertex}
        fragmentShader={shaderFragment}
        toneMapped={false}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

function ChainsawmanModel({ isMobile }) {
  const group = useRef(null);
  const { scene, animations } = useGLTF("/assets/chainsawmangrave.glb");
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    const action = names.length ? actions[names[0]] : null;
    action?.reset().fadeIn(0.45).play();
    return () => action?.fadeOut(0.2);
  }, [actions, names]);

  useMemo(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;
        if (child.material) {
          child.material.roughness = Math.min(child.material.roughness ?? 0.7, 0.84);
          child.material.metalness = child.material.metalness ?? 0.08;
        }
      }
    });
  }, [scene]);

  const frame = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const safeHeight = size.y || 1;
    return {
      center,
      scale: (isMobile ? 3.6 : 4.2) / safeHeight,
    };
  }, [isMobile, scene]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = CHAINSAWMAN_RIGHT_PROFILE_Y + Math.sin(t * 0.42) * 0.025;
    group.current.position.y = (isMobile ? -0.88 : -1.02) + Math.sin(t * 0.9) * 0.035;
  });

  return (
    <group
      ref={group}
      scale={frame.scale}
      position={[
        isMobile ? CHAINSAWMAN_SCENE_OFFSET_X * 0.75 : CHAINSAWMAN_SCENE_OFFSET_X,
        isMobile ? -0.88 : -1.02,
        0,
      ]}
      rotation={[0, CHAINSAWMAN_RIGHT_PROFILE_Y, 0]}
    >
      <group position={[-frame.center.x, -frame.center.y, -frame.center.z]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function WorkbenchGrid({ isMobile }) {
  const group = useRef(null);
  const bladeCount = isMobile ? 12 : 28;
  const blades = useMemo(
    () =>
      Array.from({ length: bladeCount }, (_, index) => ({
        x: (index % 7) * 0.82 - 2.45,
        z: Math.floor(index / 7) * -0.72 + 0.9,
        h: 0.18 + ((index * 17) % 9) * 0.018,
        r: ((index * 29) % 20) / 100,
      })),
    [bladeCount],
  );

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.006;
  });

  return (
    <group ref={group} position={[0, -1.28, 0]}>
      <gridHelper
        args={[isMobile ? 11 : 16, isMobile ? 12 : 20, SHADER_NEON_HEX, "#223324"]}
        position={[0, -0.02, -1.2]}
      />
      {blades.map((blade, index) => (
        <mesh
          key={`${blade.x}-${blade.z}-${index}`}
          position={[blade.x, blade.h / 2, blade.z]}
          rotation={[0, blade.r, 0.2 - blade.r]}
        >
          <boxGeometry args={[0.035, blade.h, 0.035]} />
          <meshStandardMaterial color={index % 4 ? SHADER_NEON_HEX : "#d8ff35"} />
        </mesh>
      ))}
    </group>
  );
}

function SceneFallback() {
  return (
    <Html center>
      <span className="scene-loading">Loading model</span>
    </Html>
  );
}

export default function MakerScene() {
  const root = useRef(null);
  const isMobile = useIsMobile();
  const sceneActive = useSceneVisibility(root);

  return (
    <div ref={root} className="maker-scene" aria-label="Animated Chainsawman maker scene">
      <Canvas
        className="maker-canvas"
        frameloop={sceneActive ? "always" : "demand"}
        performance={{ min: 0.5 }}
        dpr={isMobile ? [0.75, 1] : [1, 1.25]}
        camera={{
          position: isMobile ? [0, 0.82, 6.4] : [0.52, 0.86, 5.8],
          fov: isMobile ? 42 : 38,
          near: 0.1,
          far: 70,
        }}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={[SHADER_BASE_HEX]} />
        <fog attach="fog" args={[SHADER_BASE_HEX, 7.5, 17]} />
        <ambientLight intensity={0.72} />
        <directionalLight
          castShadow
          position={[3.8, 5.5, 4.2]}
          intensity={2.35}
          color="#f5ff7a"
        />
        <pointLight position={[-3.2, 1.4, 2.5]} intensity={1.45} color="#ff4f86" />
        <pointLight position={[2.8, 0.5, 2.4]} intensity={1.2} color={SHADER_NEON_HEX} />
        <Suspense fallback={<SceneFallback />}>
          <CameraRig isMobile={isMobile} />
          <SceneShaderBackdrop />
          <WorkbenchGrid isMobile={isMobile} />
          <ChainsawmanModel isMobile={isMobile} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/assets/chainsawmangrave.glb");
