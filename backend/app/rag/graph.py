"""Graph RAG — entity extraction + knowledge graph traversal + vector search."""

from __future__ import annotations

import re
import time
import logging
import networkx as nx

from app.rag.base import BaseRAG
from app.models.schemas import QueryResponse, RetrievedChunk
from app.services.embedding_service import embedding_service
from app.services.document_processor import search_vectors, documents_chunks
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

# ── In-memory graph store ─────────────────────────────────────────
# Maps file_id -> NetworkX graph
document_graphs: dict[str, nx.Graph] = {}


def extract_entities_simple(text: str) -> list[str]:
    """
    Extract entities from text using simple heuristics.
    Identifies capitalized phrases as potential entities.
    """
    # Find capitalized multi-word phrases (likely proper nouns / entities)
    patterns = [
        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b',  # Multi-word proper nouns
        r'\b([A-Z][a-z]{2,})\b',  # Single capitalized words (3+ chars)
    ]

    entities = set()
    for pattern in patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            entity = match.strip()
            # Filter out common words that happen to be capitalized
            stopwords = {
                "The", "This", "That", "These", "Those", "There",
                "Here", "When", "Where", "What", "Which", "How",
                "And", "But", "For", "Not", "Are", "Was", "Were",
                "Has", "Have", "Had", "Can", "Could", "Would",
                "Should", "May", "Might", "Will", "Did", "Does",
                "Its", "Also", "However", "Therefore", "Thus",
                "While", "Although", "Because", "Since", "Before",
                "After", "Until", "Once", "Each", "Every", "Some",
                "Many", "Most", "Other", "Such", "Only", "Both",
                "Few", "All", "Any", "More", "Less", "Than"
            }
            if entity not in stopwords and len(entity) > 2:
                entities.add(entity)

    return list(entities)


def build_knowledge_graph(file_id: str, chunks: list[str]) -> nx.Graph:
    """
    Build a knowledge graph from document chunks.

    Nodes = entities (extracted from text)
    Edges = co-occurrence in the same chunk (entities that appear together are related)
    """
    G = nx.Graph()

    for chunk_idx, chunk in enumerate(chunks):
        entities = extract_entities_simple(chunk)

        # Add nodes
        for entity in entities:
            if G.has_node(entity):
                G.nodes[entity]["frequency"] = G.nodes[entity].get("frequency", 1) + 1
                G.nodes[entity]["chunks"].append(chunk_idx)
            else:
                G.add_node(entity, frequency=1, chunks=[chunk_idx])

        # Add edges between entities that co-occur in the same chunk
        for i in range(len(entities)):
            for j in range(i + 1, len(entities)):
                if G.has_edge(entities[i], entities[j]):
                    G[entities[i]][entities[j]]["weight"] += 1
                    G[entities[i]][entities[j]]["shared_chunks"].append(chunk_idx)
                else:
                    G.add_edge(
                        entities[i], entities[j],
                        weight=1, shared_chunks=[chunk_idx]
                    )

    document_graphs[file_id] = G
    logger.info(
        f"Built knowledge graph for {file_id}: "
        f"{G.number_of_nodes()} nodes, {G.number_of_edges()} edges"
    )
    return G


