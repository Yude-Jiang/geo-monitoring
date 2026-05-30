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
DATA_BUCKET="${PROJECT_ID}-geo-data"
GCS_MOUNT="/mnt/gcs-data"

echo "▶ 使用项目: ${PROJECT_ID}, 区域: ${REGION}"
gcloud config set project "${PROJECT_ID}"

# 1. 启用所需 API
echo "▶ 启用 API..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com

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

# 6. 创建 GCS 数据桶并授权 (已存在则跳过)
echo "▶ 创建 GCS 持久化数据桶: gs://${DATA_BUCKET} ..."
gcloud storage buckets create "gs://${DATA_BUCKET}" \
  --location="${REGION}" \
  --uniform-bucket-level-access \
  --quiet 2>/dev/null || echo "  (桶已存在, 跳过)"

echo "▶ 授权 Cloud Run SA 读写数据桶..."
gcloud storage buckets add-iam-policy-binding "gs://${DATA_BUCKET}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectAdmin" \
  --quiet 2>/dev/null || true

# 7. 创建/读取分布式采集的 ingest 共享密钥 (节点用它推送数据到中央)
INGEST_SECRET_NAME="geo-monitoring-ingest-token"
if ! gcloud secrets describe "${INGEST_SECRET_NAME}" >/dev/null 2>&1; then
  echo "▶ 生成 ingest 共享密钥..."
  openssl rand -hex 24 | gcloud secrets create "${INGEST_SECRET_NAME}" --data-file=-
fi
gcloud secrets add-iam-policy-binding "${INGEST_SECRET_NAME}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet 2>/dev/null || true

# 8. 部署到 Cloud Run (gen2 执行环境支持 GCS FUSE 挂载)
echo "▶ 部署 Cloud Run 服务..."
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --execution-environment gen2 \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 1 \
  --timeout 300 \
  --set-env-vars "HEADLESS=true,LLM_PROVIDER=deepseek,DATA_DIR=${GCS_MOUNT},INGEST_USERNAME=admin" \
  --set-secrets "DEEPSEEK_API_KEY=${DEEPSEEK_SECRET_NAME}:latest,INGEST_TOKEN=${INGEST_SECRET_NAME}:latest" \
  --add-volume "name=gcs-data,type=cloud-storage,bucket=${DATA_BUCKET}" \
  --add-volume-mount "volume=gcs-data,mount-path=${GCS_MOUNT}"

# 9. 输出结果
SERVICE_URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)')"
INGEST_TOKEN_VALUE="$(gcloud secrets versions access latest --secret="${INGEST_SECRET_NAME}")"
echo ""
echo "✅ 部署完成: ${SERVICE_URL}"
echo "   SQLite 数据持久化路径: gs://${DATA_BUCKET} (挂载至 ${GCS_MOUNT})"
echo ""
echo "📡 分布式采集节点配置 (填入各节点的 start-node.ps1):"
echo "   CENTRAL_URL   = ${SERVICE_URL}"
echo "   INGEST_TOKEN  = ${INGEST_TOKEN_VALUE}"
echo "   (汇总账号 INGEST_USERNAME=admin, 请确保中央已注册 admin 账号)"
echo ""
curl -s "${SERVICE_URL}/api/health" && echo ""
