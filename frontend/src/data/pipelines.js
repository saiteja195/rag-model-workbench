/**
 * Structured pipeline diagrams for every architecture, keyed by RAG type id.
 *
 * A diagram is a list of lanes (phases). A lane is a top-to-bottom list of
 * steps; a step is a node, or a branch holding several alternative or
 * parallel paths. `layout: 'grid'` lays nodes out without arrows, for
 * architectures made of independent modules.
 *
 * Node kinds: input, process, embed, search, llm, store, decision, output, loop.
 */

const node = (kind, label, note) => ({ kind, label, note });
const choice = (...paths) => ({ branch: paths, mode: 'choice' });
const parallel = (...paths) => ({ branch: paths, mode: 'parallel' });
const path = (when, ...steps) => ({ when, steps });

const query = (...steps) => ({ title: 'Query', steps });

export const PIPELINES = {
  traditional: {
    lanes: [
      query(
        node('input', 'User question'),
        node('embed', 'Embed question'),
        node('search', 'Similarity search', 'Top-K chunks from the vector store'),
        node('process', 'Build prompt', 'Stuff the chunks into the context'),
        node('llm', 'Generate answer'),
        node('output', 'Answer'),
      ),
    ],
  },

  naive: {
    lanes: [
      {
        title: 'Indexing',
        steps: [
          node('input', 'Documents'),
          node('process', 'Split into chunks', 'Fixed size, 512 tokens'),
          node('embed', 'Embed chunks'),
          node('store', 'Vector database'),
        ],
      },
      query(
        node('input', 'User question'),
        node('embed', 'Embed question'),
        node('search', 'Similarity search', 'Top-K by cosine similarity'),
        node('process', 'Build prompt', 'All K chunks go into the context'),
        node('llm', 'Generate answer'),
        node('output', 'Answer'),
      ),
    ],
  },

  hybrid: {
    lanes: [
      { title: 'Pre-retrieval', steps: [node('input', 'User question'), node('process', 'Rewrite query', 'Query rewrite, HyDE or step-back')] },
      { title: 'Retrieval', steps: [node('search', 'Hybrid search', 'BM25 keywords plus dense vectors')] },
      { title: 'Post-retrieval', steps: [node('process', 'Re-rank results'), node('process', 'Compress context'), node('process', 'Remove duplicates')] },
      { title: 'Generation', steps: [node('llm', 'Generate answer', 'From filtered, ranked context'), node('output', 'Answer')] },
    ],
  },

  advanced: {
    lanes: [
      { title: 'Pre-retrieval', steps: [node('input', 'User question'), node('process', 'Rewrite query', 'Query rewrite, HyDE or step-back')] },
      { title: 'Retrieval', steps: [node('search', 'Hybrid search', 'BM25 keywords plus dense vectors')] },
      { title: 'Post-retrieval', steps: [node('process', 'Cross-encoder re-rank'), node('process', 'Compress context'), node('process', 'Remove duplicates')] },
      { title: 'Generation', steps: [node('llm', 'Generate answer', 'From filtered, ranked context'), node('output', 'Answer')] },
    ],
  },

  modular: {
    lanes: [
      {
        title: 'Swappable modules',
        layout: 'grid',
        steps: [
          node('search', 'Search module'),
          node('search', 'Retrieval module'),
          node('process', 'Re-rank module'),
          node('store', 'Memory module'),
          node('llm', 'Generator module'),
          node('decision', 'Routing module'),
        ],
        note: 'A central orchestrator connects the modules, and each one can be swapped independently.',
      },
    ],
  },

  graph: {
    lanes: [
      {
        title: 'Indexing',
        steps: [
          node('input', 'Corpus'),
          parallel(
            path('Entities', node('llm', 'Extract entities')),
            path('Relationships', node('llm', 'Extract relationships')),
          ),
          node('store', 'Knowledge graph'),
          node('process', 'Detect communities', 'Leiden algorithm'),
          node('llm', 'Summarize each community'),
          node('store', 'Index', 'Community summaries and entity embeddings'),
        ],
      },
      query(
        node('input', 'User question'),
        choice(
          path('Local question', node('search', 'Entity traversal', 'Plus the related text chunks')),
          path('Global question', node('search', 'Community summaries', 'Synthesized across the corpus')),
        ),
        node('llm', 'Generate answer'),
        node('output', 'Answer'),
      ),
    ],
  },

  lazygraphrag: {
    lanes: [
      {
        title: 'Indexing',
        steps: [
          node('process', 'Extract noun phrases', 'Plain NLP, no LLM calls'),
          node('process', 'Detect communities', 'Lightweight'),
          node('store', 'Cheap graph index'),
        ],
      },
      query(
        node('input', 'User question'),
        node('process', 'Expand query', 'Within a cost budget'),
        node('llm', 'Summarize relevant communities', 'Generated on demand, only for what the query needs'),
        node('llm', 'Synthesize answer'),
        node('output', 'Answer'),
      ),
    ],
  },

  lightrag: {
    lanes: [
      query(
        node('input', 'User question'),
        choice(
          path('Low-level: who, what, specific facts', node('search', 'Entity lookup', 'Entity node plus adjacent chunks')),
          path('High-level: how, why, themes', node('search', 'Concept traversal', 'Walk the concept subgraph')),
          path('Hybrid mode', node('process', 'Run both levels', 'Merge the results')),
        ),
        node('llm', 'Synthesize answer'),
        node('output', 'Answer'),
      ),
    ],
  },

  agentic: {
    lanes: [
      query(
        node('input', 'User question'),
        node('decision', 'Router', 'Do I need to retrieve at all?'),
        choice(
          path('No', node('output', 'Answer directly')),
          path(
            'Yes',
            node('search', 'Retrieve documents'),
            node('decision', 'Grade documents', 'Are they relevant?'),
            choice(
              path('Relevant', node('llm', 'Generate answer')),
              path('Low relevance', node('process', 'Reformulate query'), node('loop', 'Retrieve again')),
            ),
            node('decision', 'Self-check', 'Is the answer hallucinated?'),
            choice(
              path('Passes', node('output', 'Final answer')),
              path('Fails', node('loop', 'Regenerate')),
            ),
          ),
        ),
      ),
    ],
  },

  crag: {
    lanes: [
      query(
        node('input', 'User question'),
        node('search', 'Retrieve top-K documents'),
        node('decision', 'Relevance evaluator', 'Scores each document from 0 to 1'),
        choice(
          path('All high', node('process', 'Use the documents')),
          path('All low', node('process', 'Discard the documents'), node('search', 'Web search')),
          path(
            'Mixed',
            node('process', 'Keep relevant documents'),
            node('search', 'Web search'),
            node('process', 'Refine knowledge', 'Strip, decompose, filter'),
          ),
        ),
        node('llm', 'Generate answer'),
        node('output', 'Answer'),
      ),
    ],
  },

  selfrag: {
    lanes: [
      query(
        node('input', 'User question'),
        node('llm', 'Start generating', 'First tokens of the answer'),
        node('decision', 'Retrieve token', 'Is retrieval needed?'),
        choice(
          path('Yes', node('search', 'Retrieve passages'), node('process', 'Insert passages into context')),
          path('No', node('process', 'Continue without retrieval')),
        ),
        node('decision', 'ISREL check', 'Is each passage relevant?'),
        node('decision', 'ISSUP check', 'Is each claim supported?'),
        node('decision', 'ISUSE check', 'Is the answer useful overall?'),
        node('output', 'Final answer'),
      ),
    ],
  },

  hyde: {
    lanes: [
      query(
        node('input', 'User question'),
        node('llm', 'Write a hypothetical answer', 'It may be wrong, it only needs to sound like the real one'),
        node('embed', 'Embed the hypothetical answer', 'Instead of the question'),
        node('search', 'Search the corpus'),
        node('process', 'Real documents retrieved'),
        node('llm', 'Generate final answer'),
        node('output', 'Answer'),
      ),
    ],
  },

  flare: {
    lanes: [
      {
        title: 'Query',
        steps: [
          node('input', 'User question'),
          node('llm', 'Generate the next sentence'),
          node('decision', 'Confidence check', 'On the upcoming tokens'),
          choice(
            path('High confidence', node('process', 'Keep generating')),
            path(
              'Low confidence',
              node('process', 'Use the predicted sentence as a query'),
              node('search', 'Retrieve documents'),
              node('process', 'Regenerate with the new context'),
            ),
          ),
          node('output', 'Answer'),
        ],
        loop: 'Repeat until the answer is complete',
      },
    ],
  },

  fusion: {
    lanes: [
      query(
        node('input', 'User question'),
        node('llm', 'Write N query variations', 'Four by default'),
        node('search', 'Search with every variation', 'Run in parallel'),
        node('process', 'Merge with reciprocal rank fusion', 'score = Σ 1 / (k + rank), k = 60'),
        node('process', 'Re-ranked, de-duplicated context'),
        node('llm', 'Generate answer'),
        node('output', 'Answer'),
      ),
    ],
  },

  multimodal: {
    lanes: [
      {
        title: 'Ingest',
        steps: [
          node('input', 'PDF pages'),
          choice(
            path('Page images', node('process', 'Render pages as images', 'ColPali')),
            path('Separate parts', node('process', 'Extract text, tables and figures')),
          ),
        ],
      },
      {
        title: 'Embed and index',
        steps: [
          parallel(
            path('Text', node('embed', 'Text embedding model')),
            path('Images and charts', node('embed', 'Vision embedding model', 'CLIP or ColPali')),
            path('Tables', node('embed', 'Structured embedding')),
          ),
          node('store', 'Multimodal vector store', 'Named vectors per modality'),
        ],
      },
      query(
        node('input', 'Text question'),
        node('search', 'Search text and image vectors'),
        node('process', 'Retrieve text, images and tables'),
        node('llm', 'Multimodal LLM', 'GPT-4V or Claude 3, with mixed context'),
        node('output', 'Answer'),
      ),
    ],
  },

  structrag: {
    lanes: [
      query(
        node('input', 'User question'),
        node('decision', 'Structure router', 'An LLM picks the structure that fits'),
        choice(
          path('Graph', node('process', 'Relational, multi-hop questions')),
          path('Table', node('process', 'Comparative, analytical questions')),
          path('Chunk', node('process', 'Simple factual lookups')),
          path('Algorithm', node('process', 'Procedural questions')),
          path('Summary', node('process', 'Global, thematic questions')),
        ),
        node('process', 'Convert documents to that structure'),
        node('search', 'Retrieve from the structure'),
        node('llm', 'Generate answer'),
        node('output', 'Answer'),
      ),
    ],
  },
};
