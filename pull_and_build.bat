@echo off
git restore package-lock.json
git stash
git pull
git stash pop
call npm ci
powershell -ExecutionPolicy Bypass -File .\download-runner.ps1
pause