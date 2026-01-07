#!/bin/bash
set -e

julia --project=. src/backend/server.jl &
npx vite preview --host 0.0.0.0 --port ${PORT:-8080}