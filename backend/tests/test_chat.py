"""Chat endpoints. The queue and Claude are replaced by in-memory fakes."""

import pytest

import app as app_module
import chat_queue


@pytest.fixture
def fake_queue(monkeypatch):
    jobs = {}  # job_id -> history record, as taskqueue.results.get_job returns it

    def submit(user_id, message, recipe_context):
        job_id = f"00000000-0000-0000-0000-{len(jobs) + 1:012d}"
        jobs[job_id] = {"status": "pending", "result": None, "last_error": None,
                        "payload": {"task": "whisk_chat", "user_id": str(user_id),
                                    "args": {"message": message, "recipe_context": recipe_context}}}
        return job_id

    monkeypatch.setattr(chat_queue, "submit", submit)
    monkeypatch.setattr(chat_queue, "lookup", lambda job_id: jobs.get(job_id))
    monkeypatch.setattr(app_module, "CHAT_MODE", "queue")
    return jobs


def ask(client, headers, message="Why are my cookies flat?"):
    return client.post("/chat", json={"message": message}, headers=headers)


def test_chat_returns_202_with_job_id(client, auth_headers, fake_queue):
    res = ask(client, auth_headers)
    assert res.status_code == 202
    assert res.get_json()["job_id"] in fake_queue


def test_job_carries_saved_recipes_and_user(client, auth_headers, fake_queue):
    client.post("/recipes", json={"title": "Brownies", "ingredients": "cocoa, butter",
                                  "steps": "mix, bake", "servings": 9}, headers=auth_headers)
    job_id = ask(client, auth_headers).get_json()["job_id"]
    payload = fake_queue[job_id]["payload"]
    assert "Brownies" in payload["args"]["recipe_context"]
    assert payload["user_id"] == "1"


def test_pending_then_done(client, auth_headers, fake_queue):
    job_id = ask(client, auth_headers).get_json()["job_id"]
    assert client.get(f"/chat/{job_id}", headers=auth_headers).get_json() == {"status": "pending"}

    fake_queue[job_id].update(status="done", result="Chill the dough.")
    res = client.get(f"/chat/{job_id}", headers=auth_headers).get_json()
    assert res == {"status": "done", "response": "Chill the dough."}


def test_not_yet_in_history_counts_as_pending(client, auth_headers, fake_queue):
    res = client.get("/chat/00000000-0000-0000-0000-000000000999", headers=auth_headers)
    assert res.get_json() == {"status": "pending"}


def test_failed_job_reports_friendly_error(client, auth_headers, fake_queue):
    job_id = ask(client, auth_headers).get_json()["job_id"]
    fake_queue[job_id].update(status="dead", last_error="APIStatusError: overloaded")
    res = client.get(f"/chat/{job_id}", headers=auth_headers).get_json()
    assert res["status"] == "error"
    assert "overloaded" not in res["error"]  # internal details stay server-side


def test_other_users_cannot_read_my_answer(client, auth_headers, other_headers, fake_queue):
    job_id = ask(client, auth_headers).get_json()["job_id"]
    fake_queue[job_id].update(status="done", result="secret recipe advice")
    res = client.get(f"/chat/{job_id}", headers=other_headers)
    assert res.status_code == 404
    assert "secret" not in res.get_data(as_text=True)


def test_result_requires_login(client, fake_queue):
    assert client.get("/chat/00000000-0000-0000-0000-000000000001").status_code == 401


def test_queue_down_returns_503(client, auth_headers, monkeypatch):
    def broken(*args):
        raise ConnectionError("redis down")
    monkeypatch.setattr(chat_queue, "submit", broken)
    monkeypatch.setattr(app_module, "CHAT_MODE", "queue")
    assert ask(client, auth_headers).status_code == 503


def test_sync_mode_answers_directly(client, auth_headers, monkeypatch):
    monkeypatch.setattr(app_module, "CHAT_MODE", "sync")
    monkeypatch.setattr(app_module, "ask_claude", lambda msg, ctx: "Use less butter.")
    res = ask(client, auth_headers)
    assert res.status_code == 200
    assert res.get_json() == {"response": "Use less butter."}


def test_message_validation_unchanged(client, auth_headers, fake_queue):
    assert ask(client, auth_headers, message="").status_code == 400
    assert ask(client, auth_headers, message="x" * 1001).status_code == 400


def test_answer_skips_thinking_blocks(monkeypatch):
    """Claude's reply can start with a thinking block; only text blocks are the answer."""
    import types
    import assistant

    blocks = [types.SimpleNamespace(type="thinking", thinking=""),
              types.SimpleNamespace(type="text", text="Chill the dough. "),
              types.SimpleNamespace(type="text", text="Use less butter.")]
    fake_client = types.SimpleNamespace(messages=types.SimpleNamespace(
        create=lambda **kwargs: types.SimpleNamespace(content=blocks)))
    monkeypatch.setattr(assistant.anthropic, "Anthropic", lambda **kwargs: fake_client)
    monkeypatch.delenv("WHISK_FAKE_CLAUDE", raising=False)
    assert assistant.ask_claude("why flat?", "") == "Chill the dough. Use less butter."
