import React, { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// --- 1. データのロード ---
import cubeConfig from '../config/config.json';
import displaySettings from '../config/display.json';
import solveState from '../config/solve.json';

// --- 2. 座標と定数の準備 ---
const FACE_LABELS: Record<number, string> = {
  0: "R", 1: "L", 2: "U", 3: "D", 4: "F", 5: "B"
};

// 全27個の小立方体の位置を生成 (エラー解消: initialPositions)
const initialPositions: {x: number, y: number, z: number, id: string}[] = [];
for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      initialPositions.push({ x, y, z, id: `${x}${y}${z}` });
    }
  }
}

/**
 * 3D座標から1-48の場所IDを計算する関数 (エラー解消: getStickerPlaceIndex)
 */
function getStickerPlaceIndex(x: number, y: number, z: number, faceIdx: number): number | null {
  if (x === 0 && y === 0 && z === 0) return null;

  if (faceIdx === 2 && y === 1) { // U面 (+y)
    const mapping = [[-1,-1, 1], [0,-1, 2], [1,-1, 3], [-1,0, 4], [1,0, 5], [-1,1, 6], [0,1, 7], [1,1, 8]];
    return mapping.find(m => m[0] === x && m[1] === z)?.[2] || null;
  }
  if (faceIdx === 1 && x === -1) { // L面 (-x)
    const mapping = [[-1,1,-1, 9], [-1,1,0, 10], [-1,1,1, 11], [-1,0,-1, 12], [-1,0,1, 13], [-1,-1,-1, 14], [-1,-1,0, 15], [-1,-1,1, 16]];
    return mapping.find(m => m[0] === x && m[1] === y && m[2] === z)?.[3] || null;
  }
  if (faceIdx === 4 && z === 1) { // F面 (+z)
    const mapping = [[-1,1, 17], [0,1, 18], [1,1, 19], [-1,0, 20], [1,0, 21], [-1,-1, 22], [0,-1, 23], [1,-1, 24]];
    return mapping.find(m => m[0] === x && m[1] === y)?.[2] || null;
  }
  if (faceIdx === 0 && x === 1) { // R面 (+x)
    const mapping = [[1,1,1, 25], [1,1,0, 26], [1,1,-1, 27], [1,0,1, 28], [1,0,-1, 29], [1,-1,1, 30], [1,-1,0, 31], [1,-1,-1, 32]];
    return mapping.find(m => m[0] === x && m[1] === y && m[2] === z)?.[3] || null;
  }
  if (faceIdx === 5 && z === -1) { // B面 (-z)
    const mapping = [[1,1, 33], [0,1, 34], [-1,1, 35], [1,0, 36], [-1,0, 37], [1,-1, 38], [0,-1, 39], [-1,-1, 40]];
    return mapping.find(m => m[0] === x && m[1] === y)?.[2] || null;
  }
  if (faceIdx === 3 && y === -1) { // D面 (-y)
    const mapping = [[-1,1, 41], [0,1, 42], [1,1, 43], [-1,0, 44], [1,0, 45], [-1,-1, 46], [0,-1, 47], [1,-1, 48]];
    return mapping.find(m => m[0] === x && m[1] === z)?.[2] || null;
  }
  return null;
}

/**
 * 背番号から表示色を解決する
 */
function getColorByStickerId(stickerId: number): string {
  const mapping = cubeConfig.sticker_mapping;
  const colors = displaySettings.colors as any;
  for (const [face, ids] of Object.entries(mapping)) {
    if ((ids as number[]).includes(stickerId)) return colors[face];
  }
  return colors.Internal;
}

// --- 3. サブコンポーネント ---

function Cubelet({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  const { sticker_size } = displaySettings.view;
  const colors = displaySettings.colors as any;

  const faceMaterials = useMemo(() => {
    return [0, 1, 2, 3, 4, 5].map((faceIdx) => {
      const label = FACE_LABELS[faceIdx];

      // 外側判定
      const isOutside = 
        (faceIdx === 0 && x === 1) || (faceIdx === 1 && x === -1) ||
        (faceIdx === 2 && y === 1) || (faceIdx === 3 && y === -1) ||
        (faceIdx === 4 && z === 1) || (faceIdx === 5 && z === -1);

      if (!isOutside) return colors.Internal;

      // 中心パーツの固定色 (displaySettings.colors から取得)
      const isCenterPiece = (Math.abs(x) + Math.abs(y) + Math.abs(z)) === 1;
      if (isCenterPiece) return colors[label];

      // 周囲のステッカー
      const placeIdx = getStickerPlaceIndex(x, y, z, faceIdx);
      if (placeIdx !== null) {
        const stickerId = solveState.current[placeIdx - 1];
        return getColorByStickerId(stickerId);
      }
      return colors.Internal;
    });
  }, [position]);

  return (
    <mesh position={position}>
      <boxGeometry args={[sticker_size, sticker_size, sticker_size]} />
      {faceMaterials.map((col, i) => (
        <meshStandardMaterial key={i} attach={`material-${i}`} color={col} roughness={0.1} />
      ))}
    </mesh>
  );
}

// --- 4. メインコンポーネント ---
// visualize.tsx の RubikVisualizer コンポーネント部分を修正

export default function RubikVisualizer() {
  const { ambient_intensity, point_intensity, point_light_position } = displaySettings.lighting;
  const { camera_position, background_color } = displaySettings.view; // background_colorを取得

  return (
    /* 外側のdivの背景色も連動させると、Canvas読み込み前後の違和感がなくなります */
    <div style={{ width: '100vw', height: '100vh', backgroundColor: background_color }}>
      <Canvas camera={{ position: camera_position as [number, number, number] }}>
        
        {/* --- ここを追加 --- */}
        <color attach="background" args={[background_color]} />
        {/* ------------------ */}

        <ambientLight intensity={ambient_intensity} /> 
        <pointLight 
          position={point_light_position as [number, number, number]} 
          intensity={point_intensity} 
        />
        <group>
          {initialPositions.map((pos) => (
            <Cubelet key={pos.id} position={[pos.x, pos.y, pos.z]} />
          ))}
        </group>
        <OrbitControls />
      </Canvas>
    </div>
  );
}