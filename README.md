# WAIC 小分队

WAIC 2026（7.17–20 上海）小队共享逛展进度的移动端 Web App。
963 家展商 · 108 场 afterparty · 一队人分头看，进度全同步。

moonshot.ai 黑金视觉 · MapLibre 自托管上海矢量地图 · Supabase 实时同步。

## 功能

- **地图**：暗色上海全景，afterparty 按日打点（想去=金色发光 / 队友想去=金环 / 去过=白 / 爬=熄灭 / 位置待定=虚线），4 个 WAIC 场馆大标记点进展区示意图，队友头像实时浮在签到位置
- **展商库**：963 家可搜可筛（场馆/展区/行业/标记状态），卡片带股东与融资轮次
- **夜场**：108 场 afterparty 按天分组，嘉宾名单、报名链接、高德导航（自动 WGS84→GCJ02）
- **小队**：邀请码组队免注册，三态标记（想聊/聊过了/爬）实时同步，签到"我在哪"，动态流与战况统计

## 跑起来

```bash
npm install
npm run dev
```

首次需要生成数据与瓦片（仓库已带产物，源文件变了才需要重跑）：

```bash
python3 scripts/geocode.py    # 地址 -> data_raw/geocache.json
python3 scripts/etl.py        # xlsx/csv -> public/data/*.json
pmtiles extract https://build.protomaps.com/<YYYYMMDD>.pmtiles \
  public/tiles/shanghai.pmtiles --bbox=120.95,31.00,121.80,31.65 --maxzoom=15
```

## Supabase（实时同步）

1. 在 Supabase Dashboard → SQL Editor 里跑一遍 `schema.sql`
2. `.env.local` 填：

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

不配置也能用：自动降级为本地模式（标记存 localStorage，无队友同步）。
`sb_secret_*` 只能放本地 `.env.local`，永不进前端和 git。

## 部署（国内访问）

见 [deploy.md](deploy.md)。要点：静态站（`npm run build` → `dist/`）+
34MB 的 `tiles/shanghai.pmtiles` 需要 CDN 支持 Range 请求（EdgeOne/OSS 都支持）。

## 数据口径

- 展商：`data_raw/exhibitors.xlsx`「全部汇总」sheet，963 行全量
- 活动：`data_raw/afterparty.csv`，108 场；52 场地址只到片区级（`approx: true`，地图虚线 pin）
- 论坛：175 场已进 `public/data/forums.json`，UI 属 v2
- 展区示意图由展位号前缀聚合，是风格化示意不是官方平面图
