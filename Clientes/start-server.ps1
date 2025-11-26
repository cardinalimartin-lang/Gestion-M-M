Param(
  [switch]$clientes,
  [string]$regKey
)

# Script para arrancar el servidor en background, esperar a que responda y abrir el navegador
Set-StrictMode -Version Latest

$cwd = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
Set-Location $cwd

Write-Host "Iniciando servidor desde: $cwd"

# Si existe server.pid, intentar matar proceso anterior
if (Test-Path server.pid) {
  try {
    $old = Get-Content server.pid -ErrorAction SilentlyContinue
    if ($old -match '\d+') {
      Write-Host "Detectado PID anterior: $old. Intentando detenerlo..."
      try { taskkill /PID $old /F -ErrorAction SilentlyContinue } catch {}
    }
  } catch {}
  Remove-Item server.pid -ErrorAction SilentlyContinue
}

# Si se pasó una clave de registro, exportarla en el entorno para que el servidor la use
if ($regKey) {
  Write-Host "Configurando REGISTRATION_KEY (proceso heredará esta variable)..."
  $env:REGISTRATION_KEY = $regKey
}

$p = Start-Process -FilePath node -ArgumentList 'server.js' -WorkingDirectory (Get-Location) -PassThru
Write-Host "Servidor iniciado con PID=$($p.Id)"

Write-Host "Esperando a que http://localhost:3000/health responda (timeout 30s)..."
$ready = $false
for ($i=0; $i -lt 30; $i++) {
  try {
    $r = Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch {}
  Start-Sleep -Seconds 1
}

if (-not $ready) {
  Write-Host "El servidor no respondió en el tiempo esperado. Revisá server.log y la consola para errores."
  Write-Host "PID del proceso: $($p.Id)"
  exit 1
}

if ($clientes) {
  Start-Process "http://localhost:3000/clientes"
} else {
  Start-Process "http://localhost:3000/"
}

Write-Host "Servidor listo. Para detenerlo: taskkill /PID $($p.Id) /F"
