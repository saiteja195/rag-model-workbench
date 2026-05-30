"""Pydantic schemas for API request/response models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Document Schemas ──────────────────────────────────────────────


class ChunkInfo(BaseModel):
    """A single chunk of a processed document."""
    chunk_id: str
    chunk_index: int
    text: str
    metadata: dict = Field(default_factory=dict)
    embedding_preview: list[float] = Field(
        default_factory=list,
        description="First 5 dimensions of the embedding vector"
    )


class DocumentInfo(BaseModel):
    """Metadata about an uploaded document."""
    file_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    file_size: int = 0
    chunk_count: int = 0
    processing_time_ms: float = 0.0
    uploaded_at: str = Field(
        default_factory=lambda: datetime.now().isoformat()
    )
    status: str = "pending"  # pending, processing, ready, error


class FileUploadResponse(BaseModel):
    """Response after uploading and processing a file."""
    file_id: str
    filename: str
    file_size: int
    chunk_count: int
    processing_time_ms: float
    status: str
    message: str


# ── Query Schemas ─────────────────────────────────────────────────


class QueryRequest(BaseModel):
    """Request to query a document using a specific RAG type."""
    question: str
    rag_type: str  # traditional, hybrid, graph, agentic
    file_id: str
    top_k: int = 5


class RetrievedChunk(BaseModel):
    """A chunk retrieved during RAG search with its relevance score."""
    chunk_index: int
    text: str
    score: float
    metadata: dict = Field(default_factory=dict)


class WorkflowStep(BaseModel):
    """A single step in the RAG workflow execution."""
    step_number: int
    step_name: str
    description: str
    duration_ms: float
    input_preview: str = ""
    output_preview: str = ""
    status: str = "completed"  # pending, running, completed, error


class QueryResponse(BaseModel):
    """Response from a RAG query, including answer, chunks, and metrics."""
    question: str
    answer: str
    rag_type: str
    retrieved_chunks: list[RetrievedChunk] = Field(default_factory=list)
    workflow_steps: list[WorkflowStep] = Field(default_factory=list)
    total_time_ms: float = 0.0
    retrieval_time_ms: float = 0.0
    generation_time_ms: float = 0.0
    embedding_time_ms: float = 0.0
    chunks_searched: int = 0
    file_id: str = ""


class CompareRequest(BaseModel):
    """Request to compare multiple RAG types on the same query."""
    question: str
    file_id: str
    rag_types: list[str] = Field(
        default_factory=lambda: ["traditional", "hybrid", "graph", "agentic"]
    )
    top_k: int = 5


class CompareResponse(BaseModel):
    """Side-by-side comparison results from multiple RAG types."""
    question: str
    results: list[QueryResponse] = Field(default_factory=list)


# ── RAG Type Info ─────────────────────────────────────────────────


class RAGTypeInfo(BaseModel):
    """Information about a RAG type for the frontend."""
    id: str
    name: str
    description: str
    icon: str  # emoji or icon name
    color: str  # hex color for UI accent
    workflow_steps: list[str]
    strengths: list[str]
    best_for: str
