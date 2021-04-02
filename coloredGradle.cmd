@echo off
docker-compose up | node %1\coloredGradle.js %2 %3
@REM type .\testColors.txt | node .\coloredGradle.js dg temp.log
