"""Embedding service using sentence-transformers (runs locally, no API key)."""

from __future__ import annotations

import time
import logging
from sentence_transformers import SentenceTransformer
from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Singleton wrapper around SentenceTransformer for embedding generation."""

    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load_model(self):
        """Lazy-load the embedding model on first use."""
        if self._model is None:
            logger.info(f"Loading embedding model: {settings.embedding_model}")
            start = time.time()
            self._model = SentenceTransformer(settings.embedding_model)
            elapsed = (time.time() - start) * 1000
            logger.info(f"Embedding model loaded in {elapsed:.0f}ms")

    def embed_texts(self, texts: list[str]) -> tuple[list[list[float]], float]:
        """
        Embed a list of texts and return (embeddings, time_ms).

        Returns:
            Tuple of (list of embedding vectors, elapsed time in milliseconds)
        """
        self._load_model()
        start = time.time()
        embeddings = self._model.encode(texts, show_progress_bar=False)
        elapsed_ms = (time.time() - start) * 1000
        logger.info(f"Embedded {len(texts)} texts in {elapsed_ms:.1f}ms")
        return embeddings.tolist(), elapsed_ms

    def embed_query(self, query: str) -> tuple[list[float], float]:
        """
        Embed a single query string.

        Returns:
            Tuple of (embedding vector, elapsed time in milliseconds)
        """
        self._load_model()
        start = time.time()
        embedding = self._model.encode([query], show_progress_bar=False)
        elapsed_ms = (time.time() - start) * 1000
        return embedding[0].tolist(), elapsed_ms

    @property
    def dimension(self) -> int:
        """Return the embedding dimension of the loaded model."""
        self._load_model()
        return self._model.get_sentence_embedding_dimension()


# Global singleton
embedding_service = EmbeddingService()
