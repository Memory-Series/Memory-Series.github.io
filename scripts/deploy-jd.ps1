# ------------------------------------------------------------------
# Deploy to JD Cloud (京东云) — build dist and upload to remote Nginx.
#
# Usage (PowerShell):
#   powershell -ExecutionPolicy Bypass -File scripts/deploy-jd.ps1
#
# Auth:
#   - Prefers SSH key: $HOME\.ssh\id_rsa (or $env:JD_KEYFILE)
#   - Falls back to password from env var JD_PASS (if key not present)
#   - NO password is hardcoded in this script.
#
# Prereqs:
#   - Posh-SSH module (Install-Module Posh-SSH -Force)
#   - JD Cloud host reachable + Docker nginx container "memory-series-nginx"
#
# Remote layout:
#   /opt/memory-series            site root (mounted into nginx container)
#   container: memory-series-nginx  nginx, -p 80:80 -p 443:443, --privileged
# ------------------------------------------------------------------
$ErrorActionPreference = 'Stop'

$JD_HOST = if ($env:JD_HOST) { $env:JD_HOST } else { '111.228.60.135' }
$JD_USER = if ($env:JD_USER) { $env:JD_USER } else { 'root' }
$JD_KEYFILE = if ($env:JD_KEYFILE) { $env:JD_KEYFILE } else { Join-Path $env:USERPROFILE '.ssh\id_rsa' }

$REPO = Split-Path -Parent $PSScriptRoot
$DIST = Join-Path $REPO 'dist'
$TAR  = Join-Path $env:TEMP 'memory-series-dist.tar.gz'
$REMOTE_DIR = '/opt/memory-series'

Write-Host "==> Deploying to $JD_USER@$JD_HOST ..."

# --- Build credentials: prefer SSH key, else password from env ---
$keyExists = Test-Path $JD_KEYFILE
$emptyPw = ConvertTo-SecureString 'key-auth' -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($JD_USER, $emptyPw)
if ($keyExists) {
  Write-Host "==> Using SSH key: $JD_KEYFILE"
  $connArgs = @{ ComputerName = $JD_HOST; Credential = $cred; KeyFile = $JD_KEYFILE; AcceptKey = $true; ConnectionTimeout = 20 }
} else {
  if (-not $env:JD_PASS) { throw 'No SSH key found and JD_PASS env var not set. Export JD_PASS or generate an SSH key.' }
  Write-Host '==> Using password from env JD_PASS (no key found)'
  $pw = ConvertTo-SecureString $env:JD_PASS -AsPlainText -Force
  $cred = New-Object System.Management.Automation.PSCredential($JD_USER, $pw)
  $connArgs = @{ ComputerName = $JD_HOST; Credential = $cred; AcceptKey = $true; ConnectionTimeout = 20 }
}

# 1. Build production bundle
Write-Host "==> npm run build"
Push-Location $REPO
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
Pop-Location

# 2. Pack dist into tarball
if (Test-Path $TAR) { Remove-Item $TAR -Force }
& tar -czf $TAR -C $REPO dist
Write-Host ("==> packed: " + (Get-Item $TAR).Length + " bytes")

# 3. Connect & upload (SFTP)
$sftp = New-SFTPSession @connArgs
try {
  Set-SFTPItem -SessionId $sftp.SessionId -Destination '/root/' -Path $TAR -Force
} finally {
  Remove-SFTPSession -SessionId $sftp.SessionId | Out-Null
}
Write-Host '==> uploaded'

# 4. Extract + restart nginx container (SSH)
$ssh = New-SSHSession @connArgs
try {
  $script = @"
set -e
rm -rf $REMOTE_DIR/*
tar -xzf /root/$(Split-Path $TAR -Leaf) -C $REMOTE_DIR --strip-components=1
rm -f /root/$(Split-Path $TAR -Leaf)
docker restart memory-series-nginx
sleep 2
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1/
"@
  $r = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $script
  Write-Host $r.Output
} finally {
  Remove-SSHSession -SessionId $ssh.SessionId | Out-Null
}

Write-Host "==> Deploy complete: https://www.traceinhabit.cn/ (301 = HTTP->HTTPS ok)"
