---
title: "Building a RAG Pipeline from Scratch"
date: "2026-07-20"
excerpt: "A hands-on walkthrough of retrieval-augmented generation — from document chunking to vector search and LLM synthesis."
tags: ["RAG", "LLM", "Engineering"]
---

## Motivation

Retrieval-Augmented Generation (RAG) bridges the gap between parametric knowledge in LLMs and up-to-date external information.

## Pipeline Overview

1. **Document ingestion** — load and clean source documents
2. **Chunking** — split into overlapping segments (512 tokens, 64 overlap)
3. **Embedding** — encode chunks with a sentence transformer
4. **Indexing** — store vectors in a similarity search index
5. **Retrieval + Generation** — fetch top-k chunks, inject into prompt

## Chunking Strategy

```python
def chunk_text(text, size=512, overlap=64):
    tokens = tokenizer.encode(text)
    chunks = []
    for i in range(0, len(tokens), size - overlap):
        chunks.append(tokenizer.decode(tokens[i:i + size]))
    return chunks
```

## Key Takeaways

- Chunk size significantly affects retrieval quality
- Hybrid search (dense + BM25) often outperforms pure vector search
- Always evaluate with domain-specific test queries
