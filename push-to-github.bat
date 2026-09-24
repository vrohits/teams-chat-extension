@echo off
title Push Teams Chat Extension to GitHub
echo ========================================================
echo Pushing project to https://github.com/vrohits/teams-chat-extension
echo ========================================================
echo.
cd /d "%~dp0"
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo [SUCCESS] Your code is now live on GitHub!
    echo Visit: https://github.com/vrohits/teams-chat-extension
    echo ========================================================
) else (
    echo [ERROR] Push failed. If prompted, please complete the GitHub login in your browser.
)
pause
