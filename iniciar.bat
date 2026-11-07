@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo No se encontro npm. Instala Node.js y vuelve a intentarlo.
  pause
  exit /b 1
)

npm run dev
if errorlevel 1 (
  echo El servidor no pudo iniciar.
  pause
  exit /b 1
)

endlocal
