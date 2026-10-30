"""Whisk's queue worker: answers chat questions in the background.

Run it with (from backend/):  venv/bin/python worker.py
Run several to answer several questions at once.
"""

import logging

from dotenv import load_dotenv

import anthropic

from taskqueue import Task
from taskqueue.worker import Worker

load_dotenv()

import chat_queue  # noqa: E402  (after load_dotenv so settings are read)
from assistant import ask_claude  # noqa: E402


def whisk_chat(message: str, recipe_context: str) -> str:
    # The queue retries failures with backoff, so the SDK's own retries are off.
    # The 45 s client timeout ends a slow call cleanly (and it gets retried)
    # before the job's 60 s time limit makes the queue abandon it.
    return ask_claude(message, recipe_context, max_retries=0, timeout=45)


# Claude errors that can't succeed on retry: retrying would only cost money.
# Overloaded (529), rate limits (429) and server errors are still retried.
NO_RETRY = (
    anthropic.BadRequestError,           # 400: the request itself is invalid
    anthropic.AuthenticationError,       # 401: bad API key
    anthropic.PermissionDeniedError,     # 403
    anthropic.NotFoundError,             # 404: e.g. unknown model
    anthropic.UnprocessableEntityError,  # 422
)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    Worker(
        chat_queue.queue(),
        tasks={chat_queue.TASK: Task(whisk_chat, no_retry=NO_RETRY)},
        lease_seconds=30,  # real answers took 3.4-5.2 s; heartbeats cover anything longer
    ).run()


if __name__ == "__main__":
    main()
