import React, { useState, useRef } from 'react';
import Draggable from 'react-draggable';
import RubikVisualizer from './visualize';

function App() {
  const nodeRef = useRef(null);
  // 入力した手順を保持するステート
  const [moves, setMoves] = useState<string[]>([]);

  // ボタンを押した時の処理
  const addMove = (move: string) => {
    setMoves(prev => [...prev, move]);
    console.log(`Current Sequence: ${moves.join(' ')} ${move}`);
  };

  // 手順をリセットする
  const clearMoves = () => setMoves([]);

  // Julia側へ命令を送信する（後述のAPIを利用）
  const executeMoves = async () => {
    if (moves.length === 0) return;

    try {
      const response = await fetch('http://localhost:8080/apply-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: moves })
      });

      if (response.ok) {
        console.log("Moves applied successfully!");
        clearMoves(); // 入力履歴をクリア
        
        // ここで画面をリロード、あるいは state を更新して描画を反映させる
        window.location.reload(); // 最も簡単な反映方法
      }
    } catch (error) {
      console.error("Failed to send moves to Julia:", error);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#222', color: 'white' }}>
      <header style={{ padding: '10px 20px', background: '#333', borderBottom: '1px solid #444' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Rubik Solver: Julia-GAP × React</h1>
      </header>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <RubikVisualizer />

        <Draggable nodeRef={nodeRef} handle=".drag-handle">
          <div ref={nodeRef} style={{ 
            position: 'absolute', top: '20px', right: '20px', 
            background: 'rgba(10, 10, 10, 0.85)', padding: '15px', 
            borderRadius: '12px', zIndex: 100, width: '220px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #444'
          }}>
            {/* ドラッグハンドル (image_9c259b.png風) */}
            <div className="drag-handle" style={{ 
              width: '100%', height: '24px', background: '#333', borderRadius: '6px', 
              marginBottom: '12px', cursor: 'grab', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', color: '#666'
            }}>
              <span style={{ fontSize: '12px' }}>⠿</span>
            </div>

            {/* 入力履歴表示エリア (追加) */}
            <div style={{ 
              background: '#000', padding: '8px', borderRadius: '4px', 
              marginBottom: '12px', minHeight: '40px', fontSize: '14px',
              fontFamily: 'monospace', color: '#0f0', border: '1px solid #222',
              overflowWrap: 'break-word'
            }}>
              {moves.length > 0 ? moves.join(' ') : '> input moves...'}
            </div>

            {/* 回転ボタン群 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {['U', 'L', 'F', 'R', 'B', 'D'].map((m) => (
                <button key={m} onClick={() => addMove(m)} style={btnStyle}>{m}</button>
              ))}
            </div>

            {/* 実行・クリアボタン */}
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={clearMoves} style={{ ...actionBtnStyle, background: '#444' }}>Clear</button>
              <button onClick={executeMoves} style={{ ...actionBtnStyle, background: '#28a745' }}>Apply</button>
            </div>
            
            <button style={{ ...actionBtnStyle, background: '#007bff', width: '100%', marginTop: '8px' }}>
              Solve Puzzle
            </button>
          </div>
        </Draggable>
      </div>
    </div>
  );
}

// スタイル定数
const btnStyle = {
  padding: '12px 0', cursor: 'pointer', background: '#333', color: 'white',
  border: '1px solid #444', borderRadius: '8px', fontWeight: 'bold' as const,
  fontSize: '16px', transition: 'background 0.2s'
};

const actionBtnStyle = {
  padding: '10px', cursor: 'pointer', color: 'white', border: 'none',
  borderRadius: '6px', fontWeight: 'bold' as const, fontSize: '14px'
};

export default App;