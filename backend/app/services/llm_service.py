"""LLM service abstraction — supports OpenAI, Gemini, and Ollama."""

import logging
import time
from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Unified interface for LLM generation across providers."""

    def __init__(self):
        self.provider = settings.llm_provider.lower()
        self._client = None

    def _get_openai_client(self):
        """Lazy-init OpenAI client."""
        if self._client is None:
            from openai import OpenAI
            self._client = OpenAI(api_key=settings.openai_api_key)
        return self._client

    def _get_gemini_model(self):
        """Lazy-init Gemini model."""
        if self._client is None:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            self._client = genai.GenerativeModel(settings.gemini_model)
        return self._client

    def _get_ollama_client(self):
        """Lazy-init Ollama client (uses OpenAI-compatible API)."""
        if self._client is None:
            from openai import OpenAI
            self._client = OpenAI(
                base_url=f"{settings.ollama_base_url}/v1",
                api_key="ollama"  # Ollama doesn't need a real key
            )
        return self._client

    def generate(self, prompt: str, context: str, question: str) -> tuple[str, float]:
        """
        Generate an answer using the configured LLM provider.

        Args:
            prompt: System prompt describing the task
            context: Retrieved context chunks
            question: User's question

        Returns:
            Tuple of (generated answer, elapsed time in milliseconds)
        """
        full_prompt = f"""{prompt}

Context:
{context}

Question: {question}

Answer based on the context provided. If the context doesn't contain enough information, say so clearly."""

        start = time.time()

        try:
            if self.provider == "openai":
                answer = self._generate_openai(full_prompt)
            elif self.provider == "gemini":
                answer = self._generate_gemini(full_prompt)
            elif self.provider == "ollama":
                answer = self._generate_ollama(full_prompt)
            else:
                answer = self._generate_fallback(context, question)
        except Exception as e:
            logger.error(f"LLM generation failed ({self.provider}): {e}")
            answer = self._generate_fallback(context, question)

        elapsed_ms = (time.time() - start) * 1000
        logger.info(f"LLM generation ({self.provider}) took {elapsed_ms:.1f}ms")
        return answer, elapsed_ms

    def _generate_openai(self, prompt: str) -> str:
        client = self._get_openai_client()
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1024
        )
        return response.choices[0].message.content

    def _generate_gemini(self, prompt: str) -> str:
        model = self._get_gemini_model()
        response = model.generate_content(prompt)
        return response.text

    def _generate_ollama(self, prompt: str) -> str:
        client = self._get_ollama_client()
        response = client.chat.completions.create(
            model=settings.ollama_model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1024
        )
        return response.choices[0].message.content

    def _generate_fallback(self, context: str, question: str) -> str:
        """
        Fallback when no LLM is configured — returns a summary of retrieved context.
        This allows the app to work without any API keys for demo purposes.
        """
        logger.warning("Using fallback generation (no LLM configured)")
        # Truncate context for the summary
        context_preview = context[:1500] + "..." if len(context) > 1500 else context
        return (
            f"**[Fallback Mode — No LLM Configured]**\n\n"
            f"Your question: *{question}*\n\n"
            f"Based on the retrieved context, here are the most relevant passages:\n\n"
            f"---\n{context_preview}\n---\n\n"
            f"💡 *To get AI-generated answers, configure an LLM provider "
            f"(OpenAI, Gemini, or Ollama) in your `.env` file.*"
        )


# Global instance
llm_service = LLMService()
