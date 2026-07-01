import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float iTime;
  uniform vec3 iAccent;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= 1.65;
    float r = length(uv);
    float fog = smoothstep(1.45, 0.12, r);
    float scan = sin((vUv.y + iTime * 0.035) * 360.0) * 0.014;
    float pressure = noise(uv * 4.0 + vec2(iTime * 0.035, -iTime * 0.02));
    float ring = smoothstep(0.012, 0.0, abs(r - 0.58 - sin(iTime * 0.13) * 0.03));
    vec3 base = vec3(0.02, 0.04, 0.05);
    vec3 color = base;
    color += iAccent * (fog * 0.06 + ring * 0.08);
    color += vec3(0.9, 0.97, 1.0) * pow(max(0.0, 1.0 - r), 4.0) * 0.08;
    color += vec3(scan + pressure * 0.02);
    float alpha = clamp(0.1 + fog * 0.12 + ring * 0.1, 0.0, 0.28);
    gl_FragColor = vec4(color, alpha);
  }
`;

function PressureDust({ quality }) {
  const points = useRef(null);
  const count = quality === "low" ? 90 : quality === "medium" ? 150 : 240;
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      values[i * 3] = (Math.random() - 0.5) * 10;
      values[i * 3 + 1] = Math.random() * 3.4 - 0.2;
      values[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
    }
    return values;
  }, [count]);

  useFrame(({ clock }) => {
    if (!points.current) return;
    points.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.08;
    points.current.position.y = Math.sin(clock.elapsedTime * 0.24) * 0.04;
  });

  return (
    <points ref={points} name="ActiveTheoryPressureDust">
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#dffdf7" size={0.018} transparent opacity={0.42} depthWrite={false} />
    </points>
  );
}

export default function ActiveTheoryVeil({ accent = "#5ff8e7", quality = "high" }) {
  const uniforms = useMemo(
    () => ({
      iTime: { value: 0 },
      iAccent: { value: new THREE.Color(accent) },
    }),
    [accent],
  );

  useFrame(({ clock }) => {
    uniforms.iTime.value = clock.elapsedTime;
    uniforms.iAccent.value.set(accent);
  });

  return (
    <group name="ActiveTheoryVeil" className="active-theory-veil">
      <mesh position={[0, 1.15, -4.2]} scale={[13.5, 8.2, 1]} renderOrder={-10}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <shaderMaterial
          depthTest={false}
          depthWrite={false}
          fragmentShader={fragmentShader}
          transparent
          uniforms={uniforms}
          vertexShader={vertexShader}
        />
      </mesh>
      <PressureDust quality={quality} />
    </group>
  );
}
