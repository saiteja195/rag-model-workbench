"""Document processing service — parsing, chunking, embedding, and storage."""

import time
import uuid
import logging
from pathlib import Path

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.services.embedding_service import embedding_service
from app.models.schemas import DocumentInfo, ChunkInfo

logger = logging.getLogger(__name__)

# ── In-memory document registry ──────────────────────────────────
# Maps file_id -> DocumentInfo
documents_registry: dict[str, DocumentInfo] = {}

# Maps file_id -> list of raw chunk texts (for BM25 and graph)
documents_chunks: dict[str, list[str]] = {}

# ── ChromaDB client (persistent) ─────────────────────────────────
chroma_client = chromadb.PersistentClient(path=str(settings.chroma_dir))


def _get_collection(file_id: str) -> chromadb.Collection:
    """Get or create a ChromaDB collection for a specific document."""
    return chroma_client.get_or_create_collection(
        name=f"doc_{file_id.replace('-', '_')}",
        metadata={"hnsw:space": "cosine"}
    )


def parse_file(filepath: Path) -> str:
    """Extract text from a file based on its extension."""
    suffix = filepath.suffix.lower()

    if suffix == ".txt" or suffix == ".md":
        return filepath.read_text(encoding="utf-8", errors="ignore")

    elif suffix == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(filepath))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n\n".join(pages)

    else:
        raise ValueError(f"Unsupported file type: {suffix}")


def chunk_text(text: str) -> list[str]:
    """Split text into chunks using recursive character splitting."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    return splitter.split_text(text)


def process_document(filepath: Path, filename: str) -> DocumentInfo:
    """
    Full document processing pipeline:
    1. Parse file to text
    2. Chunk text
    3. Embed chunks
    4. Store in ChromaDB
    5. Return document info with metrics
    """
    file_id = str(uuid.uuid4())
    start = time.time()

    logger.info(f"Processing document: {filename} (id={file_id})")

    # Step 1: Parse
    text = parse_file(filepath)
    if not text.strip():
        raise ValueError("File contains no extractable text")

    # Step 2: Chunk
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("No chunks generated from text")

    logger.info(f"Generated {len(chunks)} chunks from {filename}")

    # Step 3: Embed
    embeddings, embed_time = embedding_service.embed_texts(chunks)

    # Step 4: Store in ChromaDB
    collection = _get_collection(file_id)
    chunk_ids = [f"{file_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {"chunk_index": i, "file_id": file_id, "filename": filename}
        for i in range(len(chunks))
    ]

    collection.add(
        ids=chunk_ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas
    )

    # Step 5: Store raw chunks for BM25/graph use
    documents_chunks[file_id] = chunks

    # Step 6: Build document info
    processing_time = (time.time() - start) * 1000
    doc_info = DocumentInfo(
        file_id=file_id,
        filename=filename,
        file_size=filepath.stat().st_size,
        chunk_count=len(chunks),
        processing_time_ms=round(processing_time, 1),
        status="ready"
    )
    documents_registry[file_id] = doc_info

    logger.info(
        f"Document processed: {filename} — "
        f"{len(chunks)} chunks in {processing_time:.0f}ms"
    )
    return doc_info


def get_document(file_id: str) -> DocumentInfo | None:
    """Retrieve document info by ID."""
    return documents_registry.get(file_id)


def get_all_documents() -> list[DocumentInfo]:
    """Return all uploaded documents."""
    return list(documents_registry.values())


def get_chunks(file_id: str) -> list[ChunkInfo]:
    """Return all chunks for a document with embedding previews."""
    collection = _get_collection(file_id)
    results = collection.get(
        include=["documents", "metadatas", "embeddings"]
    )

    chunks = []
    for i in range(len(results["ids"])):
        embedding = results["embeddings"][i] if results["embeddings"] else []
        chunks.append(ChunkInfo(
            chunk_id=results["ids"][i],
            chunk_index=results["metadatas"][i].get("chunk_index", i),
            text=results["documents"][i],
            metadata=results["metadatas"][i],
            embedding_preview=embedding[:5] if embedding else []
        ))

    # Sort by chunk_index
    chunks.sort(key=lambda c: c.chunk_index)
    return chunks


def delete_document(file_id: str) -> bool:
    """Delete a document and its vectors from storage."""
    if file_id not in documents_registry:
        return False

    try:
        chroma_client.delete_collection(f"doc_{file_id.replace('-', '_')}")
    except Exception:
        pass

    documents_registry.pop(file_id, None)
    documents_chunks.pop(file_id, None)
    return True


def search_vectors(file_id: str, query_embedding: list[float], top_k: int = 5) -> list[dict]:
    """
    Search ChromaDB for similar chunks.

    Returns list of dicts: {chunk_index, text, score, metadata}
    """
    collection = _get_collection(file_id)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"]
    )

    matches = []
    if results["ids"] and results["ids"][0]:
        for i in range(len(results["ids"][0])):
            # ChromaDB returns distances; convert to similarity for cosine
            distance = results["distances"][0][i]
            similarity = 1 - distance  # cosine distance -> similarity
            matches.append({
                "chunk_index": results["metadatas"][0][i].get("chunk_index", i),
                "text": results["documents"][0][i],
                "score": round(similarity, 4),
                "metadata": results["metadatas"][0][i]
            })

    return matches
