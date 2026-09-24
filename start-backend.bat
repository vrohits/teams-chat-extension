@echo off
title Teams Chat Backend
cd /d "%~dp0\backend"
echo ========================================================
echo Starting Teams Chat Java Backend (Port 8080)...
echo ========================================================
"C:\Users\rohit.vaghasiya\.m2\wrapper\dists\apache-maven-3.9.16-bin\5grr65jo27hi51sujmtcldfovl\apache-maven-3.9.16\bin\mvn.cmd" spring-boot:run "-Dspring-boot.run.profiles=dev"
pause
