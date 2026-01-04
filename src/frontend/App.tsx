import React from 'react';
import RubikVisualizer from './visualize';

function App() {
  console.log("2. App component is rendering");
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      <RubikVisualizer sequence={[]} />
    </div>
  );
}

export default App;