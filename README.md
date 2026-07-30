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

## 部署

推荐部署到 [Vercel](https://vercel.com)：

```bash
npm run build
```

## 设计风格

深色科研风 — 网格背景、青色 accent、等宽字体标注，简洁且具有实验室质感。
