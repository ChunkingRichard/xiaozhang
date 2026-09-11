@echo off
chcp 65001 >nul
rem ============================================================
rem  push.bat —— 一键推送到 GitHub
rem  用法：双击本文件即可
rem  首次运行会弹出 GitHub 登录窗口，登录后会自动记住凭据
rem ============================================================

cd /d "%~dp0"

echo.
echo ============================================
echo   小账 · 推送到 GitHub
echo ============================================
echo.

rem ---- 1. 检查 git ----
where git >nul 2>nul
if %errorlevel% neq 0 (
  echo [错误] 没有找到 git，请先安装 Git for Windows
  echo        下载地址：https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

rem ---- 2. 检查远程仓库 ----
echo [1/3] 当前远程仓库：
git remote -v
echo.

rem ---- 3. 提交本地未保存的改动（如果有） ----
echo [2/3] 检查本地改动...
git add -A
git diff --cached --quiet
if %errorlevel%==0 (
  echo       没有新改动，跳过提交
) else (
  git commit -m "更新"
  echo       已提交新改动
)
echo.

rem ---- 4. 推送 ----
echo [3/3] 正在推送（首次会弹窗要求登录 GitHub）...
echo.
git push -u origin main

echo.
echo ============================================
if %errorlevel%==0 (
  echo   [成功] 推送完成
  echo.
  echo   下一步：去 GitHub 仓库开启 Pages
  echo   仓库 - Settings - Pages
  echo   Source 选 Deploy from a branch
  echo   Branch 选 main + / (root) - Save
  echo.
  echo   等 1~2 分钟后访问：
  echo   https://chunkingrichard.github.io/xiaozhang/app/
) else (
  echo   [失败] 推送未成功，请把上面的错误信息截图给我
  echo.
  echo   常见原因：
  echo   - 网络无法访问 github.com（需要代理）
  echo   - 登录窗口被关闭或取消了
  echo   - 远程仓库有别人推的新内容，需要先 pull
)
echo ============================================
echo.
pause
