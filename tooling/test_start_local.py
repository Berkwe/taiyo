"""Exercise launcher paths without starting services or requiring sudo."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(os.environ.get("START_LOCAL_TEST_SCRIPT", ROOT / "start-local.sh"))


class LauncherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.home = self.base / "user"
        self.local_bin = self.home / ".local" / "bin"
        self.tools = self.base / "tools"
        self.local_bin.mkdir(parents=True)
        self.tools.mkdir()
        self.env = {
            **os.environ,
            "HOME": str(self.home),
            "PATH": f"{self.tools}:/usr/bin:/bin",
            "NVM_DIR": str(self.home / ".nvm"),
            "NOVORA_NO_BROWSER": "1",
            "NOVORA_LOCAL_URL": "http://localhost:3000/tr",
            "TEST_HOME": str(self.home),
            "TEST_DOCKER_ERROR": "",
            "TEST_HEALTH_EXIT": "0",
            "TEST_CALL_LOG": str(self.base / "calls.log"),
        }
        self.env.pop("SUDO_USER", None)
        self.stub(self.local_bin / "node", 'exit "${TEST_HEALTH_EXIT}"')
        self.stub(self.local_bin / "corepack", 'echo "$*" >> "$TEST_CALL_LOG"')
        self.stub(
            self.tools / "docker",
            'if [[ -n "$TEST_DOCKER_ERROR" ]]; then\n'
            '  echo "$TEST_DOCKER_ERROR" >&2; exit 1\nfi',
        )
        self.stub(
            self.tools / "getent",
            'printf "fixture:x:1000:1000::%s:/bin/bash\\n" "$TEST_HOME"',
        )

    def stub(self, path, body):
        path.write_text("#!/bin/bash\n" + body + "\n")
        path.chmod(0o755)

    def run_launcher(self):
        return subprocess.run(
            ["/bin/bash", str(SCRIPT)],
            env=self.env,
            capture_output=True,
            text=True,
            timeout=10,
        )

    def test_local_node_with_sanitized_path(self):
        result = self.run_launcher()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("NovoraScans zaten çalışıyor", result.stdout)

    def test_sudo_resolves_invoking_users_home(self):
        self.env["SUDO_USER"] = "fixture"
        self.env["HOME"] = str(self.base / "root")
        result = self.run_launcher()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("NovoraScans zaten çalışıyor", result.stdout)

    def test_docker_permission_is_not_reported_as_stopped(self):
        self.env["TEST_DOCKER_ERROR"] = "permission denied: /var/run/docker.sock"
        result = self.run_launcher()
        self.assertEqual(result.returncode, 1)
        self.assertIn("Docker soketine erişim reddedildi", result.stderr)
        self.assertNotIn("Docker çalışmıyor", result.stderr)

    def test_stopped_docker_keeps_diagnostic(self):
        self.env["TEST_DOCKER_ERROR"] = "Cannot connect to the Docker daemon"
        result = self.run_launcher()
        self.assertEqual(result.returncode, 1)
        self.assertIn("Cannot connect to the Docker daemon", result.stderr)
        self.assertIn("Docker çalışmıyor", result.stderr)

    def test_missing_health_runs_setup_then_dev(self):
        self.env["TEST_HEALTH_EXIT"] = "1"
        result = self.run_launcher()
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = (self.base / "calls.log").read_text().splitlines()
        self.assertEqual(calls[-2:], ["pnpm setup:local", "pnpm dev"])

    def test_unknown_sudo_user_has_useful_error(self):
        self.env["SUDO_USER"] = "fixture"
        self.stub(self.tools / "getent", "exit 2")
        result = self.run_launcher()
        self.assertEqual(result.returncode, 1)
        self.assertIn("ev dizini bulunamadı", result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
