@echo off
rem ============================================================
rem  push.bat —— 一键推送到 GitHub
rem  用途：本机（双击运行）把项目推送到远程仓库
rem  说明：本机运行时有图形界面，能正常弹出 GitHub 登录窗口
rem ============================================================

cd /d "%~dp0"

echo.
echo === 当前远程仓库 ===
git remote -v
echo.

echo === 正在推送 ===
git push -u origin main

echo.
if %errorlevel%==0 (
  echo [成功] 推送完成
) else (
  echo [失败] 请检查上面的错误信息
)
echo.
pause
