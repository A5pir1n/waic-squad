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

- `dist/tiles/shanghai.pmtiles` 已用 z14 版（19MB），低于 EdgeOne Pages 25MB 单文件上限，
  矢量瓦片会自动超采样到 15.9 级显示，城市导航精度足够
- 如果以后想换回 z15 高精度版（34MB），需把 pmtiles 放对象存储并设
  `VITE_TILES_URL=https://<bucket-cdn>/shanghai.pmtiles`（MapPage 已支持）
- Supabase 域名 `*.supabase.co` 国内一般可达但偶发抖动，应用内置 30s 轮询降级
- 换成阿里 OSS 静态站也一样：`dist/` 整个上传，开静态网站托管 + CDN 即可
