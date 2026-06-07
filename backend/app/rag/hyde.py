"""HyDE RAG — Hypothetical Document Embeddings."""

from __future__ import annotations

import time
import logging

from app.rag.base import BaseRAG
from app.models.schemas import QueryResponse, RetrievedChunk
from app.services.embedding_service import embedding_service
from app.services.document_processor import search_vectors
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class HydeRAG(BaseRAG):
    """
    HyDE RAG Pipeline:
    1. Ask LLM to generate a hypothetical answer to the query without context
    2. Embed the hypothetical answer
    3. Vector similarity search in ChromaDB using hypothetical embedding
    4. Build context from top-k chunks
    5. Generate final answer via LLM using retrieved context
    """

    @property
    def rag_type(self) -> str:
        return "hyde"

    @property
    def display_name(self) -> str:
        return "HyDE RAG"

    async def query(self, question: str, file_id: str, top_k: int = 5) -> QueryResponse:
        total_start = time.time()
        workflow_steps = []

        # Step 1: Generate Hypothetical Document
        hyde_start = time.time()
        hyde_prompt = (
            "Please write a short, informative paragraph that answers the following "
            "question. Do not include any pleasantries or apologies, just the factual "
            "information as if it were an excerpt from a document."
        )
        hypothetical_doc, hyde_time = llm_service.generate(hyde_prompt, "", question)
        workflow_steps.append(self._make_step(
            1, "Generate Hypothetical Document",
            "Ask the LLM to hallucinate a plausible answer to the question to use for semantic search.",
            hyde_time,
            input_preview=question,
            output_preview=hypothetical_doc[:200]
        ))

        # Step 2: Embed hypothetical document
        query_embedding, embed_time = embedding_service.embed_query(hypothetical_doc)
        workflow_steps.append(self._make_step(
            2, "Embed Hypothetical Document",
            "Convert the generated hypothetical answer into a dense vector.",
            embed_time,
            input_preview=hypothetical_doc[:200],
            output_preview=f"Vector of {len(query_embedding)} dimensions"
        ))

        # Step 3: Vector search
        retrieval_start = time.time()
        results = search_vectors(file_id, query_embedding, top_k)
        retrieval_time = (time.time() - retrieval_start) * 1000
        workflow_steps.append(self._make_step(
            3, "Vector Similarity Search",
            f"Search ChromaDB for top-{top_k} most similar chunks to the hypothetical document.",
            retrieval_time,
            input_preview=f"Hypothetical doc vector ({len(query_embedding)}d)",
            output_preview=f"Found {len(results)} matching chunks"
        ))

        # Step 4: Build context
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
            4, "Build Context",
            "Assemble retrieved chunks into a coherent context for the LLM.",
            context_time,
            input_preview=f"{len(retrieved_chunks)} chunks",
            output_preview=f"Context: {len(context)} chars"
        ))

        # Step 5: Generate answer
        prompt = (
            "You are a helpful assistant. Answer the question using ONLY the "
            "context provided below. Be concise and accurate."
        )
        answer, gen_time = llm_service.generate(prompt, context, question)
        workflow_steps.append(self._make_step(
            5, "LLM Generation",
            "Generate the final answer using the LLM with retrieved context.",
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
            retrieval_time_ms=retrieval_time + hyde_time, # Retrieval in HyDE includes the generation
            generation_time_ms=gen_time,
            embedding_time_ms=embed_time,
            chunks_searched=len(retrieved_chunks),
            rag_type=self.rag_type
        )
