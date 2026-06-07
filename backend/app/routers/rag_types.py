"""RAG type information endpoint — metadata about each RAG pipeline."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from app.models.schemas import RAGTypeInfo

router = APIRouter(prefix="/api/rag-types", tags=["RAG Types"])

RAG_TYPE_CATALOG: list[RAGTypeInfo] = [
    # ── RUNNABLE ENGINES ──────────────────────────────────────────────
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
        category="runnable",
        engine_id="traditional",
        origin="Meta AI Research — Lewis et al., 2020 (arxiv:2005.11401)",
        used_by="Every early LLM product (2021-2023). Default in most tutorials.",
        key_insight="'Retrieve-and-stuff' — embed query, find nearest chunks, generate answer.",
        pipeline_diagram=(
            "User Query → Embed Query → ANN Search (top-K)\n"
            "         → Stuff chunks into prompt → LLM → Answer"
        ),
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
        weaknesses=[
            "'Lost in the middle' — LLM ignores middle chunks",
            "No relevance filtering",
            "Single-hop only",
            "No self-correction"
        ],
        best_for="Prototyping, FAQ bots, customer support with bounded knowledge base"
    ),
    RAGTypeInfo(
        id="hybrid",
        name="Hybrid RAG",
        description=(
            "Combines semantic vector search with BM25 keyword search, then "
            "merges results using Reciprocal Rank Fusion (RRF). Catches both "
            "semantically similar AND keyword-matching content that pure vector "
            "search might miss. The production standard for 2024+."
        ),
        icon="⚡",
        color="#f59e0b",
        category="runnable",
        engine_id="hybrid",
        origin="Gao et al., 'RAG for LLMs: A Survey', 2023",
        used_by="LangChain, LlamaIndex, OpenAI Assistants API, AWS Bedrock Knowledge Bases",
        key_insight="Dense retrieval catches semantic similarity; BM25 catches exact keywords. RRF merges without score normalization.",
        pipeline_diagram=(
            "Pre-retrieval:  Query Rewrite / HyDE / Step-Back\n"
            "      ↓\n"
            "Retrieval:      Hybrid Search (BM25 + Dense)\n"
            "      ↓\n"
            "Post-retrieval: Re-ranking → Context Compression → Dedup\n"
            "      ↓\n"
            "Generation:     LLM with filtered, ranked context"
        ),
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
            "Handles technical terms well",
            "+15% accuracy over single-method"
        ],
        weaknesses=[
            "Higher latency than naive RAG",
            "BM25 index adds memory overhead",
            "RRF tuning (k parameter) required"
        ],
        best_for="Production enterprise Q&A, support copilots, document search"
    ),
    RAGTypeInfo(
        id="graph",
        name="GraphRAG",
        description=(
            "Builds a knowledge graph of entities and relationships from your "
            "document. Queries traverse the graph to find connected information "
            "across chunks, enabling multi-hop reasoning. Community summaries "
            "enable global thematic queries — a capability vector search cannot match."
        ),
        icon="🕸️",
        color="#10b981",
        category="runnable",
        engine_id="graph",
        origin="Microsoft Research — Edge et al., 2024 (arxiv:2404.16130)",
        used_by="Microsoft Azure AI, Microsoft Fabric, Samsung (Oxford Semantic), ServiceNow",
        key_insight="Vector RAG answers 'who/what/when'. GraphRAG also answers 'what are the themes across the whole corpus?'",
        pipeline_diagram=(
            "Corpus\n"
            "  ├─ Entity Extraction (LLM) ──────────────▶ Knowledge Graph\n"
            "  ├─ Relationship Extraction (LLM) ────────▶      │\n"
            "  ├─ Community Detection (Leiden algo) ◀───────────┘\n"
            "  ├─ Community Summarization (LLM)\n"
            "  └─ Index: community summaries + entity embeddings\n"
            "\n"
            "Query: Local → entity traversal + text chunks\n"
            "       Global → community summaries + synthesis"
        ),
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
            "Global thematic queries",
            "Community summaries"
        ],
        weaknesses=[
            "Very high index-time LLM cost ($5-50/MB)",
            "Slow to build — not for frequently updated corpora",
            "Overkill for simple single-document Q&A"
        ],
        best_for="Research corpora, legal case analysis, theme extraction across thousands of documents"
    ),
    RAGTypeInfo(
        id="agentic",
        name="Agentic RAG",
        description=(
            "An AI agent autonomously manages the retrieval process. It analyzes "
            "your query, plans a strategy, retrieves and evaluates results, and "
            "can refine its approach if initial results are insufficient. Shows "
            "visible reasoning trace with self-correction and web search fallback."
        ),
        icon="🤖",
        color="#ec4899",
        category="runnable",
        engine_id="agentic",
        origin="Extends CRAG + FLARE + Self-RAG; productized by LangGraph, CrewAI (2024-2025)",
        used_by="Perplexity AI, you.com, Glean, all major production AI assistants",
        key_insight="The LLM is the reasoning engine driving retrieval — not just a passive recipient of context.",
        pipeline_diagram=(
            "Query → [Router] → Should I retrieve? ── No ──▶ Answer\n"
            "            │\n"
            "           Yes\n"
            "            ↓\n"
            "       [Retrieve] → [Grade Docs] → Relevant? ──▶ Generate\n"
            "            │              │\n"
            "            │           No/Low\n"
            "            │              ↓\n"
            "            │   [Query Reformulate] ──────────────────┘\n"
            "            ↓\n"
            "       [Generate] → [Self-check: Hallucination?]\n"
            "            │\n"
            "        Passes → Final Answer"
        ),
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
            "Handles complex multi-hop queries",
            "Web search fallback",
            "Visible reasoning process"
        ],
        weaknesses=[
            "3-5x slower than naive RAG (multiple LLM calls)",
            "Non-deterministic — harder to test",
            "Cost scales with loop iterations"
        ],
        best_for="Research assistants, complex Q&A, systems with unpredictable query complexity"
    ),

    # ── SHOWCASE ARCHITECTURES ────────────────────────────────────────
    RAGTypeInfo(
        id="naive",
        name="Naive RAG",
        description=(
            "The original RAG pattern from the 2020 Lewis et al. paper. "
            "Fixed-size chunks, single embedding pass, cosine similarity search, "
            "and a simple stuff-into-prompt generation step. The foundation "
            "all modern RAG builds upon."
        ),
        icon="📄",
        color="#8b5cf6",
        category="showcase",
        engine_id="traditional",
        origin="Meta AI Research — Lewis et al., 2020 (arxiv:2005.11401)",
        used_by="Every early LLM product (2021-2023). Still the default in tutorials.",
        key_insight="Simple embedding + similarity search proves sufficient for bounded, single-document Q&A.",
        pipeline_diagram=(
            "Documents\n"
            "  └─ Fixed-size split (512 tokens) → Embed → Vector DB\n"
            "\n"
            "User Query → embed(query)\n"
            "          → ANN Search (top-K cosine similarity)\n"
            "          → Stuff all K chunks into prompt\n"
            "          → LLM → Answer"
        ),
        workflow_steps=[
            "Split Documents (Fixed-size)",
            "Embed All Chunks",
            "Store in Vector DB",
            "Embed Query",
            "Cosine Similarity Search",
            "Stuff Chunks into Prompt",
            "LLM Generation"
        ],
        strengths=[
            "Extremely simple to implement",
            "Works well for single-document Q&A",
            "Low infrastructure cost",
            "Fast and predictable"
        ],
        weaknesses=[
            "'Lost in the middle' — LLM ignores middle context",
            "No relevance filtering",
            "Single-hop reasoning only",
            "No self-correction"
        ],
        best_for="Prototyping, FAQ bots, customer support with a bounded knowledge base"
    ),
    RAGTypeInfo(
        id="advanced",
        name="Advanced RAG",
        description=(
            "Adds pre-retrieval query transforms (HyDE, Step-Back, Multi-Query) "
            "and post-retrieval stages (cross-encoder re-ranking, context compression, "
            "deduplication) around the naive pipeline. The current production standard "
            "for enterprise Q&A systems."
        ),
        icon="🚀",
        color="#0ea5e9",
        category="showcase",
        engine_id="hybrid",
        origin="Gao et al., 'RAG for LLMs: A Survey', 2023",
        used_by="LangChain, LlamaIndex, OpenAI Assistants API, AWS Bedrock",
        key_insight="Pre-retrieval query transformation + post-retrieval re-ranking together yield +20-30% precision over naive RAG.",
        pipeline_diagram=(
            "Pre-retrieval:  Query Rewrite / HyDE / Step-Back\n"
            "      ↓\n"
            "Retrieval:      Hybrid Search (BM25 + Dense)\n"
            "      ↓\n"
            "Post-retrieval: Cross-encoder Re-rank\n"
            "             → Context Compression\n"
            "             → Dedup\n"
            "      ↓\n"
            "Generation:     LLM with filtered, ranked context"
        ),
        workflow_steps=[
            "Query Transform (HyDE/Multi-Query)",
            "Hybrid Search (BM25 + Dense)",
            "Cross-encoder Re-ranking",
            "Context Compression",
            "Deduplication",
            "LLM Generation"
        ],
        strengths=[
            "+20% retrieval precision with HyDE",
            "+15% accuracy with hybrid search",
            "+5-15% top-K with cross-encoder re-rank",
            "Reduced noise via context compression"
        ],
        weaknesses=[
            "Higher latency (multiple pre/post steps)",
            "More infrastructure components",
            "Re-ranker adds API cost"
        ],
        best_for="Production enterprise Q&A, support copilots, document search"
    ),
    RAGTypeInfo(
        id="modular",
        name="Modular RAG",
        description=(
            "Every component is decoupled and independently swappable — "
            "hot-swap embedding models without touching the chunker, swap vector DBs "
            "without re-indexing, A/B test re-rankers independently. Central orchestration "
            "coordinates all data flow."
        ),
        icon="🧩",
        color="#14b8a6",
        category="showcase",
        engine_id=None,
        origin="Yunfan Gao et al., 'Modular RAG: Transforming RAG into LEGO-like Reconfigurable Frameworks', 2024",
        used_by="Microsoft Azure AI Search, LlamaIndex Pipelines, Haystack",
        key_insight="Pipeline-as-code: independently swap any component without touching others. Enables systematic A/B testing.",
        pipeline_diagram=(
            "[Search Module]  ←→  [Retrieval Module]  ←→  [Re-rank Module]\n"
            "      ↕                     ↕                       ↕\n"
            "[Memory Module]  ←→  [Generator Module]  ←→  [Routing Module]\n"
            "\n"
            "All modules independently swappable via central orchestrator"
        ),
        workflow_steps=[
            "Route Query",
            "Select Retrieval Module",
            "Search Module(s)",
            "Re-rank Module",
            "Memory Module (optional)",
            "Generator Module"
        ],
        strengths=[
            "Hot-swap any component independently",
            "Systematic A/B testing of each stage",
            "Multi-tenant platform support",
            "No re-indexing when swapping generators"
        ],
        weaknesses=[
            "Higher engineering complexity",
            "Orchestration overhead",
            "Overkill for simple use cases"
        ],
        best_for="Multi-tenant platforms, teams doing systematic A/B testing, enterprises with multiple departments"
    ),
    RAGTypeInfo(
        id="lazygraphrag",
        name="LazyGraphRAG",
        description=(
            "Eliminates the expensive pre-build of community summaries from GraphRAG. "
            "Uses NLP phrase extraction at index time (same cost as vector RAG), "
            "then dynamically generates summaries only for relevant communities at "
            "query time — budget-aware lazy evaluation."
        ),
        icon="💤",
        color="#22d3ee",
        category="showcase",
        engine_id="graph",
        origin="Microsoft Research — Darren Edge, 2024; production update June 2025",
        used_by="Microsoft Discovery (agentic research platform on Azure), Azure Local services",
        key_insight="Index cost = vector RAG cost ($0.10/MB) but query quality surpasses full GraphRAG. Best of both worlds.",
        pipeline_diagram=(
            "Index time: NLP phrase extraction only (no LLM calls)\n"
            "          + lightweight community detection\n"
            "\n"
            "Query time: Budget-aware query expansion\n"
            "          → Dynamically generate summaries for relevant\n"
            "            communities (lazy evaluation)\n"
            "          → Synthesize answer"
        ),
        workflow_steps=[
            "NLP Phrase Extraction",
            "Community Detection (no LLM)",
            "Budget-aware Query Expansion",
            "Lazy Community Summarization",
            "Synthesis"
        ],
        strengths=[
            "Index cost identical to vector RAG",
            "Outperforms GraphRAG on local queries",
            "Strong global query performance",
            "Won 96/96 head-to-head benchmarks (BenchmarkQED)"
        ],
        weaknesses=[
            "Higher query latency than vector RAG",
            "Requires community detection setup",
            "Less mature than GraphRAG"
        ],
        best_for="Large private datasets where GraphRAG quality is needed but full GraphRAG cost is prohibitive"
    ),
    RAGTypeInfo(
        id="lightrag",
        name="LightRAG",
        description=(
            "Dual-level retrieval over a graph index. Low-level retrieval handles "
            "entity-specific queries (who, what, specific facts). High-level retrieval "
            "handles concept/topic queries (how, why, thematic). Hybrid mode merges both "
            "for comprehensive answers."
        ),
        icon="💡",
        color="#a78bfa",
        category="showcase",
        engine_id="graph",
        origin="University of Hong Kong — Guo et al., 2024 (arxiv:2410.05779)",
        used_by="Open source; widely adopted as a cheaper GraphRAG alternative",
        key_insight="Dual-level retrieval is more flexible than GraphRAG's local/global split. Faster index time and incremental updates.",
        pipeline_diagram=(
            "Low-level retrieval:  Entity-specific queries\n"
            "  (who, what, specific facts)\n"
            "  → Entity node + adjacent chunks\n"
            "\n"
            "High-level retrieval: Concept/topic queries\n"
            "  (how, why, thematic)\n"
            "  → Concept subgraph traversal\n"
            "\n"
            "Hybrid mode: Both levels merged → synthesized answer"
        ),
        workflow_steps=[
            "KG Construction (simpler than GraphRAG)",
            "Route Query (low/high/hybrid)",
            "Low-level Entity Traversal",
            "High-level Concept Traversal",
            "Merge Results",
            "LLM Synthesis"
        ],
        strengths=[
            "Faster index time than GraphRAG",
            "Incremental graph updates",
            "Dual-level retrieval flexibility",
            "Good scalability for dynamic corpora"
        ],
        weaknesses=[
            "Less mature than Microsoft GraphRAG",
            "No hierarchical community summaries",
            "Graph construction still has LLM cost"
        ],
        best_for="Knowledge-intensive Q&A, multi-hop reasoning, teams needing graph retrieval without full GraphRAG pipeline"
    ),
    RAGTypeInfo(
        id="crag",
        name="Corrective RAG (CRAG)",
        description=(
            "Adds a relevance evaluator that scores each retrieved chunk. High-scoring "
            "chunks proceed to generation; low-scoring chunks trigger a web search fallback; "
            "mixed results trigger knowledge refinement — decomposing docs into sentence-level "
            "strips and filtering by relevance before generation."
        ),
        icon="✅",
        color="#f43f5e",
        category="showcase",
        engine_id="agentic",
        origin="Yan et al., 'Corrective Retrieval Augmented Generation', 2024 (arxiv:2401.15884)",
        used_by="LangGraph CRAG tutorial; Perplexity-style systems; high-accuracy production RAG",
        key_insight="Knowledge refinement: decompose retrieved docs into sentence-level strips, score each, discard low-relevance strips.",
        pipeline_diagram=(
            "Retrieve top-K docs\n"
            "       │\n"
            "[Relevance Evaluator] ── Score each doc (0.0–1.0)\n"
            "       │\n"
            "       ├── All HIGH (>threshold) ──▶ Use docs → Generate\n"
            "       │\n"
            "       ├── All LOW ───────────────▶ Discard → Web Search → Generate\n"
            "       │\n"
            "       └── Mixed ─────────────────▶ Keep relevant + Web Search\n"
            "                                          ↓\n"
            "                                 [Knowledge Refinement]\n"
            "                                 Strip, decompose, filter"
        ),
        workflow_steps=[
            "Retrieve top-K docs",
            "Score Relevance per Doc",
            "Route: High / Low / Mixed",
            "Knowledge Refinement (if mixed)",
            "Web Search Fallback (if low)",
            "Merge & Generate"
        ],
        strengths=[
            "Eliminates noise from irrelevant retrievals",
            "Web search prevents 'I don't know' failures",
            "Knowledge refinement reduces hallucination",
            "Claim-level verification"
        ],
        weaknesses=[
            "Additional LLM call for scoring",
            "Requires web search API for fallback",
            "Higher latency than simple RAG"
        ],
        best_for="Medical, legal, financial systems where hallucination cost is high. Any domain requiring cited, grounded answers."
    ),
    RAGTypeInfo(
        id="selfrag",
        name="Self-RAG",
        description=(
            "The model itself is fine-tuned to generate special reflection tokens inline. "
            "[Retrieve] decides whether to retrieve; [ISREL] checks passage relevance; "
            "[ISSUP] verifies claim support; [ISUSE] scores final usefulness. "
            "Adaptive retrieval — skips retrieval for simple factual queries."
        ),
        icon="🪞",
        color="#fb923c",
        category="showcase",
        engine_id=None,
        origin="Asai et al., 'Self-RAG: Learning to Retrieve, Generate, and Critique', CMU + UW, 2023 (arxiv:2310.11511)",
        used_by="Research-stage; increasingly adopted in fine-tuned domain-specific models",
        key_insight="Unlike CRAG (separate agent loop), Self-RAG bakes retrieval decisions INTO the model's generation via fine-tuning.",
        pipeline_diagram=(
            "Query → Generate first tokens\n"
            "           │\n"
            "     [Retrieve] = Yes? → Retrieve → Insert passages\n"
            "           │\n"
            "     Continue with [ISREL] check per passage\n"
            "           │\n"
            "     [ISSUP] check per generated claim\n"
            "           │\n"
            "     [ISUSE] final usefulness check\n"
            "           │\n"
            "     Final answer (with or without retrieval)"
        ),
        workflow_steps=[
            "Generate Initial Tokens",
            "[Retrieve] Decision Token",
            "Conditional Retrieval",
            "[ISREL] Relevance Check",
            "Continue Generation",
            "[ISSUP] Claim Support Check",
            "[ISUSE] Usefulness Check",
            "Final Answer"
        ],
        strengths=[
            "Adaptive retrieval (skips when not needed)",
            "Fine-grained claim-level verification",
            "More efficient than always retrieving",
            "Built-in reflection mechanism"
        ],
        weaknesses=[
            "Requires fine-tuned base model",
            "Not usable with GPT-4/Claude without fine-tuning",
            "More complex to evaluate",
            "Llama-2 7B/13B checkpoints only publicly available"
        ],
        best_for="Controllable generation requirements; domain-specific models where fine-tuning is feasible"
    ),
    RAGTypeInfo(
        id="hyde",
        name="HyDE RAG",
        description=(
            "Hypothetical Document Embeddings: instead of embedding the raw query, "
            "the LLM first generates a hypothetical answer, then that answer is embedded "
            "and used for retrieval. Bridges the embedding space gap between short queries "
            "and long document passages."
        ),
        icon="🔮",
        color="#d946ef",
        category="showcase",
        engine_id="hybrid",
        origin="Gao et al., 'Precise Zero-Shot Dense Retrieval without Relevance Labels', Stanford, 2022 (arxiv:2212.10496)",
        used_by="LangChain (HypotheticalDocumentEmbedder), LlamaIndex; widely used in production advanced RAG pipelines",
        key_insight="embed(query) ≠ embed(document). embed(hypothetical_answer_to_query) ≈ embed(relevant_document).",
        pipeline_diagram=(
            "Standard RAG: embed(query) → search(corpus)\n"
            "\n"
            "HyDE:         query\n"
            "                │\n"
            "              LLM generates hypothetical answer\n"
            "                │\n"
            "              embed(hypothetical_answer) → search(corpus)\n"
            "                │\n"
            "              Real documents retrieved → Final answer"
        ),
        workflow_steps=[
            "Generate Hypothetical Answer (LLM)",
            "Embed Hypothetical Answer",
            "Search Corpus with Hyp. Embedding",
            "Retrieve Real Documents",
            "Build Context",
            "LLM Generation"
        ],
        strengths=[
            "+20% retrieval precision on abstract queries",
            "Works with any embedding model",
            "No fine-tuning required",
            "HyPE variant: zero query-time LLM cost"
        ],
        weaknesses=[
            "Adds 1 LLM call per query (latency)",
            "Hypothetical doc may hallucinate",
            "Less effective with very specialized vocabulary"
        ],
        best_for="Abstract queries, research corpora, technical documentation, developer Q&A (Stack Overflow-style)"
    ),
    RAGTypeInfo(
        id="flare",
        name="FLARE",
        description=(
            "Forward-Looking Active REtrieval: instead of retrieving once before generation, "
            "FLARE retrieves DURING generation when the model becomes uncertain about upcoming "
            "tokens. Uses the predicted upcoming sentence as the retrieval query."
        ),
        icon="🔦",
        color="#84cc16",
        category="showcase",
        engine_id=None,
        origin="Jiang et al., 'Active Retrieval Augmented Generation', UCB + CMU, 2023 (arxiv:2305.06983)",
        used_by="LangChain (FlareChain); research pipelines needing iterative mid-generation retrieval",
        key_insight="Retrieval during generation, not just before. Uses confidence of upcoming tokens as the trigger.",
        pipeline_diagram=(
            "Start generating answer token by token\n"
            "           │\n"
            "     Confidence check on next tokens\n"
            "           │\n"
            "     ┌─── High confidence ──▶ Continue generating\n"
            "     │\n"
            "     └─── Low confidence ──▶ Use upcoming predicted tokens as query\n"
            "                                       │\n"
            "                               Retrieve relevant docs\n"
            "                                       │\n"
            "                               Continue generation with new context\n"
            "                                       │\n"
            "                               Repeat until answer complete"
        ),
        workflow_steps=[
            "Begin Generation",
            "Check Token Confidence",
            "Predict Upcoming Sentence",
            "Use Prediction as Query",
            "Mid-generation Retrieval",
            "Continue with New Context",
            "Final Answer"
        ],
        strengths=[
            "Retrieves exactly what's needed mid-generation",
            "No wasted retrieval for confident claims",
            "Handles long-form generation well",
            "Different context for different answer sections"
        ],
        weaknesses=[
            "Complex to implement",
            "Unpredictable latency",
            "Requires token-level confidence scores",
            "Hard to debug"
        ],
        best_for="Long-form generation — research reports, multi-section document drafting"
    ),
    RAGTypeInfo(
        id="fusion",
        name="Fusion RAG",
        description=(
            "Generates N query variations using an LLM, runs all N queries against "
            "the vector DB in parallel, then merges results via Reciprocal Rank Fusion (RRF). "
            "Captures relevant content that different phrasings surface — robust to "
            "imprecise user queries."
        ),
        icon="🔀",
        color="#06b6d4",
        category="showcase",
        engine_id="hybrid",
        origin="'RAG-Fusion', Raudaschl, 2023; popularized through LangChain",
        used_by="LangChain (RAGFusionRetriever); multiple production search products",
        key_insight="Multiple query variants surface different relevant chunks; RRF doesn't require score normalization across runs.",
        pipeline_diagram=(
            "User Query\n"
            "    │\n"
            "    ▼\n"
            "LLM generates N query variations (default: 4)\n"
            "    │\n"
            "    ▼\n"
            "Run all N queries against vector DB (parallel)\n"
            "    │\n"
            "    ▼\n"
            "Merge results via Reciprocal Rank Fusion (RRF)\n"
            "  score = Σ 1/(k + rank_i)  [k=60 standard]\n"
            "    │\n"
            "    ▼\n"
            "Re-ranked, deduplicated context → Generate"
        ),
        workflow_steps=[
            "Generate N Query Variations (LLM)",
            "Parallel Vector Searches",
            "Reciprocal Rank Fusion",
            "Deduplication",
            "Re-ranked Context",
            "LLM Generation"
        ],
        strengths=[
            "Robust to imprecise user phrasing",
            "Surfaces more relevant chunks",
            "RRF works without score normalization",
            "Good for non-technical users on technical knowledge bases"
        ],
        weaknesses=[
            "N+1 LLM calls (query generation + retrieval)",
            "Higher latency from parallel searches",
            "Can surface redundant context"
        ],
        best_for="Any system where users phrase queries imprecisely; non-technical users querying technical knowledge bases"
    ),
    RAGTypeInfo(
        id="multimodal",
        name="Multimodal RAG",
        description=(
            "Indexes and retrieves across text, images, tables, and charts. "
            "ColPali embeds entire PDF pages as images using a vision model — "
            "no text extraction required. Retrieves the right page even when "
            "the answer is in a chart or diagram."
        ),
        icon="🖼️",
        color="#f97316",
        category="showcase",
        engine_id=None,
        origin="Emerging standard 2024-2025; ColPali (Faysse et al., 2024) is the leading indexing approach",
        used_by="Google (Gemini multimodal context), Microsoft Azure AI multimodal search, Cohere (Embed v3 multimodal)",
        key_insight="ColPali: embed whole PDF pages as images. No text extraction. Works even when answers are in charts or diagrams.",
        pipeline_diagram=(
            "Ingest:  PDF pages → render as images (ColPali)\n"
            "         or: extract text + tables + figures separately\n"
            "\n"
            "Embed:   Text chunks → text embedding model\n"
            "         Images/charts → vision embedding model (CLIP, ColPali)\n"
            "         Tables → structured embedding\n"
            "\n"
            "Index:   Multi-modal vector store (named vectors)\n"
            "\n"
            "Query:   Text query → search text AND image vectors\n"
            "         → Retrieve text + relevant images/tables\n"
            "\n"
            "Generate: Multimodal LLM (GPT-4V, Claude 3) with mixed context"
        ),
        workflow_steps=[
            "Render Pages as Images (ColPali)",
            "Embed: Text + Image + Tables",
            "Store in Multi-modal Vector DB",
            "Embed Query",
            "Cross-modal Search",
            "Retrieve Text + Images",
            "Multimodal LLM Generation"
        ],
        strengths=[
            "Handles charts, diagrams, images",
            "ColPali: no text extraction needed",
            "Works on complex PDF layouts",
            "Retrieves the right page, not just text"
        ],
        weaknesses=[
            "Requires vision embedding infrastructure",
            "Higher storage (image embeddings)",
            "Needs multimodal LLM for generation",
            "ColPali inference is compute-heavy"
        ],
        best_for="Technical manuals with diagrams, financial reports with charts, product catalogs, medical imaging, slide decks"
    ),
    RAGTypeInfo(
        id="structrag",
        name="StructRAG",
        description=(
            "Rather than using a fixed retrieval strategy, StructRAG dynamically selects "
            "the best data structure for each query: Graph for relational queries, "
            "Table for analytical/comparative queries, Chunk for simple lookups, "
            "Algorithm for procedural queries, Summary for thematic queries."
        ),
        icon="🏗️",
        color="#f59e0b",
        category="showcase",
        engine_id=None,
        origin="Li et al., 'StructRAG: Boosting Knowledge Intensive Reasoning via Hybrid Information Structurization', 2024",
        used_by="Research-stage; referenced by Onyx, Atlan enterprise RAG platform comparisons",
        key_insight="Dynamic structure selection: different query types need fundamentally different data representations.",
        pipeline_diagram=(
            "Query → [Structure Router LLM] → Which structure fits?\n"
            "\n"
            "    ├── Graph   → for relational, multi-hop queries\n"
            "    ├── Table   → for comparative, analytical queries\n"
            "    ├── Chunk   → for simple factual lookups\n"
            "    ├── Algorithm → for process/procedural queries\n"
            "    └── Summary  → for global/thematic queries\n"
            "\n"
            "→ Convert relevant docs to selected structure\n"
            "→ Retrieve from that structure → Generate"
        ),
        workflow_steps=[
            "Route Query via Structure Router",
            "Select Data Structure Type",
            "Convert Docs to Selected Structure",
            "Structure-aware Retrieval",
            "Structured Context Assembly",
            "LLM Generation"
        ],
        strengths=[
            "Optimal structure per query type",
            "Handles both structured + unstructured",
            "Strong on knowledge-intensive benchmarks",
            "Flexible to heterogeneous query types"
        ],
        weaknesses=[
            "Research-stage: limited production tooling",
            "Structure conversion adds overhead",
            "Router accuracy is critical"
        ],
        best_for="Knowledge-intensive reasoning tasks with heterogeneous query types requiring structured and unstructured reasoning"
    ),
]


@router.get("", response_model=list[RAGTypeInfo])
async def list_rag_types():
    """Return metadata about all available RAG types."""
    return RAG_TYPE_CATALOG


@router.get("/{rag_id}", response_model=RAGTypeInfo)
async def get_rag_type(rag_id: str):
    """Return detailed metadata about a single RAG type."""
    for rag in RAG_TYPE_CATALOG:
        if rag.id == rag_id:
            return rag
    raise HTTPException(status_code=404, detail=f"RAG type '{rag_id}' not found")
