import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

import cubeConfig from '../config/config.json';
import displaySettings from '../config/display.json';


const FACE_LABELS: Record<number, string> = { 0: "R", 1: "L", 2: "U", 3: "D", 4: "F", 5: "B" };

function getColorByStickerId(stickerId: number): string {
  const mapping = cubeConfig.sticker_mapping;
  const colors = displaySettings.colors as any;
  for (const [face, ids] of Object.entries(mapping)) {
    if ((ids as number[]).includes(stickerId)) return colors[face];
  }
  return colors.Internal;
}

function getStickerPlaceIndex(x: number, y: number, z: number, faceIdx: number): number | null {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rz = Math.round(z);

  if (faceIdx === 2 && ry === 1) { // U
    const mapping = [[-1,-1, 1], [0,-1, 2], [1,-1, 3], [-1,0, 4], [1,0, 5], [-1,1, 6], [0,1, 7], [1,1, 8]];
    return mapping.find(m => m[0] === rx && m[1] === rz)?.[2] || null;
  }
  if (faceIdx === 1 && rx === -1) { // L
    const mapping = [[-1,1,-1, 9], [-1,1,0, 10], [-1,1,1, 11], [-1,0,-1, 12], [-1,0,1, 13], [-1,-1,-1, 14], [-1,-1,0, 15], [-1,-1,1, 16]];
    return mapping.find(m => m[0] === rx && m[1] === ry && m[2] === rz)?.[3] || null;
  }
  if (faceIdx === 4 && rz === 1) { // F
    const mapping = [[-1,1, 17], [0,1, 18], [1,1, 19], [-1,0, 20], [1,0, 21], [-1,-1, 22], [0,-1, 23], [1,-1, 24]];
    return mapping.find(m => m[0] === rx && m[1] === ry)?.[2] || null;
  }
  if (faceIdx === 0 && rx === 1) { // R
    const mapping = [[1,1,1, 25], [1,1,0, 26], [1,1,-1, 27], [1,0,1, 28], [1,0,-1, 29], [1,-1,1, 30], [1,-1,0, 31], [1,-1,-1, 32]];
    return mapping.find(m => m[0] === rx && m[1] === ry && m[2] === rz)?.[3] || null;
  }
  if (faceIdx === 5 && rz === -1) { // B
    const mapping = [[1,1, 33], [0,1, 34], [-1,1, 35], [1,0, 36], [-1,0, 37], [1,-1, 38], [0,-1, 39], [-1,-1, 40]];
    return mapping.find(m => m[0] === rx && m[1] === ry)?.[2] || null; // バグ修正: yではなくz判定
  }
  if (faceIdx === 3 && ry === -1) { // D
    const mapping = [[-1,1, 41], [0,1, 42], [1,1, 43], [-1,0, 44], [1,0, 45], [-1,-1, 46], [0,-1, 47], [1,-1, 48]];
    return mapping.find(m => m[0] === rx && m[1] === rz)?.[2] || null;
  }
  return null;
}


const Cubelet = React.memo(({ position, state, activeMove, rotationAngle }: any) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [x, y, z] = position;
  const { colors, view } = displaySettings;

  const faceMaterials = useMemo(() => {
    const internalCol = colors.Internal;
    if (!state || state.length === 0) return Array(6).fill(internalCol);

    return [0, 1, 2, 3, 4, 5].map(idx => {
      const isOutside = (idx === 0 && x === 1) || (idx === 1 && x === -1) || 
                        (idx === 2 && y === 1) || (idx === 3 && y === -1) || 
                        (idx === 4 && z === 1) || (idx === 5 && z === -1);
      
      if (!isOutside) return internalCol;

      const placeIdx = getStickerPlaceIndex(x, y, z, idx);
      if (placeIdx !== null && state[placeIdx - 1]) {
        return getColorByStickerId(state[placeIdx - 1]);
      }
      return (colors as any)[FACE_LABELS[idx]] || internalCol;
    });
  }, [state, x, y, z]);

  useFrame(() => {
    if (!meshRef.current) return;
    const m = new THREE.Matrix4().makeTranslation(x, y, z);
    
    if (activeMove) {
      const face = activeMove[0];
      const isTarget = (face === 'U' && y === 1) || (face === 'D' && y === -1) || 
                       (face === 'R' && x === 1) || (face === 'L' && x === -1) || 
                       (face === 'F' && z === 1) || (face === 'B' && z === -1);

      if (isTarget) {
        const rotM = new THREE.Matrix4();
        const isInv = activeMove.includes("-") || activeMove.includes("'");
        const angle = isInv ? -rotationAngle : rotationAngle;

        if (face === 'U') rotM.makeRotationY(-angle);
        else if (face === 'D') rotM.makeRotationY(angle);
        else if (face === 'R') rotM.makeRotationX(-angle);
        else if (face === 'L') rotM.makeRotationX(angle);
        else if (face === 'F') rotM.makeRotationZ(-angle);
        else if (face === 'B') rotM.makeRotationZ(angle);
        m.premultiply(rotM);
      }
    }
    meshRef.current.matrix.copy(m);
  });

  return (
    <mesh ref={meshRef} matrixAutoUpdate={false}>
      {/* JSONの sticker_size を使用 */}
      <boxGeometry args={[view.sticker_size, view.sticker_size, view.sticker_size]} />
      {faceMaterials.map((col, i) => (
        <meshLambertMaterial key={i} attach={`material-${i}`} color={col} />
      ))}
    </mesh>
  );
});

const MovingGroup = (props: any) => {
  const [activeMove, setActiveMove] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const queueRef = useRef<string[]>([]);

  useEffect(() => {
    if (props.moveQueue.length > 0) {
      queueRef.current = [...queueRef.current, ...props.moveQueue];
      props.onAnimationComplete();
    }
  }, [props.moveQueue]);

  useFrame((_, delta) => {
    if (!activeMove && queueRef.current.length > 0) {
      setActiveMove(queueRef.current.shift()!);
      setRotationAngle(0);
    }
    if (activeMove) {
      const totalRotation = Math.PI / 2;
      const speed = totalRotation / (props.animationSpeed / 1000);
      const nextAngle = rotationAngle + speed * delta;
      if (nextAngle >= totalRotation) {
        setActiveMove(null);
        setRotationAngle(0);
        props.onStepComplete?.();
      } else {
        setRotationAngle(nextAngle);
      }
    }
  });

  const positions = useMemo(() => {
    const res = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++)
          res.push({ x, y, z, id: `${x}${y}${z}` });
    return res;
  }, []);

  return (
    <group>
      {positions.map(p => (
        <Cubelet key={p.id} position={[p.x, p.y, p.z]} {...props} activeMove={activeMove} rotationAngle={rotationAngle} />
      ))}
    </group>
  );
};

export default function RubikVisualizer(props: any) {
  const { lighting, view } = displaySettings;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={view.camera_position as any} />
        <color attach="background" args={[view.background_color]} />
        
        <ambientLight intensity={lighting.ambient_intensity} /> 
        <pointLight 
          position={lighting.point_light_position as any} 
          intensity={lighting.point_intensity} 
        />

        <MovingGroup {...props} />
        <OrbitControls enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  );
}