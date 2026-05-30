# ⚗️ RAG Model Workbench

An interactive, hands-on platform for comparing Retrieval-Augmented Generation (RAG) architectures. Upload a document, select a RAG strategy, and see how retrieval, chunking, and generation work in real time.

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![React](https://img.shields.io/badge/React-18-blue)
![ChromaDB](https://img.shields.io/badge/ChromaDB-0.5-orange)

## 🎯 What It Does

- **Upload** a document (PDF, TXT, or Markdown)
- **Choose** a RAG type: Traditional, Hybrid, Graph, or Agentic
- **See** how the document is chunked and embedded
- **Ask questions** and watch the RAG pipeline execute step by step
- **Compare** all RAG types side by side on the same question
- **Visualize** workflow diagrams, performance metrics, and retrieved chunks

## 🏗️ RAG Types

| Type | How It Works | Best For |
|---|---|---|
| **🎯 Traditional** | Pure vector similarity search (cosine) | Simple, direct Q&A |
| **⚡ Hybrid** | Vector search + BM25 keyword search + Reciprocal Rank Fusion | Questions with specific terms |
| **🕸️ Graph** | Entity extraction → knowledge graph traversal + vector search | Relationship-based questions |
| **🤖 Agentic** | AI agent plans, retrieves, evaluates, and retries autonomously | Complex, multi-step questions |

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- An LLM API key (OpenAI, Google Gemini, or local Ollama) — *optional, works in fallback mode without one*

### 1. Clone & Setup

```bash
git clone https://github.com/your-username/rag-model-workbench.git
cd rag-model-workbench
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env with your LLM API key (optional)

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Open

Visit **http://localhost:5173** and start exploring! 🎉

## 📂 Project Structure

```
rag-model-workbench/
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI entry point
│       ├── config.py         # Environment configuration
│       ├── models/schemas.py # Pydantic models
│       ├── routers/          # API endpoints
│       │   ├── documents.py  # Upload, list, delete
│       │   ├── query.py      # RAG queries & comparison
│       │   └── rag_types.py  # RAG type metadata
│       ├── services/         # Core services
│       │   ├── document_processor.py  # Parse, chunk, embed, store
│       │   ├── embedding_service.py   # Local embeddings (sentence-transformers)
│       │   └── llm_service.py         # LLM abstraction (OpenAI/Gemini/Ollama)
│       └── rag/              # RAG implementations
│           ├── base.py       # Abstract base class
│           ├── traditional.py
│           ├── hybrid.py
│           ├── graph.py
│           └── agentic.py
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx           # Main layout
│       ├── index.css         # Design system
│       ├── api/client.js     # API client
│       └── components/
│           ├── FileUpload.jsx
│           ├── RAGSelector.jsx
│           ├── ChunkViewer.jsx
│           ├── ChatInterface.jsx
│           ├── WorkflowDiagram.jsx
│           ├── CompareView.jsx
│           └── MetricsPanel.jsx
├── .env.example
├── .gitignore
└── README.md
```

## 🔧 Configuration

All settings are in `.env`:

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `openai` | `openai`, `gemini`, or `ollama` |
| `OPENAI_API_KEY` | — | Your OpenAI API key |
| `GEMINI_API_KEY` | — | Your Google Gemini API key |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Local embedding model (no API key needed) |
| `CHUNK_SIZE` | `500` | Characters per chunk |
| `CHUNK_OVERLAP` | `50` | Overlap between chunks |

> **💡 No API key?** The app works in **fallback mode** — it shows retrieved context directly instead of generating an LLM answer.

## 🛠️ Tech Stack

- **Backend**: FastAPI, LangChain, ChromaDB, sentence-transformers, NetworkX
- **Frontend**: React 18, Vite, vanilla CSS (glassmorphism dark mode)
- **Embeddings**: Local `all-MiniLM-L6-v2` (no API key required)
- **LLM**: Pluggable — OpenAI, Google Gemini, or Ollama

## 📄 License

MIT
