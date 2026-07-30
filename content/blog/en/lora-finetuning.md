---
title: "Fine-tuning Practice: LoRA vs Full Fine-tuning"
date: "2026-07-10"
excerpt: "Comparing LoRA and full fine-tuning on cost, quality, and when to use each — with practical training configs."
tags: ["Fine-tuning", "LoRA", "LLM"]
---

## Why Fine-tune

Pretrained models are general-purpose; many tasks still need domain adaptation. Fine-tuning bridges general capability and task specialization.

## How LoRA Works

Low-Rank Adaptation trains a small number of parameters via low-rank factorization:

```
W' = W + BA,  where B ∈ R^{d×r}, A ∈ R^{r×k}, r << min(d,k)
```

## Experiment Comparison

| Method | Trainable params | VRAM | Quality |
|------|-----------|---------|------|
| Full FT | 100% | ~80GB | Best |
| LoRA (r=16) | ~0.1% | ~24GB | Near Full FT |
| QLoRA | ~0.1% | ~12GB | Slightly below LoRA |

## Practical Advice

- Data < 10k: prefer LoRA
- Deep domain adaptation: Full FT or higher LoRA rank
- Limited resources: QLoRA + 4-bit quantization
