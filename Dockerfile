# ========================================
# Stage 1: フロントエンドのビルド
# ========================================
FROM node:20-slim AS frontend-builder

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package.json package-lock.json ./

# 依存関係をインストール
RUN npm install

# vite.config.tsなど設定ファイルをコピー
COPY vite.config.ts ./

# ソースコードをコピー
COPY index.html ./
COPY main.tsx ./
COPY src/ ./src/

# ビルド実行
RUN npm run build

# ========================================
# Stage 2: 本番環境
# ========================================
FROM julia: 1.12

# Node.jsとserveをインストール
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g serve && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Julia依存関係
COPY Project.toml Manifest.toml ./
RUN julia --project=.  -e 'using Pkg; Pkg.instantiate(); Pkg.precompile()'

# Juliaソースコード
COPY src/ ./src/
COPY test/ ./test/

# ビルド済みフロントエンド（Stage 1から）
COPY --from=frontend-builder /app/dist ./dist

# 起動スクリプト
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV PORT=8080
EXPOSE 8080 5173

CMD ["/docker-entrypoint.sh"]