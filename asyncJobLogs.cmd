@echo off
docker compose logs -f --no-color --tail 500 asyncJob | node %1\coloredGradle.js AsyncJob %2
