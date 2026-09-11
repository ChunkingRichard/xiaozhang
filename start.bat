@echo off
setlocal
title XiaoZhang - Local Server
cd /d "%~dp0app"

echo.
echo   XiaoZhang - AI Ledger
echo   ------------------------------------
echo   Starting local server...
echo   Open in browser: http://127.0.0.1:8765
echo   Phone: open http://YOUR-LAN-IP:8765 in mobile browser
echo   Press Ctrl+C to stop.
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] python not found. Install Python 3 first.
  echo         https://www.python.org/downloads/
  echo.
  pause
  exit /b 1
)

start "" http://127.0.0.1:8765
python -m http.server 8765
