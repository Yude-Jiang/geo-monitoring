#!/usr/bin/env bash
# Cloud Run 一键部署脚本 (在 Cloud Shell 运行)
# 用法:  bash deploy.sh
set -euo pipefail

PROJECT_ID="st-china-ai-force"
REGION="asia-east1"
SERVICE="geo-monitoring"
AR_REPO="geo-monitoring"
IMAGE="asia-east1-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/app:latest"
DEEPSEEK_SECRET_NAME="VITE_DEEPSEEK_API_KEY"

echo "▶ 使用项目: ${PROJECT_ID}, 区域: ${REGION}"
gcloud config set project "${PROJECT_ID}"

# 1. 启用所需 API
echo "▶ 启用 API..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com

# 2. 创建 Artifact Registry 仓库(已存在则跳过)
echo "▶ 创建 Artifact Registry 仓库..."
gcloud artifacts repositories create "${AR_REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --quiet 2>/dev/null || echo "  (仓库已存在, 跳过)"

# 3. 授权 Cloud Build 推送镜像
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/artifactregistry.writer" \
  --quiet 2>/dev/null || true

# 4. 云端构建镜像
echo "▶ 提交 Cloud Build..."
gcloud builds submit --config cloudbuild.yaml .

# 5. 授权 Cloud Run 运行时账号读取 Secret
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "▶ 授权运行时账号读取 DeepSeek Secret..."
gcloud secrets add-iam-policy-binding "${DEEPSEEK_SECRET_NAME}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet 2>/dev/null || true

# 6. 部署到 Cloud Run
echo "▶ 部署 Cloud Run 服务..."
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 1 \
  --timeout 300 \
  --set-env-vars "HEADLESS=true,LLM_PROVIDER=deepseek" \
  --set-secrets "DEEPSEEK_API_KEY=${DEEPSEEK_SECRET_NAME}:latest"

# 7. 输出结果
SERVICE_URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)')"
echo ""
echo "✅ 部署完成: ${SERVICE_URL}"
echo ""
curl -s "${SERVICE_URL}/api/health" && echo ""
echo ""
echo "⚠️  注意: 当前数据存储在容器本地 SQLite (DATA_DIR=/app/data)。"
echo "    容器重启后数据会丢失。初次测试可接受，生产环境需挂载持久存储。"
