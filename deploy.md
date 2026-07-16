# 部署到腾讯 EdgeOne Pages（国内可直连）

## 一次性准备

1. 注册/登录 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)（腾讯云账号即可，免费额度够用）
2. 本机装 CLI 并登录：

```bash
npm i -g edgeone
edgeone login          # 会拉起浏览器授权
```

## 每次发布

```bash
npm run build
edgeone pages deploy dist -n waic-squad
```

首次 deploy 会创建项目并返回 `*.edgeone.app` 域名（国内可直连）。

## 注意

- `dist/tiles/shanghai.pmtiles` 34MB：EdgeOne Pages 单文件上限 25MB 时会被拒。
  两个解法任选：
  - **A（推荐）**：把 pmtiles 放到腾讯云 COS/EdgeOne 对象存储（开 Range 与 CORS），
    然后构建时设 `VITE_TILES_URL=https://<bucket-cdn>/shanghai.pmtiles`
    （MapPage 已优先读该环境变量，见 src/pages/MapPage.tsx）
  - **B**：重切更小的瓦片包 `--maxzoom=14`（约 15MB，街区级依然够用）
- Supabase 域名 `*.supabase.co` 国内一般可达但偶发抖动，应用内置 30s 轮询降级
- 换成阿里 OSS 静态站也一样：`dist/` 整个上传，开静态网站托管 + CDN 即可
