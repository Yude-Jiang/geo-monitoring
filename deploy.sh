#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Cloud Run 一键部署脚本 (在 Cloud Shell 运行)
# 用法:  bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── 配置 ─────────────────────────────────────────────────────────────────────
PROJECT_ID="st-china-ai-force"
REGION="asia-east1"
SERVICE="geo-monitoring"
AR_REPO="geo-monitoring"
IMAGE="asia-east1-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/app:latest"

# DeepSeek API Key 所在的 Secret 名(你已创建好)
DEEPSEEK_SECRET_NAME="VITE_DEEPSEEK_API_KEY"

echo "▶ 使用项目: ${PROJECT_ID}, 区域: ${REGION}"
gcloud config set project "${PROJECT_ID}"

# ── 1. 启用所需 API ──────────────────────────────────────────────────────────
echo "▶ 启用 API (cloudbuild / run / secretmanager / artifactregistry)..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com

# ── 2. 创建 Artifact Registry 仓库(已存在则跳过) ────────────────────────────
echo "▶ 创建 Artifact Registry 仓库 (已存在则跳过)..."
gcloud artifacts repositories create "${AR_REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="geo-monitoring docker images" \
  --quiet 2>/dev/null || echo "  (仓库已存在, 跳过)"

# 授权 Cloud Build 服务账号推送到 Artifact Registry
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
echo "▶ 授权 Cloud Build 账号推送镜像..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/artifactregistry.writer" \
  --quiet 2>/dev/null || true

# ── 3. 云端构建镜像(含 Firebase 前端配置) ────────────────────────────────────
echo "▶ 提交 Cloud Build..."
gcloud builds submit --config cloudbuild.yaml .

# ── 4. 授权 Cloud Run 运行时服务账号读取 Secret ──────────────────────────────
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "▶ 授权 ${RUNTIME_SA} 读取 Secret..."
gcloud secrets add-iam-policy-binding "${DEEPSEEK_SECRET_NAME}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet || echo "  (绑定可能已存在, 跳过)"

# ── 5. 部署到 Cloud Run ──────────────────────────────────────────────────────
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

# ── 6. 输出地址并做基础测试 ──────────────────────────────────────────────────
SERVICE_URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)')"
echo ""
echo "✅ 部署完成: ${SERVICE_URL}"
echo ""
echo "▶ 健康检查:"
curl -s "${SERVICE_URL}/api/health" && echo ""
echo ""
echo "▶ 登录状态检查 (关键! 看海外 IP 重放登录态各平台认不认):"
echo "   curl -s ${SERVICE_URL}/api/login-status"
echo ""
echo "   首次部署应全部为 false(还没注入登录 cookie)。"
echo "   要注入登录态, 见 README 的「会话移植」步骤。"
