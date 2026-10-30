"""Ask Claude a baking question. Used by both the old synchronous /chat path
and the queue worker.

Set WHISK_FAKE_CLAUDE=1 to replace the real API with a stand-in that waits as
long as real calls did (replayed from bench/claude_latency.json). Load tests
use it so they don't spend money or hit API rate limits.
"""

import json
import os
import random
import time
from pathlib import Path

import anthropic

MODEL = "claude-haiku-5-5"
# Claude Haiku 5.5 thinks before answering, and thinking counts toward
# max_tokens. At 600 tokens most answers were cut off mid-sentence. Low effort
# (recommended for chat) keeps thinking short; 1500 leaves room for the answer.
MAX_TOKENS = 1500
EFFORT = "low"
_LATENCY_FILE = Path(__file__).resolve().parent / "bench" / "claude_latency.json"


def system_prompt(recipe_context: str) -> str:
    return f"""You are a helpful baking assistant.
            The user has these recipes saved: {recipe_context}
            Help them with baking questions, troubleshooting, and suggestions.
            Keep answers concise: a few short paragraphs or a short list."""


def ask_claude(message: str, recipe_context: str, max_retries: int = 2,
               timeout: float = 600) -> str:
    """Return Claude's answer.

    max_retries is the Anthropic SDK's own retry count. The queue worker passes
    0, because the queue already retries failed jobs with backoff; two retry
    layers would multiply into up to 9 calls for one question.
    """
    if os.getenv("WHISK_FAKE_CLAUDE") == "1":
        return _fake_answer(message)
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"),
                                 max_retries=max_retries, timeout=timeout)
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        output_config={"effort": EFFORT},
        system=system_prompt(recipe_context),
        messages=[{"role": "user", "content": message}],
    )
    # The reply can start with a "thinking" block (Claude Haiku 5.5 thinks by
    # default), so collect the text blocks instead of assuming block 0 is text.
    return "".join(block.text for block in response.content if block.type == "text")


def _fake_answer(message: str) -> str:
    seconds = json.loads(_LATENCY_FILE.read_text())["seconds"]
    time.sleep(random.choice(seconds))  # a real measured response time
    return f"(Test answer) You asked: {message}"
