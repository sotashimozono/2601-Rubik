FROM julia:1.12

# Node.jsインストール
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app

# Julia依存関係をキャッシュ
COPY Project. toml Manifest.toml ./
RUN julia --project=.  -e 'using Pkg; Pkg.instantiate(); Pkg.precompile()'

# Node依存関係
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションコード
COPY . .

# フロントエンドビルド
RUN npm run build

# ポート設定
ENV PORT=8080
EXPOSE 8080

# 起動スクリプト
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]