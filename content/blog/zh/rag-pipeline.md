---
title: "从零搭建 RAG 流水线"
date: "2026-07-20"
excerpt: "检索增强生成实战：从文档切分、向量检索到大模型综合回答。"
tags: ["RAG", "LLM", "Engineering"]
---

## 动机

检索增强生成（RAG）把大模型的参数知识与外部、可更新的信息连接起来。

## 流水线概览

1. **文档接入** — 加载并清洗源文档
2. **切分** — 按重叠窗口切段（512 tokens，重叠 64）
3. **嵌入** — 用句向量模型编码
4. **建索引** — 存入相似度检索索引
5. **检索 + 生成** — 取 top-k 片段注入提示词

## 切分策略

```python
def chunk_text(text, size=512, overlap=64):
    tokens = tokenizer.encode(text)
    chunks = []
    for i in range(0, len(tokens), size - overlap):
        chunks.append(tokenizer.decode(tokens[i:i + size]))
    return chunks
```

## 关键收获

- 切分大小显著影响检索质量
- 混合检索（稠密 + BM25）往往优于纯向量检索
- 务必用领域测试查询做评估
