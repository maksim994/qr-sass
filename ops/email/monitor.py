#!/usr/bin/env python3
"""Independent host monitor. SMTP secrets stay on this server, never in logs."""
import datetime as dt
import email
import email.message
import fcntl
import imaplib
import json
import os
from pathlib import Path
import smtplib
import ssl
import subprocess
import sys
import urllib.request

RESOURCE = 'o08skcsckso0o4o8o88ow08s'
STATE = Path('/var/lib/qr-s-backup')
OWNER = 'maksim994@yandex.ru'


def command(args):
    return subprocess.run(args, check=True, capture_output=True, text=True, timeout=30).stdout


def app_config():
    cache = STATE / 'email-smtp.json'
    try:
        names = command(['docker', 'ps', '-a', '--format', '{{.Names}}']).splitlines()
        app = next((n for n in names if n.startswith('app-' + RESOURCE + '-')), None)
        if app:
            data = json.loads(command(['docker', 'inspect', app]))[0]
            env = dict(v.split('=', 1) for v in data['Config']['Env'] if '=' in v)
            smtp = {k: v for k, v in env.items() if k.startswith('SMTP_')}
            if all(smtp.get(k) for k in ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']):
                temp = cache.with_suffix('.tmp')
                temp.write_text(json.dumps(smtp))
                temp.chmod(0o600)
                temp.replace(cache)
            return app, json.loads(cache.read_text()) if cache.exists() else smtp
    except (subprocess.SubprocessError, OSError, ValueError, KeyError):
        # A stopped Docker daemon must not prevent independent email delivery.
        if not cache.exists():
            raise
    return None, json.loads(cache.read_text())


def send(config, text, subject='QR-S.ru: требуется внимание'):
    message = email.message.EmailMessage()
    message['From'] = config['SMTP_FROM']
    message['To'] = OWNER
    message['Reply-To'] = OWNER
    message['Subject'] = subject
    message.set_content(text)
    port = int(config.get('SMTP_PORT', 465))
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(config['SMTP_HOST'], port, context=context, timeout=20) as smtp:
        smtp.login(config['SMTP_USER'], config['SMTP_PASS'])
        rejected = smtp.send_message(message)
        if rejected:
            raise RuntimeError('Recipient rejected')


def rejected_digest(raw, message_ids):
    """Only a failed DSN containing an exact original Message-ID counts."""
    message = email.message_from_bytes(raw)
    failed = any(
        part.get_content_type() == 'message/delivery-status'
        and any(block.get('Action', '').lower() == 'failed' for block in part.get_payload())
        for part in message.walk()
    )
    if not failed:
        return False
    for part in message.walk():
        if part.get('Message-ID', '').strip() in message_ids:
            return True
        # Exim/Beget can attach only the original headers instead of the full mail.
        if part.get_content_type() in ('text/rfc822-headers', 'message/global-headers'):
            headers = email.message_from_bytes(part.get_payload(decode=True) or b'')
            if headers.get('Message-ID', '').strip() in message_ids:
                return True
    return False


def digest_bounced(config, message_ids):
    if not message_ids:
        return False
    # Same Beget mailbox credentials as SMTP, official incoming-mail server.
    # Never mark mail as read or log its headers, body, addresses or raw errors.
    with imaplib.IMAP4_SSL('imap.beget.com', ssl_context=ssl.create_default_context(), timeout=15) as mailbox:
        mailbox.login(config['SMTP_USER'], config['SMTP_PASS'])
        if mailbox.select('INBOX', readonly=True)[0] != 'OK':
            raise RuntimeError('Bounce mailbox unavailable')
        since = '-'.join(email.utils.format_datetime(dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)).split()[1:4])
        status, data = mailbox.search(None, 'SINCE', since)
        if status != 'OK':
            raise RuntimeError('Bounce search unavailable')
        for mid in data[0].split()[-100:]:
            status, parts = mailbox.fetch(mid, '(BODY.PEEK[]<0.262144>)')
            if status != 'OK':
                raise RuntimeError('Bounce message unavailable')
            if any(isinstance(part, tuple) and rejected_digest(part[1], message_ids) for part in parts):
                return True
    return False


def issues(app, config=None):
    result = []
    # Existing backup monitor checks freshness, restore verification and systemd failures.
    sys.path.insert(0, '/opt/qr-s-backup')
    try:
        from notify import issues as backup_issues
        result.extend(backup_issues(dt.datetime.now(dt.timezone.utc)))
    except Exception:
        result.append('Не удалось проверить резервное копирование')
    try:
        with urllib.request.urlopen('https://qr-s.ru/api/health', timeout=15) as response:
            if response.status != 200 or not json.load(response).get('ok'):
                raise ValueError()
    except Exception:
        result.append('Сайт или база данных не отвечают')
    if app:
        try:
            health = json.loads(command(['docker', 'exec', app, 'node', 'scripts/email-health.mjs']))
            if not health.get('alive'):
                result.append('Почтовый обработчик не отвечает')
            if health.get('failed'):
                result.append('Есть недоставленные письма; проверьте очередь в админке')
            if health.get('digestOverdue'):
                result.append('Ежедневная сводка не принята SMTP после 09:10 МСК; проверьте очередь')
            if config and health.get('digestMessageIds'):
                try:
                    if digest_bounced(config, set(health['digestMessageIds'])):
                        print('Daily digest delivery-status failure detected', file=sys.stderr)
                        result.append('Почтовый провайдер вернул ежедневную сводку после приёма SMTP; нужен ручной повтор')
                except Exception:
                    result.append('Не удалось проверить почтовые возвраты ежедневной сводки')
        except Exception:
            result.append('Не удалось проверить почтовый обработчик')
    else:
        result.append('Контейнер приложения отсутствует')
    return sorted(set(result))


def main():
    os.umask(0o077)
    STATE.mkdir(parents=True, exist_ok=True)
    with (STATE / 'email-monitor.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        app, config = app_config()
        if '--test' in sys.argv:
            send(config, 'Тест SMTP QR-S.ru. Отправка через Beget работает. Это проверка независимого мониторинга резервных копий, сайта и почтового обработчика.', 'QR-S.ru: тест отправки уведомлений')
            print('SMTP accepted the test message')
            return
        path = STATE / 'email-monitor-state.json'
        previous = json.loads(path.read_text()) if path.exists() else {}
        current, now = issues(app, config), dt.datetime.now(dt.timezone.utc).timestamp()
        if current and (current != previous.get('issues', []) or now - previous.get('sent_at', 0) >= 86400):
            send(config, 'QR-S.ru: требуется проверка.\n' + '\n'.join(current) + '\nhttps://qr-s.ru/admin/notifications')
        elif not current and previous.get('issues'):
            send(config, 'Сайт, резервное копирование и почтовый обработчик снова в норме.', 'QR-S.ru: работа восстановлена')
        else:
            print('Monitor checked; no notification needed')
            return
        temp = path.with_suffix('.tmp')
        temp.write_text(json.dumps({'issues': current, 'sent_at': now}))
        temp.chmod(0o600)
        temp.replace(path)
        print('SMTP accepted the monitor notification')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('Email monitor failed; private settings and delivery must be checked', file=sys.stderr)
        sys.exit(1)
