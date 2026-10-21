#!/usr/bin/env python3
"""Independent host monitor. SMTP secrets stay on this server, never in logs."""
import datetime as dt
import email.message
import fcntl
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


def issues(app):
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
        current, now = issues(app), dt.datetime.now(dt.timezone.utc).timestamp()
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
