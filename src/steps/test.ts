import { existsSync } from "node:fs";
import { join } from "node:path";
import { ALL_APPLICATIONS } from "../cli/options";
import type { Project, ProjectTestResult, TestStepsByName } from "../domain/types";
import { BuilderError } from "../infra/errors";
import { readTextFile, removeFileIfExists } from "../infra/files";
import { logger } from "../infra/logger";
import { delay, runCommand, startDetached } from "../infra/process";
import { printReport, showFailedTests } from "../reports/print";
import { classifySteps, parseTestSteps } from "../reports/results";
import { getJmeterBat } from "../tools/java";
import { ensureJmeter, validateRequiredPropertiesOfFile } from "../tools/jmeter";
import type { RunContext } from "./context";
import { waitForApplicationReady } from "./run";

/** A test is either an application (its JMeter plan is `project.testFile`) or an additional test (plan `tests_<name>.jmx`). */
type TestTarget = Project | string;

function testCodeOf(target: TestTarget): string {
  return typeof target === "string" ? target : target.code;
}

/** Folder with the test data of FTP. The layout differs between versions: with several environments the data are one level deeper. */
function getFtpDataDir(ctx: RunContext): string {
  const { ws } = ctx;
  const ftpDockerDir = join(ws.dir(ws.project("FTP")), "docker", "egw-tests");
  const hasMultipleEnvironments = existsSync(join(ftpDockerDir, "data", "data_A", "incoming1", ".gitkeep"));
  const dir = hasMultipleEnvironments ? ftpDockerDir : join(ftpDockerDir, "data");
  if (!existsSync(dir)) {
    throw new BuilderError(`${dir} does not exists`);
  }
  return dir;
}

/**
 * JMeter arguments of a test plan.
 *
 * Every plan receives the same set of properties; those which the plan does not read are dropped later by
 * `validateRequiredProperties`, and a property which the plan reads but is missing here is an error.
 * Paths are given with `/` after the root, exactly as the plans have always received them.
 */
export function buildTestParams(ctx: RunContext, target: TestTarget, testFile: string, logFile: string): string[] {
  const { ws, options } = ctx;
  const root = ws.root;
  const folderOf = (code: "DG" | "FTP" | "EMAIL" | "ECP") => ws.project(code).folder;
  const serverPath = (code: "DG" | "FTP" | "EMAIL") => `${root}/${folderOf(code)}/${ws.project(code).server}`;

  const params = ["-n", "-t", testFile, "-j", logFile, `-Jenv=${options.environmentFile}${options.isMerged ? "_merged" : ""}.cfg`];
  if (typeof target !== "string") {
    params.push(`-Jproject_dir=${ws.dir(target)}`);
  }
  if (options.uid) {
    params.push(`-Juid=${options.uid}`);
  }
  params.push(`-Jftp_data_dir=${getFtpDataDir(ctx)}`);
  params.push(`-Jproject_FTP=${root}/${folderOf("FTP")}`);
  params.push(`-Jecp_data_dir=${root}/${folderOf("ECP")}/docker/egw-tests/ecp2`);
  if (typeof target !== "string") {
    const serverDir = `${root}/${target.folder}/${target.server}`;
    params.push(`-Jinsomnia_dir=${serverDir}/src/test/insomnia`, `-Jserver_dir=${serverDir}`);
  }
  for (const code of ["DG", "FTP", "EMAIL"] as const) {
    params.push(`-Jinsomnia_dir_${code}=${serverPath(code)}/src/test/insomnia`, `-Jserver_dir_${code}=${serverPath(code)}`);
  }
  return params;
}

/**
 * Runs one JMeter test plan and evaluates its result file.
 *
 * @returns the classified steps, or null when there is no result file (can happen with `-results` before any run)
 */
