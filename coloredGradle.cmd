@echo off
@REM echo gradlew --console plain start %4 %5 %6 %7 %8
gradlew --console plain start %4 %5 %6 %7 %8 | node %1\coloredGradle.js %2 %3
title %2 END!!!