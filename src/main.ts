import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadLastOptions, saveLastOptions } from "./cli/last";
import { getHelp, type Options, parseArguments } from "./cli/options";
import { loadConfig } from "./domain/config";
import { DEFAULT_ENVIRONMENT_FILE } from "./domain/projects";
import { Workspace } from "./domain/workspace";
import { getEnvironments, printInfo } from "./info";
import { BuilderError, CommandError, describeError } from "./infra/errors";
import { logger } from "./infra/logger";
import { runCommand } from "./infra/process";
import { buildGui, buildProject } from "./steps/build";
import type { RunContext } from "./steps/context";
import { clearDockers, startDockers } from "./steps/docker";
import { cloneDataGatewayForIec } from "./steps/iec-clone";
import { runInits, validateInitOptions } from "./steps/init";
import { changeMessageBroker } from "./steps/message-broker";
import { generateMetamodel } from "./steps/metamodel";
import { openAsyncJobLogs, startApps } from "./steps/run";
import { runTests } from "./steps/test";
import { getBuildGradleVersion, printProjectsVersions, setProjectsVersions } from "./steps/versions";
import { describeJavaInfo, ensureJavaForJmeter, ensureJdk, getSubAppJavaInfo } from "./tools/java";
import { printNodeInfo } from "./tools/node";

/** Folder of the builder (the parent of `src`). */
const BUILDER_DIR = resolve(__dirname, "..");

/**
 * Entry point of the builder.
 *
 * @param args command line arguments without `node` and the script name
 * @returns process exit code
 */
export async function main(args: readonly string[]): Promise<number> {
  try {
    await run(args);
    return 0;
  } catch (error) {
    reportError(error);
    return 1;
  }
}

/** Prints a failure in a way which helps to find the cause. Unexpected errors (bugs) show their stack. */
function reportError(error: unknown): void {
  logger.error(describeError(error));
  if (error instanceof CommandError && error.stdErr.trim() && !logger.verbose) {
    logger.error(`stderr of the command:\n${error.stdErr.trim().slice(-2000)}`);
  }
  if (logger.verbose || !(error instanceof BuilderError)) {
    logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  }
  if (!(error instanceof BuilderError) || error.showHelp) {
    logger.troubleshootingHelp();
  }
  logger.error("");
}

async function run(args: readonly string[]): Promise<void> {
  let options = parseArguments(args);
  if (args.length === 0 || options.help) {
    logger.message("Syntax");
    for (const line of getHelp("node index")) {
      logger.info(line);
    }
    return;
  }
  logger.verbose = options.verbose;
  if (options.last) {
    options = { ...loadLastOptions(BUILDER_DIR), verbose: options.verbose };
  }
  if (!options.folder) {
    throw new BuilderError("Option -folder <name> is mandatory (or use -last). Run with -help to see the syntax.", { showHelp: false });
  }

  const root = resolve(options.folder);
  if (!existsSync(root)) {
    throw new BuilderError(`Folder ${root} does not exist.`, { showHelp: false });
  }
  options.folder = root;
  // Machine readable outputs must contain nothing else
  const isMachineReadable = options.getVersions || options.getInfo;
  if (!isMachineReadable) {
    logger.message(`Using folder ${root}`);
  }
  const ws = new Workspace(root, BUILDER_DIR, loadConfig(BUILDER_DIR));

  if (options.getVersions) {
    printProjectsVersions(ws, true);
    return;
  }
  if (options.logAsyncJob) {
    openAsyncJobLogs(ws);
    return;
  }
  if (options.getInfo) {
    assertMessageRegistryExists(ws);
    await printInfo(ws);
    return;
  }

  assertMessageRegistryExists(ws);
  const jdk = await prepareTools(ws);
  const ctx: RunContext = { ws, options, jdk };
  prepareOptions(ctx);
  describePlan(options);

  if (!options.last) {
    saveLastOptions(BUILDER_DIR, options);
  }
  if (options.version?.match(/^\d/)) {
    setProjectsVersions(ws, options.version);
  }

  logger.echoCommands = true;
  await execute(ctx);
  logger.message("DONE");
}

