@echo off
gradlew --console plain start %2 %3 %4 %5 | pwsh %1\coloredGradle.ps1