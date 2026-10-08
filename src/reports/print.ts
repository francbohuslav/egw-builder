import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestStepInfo, TestStepsByName } from "../domain/types";
import { ANSI, logger } from "../infra/logger";
import { formatTime } from "./results";

const SUCCESS_ART = [
  "            ████                ",
  "          ███ ██                ",
  "          ██   █                ",
  "          ██   ██               ",
  "           ██   ███             ",
  "            ██    ██            ",
  "            ██     ███          ",
  "             ██      ██         ",
  "        ███████       ██        ",
  "     █████              ███ ██  ",
  "    ██     ████          ██████ ",
  "    ██  ████  ███             ██",
  "    ██        ███             ██",
  "     ██████████ ███           ██",
  "     ██        ████           ██",
  "     ███████████  ██          ██",
  "       ██       ████     ██████ ",
  "       ██████████ ██    ███ ██  ",
  "          ██     ████ ███       ",
  "          █████████████         ",
];

const FAILURE_ART = [
  "    █████                                        █████",
  "   ███████                                      ███████",
  "   ███████           ███████████████            ███████",
  "    ████████       ███████████████████        ████████",
  "        █████     █████████████████████     █████",
  "          █████  ███████████████████████  █████",
  "            ██  █████████████████████████  ██",
  "               ███████    ██████    ██████",
  "               ██████      ████      █████",
  "               ██████      ████      █████",
  "                ██████    ██████    █████",
  "                 ███████████  ██████████",
  "                  ██████████  █████████",
  "              ██   ███████████████████   ██",
  "              ████  ████ █ █ █ █ ████  ████",
  "             █████   ███ █ █ █ █ ███   █████",
  "           █████      █████████████      █████",
  "         ████          ███████████          ████",
  "      █████              ███████              █████",
  "     ███████                                 ███████",
  "      █████                                   █████",
];

/** Prints the steps of one test with their failed assertions. */
export function showFailedSteps(steps: readonly TestStepInfo[], withResponse = false): void {
  for (const step of steps) {
    console.log(`  ${ANSI.green}%s${ANSI.reset}`, step.label);
    for (const rawAssert of step.asserts) {
      const text = rawAssert.replace(/^Test failed: /, "");
      console.log(`    ${ANSI.red}%s${ANSI.reset}`, text.substring(0, 180) + (text.length > 180 ? "..." : ""));
    }
    if (withResponse) {
      logger.message("    Response data");
      console.log(
        step.responseData
          .replace(/\\t/g, "  ")
          .replace(/\\r/g, "")
          .replace(/\\n/g, "\n")
          .split("\n")
          .map((line) => `        ${line}`)
          .join("\n"),
      );
    }
  }
}

/** Prints tests which unexpectedly passed (their task code should be removed) and tests which failed. */
export function showFailedTests(newPassed: TestStepsByName, newFailed: TestStepsByName): void {
  const heading = (name: string) => console.log(`${ANSI.bold}${ANSI.yellow}%s${ANSI.reset}`, name);
  if (Object.keys(newPassed).length) {
    logger.message("There are tests marked as failed, but already passed. Remove task code from test name.");
    for (const [testName, steps] of Object.entries(newPassed)) {
      heading(testName);
      for (const step of steps) {
        console.log(`  ${ANSI.green}%s${ANSI.reset}`, step.label);
      }
    }
  }
  console.log("");
  if (Object.keys(newFailed).length) {
    logger.message("There are failed tests. Create task in Sprintman and add code at end of test name. E.g. 'some test - T123'.");
    for (const [testName, steps] of Object.entries(newFailed)) {
      heading(testName);
      showFailedSteps(steps);
    }
  }
  console.log("");
}

export interface TestReportInput {
  newPassed: TestStepsByName;
  newFailed: TestStepsByName;
  knownFailed: TestStepsByName;
  allPassed: TestStepsByName;
  startedAt: Date;
  /** Names of the tests which were run (project codes or additional test names). */
  testNames: string[];
  /** Folder with JMeter tests and its `logs` subfolder. */
  jmeterDir: string;
}

function count(steps: TestStepsByName): number {
  return Object.values(steps).reduce((sum, list) => sum + list.length, 0);
}

/** Last modification of the result file of each test, so the summary shows how old the (possibly not re-run) results are. */
export function getResultFileDates(testNames: readonly string[], jmeterDir: string): Record<string, Date> {
  const dates: Record<string, Date> = {};
  for (const name of testNames) {
    const file = join(jmeterDir, "logs", `testResults${name}.xml`);
    if (existsSync(file)) {
      dates[name] = statSync(file).mtime;
    }
  }
  return dates;
}

/** Writes `testResults.json` and prints the final summary of the tests. */
export function printReport(input: TestReportInput): void {
  const { newPassed, newFailed, knownFailed, allPassed, startedAt, testNames, jmeterDir } = input;
  mkdirSync(join(jmeterDir, "logs"), { recursive: true });
  writeFileSync(
    join(jmeterDir, "logs", "testResults.json"),
    JSON.stringify({ PASSED: newPassed, FAILED_NEW: newFailed, FAILED_KNOWN: knownFailed }, null, 2),
    { encoding: "utf-8" },
  );
  const dates = getResultFileDates(testNames, jmeterDir);

  logger.message("\n\n======== TESTS SUMMARY =======");
  const finishedAt = new Date();
  logger.info(`Started: ${startedAt.toLocaleString()}`);
  logger.info(`Finished: ${finishedAt.toLocaleString()}`);
  logger.info(`=> ${formatTime((finishedAt.getTime() - startedAt.getTime()) / 1000)} minutes`);

  showFailedTests(newPassed, newFailed);
  const hasProblem = Object.keys(newFailed).length > 0 || Object.keys(newPassed).length > 0;
  if (hasProblem) {
    logger.error("Tests failed. Watch message above.");
  } else {
    logger.success("All tests passed as expected.");
    logger.success("");
    for (const line of SUCCESS_ART) {
      logger.success(line);
    }
    logger.success("");
  }
  logger.success(`Passed: ${count(allPassed)}`);
  for (const [name, passed] of Object.entries(allPassed)) {
    logger.success(` - ${name}: ${passed.length}`.padEnd(30) + (dates[name]?.toLocaleString() ?? ""));
  }
  logger.warning(`Failed and fix in progress: ${count(knownFailed)}`);
  const failedCount = count(newFailed);
  if (failedCount) {
    logger.error(`New failed tests: ${failedCount}`);
  }
  if (hasProblem) {
    logger.error("");
    for (const line of FAILURE_ART) {
      logger.error(line);
    }
    logger.error("");
  }
}
