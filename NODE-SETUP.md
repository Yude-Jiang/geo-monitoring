# 分布式采集节点部署指南

每台大陆常开电脑 = 一个采集节点，用**本机自己的 IP 和登录态**抓取，把结果带上地域标签推送到中央 Cloud Run 汇总。看板可按地域对比 AI 回答差异。

```
北京 PC ┐
上海 PC ┼─(推送, 带 location 标签)──▶ 中央 Cloud Run (汇总 + 看板 + 地域对比)
广州 PC ┘
```

> 节点都在 NAT 后（无公网入站），所以是**节点主动推送**，中央不主动连节点。每个节点本地有 SQLite 缓冲，中央断连不丢数据，恢复后自动补推。

## 一、中央侧（只做一次）

1. 在 Cloud Shell 跑 `bash deploy.sh`，结尾会打印：
   ```
   CENTRAL_URL   = https://geo-monitoring-xxx.run.app
   INGEST_TOKEN  = <一串密钥>
   ```
   记下这两个值，所有节点共用。
2. 确保中央已注册 `admin` 账号（节点推来的数据都汇总到这个账号下；在网页注册即可）。

## 二、每个节点（Windows PowerShell）

```powershell
# 1. 拉代码
git clone <repo>
cd geo-monitoring
git checkout claude/code-review-onmgz
npm install --legacy-peer-deps
npx playwright install chromium

# 2. 首次登录各平台（弹出浏览器, 用本地手机号登录六个平台, 登录态持久化到 .chrome-data）
$env:HEADLESS = "false"
npm run dev
#    登录完六平台后关掉, Ctrl+C

# 3. 编辑 start-node.ps1, 改这 3 个值:
#    $NODE_LOCATION = "北京"           # 本节点地域(每台不同)
#    $CENTRAL_URL   = "<上面的 CENTRAL_URL>"
#    $INGEST_TOKEN  = "<上面的 INGEST_TOKEN>"

# 4. 日常采集: 直接跑脚本(后台无头)
.\start-node.ps1
```

启动后打开 `http://localhost:8080`，点「执行手动监测」即可采集；结果自动推送到中央并带上本节点地域标签。

## 三、验证

- 节点终端出现 `[Agent] 节点模式启用 · 地点=北京` → 节点模式生效
- 中央看板「深度分析」页出现**地域筛选下拉** + **各地域可见度对比**表 → 数据已汇总
- 关掉中央/断网时节点照常采集，恢复后看到 `[Agent] 补推 N 条未同步记录` → 离线缓冲生效

## 关键环境变量（节点）

| 变量 | 说明 |
|------|------|
| `NODE_LOCATION` | 本节点地域标签（如「北京」），写入每条记录 |
| `CENTRAL_URL` | 中央服务地址 |
| `INGEST_TOKEN` | 与中央一致的推送密钥 |
| `HEADLESS` | `true` 后台跑 / `false` 首次登录时弹浏览器 |
| `DATA_DIR` | 本地缓冲库路径（脚本默认 `./node-data`） |

> 三者（`NODE_LOCATION` + `CENTRAL_URL` + `INGEST_TOKEN`）齐全才进入节点模式，否则就是普通本地单机模式。
