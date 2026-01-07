#!/bin/bash
set -e

echo "Starting Rubik Cube Solver (Production Mode)..."

# Juliaバックエンド起動（バックグラウンド）
echo "Starting Julia backend on port 8080..."
julia --project=. src/backend/server.jl &
JULIA_PID=$!

# 少し待つ
sleep 5

# 静的ファイル配信（ポート5173）
echo "Serving static frontend on port 5173..."
serve -s dist -l 5173 &
SERVE_PID=$!

echo "✅ Application started successfully!"
echo "   - Backend: http://localhost:8080"
echo "   - Frontend: http://localhost:5173"

# プロセス監視
wait $JULIA_PID $SERVE_PID

# クリーンアップ
trap "kill $JULIA_PID $SERVE_PID 2>/dev/null" EXIT