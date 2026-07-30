---
title: "Close Reading: The Transformer Architecture"
date: "2026-07-15"
excerpt: "Starting from Attention Is All You Need — Self-Attention, Multi-Head Attention, and Position Encoding."
tags: ["NLP", "Transformer", "Paper Review"]
---

## Background

In 2017, Vaswani et al. introduced the Transformer and reshaped NLP. These are my close-reading notes on the original paper.

## Self-Attention

Self-Attention lets every position attend to every other position in the sequence, with complexity O(n²·d).

Given input X, three linear maps produce Query, Key, and Value:

```
Q = XW_Q,  K = XW_K,  V = XW_V
Attention(Q,K,V) = softmax(QK^T / √d_k) V
```

## Multi-Head Attention

Multi-head attention splits attention across subspaces so the model can capture different kinds of relationships.

## Key Takeaways

- Parallel training is the Transformer's core advantage over RNNs
- Layer Normalization + residual connections are critical for stable training
- Position Encoding compensates for the model's lack of inherent order awareness

## Further Reading

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- The Illustrated Transformer (Jay Alammar)