def graph_search(
    file_id: str, question: str, top_k: int = 5
) -> tuple[list[dict], dict]:
    """
    Search the knowledge graph for relevant chunks.

    1. Extract entities from the question
    2. Find matching nodes in the graph
    3. Expand to neighbors (1-hop)
    4. Collect all chunk indices referenced by matched + neighbor nodes
    5. Return ranked results + graph info for visualization

    Returns: (results list, graph_info dict)
    """
    raw_chunks = documents_chunks.get(file_id, [])
    if not raw_chunks:
        return [], {}

    # Build graph if not already built
    if file_id not in document_graphs:
        build_knowledge_graph(file_id, raw_chunks)

    G = document_graphs[file_id]
    if G.number_of_nodes() == 0:
        return [], {"nodes": 0, "edges": 0}

    # Extract entities from question
    query_entities = extract_entities_simple(question)

    # Also try matching by substring for lower-case queries
    query_lower = question.lower()
    matched_nodes = set()
    for node in G.nodes():
        if node.lower() in query_lower or any(
            qe.lower() in node.lower() or node.lower() in qe.lower()
            for qe in query_entities
        ):
            matched_nodes.add(node)

    # Expand to neighbors (1-hop traversal)
    expanded_nodes = set(matched_nodes)
    for node in matched_nodes:
        neighbors = list(G.neighbors(node))
        # Sort neighbors by edge weight, take top ones
        neighbors.sort(
            key=lambda n: G[node][n].get("weight", 0), reverse=True
        )
        expanded_nodes.update(neighbors[:5])

    # Collect chunk indices from all matched and expanded nodes
    chunk_scores: dict[int, float] = {}
    for node in expanded_nodes:
        node_data = G.nodes[node]
        freq = node_data.get("frequency", 1)
        for chunk_idx in node_data.get("chunks", []):
            is_direct = node in matched_nodes
            score_boost = 2.0 if is_direct else 1.0
            chunk_scores[chunk_idx] = (
                chunk_scores.get(chunk_idx, 0) + freq * score_boost
            )

    # Sort by score and take top_k
    sorted_chunks = sorted(
        chunk_scores.items(), key=lambda x: x[1], reverse=True
    )[:top_k]

    # Normalize scores
    max_score = sorted_chunks[0][1] if sorted_chunks else 1
    results = []
    for chunk_idx, score in sorted_chunks:
        if chunk_idx < len(raw_chunks):
            results.append({
                "chunk_index": chunk_idx,
                "text": raw_chunks[chunk_idx],
                "score": round(score / max_score, 4),
                "metadata": {
                    "source": "graph",
                    "file_id": file_id,
                    "matched_entities": [
                        n for n in expanded_nodes
                        if chunk_idx in G.nodes[n].get("chunks", [])
                    ][:5]
                }
            })

    graph_info = {
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "query_entities": query_entities,
        "matched_nodes": list(matched_nodes)[:10],
        "expanded_nodes": len(expanded_nodes),
    }

    return results, graph_info


