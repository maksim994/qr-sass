# HTTP → HTTPS, один 301 для GET и HEAD

Traefik v3 возвращает 301 для GET, но 308 для HEAD в RedirectRegex permanent (см. https://github.com/traefik/traefik/blob/v3.1/pkg/middlewares/redirect/redirect.go). Для требуемого `curl -I` 301 применяется отдельный внутренний Nginx, без host ports. Он сохраняет query и удаляет конечный `/`, кроме корня. HTTPS и пользовательские маршруты приложения не меняются.

На сервере конфиг Nginx: `/opt/qr-s-http-redirect/nginx.conf`; router: `/data/coolify/proxy/dynamic/qr-s-http-one-hop.yaml`. Контейнер `qr-s-http-redirect`, официальное `nginx:stable-alpine`, сеть `coolify`, restart unless-stopped, root filesystem read-only, временные каталоги tmpfs. Закреплённый digest записывается в отчёте выпуска.

Откат: убрать только `qr-s-http-one-hop.yaml` из dynamic; после обновления proxy проверить старый redirect. Контейнер можно остановить отдельно. PostgreSQL, Redis, приложение и их тома не затрагиваются.

При переносе сервера перенести конфиг и восстановить контейнер в той же внутренней сети. Не перезапускать весь proxy ради этой правки: file provider наблюдает dynamic.
