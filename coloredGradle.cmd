@echo off
gradlew --console plain start %3 %4 %5 | node %1\coloredGradle.js %2
@REM type %1\testColors.txt | node %1\coloredGradle.js