export async function runProjectTests(ctx: RunContext, target: TestTarget): Promise<ProjectTestResult | null> {
  const { ws, options } = ctx;
  await ensureJmeter(ws.builderDir);
  const code = testCodeOf(target);
  let testFile: string;
  if (typeof target === "string") {
    testFile = `tests_${code}.jmx`;
  } else {
    if (!options.onlyShowResults) {
      await waitForApplicationReady(options.isMerged ? ws.project("MERGED") : target);
    }
    if (!target.testFile) {
      throw new BuilderError(`Project ${code} has no JMeter test`);
    }
    testFile = target.testFile;
  }

  const jmeterDir = ws.jmeterDir;
  const resultsFile = join(jmeterDir, "logs", `testResults${code}.xml`);
  const logFile = `logs/testLogs${code}.log`;
  if (!options.onlyShowResults) {
    removeFileIfExists(resultsFile);
    removeFileIfExists(join(jmeterDir, logFile));
    const params = validateRequiredPropertiesOfFile(join(jmeterDir, testFile), buildTestParams(ctx, target, testFile, logFile));
    await runCommand(getJmeterBat(ws.builderDir), params, { cwd: jmeterDir, shell: true });
  }
  if (!existsSync(resultsFile)) {
    return null;
  }
  return classifySteps(parseTestSteps(readTextFile(resultsFile)));
}

/** Runs the browser tests (Selenium) which are part of MR. A failure opens their HTML report. */
async function runWebTests(ctx: RunContext): Promise<ProjectTestResult> {
  const { ws, options } = ctx;
  const result: ProjectTestResult = { newFailed: [], newPassed: [], knownFailed: [], allPassed: [] };
  if (options.onlyShowResults) {
    return result;
  }
  const binDir = join(ws.serverDir(ws.project("MR")), "src", "test", "web", "bin");
  try {
    await runCommand(
      join(binDir, "SeleniumRunner.exe"),
      [
        "-nvd",
        "-r",
        "..\\results",
        "-w",
        "1",
        "-f",
        "..\\FirefoxPortable\\",
        "-s",
        "frontend_quick_test.scenario.json",
        "-c",
        "..\\test-suites\\localhost.config.json",
        "..\\test-suites\\gui",
      ],
      { cwd: binDir },
    );
    result.allPassed.push({ label: "Web tests passed.", asserts: [], responseData: "" });
  } catch {
    result.newFailed.push({ label: "Web tests failed. Opening report in browser.", asserts: [], responseData: "" });
    startDetached("start ..\\results\\index.html", binDir);
  }
  return result;
}

/** `-test*`, `-tests`: runs the selected tests and prints the summary. */
export async function runTests(ctx: RunContext, pauseBeforeTests: boolean): Promise<void> {
  const { ws, options } = ctx;
  if (pauseBeforeTests) {
    logger.message("Waiting 10s before tests...");
    await delay(10_000);
  }
  logger.message("Starting tests...");

  const startedAt = new Date();
  const newFailed: TestStepsByName = {};
  const newPassed: TestStepsByName = {};
  const knownFailed: TestStepsByName = {};
  const allPassed: TestStepsByName = {};
  const targets: TestTarget[] = [
    ...ALL_APPLICATIONS.filter((code) => options.test.has(code)).map((code) => ws.project(code)),
    ...options.additionalTests,
  ];

  for (const target of targets) {
    const code = testCodeOf(target);
    if (!options.onlyShowResults) {
      logger.message(`Testing ${code}`);
    }
    const report = code.toLowerCase() === "web" ? await runWebTests(ctx) : await runProjectTests(ctx, target);
    if (!report) {
      continue;
    }
    if (report.newFailed.length) {
      newFailed[code] = report.newFailed;
    }
    if (report.newPassed.length) {
      newPassed[code] = report.newPassed;
    }
    if (report.allPassed.length) {
      allPassed[code] = report.allPassed;
    }
    if (report.knownFailed.length) {
      knownFailed[code] = report.knownFailed;
    }
    if (!options.onlyShowResults) {
      showFailedTests(report.newPassed.length ? { [code]: report.newPassed } : {}, report.newFailed.length ? { [code]: report.newFailed } : {});
    }
  }
  printReport({ newPassed, newFailed, knownFailed, allPassed, startedAt, testNames: targets.map(testCodeOf), jmeterDir: ws.jmeterDir });
}
