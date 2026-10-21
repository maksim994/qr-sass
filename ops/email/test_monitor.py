import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('email_monitor', Path(__file__).with_name('monitor.py'))
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)


class MonitorTests(unittest.TestCase):
    def test_cached_smtp_survives_docker_daemon_failure(self):
        with tempfile.TemporaryDirectory() as root:
            state = Path(root)
            cached = {'SMTP_HOST': 'smtp.example.test', 'SMTP_USER': 'test', 'SMTP_PASS': 'synthetic'}
            (state / 'email-smtp.json').write_text(json.dumps(cached))
            with patch.object(monitor, 'STATE', state), patch.object(monitor, 'command', side_effect=subprocess.CalledProcessError(1, 'docker')):
                app, config = monitor.app_config()
                self.assertIsNone(app)
                self.assertEqual(config, cached)

    def test_running_app_refreshes_private_cache(self):
        with tempfile.TemporaryDirectory() as root:
            state = Path(root)
            env = {'SMTP_HOST': 'smtp.example.test', 'SMTP_USER': 'test', 'SMTP_PASS': 'synthetic', 'SMTP_FROM': 'noreply@example.test'}
            inspect = json.dumps([{'Config': {'Env': [k+'='+v for k, v in env.items()]}}])
            with patch.object(monitor, 'STATE', state), patch.object(monitor, 'command', side_effect=['app-'+monitor.RESOURCE+'-test', inspect]):
                app, config = monitor.app_config()
                self.assertIsNotNone(app)
                self.assertEqual(config, env)
                self.assertEqual((state / 'email-smtp.json').stat().st_mode & 0o777, 0o600)

    def test_no_app_uses_cached_transport(self):
        with tempfile.TemporaryDirectory() as root:
            state = Path(root)
            (state / 'email-smtp.json').write_text('{"SMTP_HOST":"smtp.example.test"}')
            with patch.object(monitor, 'STATE', state), patch.object(monitor, 'command', return_value=''):
                app, config = monitor.app_config()
                self.assertIsNone(app)
                self.assertEqual(config['SMTP_HOST'], 'smtp.example.test')


if __name__ == '__main__':
    unittest.main()
