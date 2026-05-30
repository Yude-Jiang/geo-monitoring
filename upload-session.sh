#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# 把本地导出的登录态 (session.json) 注入到 Cloud Run
#
# 前置: 在你「大陆的电脑」上(不是 Cloud Shell, 因为要弹浏览器登录):
#   1. git clone <repo> && cd geo-monitoring && git checkout claude/code-review-onmgz
#   2. npm install --legacy-peer-deps
#   3. npx playwright install chromium
#   4. (PowerShell) $env:HEADLESS="false"; npm run dev   # 弹浏览器手动登录各平台
#   5. (另开 PowerShell 窗口) 导出登录态:
#        $resp = Invoke-RestMethod -Uri http://localhost:8080/api/export-session -Method Post
#        $resp.session | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 session.json
#   6. 把 session.json 传到 Cloud Shell (右上角「⋮ → Upload」)
#
# 然后在 Cloud Shell 运行:  bash upload-session.sh session.json
#
# 注意: 登录态文件 (六平台 cookies+localStorage) 通常 >64KB, 超过 Secret Manager
#       单条上限, 故改用已挂载的 GCS 数据桶存放 (无大小限制)。
#       本脚本依赖 deploy.sh 已把桶挂到容器 /mnt/gcs-data, 请先跑过 deploy.sh。
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_ID="st-china-ai-force"
REGION="asia-east1"
SERVICE="geo-monitoring"
DATA_BUCKET="${PROJECT_ID}-geo-data"
GCS_MOUNT="/mnt/gcs-data"
SESSION_OBJECT="session.json"           # 桶内对象名
STORAGE_STATE_PATH="${GCS_MOUNT}/${SESSION_OBJECT}"  # 容器内可见路径

SESSION_FILE="${1:-session.json}"
if [[ ! -f "${SESSION_FILE}" ]]; then
  echo "✗ 找不到 ${SESSION_FILE}。请先按脚本顶部说明在本机导出登录态。"
  exit 1
fi

gcloud config set project "${PROJECT_ID}"

# 1. 确保数据桶存在 (deploy.sh 已创建; 这里兜底)
if ! gcloud storage buckets describe "gs://${DATA_BUCKET}" >/dev/null 2>&1; then
  echo "▶ 数据桶不存在, 创建 gs://${DATA_BUCKET}..."
  gcloud storage buckets create "gs://${DATA_BUCKET}" \
    --location="${REGION}" --uniform-bucket-level-access --quiet
fi

# 2. 上传登录态到桶
echo "▶ 上传登录态到 gs://${DATA_BUCKET}/${SESSION_OBJECT}..."
gcloud storage cp "${SESSION_FILE}" "gs://${DATA_BUCKET}/${SESSION_OBJECT}"

# 3. 确保运行时账号可读桶
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud storage buckets add-iam-policy-binding "gs://${DATA_BUCKET}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectAdmin" --quiet 2>/dev/null || true

# 4. 启用 storageState 模式并强制新修订版本 (新修订才会重新挂载并读到新文件)
echo "▶ 启用 storageState 模式 (STORAGE_STATE_PATH=${STORAGE_STATE_PATH})..."
gcloud run services update "${SERVICE}" \
  --region "${REGION}" \
  --update-env-vars "STORAGE_STATE_PATH=${STORAGE_STATE_PATH}"

SERVICE_URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)')"
echo ""
echo "✅ 登录态已注入。现在验证海外 IP 下各平台是否仍认登录:"
echo "   curl -s ${SERVICE_URL}/api/login-status"
