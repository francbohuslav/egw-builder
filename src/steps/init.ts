import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Options } from "../cli/options";
import type { Project } from "../domain/types";
import { BuilderError } from "../infra/errors";
import { readTextFile, removeFileIfExists } from "../infra/files";
import { logger } from "../infra/logger";
import { runCommand } from "../infra/process";
import { showFailedSteps } from "../reports/print";
import { classifySteps, parseTestSteps } from "../reports/results";
import { getJmeterBat } from "../tools/java";
import { ensureJmeter } from "../tools/jmeter";
import type { RunContext } from "./context";
import { waitForApplicationReady, waitForAsyncJobReady, waitForBsg02Ready } from "./run";

/** JMeter prints `Err: <n>` in its summary, a non-zero number means a failed request or assertion. */
const JMETER_ERRORS_PATTERN = /Err:\s+[1-9]/;

interface InitJob {
  /** Name for messages, e.g. "DG" or "ASYNC". */
  name: string;
  /** JMeter plan relative to the JMeter folder. */
  planFile: string;
  /** Result and log file names (relative to the JMeter folder). */
  resultsFile: string;
  logFile: string;
  /** Extra `-J` properties on top of the environment file. */
  properties: string[];
}

/** `_merged` environment files exist for the merged application. */
function environmentFileName(ctx: RunContext): string {
  return `${ctx.options.environmentFile}${ctx.options.isMerged ? "_merged" : ""}.cfg`;
}

/** Runs one init JMeter plan. The plans create the workspaces, set permissions etc. */
async function runInitJob(ctx: RunContext, job: InitJob): Promise<void> {
  const { ws } = ctx;
  const jmeterDir = ws.jmeterDir;
  await ensureJmeter(ws.builderDir);
  removeFileIfExists(join(jmeterDir, job.resultsFile));
  removeFileIfExists(join(jmeterDir, job.logFile));

  const params = ["-n", "-t", job.planFile, "-j", job.logFile, `-Jenv=${environmentFileName(ctx)}`, ...job.properties];
  const { stdOut } = await runCommand(getJmeterBat(ws.builderDir), params, { cwd: jmeterDir, shell: true });
  if (JMETER_ERRORS_PATTERN.test(stdOut)) {
    printInitReport(join(jmeterDir, job.resultsFile));
    throw new BuilderError(`Init commands of ${job.name} failed`);
  }
}

/** Prints the failed requests of the init with their responses. */
function printInitReport(resultsFile: string): void {
  if (!existsSync(resultsFile)) {
    logger.warning(`Result file ${resultsFile} was not created, see the JMeter log.`);
    return;
  }
  showFailedSteps(classifySteps(parseTestSteps(readTextFile(resultsFile))).newFailed, true);
}

async function initProject(ctx: RunContext, project: Project): Promise<void> {
  const { ws, options } = ctx;
  // With the merged application all inits go to it
  await waitForApplicationReady(options.isMerged ? ws.project("MERGED") : project);
  const serverDir = `${ws.root}/${project.folder}/${project.server}`;
  await runInitJob(ctx, {
    name: project.code,
    planFile: `inits/init_${project.code}.jmx`,
    resultsFile: `logs/initResults${project.code}.xml`,
    logFile: `logs/initLogs${project.code}.log`,
    // The paths are given in exactly this form to the JMeter plans, they were always passed so
    properties: [
      `-Jinsomnia_dir=${serverDir}/src/test/insomnia`,
      `-Jserver_dir=${serverDir}`,
      `-Jproject_dir=${ws.dir(project)}`,
      `-Juid=${options.uid}`,
    ],
  });
}

/**
 * The inits of applications and of BSg02 act on behalf of the user, so they need the UID. Only the AsyncJob init does not.
 *
 * @throws BuilderError when a UID is needed and missing
 */
export function validateInitOptions(options: Options): void {
  const needsUid = [...options.init].some((target) => target !== "ASYNC");
  if (needsUid && !options.uid) {
    throw new BuilderError("UID must be set along with inits, use option -uid <your-uid>", { showHelp: false });
  }
}

/**
 * `-init*`: runs the init plans of the selected servers and applications.
 * AsyncJob and BSg02 run in docker, so their inits wait for the container instead of for an app.
 */
export async function runInits(ctx: RunContext): Promise<void> {
  const { ws, options } = ctx;
  if (options.uid) {
    logger.info(`Your OID: ${options.uid}`);
  }
  logger.message("Starting inits...");
  if (options.init.has("ASYNC")) {
    await waitForAsyncJobReady();
    logger.message("Init AsyncJob");
    await runInitJob(ctx, {
      name: "ASYNC",
      planFile: "inits/init_ASYNC_JOB.jmx",
      resultsFile: "logs/initResultsASYNC.xml",
      logFile: "logs/initLogsASYNC.log",
      properties: [],
    });
  }
  if (options.init.has("BSg02")) {
    await waitForBsg02Ready();
    logger.message("Init BSg02");
    await runInitJob(ctx, {
      name: "BSg02",
      planFile: "inits/init_BS.jmx",
      resultsFile: "logs/initResultsBS.xml",
      logFile: "logs/initLogsBS.log",
      properties: [],
    });
  }
  for (const project of ws.runnableProjects) {
    if (project.code !== "MERGED" && options.init.has(project.code)) {
      logger.message(`Init ${project.code}`);
      await initProject(ctx, project);
    }
  }
}
