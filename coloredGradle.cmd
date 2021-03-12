@echo off
gradlew --console plain start %4 %5 | node %1\coloredGradle.js %2 %3
@REM type .\testColors.txt | node .\coloredGradle.js temp.log
