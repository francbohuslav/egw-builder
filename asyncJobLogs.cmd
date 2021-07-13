@echo off
docker-compose logs asyncJob -f --no-color | node %1\coloredGradle.js AsyncJob %2
