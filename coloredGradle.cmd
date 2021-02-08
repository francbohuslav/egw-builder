@echo off
gradlew --console plain start %2 %3 %4 %5 | node %1\coloredGradle.js