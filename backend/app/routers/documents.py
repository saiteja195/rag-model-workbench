"""Document management endpoints — upload, list, view chunks, delete."""

from __future__ import annotations

import shutil
import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.config import settings
from app.models.schemas import FileUploadResponse, DocumentInfo, ChunkInfo
from app.services.document_processor import (
    process_document,
    get_document,
    get_all_documents,
    get_chunks,
    delete_document,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".md"}


@router.post("/upload", response_model=FileUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document for RAG querying."""
    # Validate file extension
    filename = file.filename or "unnamed.txt"
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {suffix}. Allowed: {ALLOWED_EXTENSIONS}"
        )

    # Save uploaded file
    upload_path = settings.uploads_dir / filename
    try:
        with open(upload_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Process document (parse → chunk → embed → store)
    try:
        doc_info = process_document(upload_path, filename)
    except ValueError as e:
        # Clean up uploaded file on processing error
        upload_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        upload_path.unlink(missing_ok=True)
        logger.error(f"Document processing failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")

    return FileUploadResponse(
        file_id=doc_info.file_id,
        filename=doc_info.filename,
        file_size=doc_info.file_size,
        chunk_count=doc_info.chunk_count,
        processing_time_ms=doc_info.processing_time_ms,
        status=doc_info.status,
        message=f"Successfully processed '{filename}' into {doc_info.chunk_count} chunks"
    )


@router.get("", response_model=list[DocumentInfo])
async def list_documents():
    """List all uploaded documents."""
    return get_all_documents()


@router.get("/{file_id}", response_model=DocumentInfo)
async def get_document_info(file_id: str):
    """Get metadata for a specific document."""
    doc = get_document(file_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{file_id}/chunks", response_model=list[ChunkInfo])
async def get_document_chunks(file_id: str):
    """Get all chunks for a document, including embedding previews."""
    doc = get_document(file_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return get_chunks(file_id)


@router.delete("/{file_id}")
async def remove_document(file_id: str):
    """Delete a document and its vector embeddings."""
    success = delete_document(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully", "file_id": file_id}
