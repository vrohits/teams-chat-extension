@echo off
title Teams Chat Public Tunnel (Cloudflare)
cd /d "%~dp0"
echo ========================================================
echo Starting Public Cloudflare Tunnel for Port 8080...
echo ========================================================
echo Copy the https://...trycloudflare.com link shown below
echo and paste it into your Chrome Extension Settings!
echo ========================================================
"%~dp0\cloudflared.exe" tunnel --url http://localhost:8080
pause
