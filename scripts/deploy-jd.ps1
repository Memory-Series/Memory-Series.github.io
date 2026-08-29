# ------------------------------------------------------------------
# Deploy to JD Cloud (京东云) — build dist and upload to remote Nginx.
#
# Usage (PowerShell):
#   powershell -ExecutionPolicy Bypass -File scripts/deploy-jd.ps1
#
# Prereqs:
#   - Posh-SSH module (Install-Module Posh-SSH -Force)
#   - JD Cloud host reachable + Docker nginx container "memory-series-nginx"
#   - Edit HOST / USER / PASSWORD below (or set env vars JD_HOST/JD_USER/JD_PASS)
#
# Remote layout:
#   /opt/memory-series            site root (mounted into nginx:80)
#   container: memory-series-nginx  nginx:alpine, -p 80:80, --privileged
# ------------------------------------------------------------------
$ErrorActionPreference = 'Stop'

$JD_HOST = if ($env:JD_HOST) { $env:JD_HOST } else { '111.228.60.135' }
$JD_USER = if ($env:JD_USER) { $env:JD_USER } else { 'root' }
$JD_PASS = if ($env:JD_PASS) { $env:JD_PASS } else { '955777Qq..' }

$REPO = Split-Path -Parent $PSScriptRoot
$DIST = Join-Path $REPO 'dist'
$TAR  = Join-Path $env:TEMP 'memory-series-dist.tar.gz'
$REMOTE_DIR = '/opt/memory-series'

Write-Host "==> Deploying to $JD_USER@$JD_HOST ..."

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

# 3. Connect & upload
$pw = ConvertTo-SecureString $JD_PASS -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($JD_USER, $pw)
$sftp = New-SFTPSession -ComputerName $JD_HOST -Credential $cred -AcceptKey -ConnectionTimeout 20
try {
  Set-SFTPItem -SessionId $sftp.SessionId -Destination '/root/' -Path $TAR -Force
} finally {
  Remove-SFTPSession -SessionId $sftp.SessionId | Out-Null
}
Write-Host '==> uploaded'

# 4. Extract + restart nginx container
$ssh = New-SSHSession -ComputerName $JD_HOST -Credential $cred -AcceptKey -ConnectionTimeout 20
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

Write-Host '==> Deploy complete: http://'$JD_HOST'/'
