"""Hybrid RAG — combines vector search with BM25 keyword search via Reciprocal Rank Fusion."""

import time
import logging
import numpy as np
from rank_bm25 import BM25Okapi

from app.rag.base import BaseRAG
from app.models.schemas import QueryResponse, RetrievedChunk
from app.services.embedding_service import embedding_service
from app.services.document_processor import search_vectors, documents_chunks
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


def reciprocal_rank_fusion(
    vector_results: list[dict],
    bm25_results: list[dict],
    k: int = 60
) -> list[dict]:
    """
    Merge vector and BM25 results using Reciprocal Rank Fusion (RRF).

    RRF score = Σ 1 / (k + rank)
    This gives a balanced combination that doesn't favor either source.
    """
    fused_scores: dict[int, float] = {}
    chunk_data: dict[int, dict] = {}

    # Score vector results
    for rank, result in enumerate(vector_results):
        idx = result["chunk_index"]
        fused_scores[idx] = fused_scores.get(idx, 0) + 1 / (k + rank + 1)
        chunk_data[idx] = result

    # Score BM25 results
    for rank, result in enumerate(bm25_results):
        idx = result["chunk_index"]
        fused_scores[idx] = fused_scores.get(idx, 0) + 1 / (k + rank + 1)
        if idx not in chunk_data:
            chunk_data[idx] = result

    # Sort by fused score (descending)
    sorted_indices = sorted(fused_scores.keys(), key=lambda x: fused_scores[x], reverse=True)

    merged = []
    for idx in sorted_indices:
        entry = chunk_data[idx].copy()
        entry["score"] = round(fused_scores[idx], 4)
        merged.append(entry)

    return merged


class HybridRAG(BaseRAG):
    """
    Hybrid RAG Pipeline:
    1. Embed the query → vector similarity search
    2. BM25 keyword search on raw chunk texts
    3. Reciprocal Rank Fusion to merge results
    4. Build context from fused top-k chunks
    5. Generate answer via LLM
    """

    @property
    def rag_type(self) -> str:
        return "hybrid"

    @property
    def display_name(self) -> str:
        return "Hybrid RAG"

    async def query(self, question: str, file_id: str, top_k: int = 5) -> QueryResponse:
        total_start = time.time()
        workflow_steps = []

        # Step 1: Embed query
        query_embedding, embed_time = embedding_service.embed_query(question)
        workflow_steps.append(self._make_step(
            1, "Embed Query",
            "Convert question into a dense vector for semantic search",
            embed_time,
            input_preview=question,
            output_preview=f"Vector of {len(query_embedding)} dimensions"
        ))

        # Step 2: Vector similarity search
        vec_start = time.time()
        vector_results = search_vectors(file_id, query_embedding, top_k * 2)
        vec_time = (time.time() - vec_start) * 1000
        workflow_steps.append(self._make_step(
            2, "Vector Similarity Search",
            f"Semantic search in ChromaDB for top-{top_k * 2} similar chunks",
            vec_time,
            input_preview=f"Query vector ({len(query_embedding)}d)",
            output_preview=f"Found {len(vector_results)} semantic matches"
        ))

        # Step 3: BM25 keyword search
        bm25_start = time.time()
        raw_chunks = documents_chunks.get(file_id, [])
        bm25_results = []
        if raw_chunks:
            tokenized_corpus = [doc.lower().split() for doc in raw_chunks]
            bm25 = BM25Okapi(tokenized_corpus)
            tokenized_query = question.lower().split()
            scores = bm25.get_scores(tokenized_query)

            # Get top indices
            top_indices = np.argsort(scores)[::-1][:top_k * 2]
            for idx in top_indices:
                if scores[idx] > 0:
                    bm25_results.append({
                        "chunk_index": int(idx),
                        "text": raw_chunks[idx],
                        "score": round(float(scores[idx]), 4),
                        "metadata": {"source": "bm25", "file_id": file_id}
                    })

        bm25_time = (time.time() - bm25_start) * 1000
        workflow_steps.append(self._make_step(
            3, "BM25 Keyword Search",
            "Traditional keyword search using BM25 algorithm on raw text",
            bm25_time,
            input_preview=f"Query tokens: {question.lower().split()[:5]}...",
            output_preview=f"Found {len(bm25_results)} keyword matches"
        ))

        # Step 4: Reciprocal Rank Fusion
        fusion_start = time.time()
        fused_results = reciprocal_rank_fusion(vector_results, bm25_results)
        fused_results = fused_results[:top_k]
        fusion_time = (time.time() - fusion_start) * 1000
        workflow_steps.append(self._make_step(
            4, "Reciprocal Rank Fusion",
            f"Merge {len(vector_results)} vector + {len(bm25_results)} BM25 results using RRF",
            fusion_time,
            input_preview=f"Vector({len(vector_results)}) + BM25({len(bm25_results)})",
            output_preview=f"Fused top-{len(fused_results)} results"
        ))

        # Step 5: Build context
        context_parts = []
        retrieved_chunks = []
        for r in fused_results:
            context_parts.append(r["text"])
            retrieved_chunks.append(RetrievedChunk(
                chunk_index=r["chunk_index"],
                text=r["text"],
                score=r["score"],
                metadata=r.get("metadata", {})
            ))
        context = "\n\n---\n\n".join(context_parts)
        workflow_steps.append(self._make_step(
            5, "Build Context",
            "Assemble fused chunks into coherent context for the LLM",
            0.1,
            input_preview=f"{len(retrieved_chunks)} fused chunks",
            output_preview=f"Context: {len(context)} chars"
        ))

        # Step 6: Generate answer
        prompt = (
            "You are a helpful assistant. Answer the question using ONLY the "
            "context provided below. This context was retrieved using a hybrid "
            "approach combining semantic and keyword search. Be concise and accurate."
        )
        answer, gen_time = llm_service.generate(prompt, context, question)
        workflow_steps.append(self._make_step(
            6, "LLM Generation",
            "Generate answer using LLM with hybrid-retrieved context",
            gen_time,
            input_preview=f"Prompt + {len(context)} chars context",
            output_preview=answer[:200]
        ))

        total_time = (time.time() - total_start) * 1000
        retrieval_time = vec_time + bm25_time + fusion_time

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
            chunks_searched=len(fused_results),
            file_id=file_id
        )
