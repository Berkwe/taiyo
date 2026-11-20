"""Offline bridge and persistent Mandown-cache integration tests (stdlib only)."""

from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import mandown
from mandown import jev

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "novora_mandown_bridge", ROOT / "tooling/mandown_bridge.py"
)
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


def record(url="https://example.test/anchor"):
    return {
        "source": "fixture",
        "url": url,
        "search_title": "Fictional Star",
        "identifiers": {},
        "metadata": {"title": "Fictional Star"},
    }


class Session:
    calls = 0

    def post(self, *args, **kwargs):
        self.calls += 1

        class Response:
            status_code = 200
            headers = {}

            def json(self):
                return {"answers": {"same_original_work": {"noul": 0.7}}}

        return Response()


class BridgeTests(unittest.IsolatedAsyncioTestCase):
    async def test_dispatch_uses_mandown_defaults_and_returns_diagnostics(self):
        response = unittest.mock.Mock()
        payload = {"links": [], "providers": [], "errors": [], "threshold": 54}
        response.asdict.return_value = payload
        with patch.object(
            mandown, "search_sources", AsyncMock(return_value=response)
        ) as discover:
            result = await bridge.dispatch(["search-sources", "42"], None, quiet=True)
            discover.assert_awaited_once_with(42)
            self.assertEqual(result, payload)

    def test_defaults_use_workspace_storage_and_preserve_server_revision(self):
        with patch.dict(
            os.environ, {"MANDOWN_JEV_CACHE_REVISION": "fixture-revision"}, clear=True
        ):
            bridge.configure_discovery_environment()
            self.assertEqual(
                os.environ["MANDOWN_JEV_CACHE"],
                str(ROOT / "storage/mandown/jev.sqlite3"),
            )
            self.assertEqual(
                os.environ["MANDOWN_SEARCH_LOG"],
                str(ROOT / "storage/mandown/search.jsonl"),
            )
            self.assertEqual(
                os.environ["MANDOWN_JEV_CACHE_REVISION"], "fixture-revision"
            )

    def test_relative_paths_and_disabled_cache(self):
        with patch.dict(
            os.environ,
            {"MANDOWN_JEV_CACHE": "off", "MANDOWN_SEARCH_LOG": "storage/fixture.jsonl"},
            clear=True,
        ):
            bridge.configure_discovery_environment()
            self.assertEqual(os.environ["MANDOWN_JEV_CACHE"], "off")
            self.assertEqual(
                os.environ["MANDOWN_SEARCH_LOG"], str(ROOT / "storage/fixture.jsonl")
            )

    def test_four_pairs_cached_across_processes_without_key(self):
        with tempfile.TemporaryDirectory() as directory:
            env = {"MANDOWN_JEV_CACHE": str(Path(directory) / "jev.sqlite3")}
            with patch.dict(os.environ, env):
                session = Session()
                for pass_number in range(2):
                    for index in range(4):
                        result = jev.call_jev(
                            record(),
                            record(f"https://example.test/source/{index}"),
                            "fixture-key" if pass_number == 0 else [],
                            54,
                            session=session,
                        )
                        self.assertEqual(result["cache_hit"], pass_number == 1)
                self.assertEqual(session.calls, 4)
                code = (
                    "from mandown import jev; "
                    f"a={record()!r}; "
                    f"b={record('https://example.test/source/0')!r}; "
                    "r=jev.call_jev(a,b,[],80); "
                    "assert r['cache_hit'] and r['attempts']==0 and r['decision']=='DIFFERENT'; "
                    "print('restart cache hit: zero Jev calls, no API key')"
                )
                result = subprocess.run(
                    [sys.executable, "-c", code],
                    env=os.environ.copy(),
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("restart cache hit", result.stdout)
                changed = jev.call_jev(
                    record("https://example.test/changed"),
                    record(),
                    "fixture-key",
                    54,
                    session=session,
                )
                self.assertFalse(changed["cache_hit"])
                with patch.dict(os.environ, {"MANDOWN_JEV_CACHE_REVISION": "next"}):
                    changed = jev.call_jev(
                        record(),
                        record("https://example.test/source/0"),
                        "fixture-key",
                        54,
                        session=session,
                    )
                    self.assertFalse(changed["cache_hit"])
                self.assertEqual(session.calls, 6)

    def test_service_protocol_resolves_and_reuses_cache_without_key(self):
        """Real bridge/service, real Mandown resolver/cache; all HTTP replaced locally."""
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            (directory / "sitecustomize.py").write_text("""
import mandown
from mandown import jev, catalog_matching
from mandown.anilist import AniListClient, AniListManga, AniListTitle
from mandown.sources.base_source import SourceSearchResult
async def get_manga(self, ident, **kwargs):
    return AniListManga(id=42, title=AniListTitle(english="Fictional Star"))
AniListClient.get_manga = get_manga
catalog_matching.PROVIDERS["mangadex"] = lambda alias: [SourceSearchResult("Fictional Star", "https://mangadex.org/title/00000000-0000-0000-0000-000000000042")]
jev.hydrate_candidate = lambda provider, result: {"source": provider, "url": result.url, "search_title": result.title, "identifiers": {}, "metadata": {"title": result.title}, "status": "ok", "error": None}
class Response:
    status_code=200
    headers={}
    def json(self):
        return {"answers": {"same_original_work": {"noul": 0.7}}}
def post(*args, **kwargs):
    import os
    if not os.environ.get("JEVMODEL_API_KEY"):
        raise AssertionError("HTTP must not run on keyless cache hit")
    return Response()
jev.requests.post = post
""")
            env = {
                **os.environ,
                "PYTHONPATH": str(directory),
                "MANDOWN_JEV_CACHE": str(directory / "cache.sqlite3"),
                "MANDOWN_SEARCH_LOG": str(directory / "log.jsonl"),
                "JEVMODEL_API_KEY": "fixture-key",
            }
            frame = (
                json.dumps(
                    {"id": "fixture", "args": ["search-sources", "42"], "env": {}}
                )
                + "\n"
            )
            for pass_number in range(2):
                if pass_number:
                    env["JEVMODEL_API_KEY"] = ""
                response = subprocess.run(
                    [sys.executable, str(ROOT / "tooling/mandown_bridge.py"), "serve"],
                    input=frame,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                self.assertEqual(response.returncode, 0, response.stderr)
                payload = json.loads(response.stdout)["result"]
                self.assertTrue(payload["links"])
                comparisons = payload["providers"][0]["comparisons"]
                self.assertEqual(comparisons[0]["cache_hit"], bool(pass_number))
                self.assertEqual(comparisons[0]["attempts"], 0 if pass_number else 1)
                self.assertFalse(payload["errors"])


if __name__ == "__main__":
    unittest.main()
