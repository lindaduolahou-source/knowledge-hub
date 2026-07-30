---
title: "大模型微调实践：LoRA vs Full Fine-tuning"
date: "2026-07-10"
excerpt: "对比 LoRA 与全量微调在资源消耗、效果与适用场景上的差异，附实际训练配置参考。"
tags: ["Fine-tuning", "LoRA", "LLM"]
---

## 为什么需要微调

预训练大模型具备通用能力，但特定任务往往需要领域适配。微调是在通用能力与任务专精之间的桥梁。

## LoRA 原理

Low-Rank Adaptation 通过低秩矩阵分解，仅训练少量参数：

```
W' = W + BA,  where B ∈ R^{d×r}, A ∈ R^{r×k}, r << min(d,k)
```

## 实验对比

| 方法 | 可训练参数 | 显存占用 | 效果 |
|------|-----------|---------|------|
| Full FT | 100% | ~80GB | 最佳 |
| LoRA (r=16) | ~0.1% | ~24GB | 接近 Full FT |
| QLoRA | ~0.1% | ~12GB | 略低于 LoRA |

## 实践建议

- 数据量 < 10k：优先 LoRA
- 需要深度领域适配：考虑 Full FT 或 LoRA rank 增大
- 资源受限：QLoRA + 4-bit 量化
