# ========================================
# Stage 1: フロントエンドのビルド
# ========================================
FROM node:20-slim AS frontend-builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . . 
RUN npm run build

# ========================================
# Stage 2: 本番環境
# ========================================
FROM julia:1.11

# Node.jsインストール（軽量版）
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g serve && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Julia依存関係
COPY Project.toml Manifest.toml ./
RUN julia --project=. -e 'using Pkg; Pkg.instantiate(); Pkg.precompile()'

# Juliaコード
COPY src/ ./src/
COPY test/ ./test/

# ビルド済みフロントエンド
COPY --from=frontend-builder /app/dist ./dist

# 起動スクリプト
COPY docker-entrypoint-prod.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV PORT=8080
EXPOSE 8080

CMD ["/docker-entrypoint. sh"]