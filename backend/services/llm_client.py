"""
LLM client abstraction for Ollama integration.
Gracefully degrades if Ollama isn't running.
"""
import httpx
import json
from typing import Optional


class LLMClient:
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3"):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self._available: Optional[bool] = None

    async def check_availability(self) -> bool:
        """Ping Ollama to see if it's running."""
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                self._available = r.status_code == 200
        except (httpx.TimeoutException, httpx.ConnectError):
            self._available = False
        return self._available

    async def chat(self, prompt: str, context: str = "") -> dict:
        """
        Send a prompt to Ollama. Returns dict with 'response' and 'available'.
        If Ollama is unavailable, returns a graceful error dict.
        """
        available = await self.check_availability()
        if not available:
            return {
                "response": "Mac is asleep or unreachable. Fallback response active.",
                "available": False,
                "model": self.model,
                "error": "Ollama not detected.",
            }

        full_prompt = f"{context}\n\nUser question: {prompt}" if context else prompt
        payload = {
            "model": self.model,
            "prompt": full_prompt,
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                r = await client.post(f"{self.base_url}/api/generate", json=payload)
                r.raise_for_status()
                data = r.json()
                return {
                    "response": data.get("response", ""),
                    "available": True,
                    "model": self.model,
                }
        except httpx.TimeoutException:
            return {
                "response": "Connection to Mac lost during generation.",
                "available": False,
                "model": self.model,
                "error": f"The model '{self.model}' took too long to respond.",
            }
        except Exception as e:
            return {
                "response": "",
                "available": True,
                "model": self.model,
                "error": f"Ollama error: {str(e)}",
            }


# Module-level singleton; re-created when settings change
_client: Optional[LLMClient] = None


def get_llm_client(base_url: str = "http://localhost:11434", model: str = "llama3") -> LLMClient:
    global _client
    if _client is None or _client.base_url != base_url or _client.model != model:
        _client = LLMClient(base_url=base_url, model=model)
    return _client
