param(
  [string]$Repository = "fhenriquefcruz/cfp-money",
  [string]$ServiceAccountJson,
  [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Comando '$Name' não encontrado. Instale-o e tente novamente."
  }
}

function ConvertFrom-SecureValue {
  param([Security.SecureString]$SecureValue)

  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

function Read-RequiredSecureValue {
  param([string]$Label)

  $secure = Read-Host $Label -AsSecureString
  $plain = ConvertFrom-SecureValue $secure
  if ([string]::IsNullOrWhiteSpace($plain)) {
    throw "$Label não pode ficar vazio."
  }
  return $plain
}

function Set-RepositorySecret {
  param(
    [string]$Name,
    [string]$Value,
    [string]$Repo
  )

  $psi = [Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = "gh"
  $psi.Arguments = "secret set $Name --repo $Repo"
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $psi

  [void]$process.Start()
  $process.StandardInput.Write($Value)
  $process.StandardInput.Close()

  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($process.ExitCode -ne 0) {
    throw "Falha ao cadastrar $Name. $stderr"
  }

  if ($stdout) {
    Write-Verbose $stdout
  }

  Write-Host "✓ $Name cadastrado"
}

function New-AdminSecret {
  $bytes = [byte[]]::new(48)
  [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return ([Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_"))
}

Require-Command "gh"

Write-Host "Validando autenticação do GitHub CLI..."
& gh auth status
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI não está autenticado. Execute 'gh auth login' e tente novamente."
}

if ([string]::IsNullOrWhiteSpace($ServiceAccountJson)) {
  $ServiceAccountJson = Read-Host "Caminho do JSON da conta de serviço Google"
}

if (-not (Test-Path -LiteralPath $ServiceAccountJson -PathType Leaf)) {
  throw "Arquivo da conta de serviço não encontrado: $ServiceAccountJson"
}

$serviceAccount = Get-Content -LiteralPath $ServiceAccountJson -Raw | ConvertFrom-Json
$googleClientEmail = [string]$serviceAccount.client_email
$googlePrivateKey = [string]$serviceAccount.private_key

if ([string]::IsNullOrWhiteSpace($googleClientEmail) -or [string]::IsNullOrWhiteSpace($googlePrivateKey)) {
  throw "O JSON informado não contém client_email/private_key válidos."
}

$cloudflareApiToken = Read-RequiredSecureValue "Cloudflare API Token"
$brevoApiKey = Read-RequiredSecureValue "Brevo API Key"
$testUid = Read-Host "UID da conta de teste no Firebase Authentication"
$senderEmail = Read-Host "E-mail remetente já validado no Brevo"

if ([string]::IsNullOrWhiteSpace($testUid)) {
  throw "O UID da conta de teste é obrigatório."
}

if ($senderEmail -notmatch "^[^\s@]+@[^\s@]+\.[^\s@]+$") {
  throw "O e-mail remetente informado é inválido."
}

$adminSecret = New-AdminSecret

$secrets = [ordered]@{
  CLOUDFLARE_API_TOKEN               = $cloudflareApiToken
  GOOGLE_CLIENT_EMAIL                = $googleClientEmail
  GOOGLE_PRIVATE_KEY                 = $googlePrivateKey
  BREVO_API_KEY                      = $brevoApiKey
  EMAIL_NOTIFICATIONS_ADMIN_SECRET   = $adminSecret
  EMAIL_NOTIFICATIONS_TEST_UID       = $testUid.Trim()
  EMAIL_NOTIFICATIONS_SENDER_EMAIL   = $senderEmail.Trim()
}

Write-Host ""
Write-Host "Cadastrando secrets em $Repository..."

foreach ($entry in $secrets.GetEnumerator()) {
  Set-RepositorySecret -Name $entry.Key -Value ([string]$entry.Value) -Repo $Repository
}

Write-Host ""
Write-Host "Verificando presença dos secrets..."

$existingNames = @(
  & gh secret list --repo $Repository --json name --jq ".[].name"
)

if ($LASTEXITCODE -ne 0) {
  throw "Não foi possível listar os secrets do repositório."
}

$missing = @($secrets.Keys | Where-Object { $_ -notin $existingNames })
if ($missing.Count -gt 0) {
  throw "Secrets ainda ausentes após o cadastro: $($missing -join ', ')"
}

Write-Host "✓ Todos os 7 secrets estão presentes."

if (-not $SkipDeploy) {
  Write-Host ""
  Write-Host "Disparando o workflow de deploy do Worker..."
  & gh workflow run deploy-email-notifications-worker.yml --repo $Repository --ref main
  if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível disparar o workflow de deploy."
  }

  Write-Host "✓ Workflow disparado."
  Write-Host "Acompanhe com:"
  Write-Host "  gh run list --repo $Repository --workflow deploy-email-notifications-worker.yml --limit 1"
}

$cloudflareApiToken = $null
$brevoApiKey = $null
$googlePrivateKey = $null
$adminSecret = $null
$secrets = $null

Write-Host ""
Write-Host "Concluído sem gravar valores de secrets em arquivos do repositório."
