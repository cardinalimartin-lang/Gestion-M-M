@echo off
setlocal
set "HTML=%~dp0Presupuesto.html"

REM Try Chrome first
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files "%HTML%"
  goto :eof
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files "%HTML%"
  goto :eof
)

REM Fallback to Microsoft Edge
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --allow-file-access-from-files "%HTML%"
  goto :eof
)
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --allow-file-access-from-files "%HTML%"
  goto :eof
)

echo No se encontro Chrome ni Edge en las ubicaciones estandar.
echo Abre Presupuesto.html manualmente con un navegador y el flag --allow-file-access-from-files.
pause
