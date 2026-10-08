import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ASYNC_JOB_PORT, ASYNC_JOB_UID, BSG02_PORT, DEFAULT_PAYLOAD_PERSISTENCE_STRATEGY, HEALTH_CHECK_UID } from "../domain/projects";
import type { Project } from "../domain/types";
import type { Workspace } from "../domain/workspace";
import { waitForUrl } from "../infra/http";
import { logger } from "../infra/logger";
import { delay, startDetached } from "../infra/process";
import { getSubAppJavaInfo } from "../tools/java";
import { copyUu5Environment } from "./build";
import type { RunContext } from "./context";
import { cloneDataGatewayForIec } from "./iec-clone";
import { killProject } from "./kill";
import { getBuildGradleVersion } from "./versions";

// 127.0.0.1 is used instead of localhost to force IPv4, the apps listen only there
const LOCALHOST = "127.0.0.1";

/** Waits until the application answers its health check. */
export async function waitForApplicationReady(project: Project): Promise<void> {
  await waitForUrl(`http://${LOCALHOST}:${project.port}/${project.webName}/${HEALTH_CHECK_UID}/sys/getHealth`);
}

/** Waits until the AsyncJob application (docker) answers its health check. */
export async function waitForAsyncJobReady(): Promise<void> {
  await waitForUrl(`http://${LOCALHOST}:${ASYNC_JOB_PORT}/uu-asyncjobg01-main/${ASYNC_JOB_UID}/sys/getHealth`);
}

/** Waits until BSg02 (docker) answers. */
export async function waitForBsg02Ready(): Promise<void> {
  await waitForUrl(`http://${LOCALHOST}:${BSG02_PORT}/`);
}

/**
 * Starts the application in a new minimized console window.
 * The window runs `coloredGradle.cmd`, which starts Java and pipes its output through the colorizer (`coloredGradle.js`)
 * that also writes the log file `<root>/logs/<CODE>.log`.
 */
export function runApp(ctx: RunContext, project: Project): void {
  const { ws, options, jdk } = ctx;
  mkdirSync(ws.logsDir, { recursive: true });
  const javaInfo = getSubAppJavaInfo(ws, project);
  const logFile = join(ws.logsDir, `${project.code}.log`);
  const strategy = options.payloadPersistenceStrategy;
  const commandLine =
    `start "${project.code}" /MIN ${ws.builderDir}\\coloredGradle` +
    ` ${ws.builderDir}` +
    ` ${project.code}` +
    ` ${logFile}` +
    ` ${javaInfo.mainClassName}` +
    ` ${jdk || "default"}` +
    ` -Xmx${javaInfo.maxMemory}` +
    (strategy && strategy !== DEFAULT_PAYLOAD_PERSISTENCE_STRATEGY ? ` "-DpayloadPersistenceStrategy=${strategy}"` : "");
  startDetached(commandLine, ws.serverDir(project));
}

/** Opens a console window with the colored log of the AsyncJob docker container. */
export function openAsyncJobLogs(ws: Workspace): void {
  mkdirSync(ws.logsDir, { recursive: true });
  const dg = ws.project("DG");
  const commandLine = `start "AsyncJob" /MAX ${ws.builderDir}\\asyncJobLogs.cmd ${ws.builderDir} ${join(ws.logsDir, "AsyncJob.log")}`;
  startDetached(commandLine, join(ws.dir(dg), "docker", "egw-tests"));
}

/** `-run*`: kills the previous instances and starts the selected applications. */
export async function startApps(ctx: RunContext): Promise<void> {
  const { ws, options } = ctx;
  logger.message("Starting apps...");
  let previous: Project | undefined;
  for (const project of ws.runnableProjects) {
    if (!options.run.has(project.code)) {
      continue;
    }
    if (previous && options.runInSequence) {
      await waitForApplicationReady(previous);
    }
    logger.message(`Starting ${project.code}`);
    if (await killProject(project)) {
      logger.info("Killed previous");
    }
    // Since version 4 the endpoints use the DG from the repository directly, older ones need a copy of it
    if (project.code === "IEC62325" && !options.build.has("IEC62325")) {
      cloneDataGatewayForIec(ws, getBuildGradleVersion(ws, ws.project("DG")));
    }
    if (project.code === "MR") {
      logger.info("Copying tests-uu5-environment.json to server/public");
      copyUu5Environment(ctx);
    }
    runApp(ctx, project);
    await delay(1000);
    previous = project;
  }
}
