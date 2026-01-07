#!/bin/bash
set -e  # エラーが起きたら即座に停止

echo "🎲 Starting Rubik Cube Solver..."

# Juliaバックエンドをバックグラウンドで起動
echo "Starting Julia backend on port 8080..."
julia --project=. src/backend/server.jl &
JULIA_PID=$! 

# バックエンドの起動を待つ
sleep 5

# フロントエンドの静的ファイルを配信
echo "Starting frontend on port 5173..."
serve -s dist -l 5173 -n

# serveが終了したら、Juliaプロセスも終了
kill $JULIA_PID 2>/dev/null || true