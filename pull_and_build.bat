@echo off
git pull
npm i
powershell -ExecutionPolicy Bypass -File .\download-runner.ps1
pause