import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

interface CubeletData {
  x: number;
  y: number;
  z: number;
  id: string;
}

interface Props {
  sequence: string[];
}

const initialPositions: CubeletData[] = []; 

for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      initialPositions.push({ x, y, z, id: `${x}${y}${z}` });
    }
  }
}

export default function RubikVisualizer({ sequence }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  console.log("3. RubikVisualizer is called with seq:", sequence);
  return (
    <Canvas camera={{ position: [5, 5, 5] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <group ref={groupRef}>
        {initialPositions.map((pos) => (
          <Cubelet key={pos.id} position={[pos.x, pos.y, pos.z]} />
        ))}
      </group>
      <OrbitControls />
    </Canvas>
  );
}

function Cubelet({ position }: { position: [number, number, number] }) {
  const colors = ['#B71234', '#FF5800', '#FFFFFF', '#FFD500', '#009B48', '#0046AD'];
  return (
    <mesh position={position}>
      <boxGeometry args={[0.92, 0.92, 0.92]} />
      {colors.map((col, i) => (
        <meshStandardMaterial key={i} attach={`material-${i}`} color={col} roughness={0.1} />
      ))}
    </mesh>
  );
}