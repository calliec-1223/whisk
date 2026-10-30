"""Whisk's queue worker: answers chat questions in the background.

Run it with (from backend/):  venv/bin/python worker.py
Run several to answer several questions at once.
"""

import logging

from dotenv import load_dotenv

from taskqueue.worker import Worker

load_dotenv()

import chat_queue  # noqa: E402  (after load_dotenv so settings are read)
from assistant import ask_claude  # noqa: E402


def whisk_chat(message: str, recipe_context: str) -> str:
    # The queue retries failures with backoff, so the SDK's own retries are off.
    return ask_claude(message, recipe_context, max_retries=0)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    Worker(
        chat_queue.queue(),
        tasks={chat_queue.TASK: whisk_chat},
        lease_seconds=30,  # real answers took 3.4-5.2 s; heartbeats cover anything longer
    ).run()


if __name__ == "__main__":
    main()
