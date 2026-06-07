"""Naive RAG — identical to traditional RAG, representing the baseline."""

from __future__ import annotations

import time
import logging

from app.rag.base import BaseRAG
from app.models.schemas import QueryResponse, RetrievedChunk
from app.services.embedding_service import embedding_service
from app.services.document_processor import search_vectors
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class NaiveRAG(BaseRAG):
    """
    Naive RAG Pipeline:
    1. Embed the query
    2. Vector similarity search in ChromaDB
    3. Build context from top-k chunks
    4. Generate answer via LLM
    """

    @property
    def rag_type(self) -> str:
        return "naive"

    @property
    def display_name(self) -> str:
        return "Naive RAG"

    async def query(self, question: str, file_id: str, top_k: int = 5) -> QueryResponse:
        total_start = time.time()
        workflow_steps = []

        # Step 1: Embed query
        query_embedding, embed_time = embedding_service.embed_query(question)
        workflow_steps.append(self._make_step(
            1, "Embed Query",
            "Convert the question into a dense vector using sentence-transformers",
            embed_time,
            input_preview=question,
            output_preview=f"Vector of {len(query_embedding)} dimensions"
        ))

        # Step 2: Vector search
        retrieval_start = time.time()
        results = search_vectors(file_id, query_embedding, top_k)
        retrieval_time = (time.time() - retrieval_start) * 1000
        workflow_steps.append(self._make_step(
            2, "Vector Similarity Search",
            f"Search ChromaDB for top-{top_k} most similar chunks using cosine similarity",
            retrieval_time,
            input_preview=f"Query vector ({len(query_embedding)}d)",
            output_preview=f"Found {len(results)} matching chunks"
        ))

        # Step 3: Build context
        context_start = time.time()
        context_parts = []
        retrieved_chunks = []
        for r in results:
            context_parts.append(r["text"])
            retrieved_chunks.append(RetrievedChunk(
                chunk_index=r["chunk_index"],
                text=r["text"],
                score=r["score"],
                metadata=r["metadata"]
            ))
        context = "\n\n---\n\n".join(context_parts)
        context_time = (time.time() - context_start) * 1000
        workflow_steps.append(self._make_step(
            3, "Build Context",
            "Assemble retrieved chunks into a coherent context for the LLM",
            context_time,
            input_preview=f"{len(retrieved_chunks)} chunks",
            output_preview=f"Context: {len(context)} chars"
        ))

        # Step 4: Generate answer
        prompt = (
            "You are a helpful assistant. Answer the question using ONLY the "
            "context provided below. Be concise and accurate."
        )
        answer, gen_time = llm_service.generate(prompt, context, question)
        workflow_steps.append(self._make_step(
            4, "LLM Generation",
            "Generate an answer using the LLM with retrieved context",
            gen_time,
            input_preview=f"Prompt + {len(context)} chars context",
            output_preview=answer[:200]
        ))

        total_time = (time.time() - total_start) * 1000

        return QueryResponse(
            question=question,
            answer=answer,
            retrieved_chunks=retrieved_chunks,
            workflow_steps=workflow_steps,
            total_time_ms=total_time,
            retrieval_time_ms=retrieval_time,
            generation_time_ms=gen_time,
            embedding_time_ms=embed_time,
            chunks_searched=len(retrieved_chunks),
            rag_type=self.rag_type
        )
