# Simple static file server using TcpListener (no HttpListener/URLACL needed)
# Usage: powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 5500

param(
  [int]$Port = 5500
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()

Write-Host "Servidor iniciado en http://localhost:$Port/"
Write-Host "Raíz: $root"
Write-Host "Presiona Ctrl+C para detener"

$mime = @{
  '.html'='text/html; charset=utf-8'
  '.htm' ='text/html; charset=utf-8'
  '.js'  ='application/javascript; charset=utf-8'
  '.css' ='text/css; charset=utf-8'
  '.json'='application/json; charset=utf-8'
  '.csv' ='text/csv; charset=utf-8'
  '.png' ='image/png'
  '.jpg' ='image/jpeg'
  '.jpeg'='image/jpeg'
  '.gif' ='image/gif'
  '.svg' ='image/svg+xml'
  '.ico' ='image/x-icon'
}

function Get-ContentType($path) {
  $ext = [System.IO.Path]::GetExtension($path).ToLower()
  if ($mime.ContainsKey($ext)) { return $mime[$ext] }
  return 'application/octet-stream'
}

while ($true) {
  try {
    $client = $listener.AcceptTcpClient()
    Start-Job -ArgumentList $client,$root -ScriptBlock {
      param($client,$root)
      try {
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $writer = New-Object System.IO.StreamWriter($stream)
        $writer.NewLine = "\r\n"
        $writer.AutoFlush = $true

        # Read first request line
        $requestLine = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($requestLine)) { $client.Close(); return }

        # Consume remaining headers
        while ($true) {
          $line = $reader.ReadLine()
          if ($line -eq $null -or $line -eq '') { break }
        }

        # Parse method and path
        $parts = $requestLine.Split(' ')
        $method = $parts[0]
        $path = $parts[1]

        if ($method -ne 'GET') {
          $resp = "HTTP/1.1 405 Method Not Allowed\r\nConnection: close\r\n\r\n"
          $bytes = [System.Text.Encoding]::ASCII.GetBytes($resp)
          $stream.Write($bytes,0,$bytes.Length)
          $client.Close(); return
        }

        $localPath = $path.Split('?')[0].Trim('/')
        if ([string]::IsNullOrWhiteSpace($localPath)) { $localPath = 'Presupuesto.html' }

        $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $localPath))
        if (-not $filePath.StartsWith($root)) {
          $resp = "HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n"
          $bytes = [System.Text.Encoding]::ASCII.GetBytes($resp)
          $stream.Write($bytes,0,$bytes.Length)
          $client.Close(); return
        }

        if (-not (Test-Path $filePath -PathType Leaf)) {
          $resp = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-cache, no-store, must-revalidate\r\nConnection: close\r\n\r\n404 Not Found"
          $bytes = [System.Text.Encoding]::UTF8.GetBytes($resp)
          $stream.Write($bytes,0,$bytes.Length)
          $client.Close(); return
        }

        $contentType = Get-ContentType $filePath
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $header = @(
          "HTTP/1.1 200 OK",
          "Content-Type: $contentType",
          "Content-Length: $($bytes.Length)",
          "Cache-Control: no-cache, no-store, must-revalidate",
          "Connection: close",
          ""
        ) -join "\r\n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header + "\r\n")
        $stream.Write($headerBytes,0,$headerBytes.Length)
        $stream.Write($bytes,0,$bytes.Length)
        $stream.Flush()
      } catch {}
      finally { try { $client.Close() } catch {} }
    } | Out-Null
  } catch {
    Start-Sleep -Milliseconds 50
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
