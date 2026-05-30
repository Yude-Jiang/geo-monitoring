#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# 把本地导出的登录态 (session.json) 注入到 Cloud Run
#
# 前置: 在你「大陆的电脑」上(不是 Cloud Shell, 因为要弹浏览器登录):
#   1. git clone <repo> && cd geo-monitoring
#   2. npm install --legacy-peer-deps
#   3. npx playwright install chromium
#   4. HEADLESS=false npm run dev          # 弹出浏览器, 手动登录各 AI 平台
#   5. 导出登录态到 session.json:
#        curl -X POST http://localhost:8080/api/export-session \
#          | python3 -c "import sys,json; json.dump(json.load(sys.stdin)['session'], open('session.json','w'))"
#   6. 把 session.json 传到 Cloud Shell (右上角「上传文件」)
#
# 然后在 Cloud Shell 运行:  bash upload-session.sh session.json
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_ID="st-china-ai-force"
REGION="asia-east1"
SERVICE="geo-monitoring"
SESSION_SECRET="geo-monitoring-session"
MOUNT_PATH="/secrets/session/session.json"

SESSION_FILE="${1:-session.json}"
if [[ ! -f "${SESSION_FILE}" ]]; then
  echo "✗ 找不到 ${SESSION_FILE}。请先按脚本顶部说明在本机导出登录态。"
  exit 1
fi

gcloud config set project "${PROJECT_ID}"

echo "▶ 创建/更新 Secret: ${SESSION_SECRET}..."
if gcloud secrets describe "${SESSION_SECRET}" >/dev/null 2>&1; then
  gcloud secrets versions add "${SESSION_SECRET}" --data-file="${SESSION_FILE}"
else
  gcloud secrets create "${SESSION_SECRET}" --data-file="${SESSION_FILE}"
fi

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding "${SESSION_SECRET}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" --quiet 2>/dev/null || true

echo "▶ 把登录态挂载到 Cloud Run 并启用 storageState 模式..."
gcloud run services update "${SERVICE}" \
  --region "${REGION}" \
  --update-secrets "${MOUNT_PATH}=${SESSION_SECRET}:latest" \
  --update-env-vars "STORAGE_STATE_PATH=${MOUNT_PATH}"

SERVICE_URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)')"
echo ""
echo "✅ 登录态已注入。现在验证海外 IP 下各平台是否仍认登录:"
echo "   curl -s ${SERVICE_URL}/api/login-status"
