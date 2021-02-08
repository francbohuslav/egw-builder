@echo off
gradlew --console plain start %2 %3 %4 %5 | powershell -ExecutionPolicy Bypass -File %1\coloredGradle.ps1