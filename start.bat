@echo off
chcp 65001 >nul
title 小账 · AI 记账
cd /d "%~dp0app"
echo.
echo   小账 · AI 记账工具
echo   ------------------------------------
echo   正在启动本地服务...
echo   启动后请用浏览器访问: http://127.0.0.1:8765
echo   手机访问: 用手机浏览器打开 http://本机IP:8765
echo   按 Ctrl+C 停止服务
echo.
start "" http://127.0.0.1:8765
python -m http.server 8765
