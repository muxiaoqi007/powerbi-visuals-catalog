# Power BI 图表集

中文优先的 Power BI 自定义可视化目录。数据来自 [DataChant 的 Power BI Visuals Marketplace 仓库](https://github.com/DataChant/PowerBI-Visuals-Marketplace)，由 GitHub Actions 每天生成快照；站点部署在 Cloudflare Workers（静态资源 + `/api/catalog` 目录接口）。

- 1,200+ 图表，中文分类、关键词搜索、价格/认证/PBIX 筛选
- 卡片直达微软商店、PBIX 示例、PBIVIZ 原始文件
- 收藏保存在浏览器本地；名称与描述保留发布者原文
- 不镜像、托管任何第三方图表文件

## 本地开发

```sh
npm ci
npm run sync     # 可选：重新抓取 DataChant 数据生成 public/data/catalog.json
npm run dev      # http://127.0.0.1:5173
npm run build    # 输出 dist/
```

本地 `npm run dev` 没有 Worker，前端会自动回退读取 `public/data/catalog.json`。

## 手动更新数据

线上点击右上角「↻ 手动更新数据」会打开 GitHub Actions 的同步工作流页面，点击 **Run workflow** 即可：

1. 抓取 DataChant 最新 CSV；
2. 规范化后写入 `public/data/catalog.json` 并提交；
3. 站点通过 `/api/catalog` 读取最新快照（Worker 从 GitHub 拉取并缓存 30 分钟），无需等待重新部署即可生效。

同步工作流也会每天北京时间 05:00 自动运行。

## 部署到 Cloudflare

首次部署：

```sh
npx wrangler deploy
```

GitHub Actions 自动部署（`.github/workflows/deploy.yml`）需要仓库 Secrets：

| Secret | 说明 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token，需具备 Workers Scripts 编辑权限 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

配置入口：GitHub 仓库 **Settings → Secrets and variables → Actions**。

## 数据字段

`public/data/catalog.json` 的 `meta` 包含生成时间、来源、总数、认证数与分类统计；`visuals` 每项包含名称、发布者、简介、中文分类、价格、认证、评分、版本、发布日期、图标、商店/PBIVIZ/PBIX/支持/隐私/授权链接。

## 目录结构

```
src/                 React 前端（目录、筛选、详情、收藏）
worker/index.ts      Cloudflare Worker：静态资源 + /api/catalog
scripts/sync-catalog.mjs  CSV 抓取与规范化
public/data/catalog.json  数据快照
.github/workflows/   数据同步与部署工作流
```
