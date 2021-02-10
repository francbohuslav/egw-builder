@echo off
gradlew --console plain start %2 %3 %4 %5 | node %1\coloredGradle.js
@REM type %1\testColors.txt | node %1\coloredGradle.js
