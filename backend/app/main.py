"""RAG Model Workbench — FastAPI application entry point."""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import documents, query, rag_types

# ── Logging ───────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-30s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)

# ── FastAPI App ───────────────────────────────────────────────────
app = FastAPI(
    title="RAG Model Workbench",
    description=(
        "Interactive platform for comparing RAG architectures. "
        "Upload documents, select a RAG type, and see retrieval results in real time."
    ),
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────
# Configurable via CORS_ORIGINS env var (comma-separated).
# Defaults include localhost for local development.
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
_cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", _default_origins).split(",")
    if origin.strip()
]
logger.info(f"🌐 CORS origins: {_cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────
app.include_router(documents.router)
app.include_router(query.router)
app.include_router(rag_types.router)


# ── Health Check ──────────────────────────────────────────────────
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "RAG Model Workbench",
        "version": "1.0.0"
    }


@app.on_event("startup")
async def startup_event():
    """Pre-load the embedding model on startup to avoid first-request latency."""
    logger.info("🚀 RAG Model Workbench starting up...")
    logger.info("📦 Pre-loading embedding model...")
    try:
        from app.services.embedding_service import embedding_service
        # Trigger model load
        embedding_service.embed_query("warmup")
        logger.info("✅ Embedding model loaded successfully")
    except Exception as e:
        logger.warning(f"⚠️  Embedding model pre-load failed: {e}")
    logger.info("🎯 RAG Model Workbench is ready!")
