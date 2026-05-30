"""RAG type information endpoint — metadata about each RAG pipeline."""

from __future__ import annotations

from fastapi import APIRouter
from app.models.schemas import RAGTypeInfo

router = APIRouter(prefix="/api/rag-types", tags=["RAG Types"])

RAG_TYPE_CATALOG: list[RAGTypeInfo] = [
    RAGTypeInfo(
        id="traditional",
        name="Traditional RAG",
        description=(
            "The baseline approach. Converts your question into a vector and "
            "finds the most semantically similar chunks using cosine similarity. "
            "Fast and simple, but can miss exact keywords or cross-document connections."
        ),
        icon="🎯",
        color="#6366f1",
        workflow_steps=[
            "Embed Query",
            "Vector Similarity Search",
            "Build Context",
            "LLM Generation"
        ],
        strengths=[
            "Fastest retrieval",
            "Simple and predictable",
            "Low computational cost",
            "Good for straightforward Q&A"
        ],
        best_for="Simple, direct questions where semantic meaning matters most"
    ),
    RAGTypeInfo(
        id="hybrid",
        name="Hybrid RAG",
        description=(
            "Combines semantic vector search with BM25 keyword search, then "
            "merges results using Reciprocal Rank Fusion (RRF). Catches both "
            "semantically similar AND keyword-matching content that pure vector "
            "search might miss."
        ),
        icon="⚡",
        color="#f59e0b",
        workflow_steps=[
            "Embed Query",
            "Vector Similarity Search",
            "BM25 Keyword Search",
            "Reciprocal Rank Fusion",
            "Build Context",
            "LLM Generation"
        ],
        strengths=[
            "Best precision overall",
            "Catches exact keyword matches",
            "Balanced semantic + lexical",
            "Handles technical terms well"
        ],
        best_for="Questions with specific terms, acronyms, or when precision matters"
    ),
    RAGTypeInfo(
        id="graph",
        name="Graph RAG",
        description=(
            "Builds a knowledge graph of entities and relationships from your "
            "document. Queries traverse the graph to find connected information "
            "across chunks, enabling multi-hop reasoning."
        ),
        icon="🕸️",
        color="#10b981",
        workflow_steps=[
            "Extract Query Entities",
            "Knowledge Graph Traversal",
            "Vector Search (Complementary)",
            "Merge Graph + Vector Results",
            "Build Entity-Enriched Context",
            "LLM Generation"
        ],
        strengths=[
            "Relationship-aware retrieval",
            "Multi-hop reasoning",
            "Connects information across chunks",
            "Entity-centric understanding"
        ],
        best_for="Questions about relationships, connections, or requiring information from multiple sections"
    ),
    RAGTypeInfo(
        id="agentic",
        name="Agentic RAG",
        description=(
            "An AI agent autonomously manages the retrieval process. It analyzes "
            "your query, plans a strategy, retrieves and evaluates results, and "
            "can refine its approach if initial results are insufficient. Shows "
            "visible reasoning trace."
        ),
        icon="🤖",
        color="#ec4899",
        workflow_steps=[
            "🤖 Analyze Query",
            "🔍 Vector Search (Attempt 1)",
            "🧠 Evaluate Results",
            "🔄 Refine Query (if needed)",
            "🔍 Retry Search (if needed)",
            "📊 Rank & Deduplicate",
            "✍️ Generate Answer",
            "🔎 Self-Critique"
        ],
        strengths=[
            "Self-correcting retrieval",
            "Adaptive strategy",
            "Handles complex queries",
            "Visible reasoning process"
        ],
        best_for="Complex, multi-faceted questions requiring autonomous decision-making"
    ),
]


@router.get("", response_model=list[RAGTypeInfo])
async def list_rag_types():
    """Return metadata about all available RAG types."""
    return RAG_TYPE_CATALOG
