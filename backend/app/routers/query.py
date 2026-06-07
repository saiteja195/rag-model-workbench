"""Query endpoints — run RAG pipelines and compare results."""

from __future__ import annotations

import asyncio
import logging
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    QueryRequest, QueryResponse,
    CompareRequest, CompareResponse,
)
from app.services.document_processor import get_document
from app.rag.traditional import TraditionalRAG
from app.rag.hybrid import HybridRAG
from app.rag.graph import GraphRAG
from app.rag.agentic import AgenticRAG
from app.rag.naive import NaiveRAG
from app.rag.hyde import HydeRAG

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/query", tags=["Query"])

# ── RAG engine registry ──────────────────────────────────────────
RAG_ENGINES = {
    "traditional": TraditionalRAG(),
    "hybrid": HybridRAG(),
    "graph": GraphRAG(),
    "agentic": AgenticRAG(),
    "naive": NaiveRAG(),
    "hyde": HydeRAG(),
}


@router.post("", response_model=QueryResponse)
async def run_query(request: QueryRequest):
    """Run a RAG query using the specified RAG type."""
    # Validate document exists
    doc = get_document(request.file_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail="Document is still processing")

    # Validate RAG type
    engine = RAG_ENGINES.get(request.rag_type)
    if not engine:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown RAG type: {request.rag_type}. "
                   f"Available: {list(RAG_ENGINES.keys())}"
        )

    try:
        result = await engine.query(
            question=request.question,
            file_id=request.file_id,
            top_k=request.top_k
        )
        return result
    except Exception as e:
        logger.error(f"Query failed ({request.rag_type}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.post("/compare", response_model=CompareResponse)
async def compare_rag_types(request: CompareRequest):
    """Run the same query across multiple RAG types for comparison."""
    # Validate document
    doc = get_document(request.file_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail="Document is still processing")

    # Validate RAG types
    for rag_type in request.rag_types:
        if rag_type not in RAG_ENGINES:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown RAG type: {rag_type}. "
                       f"Available: {list(RAG_ENGINES.keys())}"
            )

    # Run all RAG types concurrently
    tasks = []
    for rag_type in request.rag_types:
        engine = RAG_ENGINES[rag_type]
        tasks.append(
            engine.query(
                question=request.question,
                file_id=request.file_id,
                top_k=request.top_k
            )
        )

    try:
        results = await asyncio.gather(*tasks, return_exceptions=True)
    except Exception as e:
        logger.error(f"Compare failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

    # Filter out errors and collect successful results
    successful_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error(f"RAG type {request.rag_types[i]} failed: {result}")
            # Return a placeholder error result
            successful_results.append(QueryResponse(
                question=request.question,
                answer=f"Error: {str(result)}",
                rag_type=request.rag_types[i],
                file_id=request.file_id
            ))
        else:
            successful_results.append(result)

    return CompareResponse(
        question=request.question,
        results=successful_results
    )
