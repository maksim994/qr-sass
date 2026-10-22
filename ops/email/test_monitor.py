import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('email_monitor', Path(__file__).with_name('monitor.py'))
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)


def dsn(action='failed', original='<digest-fixture@qr-s.ru>'):
    return f'''MIME-Version: 1.0
Content-Type: multipart/report; report-type=delivery-status; boundary="test"
Message-ID: <bounce@provider.test>

--test
Content-Type: text/plain

retry timeout exceeded
--test
Content-Type: message/delivery-status

Reporting-MTA: dns; sender.test

Action: {action}
Status: 5.0.0

--test
Content-Type: message/rfc822

Message-ID: {original}
Subject: Synthetic

Aggregate body
--test--
'''.encode()


class BounceTests(unittest.TestCase):
    def test_exact_original_id_only(self):
        ids = {'<digest-fixture@qr-s.ru>'}
        self.assertTrue(monitor.rejected_digest(dsn(), ids))
        self.assertFalse(monitor.rejected_digest(dsn(original='<other@qr-s.ru>'), ids))
        self.assertFalse(monitor.rejected_digest(dsn(action='delayed'), ids))
        self.assertFalse(monitor.rejected_digest(b'Message-ID: <digest-fixture@qr-s.ru>\n\nordinary mail', ids))

    def test_readonly_and_bounded_fetch(self):
        with patch.object(monitor.imaplib, 'IMAP4_SSL') as imap:
            mailbox = imap.return_value.__enter__.return_value
            mailbox.select.return_value = ('OK', [b'1'])
            mailbox.search.return_value = ('OK', [b'7'])
            mailbox.fetch.return_value = ('OK', [(b'metadata', dsn())])
            self.assertTrue(monitor.digest_bounced({'SMTP_USER': 'synthetic', 'SMTP_PASS': 'synthetic'}, {'<digest-fixture@qr-s.ru>'}))
            mailbox.select.assert_called_once_with('INBOX', readonly=True)
            mailbox.fetch.assert_called_once_with(b'7', '(BODY.PEEK[]<0.262144>)')

    def test_headers_only_returned_by_beget(self):
        headers_only = dsn().replace(b'message/rfc822', b'text/rfc822-headers')
        self.assertTrue(monitor.rejected_digest(headers_only, {'<digest-fixture@qr-s.ru>'}))
        self.assertFalse(monitor.rejected_digest(headers_only, {'<another@qr-s.ru>'}))

    def test_no_mailbox_access_without_known_digest_ids(self):
        with patch.object(monitor.imaplib, 'IMAP4_SSL') as imap:
            self.assertFalse(monitor.digest_bounced({}, set()))
            imap.assert_not_called()


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
