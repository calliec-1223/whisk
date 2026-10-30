"""Before/after load test: chat in the web request (sync) vs. on the queue.

Usage (from backend/, with the task-queue Docker stack running):
    venv/bin/python -m bench.load_test            # about 5 minutes
    venv/bin/python -m bench.load_test --quick

For each mode and number of chat users, this starts Whisk under gunicorn with
2 server processes (a small production-like server) and, in queue mode, 4 Whisk
workers. Claude is replaced by the stand-in (WHISK_FAKE_CLAUDE=1), which waits
as long as real calls did (bench/claude_latency.json).

While chat users ask questions back to back, one "browsing" user loads their
recipe list 5 times a second. We measure:
  - how long POST /chat holds a server process
  - how long a recipe-list page load takes while others are chatting
  - total time until each chat answer arrives
"""

import argparse
import json
import os
import statistics
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
VENV = BACKEND / "venv" / "bin"
SCRATCH = Path(os.environ.get("TMPDIR", "/tmp")) / "whisk-load-test"
PORT = 5002
BASE = f"http://127.0.0.1:{PORT}"
SERVER_PROCESSES = 2
QUEUE_WORKERS = 4


def http(method, path, body=None, token=None, timeout=60):
    req = urllib.request.Request(
        BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json",
                 **({"Authorization": f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def percentile(values, p):
    values = sorted(values)
    if not values:
        return None
    k = (len(values) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(values) - 1)
    return values[lo] + (values[hi] - values[lo]) * (k - lo)


def start_stack(mode: str, db_path: Path) -> list[subprocess.Popen]:
    env = {**os.environ, "CHAT_MODE": mode, "WHISK_FAKE_CLAUDE": "1",
           "RATELIMIT_ENABLED": "0", "DATABASE_URL": f"sqlite:///{db_path}"}
    db_path.unlink(missing_ok=True)
    # Create tables once, before gunicorn's processes start (avoids a create_all race).
    subprocess.run([VENV / "python", "-c", "import app"], cwd=BACKEND, env=env, check=True)
    procs = [subprocess.Popen(
        [VENV / "gunicorn", "app:app", "-w", str(SERVER_PROCESSES), "-b", f"127.0.0.1:{PORT}"],
        cwd=BACKEND, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
    if mode == "queue":
        procs += [subprocess.Popen([VENV / "python", "worker.py"], cwd=BACKEND, env=env,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                  for _ in range(QUEUE_WORKERS)]
    for _ in range(50):
        try:
            if http("GET", "/ping", timeout=1)[0] == 200:
                break
        except OSError:
            pass
        time.sleep(0.2)
    else:
        raise RuntimeError("Whisk server didn't start")
    time.sleep(1)  # let workers start polling
    return procs


def stop_stack(procs):
    for p in procs:
        p.terminate()
    for p in procs:
        try:
            p.wait(timeout=15)
        except subprocess.TimeoutExpired:
            p.kill()


def make_user(name):
    http("POST", "/signup", {"username": name, "email": f"{name}@example.com", "password": "pw123456"})
    return http("POST", "/login", {"username": name, "password": "pw123456"})[1]["token"]


def run(mode: str, chat_users: int, duration: float) -> dict:
    procs = start_stack(mode, SCRATCH / f"{mode}-{chat_users}.db")
    try:
        browser = make_user("browser")
        for i in range(5):
            http("POST", "/recipes", {"title": f"Recipe {i}", "ingredients": "flour, butter",
                                      "steps": "mix, bake", "servings": 4}, browser)
        chatters = [make_user(f"chatter{i}") for i in range(chat_users)]

        deadline = time.perf_counter() + duration
        post_ms, answer_s, page_ms, errors = [], [], [], {"chat": 0, "page": 0}
        lock = threading.Lock()

        def chat_loop(token):
            while time.perf_counter() < deadline:
                t0 = time.perf_counter()
                try:
                    status, body = http("POST", "/chat", {"message": "Why are my cookies flat?"}, token)
                except OSError:
                    status, body = 0, {}
                t_post = time.perf_counter()
                answer = body.get("response")
                if status == 202:  # queued: check once a second, like the browser does
                    while time.perf_counter() - t0 < 90:
                        time.sleep(1)
                        _, res = http("GET", f"/chat/{body['job_id']}", token=token)
                        if res.get("status") != "pending":
                            answer = res.get("response")
                            break
                with lock:
                    if answer:
                        post_ms.append((t_post - t0) * 1000)
                        answer_s.append(time.perf_counter() - t0)
                    else:
                        errors["chat"] += 1

        def browse_loop():
            while time.perf_counter() < deadline:
                t0 = time.perf_counter()
                try:
                    ok = http("GET", "/recipes", token=browser, timeout=30)[0] == 200
                except OSError:
                    ok = False
                with lock:
                    if ok:
                        page_ms.append((time.perf_counter() - t0) * 1000)
                    else:
                        errors["page"] += 1
                time.sleep(0.2)

        threads = [threading.Thread(target=chat_loop, args=(t,)) for t in chatters]
        threads.append(threading.Thread(target=browse_loop))
        for t in threads:
            t.start()
        for t in threads:
            t.join()
    finally:
        stop_stack(procs)

    return {
        "mode": mode, "chat_users": chat_users, "duration_s": duration,
        "chats_answered": len(answer_s), "chat_errors": errors["chat"],
        "chat_post_p50_ms": percentile(post_ms, 0.5), "chat_post_p99_ms": percentile(post_ms, 0.99),
        "answer_p50_s": percentile(answer_s, 0.5), "answer_p99_s": percentile(answer_s, 0.99),
        "page_loads": len(page_ms), "page_errors": errors["page"],
        "page_p50_ms": percentile(page_ms, 0.5), "page_p99_ms": percentile(page_ms, 0.99),
    }


def check_no_stray_workers():
    """Leftover Whisk workers would steal jobs and skew results (case-insensitive:
    macOS lists the interpreter as "Python")."""
    found = subprocess.run(["pgrep", "-fil", r"worker\.py|gunicorn app:app"],
                           capture_output=True, text=True).stdout.strip()
    if found:
        raise SystemExit(f"Stop these processes first; they would take part in the test:\n{found}")


def main():
    check_no_stray_workers()
    parser = argparse.ArgumentParser()
    parser.add_argument("--quick", action="store_true")
    opts = parser.parse_args()
    users, duration = ([2], 10) if opts.quick else ([1, 4, 8], 40)
    SCRATCH.mkdir(parents=True, exist_ok=True)
    latency = json.loads((BACKEND / "bench" / "claude_latency.json").read_text())
    results = {"started_at": datetime.now(timezone.utc).isoformat(),
               "server_processes": SERVER_PROCESSES, "queue_workers": QUEUE_WORKERS,
               "claude_stand_in_median_s": latency["p50_s"], "runs": []}
    for mode in ("sync", "queue"):
        for n in users:
            r = run(mode, n, duration)
            results["runs"].append(r)
            print(f"{mode:5} chat_users={n}: POST /chat p50 {r['chat_post_p50_ms']:7.0f} ms | "
                  f"answer p50 {r['answer_p50_s']:5.1f} s p99 {r['answer_p99_s']:5.1f} s | "
                  f"page load p50 {r['page_p50_ms']:6.0f} ms p99 {r['page_p99_ms']:6.0f} ms | "
                  f"answered {r['chats_answered']}, errors {r['chat_errors']}/{r['page_errors']}",
                  flush=True)
    name = "quick" if opts.quick else datetime.now().strftime("%Y%m%d-%H%M%S")
    out = BACKEND / "bench" / "results" / f"load-{name}.json"
    out.write_text(json.dumps(results, indent=2))
    print(f"saved {out.relative_to(BACKEND)}")


if __name__ == "__main__":
    sys.exit(main())
