@echo off
git pull
call npm i
powershell -ExecutionPolicy Bypass -File .\download-runner.ps1
pause