import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import cubeConfig from '../config/config.json';
import displaySettings from '../config/display.json';

const FACE_LABELS: Record<number, string> = { 0: "R", 1: "L", 2: "U", 3: "D", 4: "F", 5: "B" };

const initialPositions: {x: number, y: number, z: number, id: string}[] = [];
for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      initialPositions.push({ x, y, z, id: `${x}${y}${z}` });
    }
  }
}

function getStickerPlaceIndex(x: number, y: number, z: number, faceIdx: number): number | null {
  if (x === 0 && y === 0 && z === 0) return null;
  if (faceIdx === 2 && y === 1) { // U
    const mapping = [[-1,-1, 1], [0,-1, 2], [1,-1, 3], [-1,0, 4], [1,0, 5], [-1,1, 6], [0,1, 7], [1,1, 8]];
    return mapping.find(m => m[0] === x && m[1] === z)?.[2] || null;
  }
  if (faceIdx === 1 && x === -1) { // L
    const mapping = [[-1,1,-1, 9], [-1,1,0, 10], [-1,1,1, 11], [-1,0,-1, 12], [-1,0,1, 13], [-1,-1,-1, 14], [-1,-1,0, 15], [-1,-1,1, 16]];
    return mapping.find(m => m[0] === x && m[1] === y && m[2] === z)?.[3] || null;
  }
  if (faceIdx === 4 && z === 1) { // F
    const mapping = [[-1,1, 17], [0,1, 18], [1,1, 19], [-1,0, 20], [1,0, 21], [-1,-1, 22], [0,-1, 23], [1,-1, 24]];
    return mapping.find(m => m[0] === x && m[1] === y)?.[2] || null;
  }
  if (faceIdx === 0 && x === 1) { // R
    const mapping = [[1,1,1, 25], [1,1,0, 26], [1,1,-1, 27], [1,0,1, 28], [1,0,-1, 29], [1,-1,1, 30], [1,-1,0, 31], [1,-1,-1, 32]];
    return mapping.find(m => m[0] === x && m[1] === y && m[2] === z)?.[3] || null;
  }
  if (faceIdx === 5 && z === -1) { // B
    const mapping = [[1,1, 33], [0,1, 34], [-1,1, 35], [1,0, 36], [-1,0, 37], [1,-1, 38], [0,-1, 39], [-1,-1, 40]];
    return mapping.find(m => m[0] === x && m[1] === y)?.[2] || null;
  }
  if (faceIdx === 3 && y === -1) { // D
    const mapping = [[-1,1, 41], [0,1, 42], [1,1, 43], [-1,0, 44], [1,0, 45], [-1,-1, 46], [0,-1, 47], [1,-1, 48]];
    return mapping.find(m => m[0] === x && m[1] === z)?.[2] || null;
  }
  return null;
}

function getColorByStickerId(stickerId: number): string {
  const mapping = cubeConfig.sticker_mapping;
  const colors = displaySettings.colors as any;
  for (const [face, ids] of Object.entries(mapping)) {
    if ((ids as number[]).includes(stickerId)) return colors[face];
  }
  return colors.Internal;
}

