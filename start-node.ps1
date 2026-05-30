# ─────────────────────────────────────────────────────────────────────────────
# GEO 监测 - 大陆采集节点启动脚本 (Windows PowerShell)
#
# 每台大陆常开电脑跑一个节点: 用本机自己的登录态抓取, 打上本地地域标签,
# 把结果推送到中央 Cloud Run 汇总。节点在 NAT 后, 只能由节点主动推送。
#
# 首次使用:
#   1. git clone <repo> ; cd geo-monitoring ; git checkout claude/code-review-onmgz
#   2. npm install --legacy-peer-deps
#   3. npx playwright install chromium
#   4. 改下面 4 个变量 (尤其 NODE_LOCATION 和 INGEST_TOKEN)
#   5. 首次需登录各 AI 平台: 先设 $env:HEADLESS="false" 再 npm run dev, 在弹出的浏览器里
#      逐个登录六平台。登录态会持久化在本机 .chrome-data, 之后无需再登。
#   6. 以后日常采集直接运行本脚本:  .\start-node.ps1
# ─────────────────────────────────────────────────────────────────────────────

# ── 必填配置 ────────────────────────────────────────────────────────────────
$NODE_LOCATION = "北京"                                              # 本节点地域标签 (每台不同)
$CENTRAL_URL   = "https://geo-monitoring-460989091461.asia-east1.run.app"  # 中央服务地址
$INGEST_TOKEN  = "改成与中央一致的密钥"                              # 与中央 INGEST_TOKEN 相同
$HEADLESS      = "true"                                              # 已登录后用 true 后台跑; 首次登录用 false
# ────────────────────────────────────────────────────────────────────────────

$env:NODE_LOCATION = $NODE_LOCATION
$env:CENTRAL_URL   = $CENTRAL_URL
$env:INGEST_TOKEN  = $INGEST_TOKEN
$env:HEADLESS      = $HEADLESS
# 节点本地数据库 (缓冲, 中央断连不丢数据)
$env:DATA_DIR      = Join-Path (Get-Location) "node-data"

Write-Host "▶ 启动采集节点" -ForegroundColor Cyan
Write-Host "   地域:     $NODE_LOCATION"
Write-Host "   中央:     $CENTRAL_URL"
Write-Host "   无头模式: $HEADLESS"
Write-Host "   本地缓冲: $env:DATA_DIR"
Write-Host ""
Write-Host "   节点启动后, 在浏览器打开 http://localhost:8080 点『执行手动监测』,"
Write-Host "   或等待本地定时器自动采集。结果会自动推送到中央并带上『$NODE_LOCATION』标签。"
Write-Host ""

npm run dev
