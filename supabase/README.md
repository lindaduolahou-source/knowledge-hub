# Knowledge Hub — 数据库清单

本站不是传统多表结构，而是：**一张 `site_stores` 表**，按 store 名保存 17 组 JSON 内容（与浏览器 localStorage 一一对应）。

## 表：`public.site_stores`

| 列 | 类型 | 说明 |
|----|------|------|
| `name` | `text` 主键 | store 名称 |
| `payload` | `jsonb` | 内容 JSON，默认 `'{}'` |
| `updated_at` | `timestamptz` | 更新时间，默认 `now()` |

**RLS**：所有人可读；仅登录用户可写。

## Store 清单（17 条）

| # | `name` | 内容 |
|---|--------|------|
| 1–2 | `knowledge-hub:module-content:zh / :en` | 各模块标题、简介、章节、联系方式等文字 |
| 3–4 | `knowledge-hub:toc-notes:zh / :en` | 模块目录/探索卡注释 |
| 5 | `knowledge-hub:module-layout` | 模块显示顺序 + 自定义模块 |
| 6 | `knowledge-hub:module-sections` | 模块章节结构（如空间的关注/技能） |
| 7 | `knowledge-hub:module-page-blocks` | 页面板块排序 |
| 8 | `knowledge-hub:project-items` | 项目列表 |
| 9 | `knowledge-hub:post-items` | 文章/思考列表 |
| 10 | `knowledge-hub:roadmap-items` | 学习路线阶段 |
| 11 | `knowledge-hub:mindmap-items` | 思维导图 |
| 12 | `knowledge-hub:mindmap-library` | 导图模板库 |
| 13 | `knowledge-hub:mindmap-style-library` | 导图连线样式 |
| 14 | `knowledge-hub:contact-links` | 联系方式 |
| 15 | `knowledge-hub:trash` | 回收站 |
| 16 | `knowledge-hub:share-card-vault` | 名片仓库 |
| 17 | `knowledge-hub:share-card-library` | 名片模板 |

## 初始化

- `schema.sql`：建表 + 权限（先跑）
- `seed.sql`：写入默认内容（模块布局、空间章节、联系方式）

其余 store 留空，由应用回退到代码里的默认文案。

## 同步规则（`src/lib/cloud-sync.ts`）

**阶段 1 + 2（当前）**
- 所有人（含未登录）读取 `site_stores` 公开默认内容
- **站长邮箱**登录后编辑 → 写入 `site_stores`（更新所有人看到的默认）
- **普通用户**登录后编辑 → 写入 `user_stores`（每人一份；首次登录从默认复制）
- 请先运行 `schema.sql`、`seed.sql`，再运行 `user_stores.sql`