const Cubelet = React.memo(({ position, state, activeMove, rotationAngle }: any) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [x, y, z] = position;
  const colors = displaySettings.colors as any;

  const rotationMatrix = useMemo(() => {
    const mat = new THREE.Matrix4();
    if (!activeMove) return mat;
    const m = activeMove[0];
    
    const isTarget = (m === 'U' && y === 1) || (m === 'D' && y === -1) || 
                     (m === 'R' && x === 1) || (m === 'L' && x === -1) || 
                     (m === 'F' && z === 1) || (m === 'B' && z === -1);
    if (!isTarget) return mat;

    const baseAngle = activeMove.includes("'") || activeMove.includes("-") ? -rotationAngle : rotationAngle;

    if (m === 'U') mat.makeRotationY(-baseAngle);
    else if (m === 'D') mat.makeRotationY(baseAngle); 

    else if (m === 'R') mat.makeRotationX(-baseAngle);
    else if (m === 'L') mat.makeRotationX(baseAngle);

    else if (m === 'F') mat.makeRotationZ(-baseAngle);
    else if (m === 'B') mat.makeRotationZ(baseAngle);
    return mat;
  }, [activeMove, rotationAngle, x, y, z]);

  useFrame(() => {
    if (meshRef.current) {
      const m = new THREE.Matrix4().makeTranslation(x, y, z).premultiply(rotationMatrix);
      meshRef.current.matrix.copy(m);
      meshRef.current.matrixWorldNeedsUpdate = true;
    }
  });

  const faceMaterials = useMemo(() => {
    if (!state || state.length === 0) return Array(6).fill(colors.Internal);
    return [0, 1, 2, 3, 4, 5].map(idx => {
      const isOutside = (idx === 0 && x === 1) || (idx === 1 && x === -1) || (idx === 2 && y === 1) || (idx === 3 && y === -1) || (idx === 4 && z === 1) || (idx === 5 && z === -1);
      if (!isOutside) return colors.Internal;

      const placeIdx = getStickerPlaceIndex(x, y, z, idx);
      if (placeIdx !== null) return getColorByStickerId(state[placeIdx - 1]);
      
      // センターパーツの色を解決
      return colors[FACE_LABELS[idx]] || colors.Internal;
    });
  }, [state, x, y, z, colors]);

  return (
    <mesh ref={meshRef} matrixAutoUpdate={false}>
      <boxGeometry args={[displaySettings.view.sticker_size, displaySettings.view.sticker_size, displaySettings.view.sticker_size]} />
      {faceMaterials.map((col, i) => (
        <meshStandardMaterial key={i} attach={`material-${i}`} color={col} roughness={0.1} />
      ))}
    </mesh>
  );
});

const MovingGroup = ({ state, moveQueue, animationSpeed, onAnimationComplete, onStepComplete }: any) => {
  const [activeMove, setActiveMove] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const queueRef = useRef<string[]>([]);

  useEffect(() => {
    if (moveQueue.length > 0) {
      queueRef.current = [...queueRef.current, ...moveQueue];
      onAnimationComplete();
    }
  }, [moveQueue]);

useFrame((_, delta) => {
    if (!activeMove && queueRef.current.length > 0) {
      setActiveMove(queueRef.current.shift()!);
      setRotationAngle(0);
    }

    if (activeMove) {
      setRotationAngle(prev => {
        /* 物理計算: 
           全角度 = PI / 2 (90度)
           全時間 = animationSpeed / 1000 (秒)
           1フレームの進み = (全角度 / 全時間) * delta
        */
        const totalRotation = Math.PI / 2;
        const totalTimeSeconds = animationSpeed / 1000;
        const angularVelocity = totalRotation / totalTimeSeconds;
        
        const next = prev + angularVelocity * delta; // 指定時間でピッタリ終わる速度

        if (next >= totalRotation) {
          setActiveMove(null);
          onStepComplete?.(); // ここでApp側の色更新をキックする
          return 0;
        }
        return next;
      });
    }
  });

  return (
    <group>
      {initialPositions.map(pos => (
        <Cubelet key={pos.id} position={[pos.x, pos.y, pos.z]} state={state} activeMove={activeMove} rotationAngle={rotationAngle} />
      ))}
    </group>
  );
};

export default function RubikVisualizer(props: any) {
  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: displaySettings.view.background_color }}>
      <Canvas camera={{ position: displaySettings.view.camera_position as any }}>
        <color attach="background" args={[displaySettings.view.background_color]} />
        <ambientLight intensity={displaySettings.lighting.ambient_intensity} /> 
        <pointLight position={displaySettings.lighting.point_light_position as any} intensity={displaySettings.lighting.point_intensity} />
        <MovingGroup {...props} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}