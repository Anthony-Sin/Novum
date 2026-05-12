import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Text, Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

export function ThreeDocument({ analyzing }: { analyzing: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (analyzing ? 0.5 : 0.1);
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef}>
        <boxGeometry args={[2, 2.8, 0.1]} />
        <MeshDistortMaterial
          color={analyzing ? "#3a6d73" : "#f0ead6"} // accent vs beige
          envMapIntensity={1}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          metalness={0.5}
          roughness={0.2}
          distort={analyzing ? 0.3 : 0}
          speed={analyzing ? 4 : 1}
        />

        {/* Simple text abstraction for document */}
        <Text
          position={[0, 0, 0.06]}
          fontSize={0.2}
          color="#1a1a1a" // ink
          anchorX="center"
          anchorY="middle"
        >
          Research Document
        </Text>
        <Text
          position={[0, -0.4, 0.06]}
          fontSize={0.1}
          color="#1a1a1a" // ink
          anchorX="center"
          anchorY="middle"
          opacity={0.6}
        >
          {analyzing ? "Analyzing Methodologies..." : "Ready for Forensics"}
        </Text>

      </mesh>
    </Float>
  );
}
