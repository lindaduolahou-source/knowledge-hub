# Knowledge Hub

个人知识主页 — 学习笔记与项目展示平台。

## 功能

- **学习路线** — 可视化时间线展示学习路径（含 AI 学习路线等专题模块）
- **博客** — Markdown 文章，支持 GFM 语法
- **项目** — JSON 格式的项目卡片展示
- **思考** — 短篇幅的个人反思与随想
- **中英双语** — `/zh` 与 `/en` 路由，一键切换

## 技术栈

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- react-markdown + gray-matter

## 快速开始

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)，默认跳转到 `/zh`。

## 内容管理

所有内容存放在 `content/` 目录：

```
content/
├── blog/{zh,en}/*.md       # 博客文章
├── thoughts/{zh,en}/*.md # 思考笔记
├── projects/{zh,en}/*.json # 项目信息
└── roadmap/{zh,en}.json    # 学习路线
```

### 新增博客文章

在 `content/blog/zh/` 下创建 `.md` 文件：

```markdown
---
title: "文章标题"
date: "2026-07-27"
excerpt: "摘要"
tags: ["Tag1", "Tag2"]
---

正文内容...
```

### 新增项目

在 `content/projects/zh/` 下创建 `.json` 文件：

```json
{
  "title": "项目名",
  "description": "描述",
  "date": "2026-07-27",
  "tags": ["Tech1"],
  "github": "https://github.com/...",
  "featured": true
}
```

## Supabase 云端同步（可选）

编辑内容默认存在本机浏览器。接入 [Supabase](https://supabase.com) 后，登录即可跨设备同步。

1. 在 Supabase 新建项目  
2. **SQL Editor** 运行仓库里的 `supabase/schema.sql`  
3. **Authentication → Providers → Email** 开启邮箱登录  
   - 先注册你自己的账号，然后建议关闭公开注册  
4. **Authentication → URL Configuration**  
   - Site URL：`http://127.0.0.1:3000`（生产环境改成你的域名）  
   - Redirect URLs 增加：`http://127.0.0.1:3000/auth/callback` 与生产回调地址  
5. 复制 `.env.example` 为 `.env.local`，填入 Project URL 与 anon key  
6. （推荐）设置 `NEXT_PUBLIC_SITE_OWNER_EMAIL=你的邮箱`，限制仅站长可登录  
7. `npm run dev`，右上角 **登录** → 编辑内容会自动写入 `site_stores` 表  

未配置环境变量时，站点行为与原来一致（仅 localStorage）。

在 Vercel 部署时，把同样的环境变量加到 Project Settings → Environment Variables。

## 部署

推荐部署到 [Vercel](https://vercel.com)：

```bash
npm run build
```

## 设计风格

深色科研风 — 网格背景、青色 accent、等宽字体标注，简洁且具有实验室质感。
