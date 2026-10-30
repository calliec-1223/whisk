"""Submit chat questions to the task queue and read their answers.

Whisk uses its own queue ("whisk"), run by `python worker.py`. Answers are
read from the queue's PostgreSQL history (DECISIONS.md #16 in task-queue).

Settings (backend/.env):
    TQ_REDIS_URL           default redis://localhost:6379/0
    TQ_POSTGRES_HOST/PORT/USER/DB   default localhost/5432/taskqueue/taskqueue
    TQ_POSTGRES_PASSWORD   required (the task-queue database password)
"""

import os

import psycopg
import redis

from taskqueue.core.queue import Queue
from taskqueue.results import get_job

QUEUE_NAME = "whisk"
TASK = "whisk_chat"
MAX_ATTEMPTS = 3  # first try plus 2 retries with backoff (e.g. if Claude is overloaded)
TIMEOUT_SECONDS = 60  # one attempt may run this long before the queue abandons it

_queue = None


def queue() -> Queue:
    global _queue
    if _queue is None:
        client = redis.Redis.from_url(os.getenv("TQ_REDIS_URL", "redis://localhost:6379/0"))
        _queue = Queue(client, name=QUEUE_NAME)
    return _queue


def submit(user_id: str, message: str, recipe_context: str, request_id: str | None = None) -> str:
    """Enqueue a chat question. Returns the job id.

    request_id: a unique id the browser makes for each message. If the same
    message is sent again (e.g. a retried request), the original job is
    returned instead of asking Claude twice. Keys include the user id, so one
    user's id can never match another user's job.
    """
    payload = {"task": TASK, "args": {"message": message, "recipe_context": recipe_context},
               "user_id": str(user_id)}  # stored so only this user can read the answer
    key = f"chat:{user_id}:{request_id}" if request_id else None
    return queue().enqueue(payload, max_attempts=MAX_ATTEMPTS, idempotency_key=key,
                           timeout_seconds=TIMEOUT_SECONDS)


def lookup(job_id: str) -> dict | None:
    """The job's history record, or None if not recorded yet (still pending)."""
    password = os.getenv("TQ_POSTGRES_PASSWORD")
    if not password:
        raise RuntimeError("TQ_POSTGRES_PASSWORD is not set")
    # A short-lived connection per lookup keeps this simple and safe with any
    # server setup. Each lookup is one small indexed query.
    with psycopg.connect(
        host=os.getenv("TQ_POSTGRES_HOST", "localhost"),
        port=os.getenv("TQ_POSTGRES_PORT", "5432"),
        user=os.getenv("TQ_POSTGRES_USER", "taskqueue"),
        password=password,
        dbname=os.getenv("TQ_POSTGRES_DB", "taskqueue"),
        connect_timeout=3,
    ) as conn:
        return get_job(conn, job_id)
