#!/usr/bin/env bash
set -euo pipefail
set +x

REPOSITORY="${REPOSITORY:-fhenriquefcruz/cfp-money}"
SERVICE_ACCOUNT_JSON="${SERVICE_ACCOUNT_JSON:-}"
SKIP_DEPLOY="${SKIP_DEPLOY:-false}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Comando '$1' não encontrado." >&2
    exit 1
  fi
}

read_required_secret() {
  local label="$1"
  local value
  read -r -s -p "$label: " value
  printf '\n' >&2
  if [[ -z "${value// }" ]]; then
    echo "$label não pode ficar vazio." >&2
    exit 1
  fi
  printf '%s' "$value"
}

set_repository_secret() {
  local name="$1"
  local value="$2"

  if ! printf '%s' "$value" | gh_personal secret set "$name" --repo "$REPOSITORY" >/dev/null; then
    echo "Falha ao cadastrar $name." >&2
    exit 1
  fi

  echo "✓ $name cadastrado"
}

require_command gh
require_command node

gh_personal() {
  env -u GH_TOKEN -u GITHUB_TOKEN gh "$@"
}

echo "Validando autenticação pessoal do GitHub CLI..."
if ! gh_personal auth status >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Nenhuma autenticação pessoal utilizável foi encontrada no GitHub CLI.

Execute:
  env -u GH_TOKEN -u GITHUB_TOKEN gh auth login --hostname github.com --web --scopes "repo,workflow"

Depois rode este bootstrap novamente.
EOF
  exit 1
fi

echo "Validando permissão para administrar GitHub Actions Secrets..."
if ! gh_personal api "repos/$REPOSITORY/actions/secrets/public-key" >/dev/null 2>&1; then
  cat >&2 <<'EOF'
A autenticação atual do GitHub CLI não pode administrar Actions Secrets deste repositório.

Em GitHub Codespaces, execute no mesmo terminal:
  unset GH_TOKEN GITHUB_TOKEN
  gh auth login --hostname github.com --web --scopes "repo,workflow"

Depois confirme:
  gh auth status

E execute este bootstrap novamente.
EOF
  exit 1
fi
echo "✓ Permissão para Actions Secrets confirmada."

if [[ -z "$SERVICE_ACCOUNT_JSON" ]]; then
  read -r -p "Caminho do JSON da conta de serviço Google: " SERVICE_ACCOUNT_JSON
fi

if [[ ! -f "$SERVICE_ACCOUNT_JSON" ]]; then
  echo "Arquivo da conta de serviço não encontrado: $SERVICE_ACCOUNT_JSON" >&2
  exit 1
fi

GOOGLE_CLIENT_EMAIL="$(
  node -e '
    const fs = require("fs")
    const file = process.argv[1]
    const json = JSON.parse(fs.readFileSync(file, "utf8"))
    if (!json.client_email) process.exit(2)
    process.stdout.write(String(json.client_email))
  ' "$SERVICE_ACCOUNT_JSON"
)"

GOOGLE_PRIVATE_KEY="$(
  node -e '
    const fs = require("fs")
    const file = process.argv[1]
    const json = JSON.parse(fs.readFileSync(file, "utf8"))
    if (!json.private_key) process.exit(2)
    process.stdout.write(String(json.private_key))
  ' "$SERVICE_ACCOUNT_JSON"
)"

if [[ -z "$GOOGLE_CLIENT_EMAIL" || -z "$GOOGLE_PRIVATE_KEY" ]]; then
  echo "O JSON informado não contém client_email/private_key válidos." >&2
  exit 1
fi

CLOUDFLARE_API_TOKEN="$(read_required_secret "Cloudflare API Token")"
BREVO_API_KEY="$(read_required_secret "Brevo API Key")"

read -r -p "UID da conta de teste no Firebase Authentication: " EMAIL_NOTIFICATIONS_TEST_UID
read -r -p "E-mail remetente já validado no Brevo: " EMAIL_NOTIFICATIONS_SENDER_EMAIL

if [[ -z "${EMAIL_NOTIFICATIONS_TEST_UID// }" ]]; then
  echo "O UID da conta de teste é obrigatório." >&2
  exit 1
fi

if [[ ! "$EMAIL_NOTIFICATIONS_SENDER_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo "O e-mail remetente informado é inválido." >&2
  exit 1
fi

EMAIL_NOTIFICATIONS_ADMIN_SECRET="$(
  node -e '
    const crypto = require("crypto")
    process.stdout.write(
      crypto.randomBytes(48).toString("base64url")
    )
  '
)"

echo
echo "Cadastrando secrets em $REPOSITORY..."

set_repository_secret "CLOUDFLARE_API_TOKEN" "$CLOUDFLARE_API_TOKEN"
set_repository_secret "GOOGLE_CLIENT_EMAIL" "$GOOGLE_CLIENT_EMAIL"
set_repository_secret "GOOGLE_PRIVATE_KEY" "$GOOGLE_PRIVATE_KEY"
set_repository_secret "BREVO_API_KEY" "$BREVO_API_KEY"
set_repository_secret "EMAIL_NOTIFICATIONS_ADMIN_SECRET" "$EMAIL_NOTIFICATIONS_ADMIN_SECRET"
set_repository_secret "EMAIL_NOTIFICATIONS_TEST_UID" "$EMAIL_NOTIFICATIONS_TEST_UID"
set_repository_secret "EMAIL_NOTIFICATIONS_SENDER_EMAIL" "$EMAIL_NOTIFICATIONS_SENDER_EMAIL"

echo
echo "Verificando presença dos secrets..."

mapfile -t EXISTING_NAMES < <(gh_personal secret list --repo "$REPOSITORY" --json name --jq '.[].name')

REQUIRED_NAMES=(
  CLOUDFLARE_API_TOKEN
  GOOGLE_CLIENT_EMAIL
  GOOGLE_PRIVATE_KEY
  BREVO_API_KEY
  EMAIL_NOTIFICATIONS_ADMIN_SECRET
  EMAIL_NOTIFICATIONS_TEST_UID
  EMAIL_NOTIFICATIONS_SENDER_EMAIL
)

MISSING=()
for name in "${REQUIRED_NAMES[@]}"; do
  found=false
  for existing in "${EXISTING_NAMES[@]}"; do
    if [[ "$name" == "$existing" ]]; then
      found=true
      break
    fi
  done
  if [[ "$found" == false ]]; then
    MISSING+=("$name")
  fi
done

if (( ${#MISSING[@]} > 0 )); then
  echo "Secrets ainda ausentes após o cadastro: ${MISSING[*]}" >&2
  exit 1
fi

echo "✓ Todos os 7 secrets estão presentes."

if [[ "$SKIP_DEPLOY" != "true" ]]; then
  echo
  echo "Disparando o workflow de deploy do Worker..."
  gh_personal workflow run deploy-email-notifications-worker.yml --repo "$REPOSITORY" --ref main
  echo "✓ Workflow disparado."
  echo "Acompanhe com:"
  echo "  env -u GH_TOKEN -u GITHUB_TOKEN gh run list --repo $REPOSITORY --workflow deploy-email-notifications-worker.yml --limit 1"
fi

unset CLOUDFLARE_API_TOKEN
unset BREVO_API_KEY
unset GOOGLE_PRIVATE_KEY
unset EMAIL_NOTIFICATIONS_ADMIN_SECRET

echo
echo "Concluído sem gravar valores de secrets em arquivos do repositório."