/** The JMeter tests, inits and environment files live in MR, almost everything needs them. */
function assertMessageRegistryExists(ws: Workspace): void {
  if (!existsSync(ws.jmeterDir)) {
    throw new BuilderError(`${ws.root} does not look like a folder with EGW repositories, ${ws.jmeterDir} does not exist.`, { showHelp: false });
  }
}

/** Resolves the JDK for the apps and makes sure JMeter and Node.js are usable. Returns the folder of the JDK. */
async function prepareTools(ws: Workspace): Promise<string> {
  const javaInfo = getSubAppJavaInfo(ws, ws.project("DG"));
  const jdk = ws.config.JDK[javaInfo.javaVersion] || (await ensureJdk(ws.builderDir, javaInfo.javaVersion));
  await ensureJavaForJmeter(ws.builderDir);

  logger.info(describeJavaInfo(javaInfo, jdk));
  // Absolute path: Node does not look for the executable in the working directory
  const { stdErr } = await runCommand(join(jdk, "bin", "java"), ["-version"], { silent: true });
  logger.info(stdErr);

  await printNodeInfo();
  logger.info("");
  return jdk;
}

/** Fills the values which are not on the command line and checks the combinations which cannot work. */
function prepareOptions(ctx: RunContext): void {
  const { ws, options } = ctx;
  options.environmentFile ||= getEnvironments(ws)[0] ?? DEFAULT_ENVIRONMENT_FILE;
  validateInitOptions(options);
}

/** Prints what is going to happen, so the first lines of the log answer "what did I run?". */
function describePlan(options: Options): void {
  logger.info(`Environment file: ${options.environmentFile}`);
  logger.info(options.version ? `Set version to ${options.version}` : "Set version? no");
  const list = (title: string, items: Iterable<string>) => {
    const text = [...items].join(", ");
    logger.info(`${title}: ${text || "no"}`);
  };
  list("Clear docker", options.clear ? ["yes"] : []);
  list("Generate metamodel", options.metamodel ? ["yes"] : []);
  list("Run as merged application", options.isMerged ? ["yes"] : []);
  list("Build", options.build);
  list("Unit tests", options.unitTests ? ["yes"] : []);
  list("Run", options.run);
  list("Init", options.init);
  list("Tests", [...options.test, ...options.additionalTests]);
}

/** Runs the selected steps in the fixed order: clear, docker, metamodel, broker, build, run, init, test. */
async function execute(ctx: RunContext): Promise<void> {
  const { ws, options } = ctx;
  const isRun = options.run.size > 0;
  const isInit = options.init.size > 0;
  const isTest = options.test.size > 0 || options.additionalTests.length > 0;

  if (options.clear) {
    await clearDockers(ctx);
  }
  if (options.unitTests || isRun) {
    await startDockers(ctx);
  }

  if (options.metamodel) {
    logger.message("Generating metamodel...");
    for (const project of ws.installedProjects) {
      await generateMetamodel(ws, project);
    }
  }

  if (options.messageBroker) {
    logger.message(`Setting message broker to ${options.messageBroker}`);
    changeMessageBroker(ws, options.messageBroker);
  }

  if (options.build.size > 0) {
    logger.message("Building apps...");
    for (const project of ws.projects) {
      if (project.code === "MR" && (options.build.has("Npm") || options.build.has("Gui"))) {
        await buildGui(ctx);
      }
      if (options.build.has(project.code)) {
        if (project.code === "IEC62325") {
          cloneDataGatewayForIec(ws, getBuildGradleVersion(ws, ws.project("DG")));
        }
        logger.message(`Building ${project.code} ...`);
        await buildProject(ctx, project);
        logger.message(`${project.code} - build ok`);
      }
    }
  }

  if (isRun) {
    await startApps(ctx);
  }
  if (isInit) {
    await runInits(ctx);
  }
  if (isTest) {
    await runTests(ctx, isRun || isInit);
  }
}
