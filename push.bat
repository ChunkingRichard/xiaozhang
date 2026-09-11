@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo   XiaoZhang - Push to GitHub
echo ============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] git not found.
  echo         Install Git for Windows: https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

echo [1/3] Remote repository:
git remote -v
echo.

echo [2/3] Checking local changes...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "update"
  echo       Committed.
) else (
  echo       Nothing to commit.
)
echo.

echo [3/3] Pushing... (a GitHub login window may pop up)
echo.
git push -u origin main
set PUSH_RESULT=%errorlevel%

echo.
echo ============================================
if "%PUSH_RESULT%"=="0" (
  echo   [OK] Pushed successfully.
  echo.
  echo   Next step: enable GitHub Pages
  echo     repo - Settings - Pages
  echo     Source: Deploy from a branch
  echo     Branch: main + / (root) - Save
  echo.
  echo   After 1-2 minutes open:
  echo   https://chunkingrichard.github.io/xiaozhang/app/
) else (
  echo   [FAILED] Push did not succeed.
  echo   Please screenshot the error above.
  echo.
  echo   Common causes:
  echo     - cannot reach github.com (proxy needed)
  echo     - login window was closed or cancelled
  echo     - remote has newer commits, pull first
)
echo ============================================
echo.
pause
