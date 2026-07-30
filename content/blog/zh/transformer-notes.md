---
title: "Transformer 架构精读笔记"
date: "2026-07-15"
excerpt: "从 Attention Is All You Need 出发，梳理 Self-Attention、Multi-Head Attention 与 Position Encoding 的核心机制。"
tags: ["NLP", "Transformer", "Paper Review"]
---

## 背景

2017 年 Vaswani 等人提出的 Transformer 架构彻底改变了 NLP 领域。本文记录我对原论文的精读笔记。

## Self-Attention 机制

Self-Attention 允许序列中的每个位置直接关注其他所有位置，计算复杂度为 O(n²·d)。

给定输入 X，通过三个线性变换得到 Query、Key、Value：

```
Q = XW_Q,  K = XW_K,  V = XW_V
Attention(Q,K,V) = softmax(QK^T / √d_k) V
```

## Multi-Head Attention

多头机制将注意力分解到多个子空间，增强模型捕获不同关系模式的能力。

## 关键收获

- 并行化训练是 Transformer 相对 RNN 的核心优势
- Layer Normalization + Residual Connection 对训练稳定性至关重要
- Position Encoding 弥补了模型本身不具备顺序感知的问题

## 延伸阅读

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- The Illustrated Transformer (Jay Alammar)
