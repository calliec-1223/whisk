"""Measure real Claude response times for Whisk-style chat requests.

Usage (from backend/):  venv/bin/python -m bench.measure_claude [--calls 20]

Uses the same model and settings as the app (assistant.py). Saves the timings
to bench/claude_latency.json, which the load-test stand-in replays.
"""

import argparse
import json
import statistics
import time
from pathlib import Path

import anthropic
from dotenv import load_dotenv

load_dotenv()

import assistant  # noqa: E402

RECIPES = """- Brown Butter Chocolate Chip Cookies (24 servings): 2 1/4 cups flour, 1 cup butter, 1 cup brown sugar, 1/2 cup sugar, 2 eggs, 2 tsp vanilla, 1 tsp baking soda, 2 cups chocolate chips
- Sourdough Sandwich Loaf (12 servings): 500 g bread flour, 350 g water, 100 g starter, 10 g salt, 20 g honey, 30 g butter
- Lemon Blueberry Muffins (12 servings): 2 cups flour, 3/4 cup sugar, 2 tsp baking powder, 1/2 cup butter, 2 eggs, 1/2 cup milk, 1 lemon, 1 1/2 cups blueberries"""

QUESTIONS = [
    "Why did my cookies spread so much and come out flat?",
    "Can I swap the butter in my muffins for oil?",
    "How do I know when my sourdough loaf is fully proofed?",
    "My muffins came out dense. What went wrong?",
    "How can I make my chocolate chip cookies chewier?",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--calls", type=int, default=20)
    opts = parser.parse_args()
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment
    times, out_tokens, cut_off = [], [], 0
    for i in range(opts.calls):
        start = time.perf_counter()
        # Same settings as the app (assistant.py), so timings match real chats.
        response = client.messages.create(
            model=assistant.MODEL,
            max_tokens=assistant.MAX_TOKENS,
            output_config={"effort": assistant.EFFORT},
            system=assistant.system_prompt(RECIPES),
            messages=[{"role": "user", "content": QUESTIONS[i % len(QUESTIONS)]}],
        )
        elapsed = time.perf_counter() - start
        times.append(elapsed)
        out_tokens.append(response.usage.output_tokens)
        cut_off += response.stop_reason == "max_tokens"
        print(f"call {i + 1:2}: {elapsed:5.2f} s, {response.usage.output_tokens} output tokens, "
              f"stop={response.stop_reason}")
    times_sorted = sorted(times)
    summary = {
        "model": "claude-haiku-5-5", "calls": len(times),
        "seconds": [round(t, 3) for t in times],
        "p50_s": round(statistics.median(times), 3),
        "max_s": round(times_sorted[-1], 3),
        "mean_output_tokens": round(statistics.mean(out_tokens)),
        "cut_off_answers": cut_off,
        "settings": {"max_tokens": assistant.MAX_TOKENS, "effort": assistant.EFFORT},
    }
    Path("bench/claude_latency.json").write_text(json.dumps(summary, indent=2))
    print(f"median {summary['p50_s']} s, max {summary['max_s']} s -> saved bench/claude_latency.json")


if __name__ == "__main__":
    main()