class GraphRAG(BaseRAG):
    """
    Graph RAG Pipeline:
    1. Extract entities from query
    2. Search knowledge graph (match + 1-hop expansion)
    3. Also run vector search for coverage
    4. Merge graph + vector results
    5. Generate answer with entity-enriched context
    """

    @property
    def rag_type(self) -> str:
        return "graph"

    @property
    def display_name(self) -> str:
        return "Graph RAG"

    async def query(self, question: str, file_id: str, top_k: int = 5) -> QueryResponse:
        total_start = time.time()
        workflow_steps = []

        # Step 1: Entity extraction from query
        entity_start = time.time()
        query_entities = extract_entities_simple(question)
        entity_time = (time.time() - entity_start) * 1000
        workflow_steps.append(self._make_step(
            1, "Extract Query Entities",
            "Identify key entities and concepts from the question",
            entity_time,
            input_preview=question,
            output_preview=f"Entities: {query_entities[:5]}"
        ))

        # Step 2: Graph search
        graph_start = time.time()
        graph_results, graph_info = graph_search(file_id, question, top_k)
        graph_time = (time.time() - graph_start) * 1000
        workflow_steps.append(self._make_step(
            2, "Knowledge Graph Traversal",
            f"Search {graph_info.get('total_nodes', 0)}-node graph, "
            f"matched {len(graph_info.get('matched_nodes', []))} entities, "
            f"expanded to {graph_info.get('expanded_nodes', 0)} nodes",
            graph_time,
            input_preview=f"Entities: {graph_info.get('query_entities', [])}",
            output_preview=f"Found {len(graph_results)} graph-matched chunks"
        ))

        # Step 3: Vector search (complementary)
        query_embedding, embed_time = embedding_service.embed_query(question)
        vec_start = time.time()
        vector_results = search_vectors(file_id, query_embedding, top_k)
        vec_time = (time.time() - vec_start) * 1000
        workflow_steps.append(self._make_step(
            3, "Vector Search (Complementary)",
            "Run semantic search to catch chunks the graph may have missed",
            vec_time + embed_time,
            input_preview=f"Query vector ({len(query_embedding)}d)",
            output_preview=f"Found {len(vector_results)} semantic matches"
        ))

        # Step 4: Merge results (vector-first for semantic coverage, graph fills remaining)
        # Vector results are prioritized because graph entity matching can return
        # many chunks that contain a matched entity but don't answer the question.
        # Graph results are added for any slots the vector search didn't fill.
        merge_start = time.time()
        seen_indices = set()
        merged = []

        # Mark which chunks appeared in graph results (for entity annotation later)
        graph_chunk_indices = {r["chunk_index"] for r in graph_results}
        graph_results_by_index = {r["chunk_index"]: r for r in graph_results}

        # Vector results first (semantically relevant to the actual question)
        for r in vector_results:
            if r["chunk_index"] not in seen_indices and len(merged) < top_k:
                chunk = dict(r)
                # Carry over entity metadata if this chunk also appeared in graph results
                if chunk["chunk_index"] in graph_chunk_indices:
                    graph_meta = graph_results_by_index[chunk["chunk_index"]].get("metadata", {})
                    chunk["metadata"] = {**chunk["metadata"], **graph_meta}
                merged.append(chunk)
                seen_indices.add(chunk["chunk_index"])

        # Fill any remaining slots with graph-only results (entity-matched but not in vector top-k)
        for r in graph_results:
            if r["chunk_index"] not in seen_indices and len(merged) < top_k:
                merged.append(r)
                seen_indices.add(r["chunk_index"])

        merge_time = (time.time() - merge_start) * 1000
        workflow_steps.append(self._make_step(
            4, "Merge Graph + Vector Results",
            f"Combine {len(graph_results)} graph + {len(vector_results)} vector results",
            merge_time,
            input_preview=f"Graph({len(graph_results)}) + Vector({len(vector_results)})",
            output_preview=f"Merged: {len(merged)} unique chunks"
        ))

        # Step 5: Build context with entity annotations
        context_parts = []
        retrieved_chunks = []
        for r in merged:
            entities = r.get("metadata", {}).get("matched_entities", [])
            entity_note = f" [Entities: {', '.join(entities)}]" if entities else ""
            context_parts.append(r["text"] + entity_note)
            retrieved_chunks.append(RetrievedChunk(
                chunk_index=r["chunk_index"],
                text=r["text"],
                score=r["score"],
                metadata=r.get("metadata", {})
            ))
        context = "\n\n---\n\n".join(context_parts)
        workflow_steps.append(self._make_step(
            5, "Build Entity-Enriched Context",
            "Assemble context with entity annotations for the LLM",
            0.1,
            input_preview=f"{len(retrieved_chunks)} chunks with entities",
            output_preview=f"Context: {len(context)} chars"
        ))

        # Step 6: Generate answer
        has_entity_context = any(
            r.get("metadata", {}).get("matched_entities") for r in merged
        )
        if has_entity_context:
            prompt = (
                "You are a helpful assistant. Answer the question using ONLY the "
                "context provided below. This context was retrieved using a knowledge "
                "graph that maps entity relationships. Pay attention to entity "
                "annotations when connecting information across chunks."
            )
        else:
            prompt = (
                "You are a helpful assistant. Answer the question using ONLY the "
                "context provided below. Be concise and accurate."
            )
        answer, gen_time = llm_service.generate(prompt, context, question)
        workflow_steps.append(self._make_step(
            6, "LLM Generation",
            "Generate answer with entity-relationship awareness",
            gen_time,
            input_preview=f"Prompt + {len(context)} chars enriched context",
            output_preview=answer[:200]
        ))

        total_time = (time.time() - total_start) * 1000
        retrieval_time = graph_time + vec_time + merge_time

        return QueryResponse(
            question=question,
            answer=answer,
            rag_type=self.rag_type,
            retrieved_chunks=retrieved_chunks,
            workflow_steps=workflow_steps,
            total_time_ms=round(total_time, 1),
            retrieval_time_ms=round(retrieval_time, 1),
            generation_time_ms=round(gen_time, 1),
            embedding_time_ms=round(embed_time, 1),
            chunks_searched=len(merged),
            file_id=file_id
        )
