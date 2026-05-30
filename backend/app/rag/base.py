"""Base class for all RAG pipeline implementations."""

from __future__ import annotations

from abc import ABC, abstractmethod
from app.models.schemas import QueryResponse, WorkflowStep


class BaseRAG(ABC):
    """Abstract base class that all RAG implementations must follow."""

    @property
    @abstractmethod
    def rag_type(self) -> str:
        """Return the RAG type identifier (e.g., 'traditional')."""
        ...

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable name for display."""
        ...

    @abstractmethod
    async def query(
        self, question: str, file_id: str, top_k: int = 5
    ) -> QueryResponse:
        """
        Execute the RAG pipeline for a given question.

        Args:
            question: The user's question
            file_id: ID of the document to search
            top_k: Number of chunks to retrieve

        Returns:
            QueryResponse with answer, retrieved chunks, workflow steps, and metrics
        """
        ...

    def _make_step(
        self,
        step_number: int,
        name: str,
        description: str,
        duration_ms: float,
        input_preview: str = "",
        output_preview: str = "",
        status: str = "completed"
    ) -> WorkflowStep:
        """Helper to create a workflow step for visualization."""
        return WorkflowStep(
            step_number=step_number,
            step_name=name,
            description=description,
            duration_ms=round(duration_ms, 2),
            input_preview=input_preview[:200],
            output_preview=output_preview[:200],
            status=status
        )
