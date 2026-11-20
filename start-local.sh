#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "NovoraScans yerel ortamı hazırlanıyor…"

# sudo replaces HOME and PATH; find the invoking user's local Node installation.
RUNTIME_HOME="$HOME"
if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
  if ! USER_ENTRY="$(getent passwd "$SUDO_USER")"; then
    echo "Hata: '$SUDO_USER' kullanıcısının ev dizini bulunamadı." >&2
    exit 1
  fi
  IFS=: read -r _ _ _ _ _ RUNTIME_HOME _ <<< "$USER_ENTRY"
  if [[ -z "$RUNTIME_HOME" ]]; then
    echo "Hata: '$SUDO_USER' kullanıcısının ev dizini bulunamadı." >&2
    exit 1
  fi
fi
export PATH="$RUNTIME_HOME/.local/bin:$PATH"

if [[ -s "${NVM_DIR:-$RUNTIME_HOME/.nvm}/nvm.sh" ]]; then
  # Use the repository's .nvmrc when that Node version is already installed.
  source "${NVM_DIR:-$RUNTIME_HOME/.nvm}/nvm.sh"
    if ! nvm use --silent >/dev/null 2>&1; then
        echo "Hata: .nvmrc dosyasında belirtilen Node.js sürümü kurulu değil."
        echo "Kurmak için: nvm install"
        exit 1
    fi
fi

for command in node corepack docker; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Hata: '$command' bulunamadı." >&2
    exit 1
  fi
done

if ! DOCKER_STATUS="$(docker info 2>&1)"; then
  printf '%s\n' "$DOCKER_STATUS" >&2
  if [[ "$DOCKER_STATUS" == *"permission denied"* ]]; then
    echo "Hata: Docker soketine erişim reddedildi. sudo bash start-local.sh ile tekrar deneyin." >&2
  else
    echo "Hata: Docker çalışmıyor. Docker'ı açıp tekrar deneyin." >&2
  fi
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Bağımlılıklar ilk kez kuruluyor…"
  corepack pnpm install --frozen-lockfile
fi

APP_URL="${NOVORA_LOCAL_URL:-http://localhost:3000/tr}"
APP_HEALTH_URL="${APP_URL%/tr}/api/health"

if node -e '
  fetch(process.argv[1])
    .then(async (response) => {
      const body = await response.json()
      process.exit(response.ok && body.status === "ok" && body.checks ? 0 : 1)
    })
    .catch(() => process.exit(1))
' "$APP_HEALTH_URL"; then
  echo
  echo "NovoraScans zaten çalışıyor: $APP_URL"
  if [[ "${NOVORA_NO_BROWSER:-0}" != "1" ]] &&
    command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$APP_URL" >/dev/null 2>&1 || true
  fi
  exit 0
fi

corepack pnpm setup:local

echo
echo "NovoraScans başlatılıyor: $APP_URL"
echo "Durdurmak için Ctrl+C kullanabilirsiniz."

if [[ "${NOVORA_NO_BROWSER:-0}" != "1" ]] &&
  command -v xdg-open >/dev/null 2>&1; then
  (
    for _ in {1..60}; do
      if node -e 'fetch(process.argv[1]).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))' "$APP_URL"; then
        xdg-open "$APP_URL" >/dev/null 2>&1 || true
        exit 0
      fi
      sleep 1
    done
  ) &
fi

exec corepack pnpm dev
