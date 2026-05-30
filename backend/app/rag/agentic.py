"""Agentic RAG — LLM-driven agent that plans, retrieves, evaluates, and retries."""

import time
import logging

from app.rag.base import BaseRAG
from app.models.schemas import QueryResponse, RetrievedChunk
from app.services.embedding_service import embedding_service
from app.services.document_processor import search_vectors, documents_chunks
from app.services.llm_service import llm_service
from rank_bm25 import BM25Okapi
import numpy as np

logger = logging.getLogger(__name__)


class AgenticRAG(BaseRAG):
    """
    Agentic RAG Pipeline — the agent autonomously decides its retrieval strategy:

    1. Analyze query complexity and plan approach
    2. First retrieval attempt (vector search)
    3. Evaluate results — are they sufficient?
    4. If not, refine query and retry with different strategy (BM25, broader search)
    5. Self-critique and synthesize final answer
    6. Each "thought" is logged for workflow visualization

    This demonstrates how an agent can make autonomous decisions about
    retrieval strategy, query refinement, and answer quality.
    """

    @property
    def rag_type(self) -> str:
        return "agentic"

    @property
    def display_name(self) -> str:
        return "Agentic RAG"

    def _analyze_query(self, question: str) -> dict:
        """
        Simulate agent's query analysis step.
        In production, this would use an LLM to analyze complexity.
        """
        words = question.split()
        has_comparison = any(w in question.lower() for w in [
            "compare", "difference", "versus", "vs", "between", "better", "worse"
        ])
        has_multi_part = "?" in question[:-1] or " and " in question.lower()
        is_specific = any(w in question.lower() for w in [
            "what", "who", "when", "where", "how many", "how much"
        ])
        is_broad = any(w in question.lower() for w in [
            "explain", "describe", "overview", "summary", "tell me about"
        ])

        complexity = "simple"
        if has_comparison or has_multi_part:
            complexity = "complex"
        elif is_broad:
            complexity = "broad"

        strategy = {
            "complexity": complexity,
            "needs_keyword_search": has_comparison or is_specific,
            "needs_broad_retrieval": is_broad,
            "suggested_top_k": 8 if is_broad or has_comparison else 5,
            "should_decompose": has_multi_part,
            "sub_queries": [],
        }

        # Generate sub-queries for complex questions
        if has_multi_part or has_comparison:
            parts = question.replace("?", "").split(" and ")
            strategy["sub_queries"] = [p.strip() + "?" for p in parts if len(p.strip()) > 10]

        return strategy

    def _evaluate_results(self, results: list[dict], question: str) -> dict:
        """
        Evaluate whether retrieved results are sufficient to answer the question.
        Simulates the agent's self-evaluation step.
        """
        if not results:
            return {"sufficient": False, "reason": "No results found", "confidence": 0.0}

        avg_score = sum(r["score"] for r in results) / len(results)
        max_score = max(r["score"] for r in results)
        total_text_len = sum(len(r["text"]) for r in results)

        # Check if question keywords appear in results
        question_words = set(question.lower().split())
        stop_words = {"the", "a", "an", "is", "are", "was", "were", "what", "how", "why", "when", "where", "do", "does", "in", "on", "at", "to", "for", "of", "and", "or"}
        content_words = question_words - stop_words
        results_text = " ".join(r["text"].lower() for r in results)
        keyword_coverage = sum(1 for w in content_words if w in results_text) / max(len(content_words), 1)

        sufficient = (
            max_score > 0.3
            and avg_score > 0.2
            and keyword_coverage > 0.4
            and total_text_len > 100
        )

        return {
            "sufficient": sufficient,
            "avg_score": round(avg_score, 3),
            "max_score": round(max_score, 3),
            "keyword_coverage": round(keyword_coverage, 3),
            "confidence": round(min(max_score * keyword_coverage * 1.5, 1.0), 3),
            "reason": "Results look sufficient" if sufficient else "Low relevance — will retry with refined query"
        }

    def _refine_query(self, question: str, evaluation: dict) -> str:
        """
        Refine the query based on evaluation results.
        Simulates the agent deciding to rephrase for better retrieval.
        """
        # Simple query expansion: add contextual keywords
        refined = question.rstrip("?").rstrip(".")

        # Try to make the query more specific or broader based on evaluation
        if evaluation.get("keyword_coverage", 0) < 0.3:
            # Keywords not found — try broader phrasing
            refined = f"information about {refined}"
        else:
            # Keywords found but low scores — try more specific
            words = refined.split()
            if len(words) > 5:
                # Focus on key terms
                refined = " ".join(words[:3]) + " " + " ".join(words[-2:])

        return refined

    async def query(self, question: str, file_id: str, top_k: int = 5) -> QueryResponse:
        total_start = time.time()
        workflow_steps = []

        # ── Agent Step 1: Analyze Query ──────────────────────────
        analysis_start = time.time()
        strategy = self._analyze_query(question)
        analysis_time = (time.time() - analysis_start) * 1000
        effective_top_k = strategy["suggested_top_k"]
        workflow_steps.append(self._make_step(
            1, "🤖 Agent: Analyze Query",
            f"Complexity={strategy['complexity']}, "
            f"Keyword search={strategy['needs_keyword_search']}, "
            f"Broad retrieval={strategy['needs_broad_retrieval']}, "
            f"Sub-queries={len(strategy['sub_queries'])}",
            analysis_time,
            input_preview=question,
            output_preview=f"Strategy: {strategy['complexity']}, top_k={effective_top_k}"
        ))

        # ── Agent Step 2: First Retrieval (Vector Search) ─────────
        query_embedding, embed_time = embedding_service.embed_query(question)
        vec_start = time.time()
        first_results = search_vectors(file_id, query_embedding, effective_top_k)
        vec_time = (time.time() - vec_start) * 1000
        workflow_steps.append(self._make_step(
            2, "🔍 Agent: Vector Search (Attempt 1)",
            f"Semantic search for top-{effective_top_k} chunks",
            vec_time + embed_time,
            input_preview=question,
            output_preview=f"Found {len(first_results)} results, "
                          f"best score: {first_results[0]['score'] if first_results else 0}"
        ))

        # ── Agent Step 3: Evaluate Results ────────────────────────
        eval_start = time.time()
        evaluation = self._evaluate_results(first_results, question)
        eval_time = (time.time() - eval_start) * 1000
        workflow_steps.append(self._make_step(
            3, "🧠 Agent: Evaluate Results",
            f"Sufficient={evaluation['sufficient']}, "
            f"Confidence={evaluation['confidence']}, "
            f"Coverage={evaluation.get('keyword_coverage', 0)}",
            eval_time,
            input_preview=f"{len(first_results)} results to evaluate",
            output_preview=evaluation["reason"]
        ))

        all_results = list(first_results)

        # ── Agent Step 4: Retry if Needed ─────────────────────────
        if not evaluation["sufficient"]:
            # Step 4a: Refine query
            refined_query = self._refine_query(question, evaluation)
            workflow_steps.append(self._make_step(
                4, "🔄 Agent: Refine Query",
                f"Rephrased query for better retrieval based on low confidence",
                0.5,
                input_preview=question,
                output_preview=f"Refined: {refined_query}"
            ))

            # Step 4b: Retry with refined query
            refined_embedding, re_embed_time = embedding_service.embed_query(refined_query)
            re_start = time.time()
            retry_results = search_vectors(file_id, refined_embedding, effective_top_k)
            re_time = (time.time() - re_start) * 1000
            workflow_steps.append(self._make_step(
                5, "🔍 Agent: Vector Search (Attempt 2)",
                f"Retry with refined query",
                re_time + re_embed_time,
                input_preview=refined_query,
                output_preview=f"Found {len(retry_results)} results"
            ))

            # Step 4c: Also try BM25 if strategy suggests it
            if strategy["needs_keyword_search"]:
                bm25_start = time.time()
                raw_chunks = documents_chunks.get(file_id, [])
                if raw_chunks:
                    tokenized = [d.lower().split() for d in raw_chunks]
                    bm25 = BM25Okapi(tokenized)
                    scores = bm25.get_scores(question.lower().split())
                    top_indices = np.argsort(scores)[::-1][:effective_top_k]
                    for idx in top_indices:
                        if scores[idx] > 0:
                            all_results.append({
                                "chunk_index": int(idx),
                                "text": raw_chunks[idx],
                                "score": round(float(scores[idx]) / (max(scores) + 0.01), 4),
                                "metadata": {"source": "bm25_agent", "file_id": file_id}
                            })
                bm25_time = (time.time() - bm25_start) * 1000
                workflow_steps.append(self._make_step(
                    6, "🔍 Agent: BM25 Keyword Search",
                    "Agent decided to also use keyword search",
                    bm25_time,
                    input_preview=question,
                    output_preview=f"Added BM25 results"
                ))

            # Merge retry results (deduplicate)
            seen = {r["chunk_index"] for r in all_results}
            for r in retry_results:
                if r["chunk_index"] not in seen:
                    all_results.append(r)
                    seen.add(r["chunk_index"])

            step_num = len(workflow_steps) + 1
        else:
            step_num = 4

        # ── Agent Step 5: Deduplicate & Rank Final Results ────────
        rank_start = time.time()
        # Deduplicate and keep best scores
        best_results: dict[int, dict] = {}
        for r in all_results:
            idx = r["chunk_index"]
            if idx not in best_results or r["score"] > best_results[idx]["score"]:
                best_results[idx] = r

        final_results = sorted(
            best_results.values(), key=lambda x: x["score"], reverse=True
        )[:top_k]
        rank_time = (time.time() - rank_start) * 1000
        workflow_steps.append(self._make_step(
            step_num, "📊 Agent: Rank & Deduplicate",
            f"Final ranking: {len(all_results)} → {len(final_results)} results",
            rank_time,
            input_preview=f"{len(all_results)} total candidates",
            output_preview=f"Top-{len(final_results)} selected"
        ))

        # ── Agent Step 6: Build Context & Generate ────────────────
        context_parts = []
        retrieved_chunks = []
        for r in final_results:
            context_parts.append(r["text"])
            retrieved_chunks.append(RetrievedChunk(
                chunk_index=r["chunk_index"],
                text=r["text"],
                score=r["score"],
                metadata=r.get("metadata", {})
            ))
        context = "\n\n---\n\n".join(context_parts)

        prompt = (
            "You are a helpful AI assistant with agentic capabilities. "
            "Answer the question using ONLY the context provided below. "
            "This context was retrieved through an autonomous multi-step process "
            "including query analysis, iterative retrieval, and self-evaluation. "
            "Be thorough, accurate, and cite specific parts of the context."
        )
        answer, gen_time = llm_service.generate(prompt, context, question)
        workflow_steps.append(self._make_step(
            step_num + 1, "✍️ Agent: Generate Answer",
            "Synthesize final answer from curated context",
            gen_time,
            input_preview=f"Prompt + {len(context)} chars context",
            output_preview=answer[:200]
        ))

        # ── Agent Step 7: Self-Critique ───────────────────────────
        critique_start = time.time()
        confidence = evaluation.get("confidence", 0.5)
        if len(final_results) >= 3 and confidence > 0.5:
            critique = "High confidence — multiple relevant sources found"
        elif len(final_results) >= 1:
            critique = "Medium confidence — limited relevant sources"
        else:
            critique = "Low confidence — may not have found the best context"
        critique_time = (time.time() - critique_start) * 1000
        workflow_steps.append(self._make_step(
            step_num + 2, "🔎 Agent: Self-Critique",
            f"Confidence assessment: {critique}",
            critique_time,
            input_preview=f"Answer quality check",
            output_preview=critique
        ))

        total_time = (time.time() - total_start) * 1000
        retrieval_time = total_time - gen_time - embed_time

        return QueryResponse(
            question=question,
            answer=answer,
            rag_type=self.rag_type,
            retrieved_chunks=retrieved_chunks,
            workflow_steps=workflow_steps,
            total_time_ms=round(total_time, 1),
            retrieval_time_ms=round(retrieval_time, 1),
            generation_time_ms=round(gen_time, 1),
            embedding_time_ms=round(embed_time, 1),
            chunks_searched=len(final_results),
            file_id=file_id
        )
