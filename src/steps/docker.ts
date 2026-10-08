import { existsSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_PAYLOAD_PERSISTENCE_STRATEGY } from "../domain/projects";
import type { Project } from "../domain/types";
import { logger } from "../infra/logger";
import { runCommand } from "../infra/process";
import type { RunContext } from "./context";

/** Docker profiles which may be started. All of them are stopped, so no container stays after switching the strategy. */
const ALL_PROFILES = ["S3", "Azure", "BSg02"];

/** Folder of the docker compose project of the application. */
function composeDir(ctx: RunContext, project: Project): string {
  return join(ctx.ws.dir(project), "docker", "egw-tests");
}

function hasCompose(ctx: RunContext, project: Project): boolean {
  return existsSync(join(composeDir(ctx, project), "docker-compose.yml"));
}

/** Extracts container IDs from the output of `docker container ls -a`. The first line is a header, short lines are empty ones. */
export function parseContainerIds(output: string): string[] {
  return output
    .split("\n")
    .slice(1)
    .map((line) => line.split(" ")[0] ?? "")
    .filter((id) => id.length > 10);
}

async function stopComposer(cwd: string): Promise<void> {
  const profiles = ALL_PROFILES.flatMap((p) => ["--profile", p]);
  try {
    await runCommand("docker", ["compose", ...profiles, "kill"], { cwd });
    await runCommand("docker", ["compose", ...profiles, "down"], { cwd });
  } catch (error) {
    // Nothing is running or docker is not started, which is fine for clearing
    logger.debug(`docker compose stop ignored: ${error instanceof Error ? error.message : error}`);
  }
}

/** Removes the containers of the tests which are not part of any compose project. */
async function cleanLooseContainers(): Promise<void> {
  const mongo = await runCommand("docker", ["container", "ls", "-a", "--filter", "name=egw-tests_mongo"]);
  const runTest = await runCommand("docker", ["container", "ls", "-a", "--filter", "name=egw-run-test"]);
  const ids = [...parseContainerIds(mongo.stdOut)];
  // Only one container of the test runner is expected
  const runTestId = parseContainerIds(runTest.stdOut)[0];
  if (runTestId) {
    ids.push(runTestId);
  }
  for (const id of ids) {
    logger.info("Stop docker ...");
    await runCommand("docker", ["container", "stop", id]);
    logger.info("Remove docker ...");
    await runCommand("docker", ["container", "rm", id]);
  }
}

/** `-clear`: stops and removes docker containers of all runnable projects. */
export async function clearDockers(ctx: RunContext): Promise<void> {
  logger.message("Clearing docker...");
  for (const project of ctx.ws.runnableProjects) {
    if (hasCompose(ctx, project)) {
      await stopComposer(composeDir(ctx, project));
    }
    if (project.code === "DG") {
      await cleanLooseContainers();
    }
  }
}

/**
 * Starts docker containers which the selected apps (or the unit tests of the selected builds) need.
 * A project with `before-start.cmd` runs it first (e.g. to prepare the data).
 */
export async function startDockers(ctx: RunContext): Promise<void> {
  const { options, ws } = ctx;
  logger.message("Starting docker...");
  // The merged app contains all apps, so it needs the containers of all of them
  const isMergedRun = options.run.has("MERGED");
  for (const project of ws.runnableProjects) {
    const needed = (options.unitTests && options.build.has(project.code)) || options.run.has(project.code) || isMergedRun;
    if (!needed || !hasCompose(ctx, project)) {
      continue;
    }
    const beforeStart = join(ws.dir(project), "before-start.cmd");
    if (existsSync(beforeStart)) {
      await runCommand("before-start.cmd", [], { cwd: ws.dir(project), shell: true });
    }
    const profile = options.payloadPersistenceStrategy || DEFAULT_PAYLOAD_PERSISTENCE_STRATEGY;
    await runCommand("docker", ["compose", "--profile", profile, "up", "-d"], { cwd: composeDir(ctx, project) });
  }
}
