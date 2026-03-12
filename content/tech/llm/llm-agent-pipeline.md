---
title: "LLM Agent 파이프라인 설계하기"
date: 2026-03-13
draft: false
tags: ["AI", "LLM", "LangGraph", "Python"]
categories: ["Tech"]
summary: "LangGraph를 활용한 멀티 에이전트 파이프라인 설계 경험을 공유합니다."
---

## 들어가며

최근 LLM 기반 에이전트 시스템을 설계하면서 배운 점들을 정리합니다.

## LangGraph란?

LangGraph는 LangChain 팀에서 만든 라이브러리로, LLM 에이전트의 워크플로우를 **그래프 구조**로 정의할 수 있게 해줍니다.

```python
from langgraph.graph import StateGraph, START, END

builder = StateGraph(MyState)
builder.add_node("research", research_node)
builder.add_node("write", write_node)
builder.add_edge(START, "research")
builder.add_edge("research", "write")
builder.add_edge("write", END)
```

## 핵심 설계 원칙

1. **단일 책임**: 각 노드는 하나의 역할만 수행
2. **상태 관리**: TypedDict로 명확한 상태 정의
3. **조건부 라우팅**: 품질 검증 후 분기 처리

## 마무리

에이전트 파이프라인은 복잡해 보이지만, 그래프 구조로 나누면 관리하기 훨씬 수월합니다.
