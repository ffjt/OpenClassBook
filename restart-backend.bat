@echo off
setlocal
title OpenClassBook Backend
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0restart-backend.ps1" %*
if errorlevel 1 pause
endlocal
