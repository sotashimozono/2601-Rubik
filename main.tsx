import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './src/frontend/App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

console.log("1. main.tsx has started"); // これを追加