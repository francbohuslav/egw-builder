@echo off
docker-compose logs -f --no-color asyncJob | node %1\coloredGradle.js AsyncJob %2
