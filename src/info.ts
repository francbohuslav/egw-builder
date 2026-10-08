import { existsSync, readdirSync } from "node:fs";
import type { InfoStructure } from "./domain/types";
import type { Workspace } from "./domain/workspace";
import { logger } from "./infra/logger";
import { runCommand } from "./infra/process";
import { getActualMessageBroker } from "./steps/message-broker";

/** Environment files of the JMeter tests: `env_localhost.cfg`, `env_localhost_A.cfg`... Returned without the extension. */
export function getEnvironments(ws: Workspace): string[] {
  return readdirSync(ws.jmeterDir)
    .filter((file) => /^env_localhost(_.+)?\.cfg/.test(file))
    .map((file) => file.replace(".cfg", ""));
}

/** Names of the additional tests: every `tests_<name>.jmx` plus the browser tests. */
function getAdditionalTests(ws: Workspace): string[] {
  const tests = readdirSync(ws.jmeterDir)
    .filter((file) => /^tests_.*\.jmx$/.test(file))
    .map((file) => file.replace(/^tests_/, "").replace(/\.jmx$/, ""));
  tests.push("Web");
  return tests;
}

/** Current git branch of a folder, or the error output of git when it is not a repository. */
async function getBranch(dir: string): Promise<string> {
  try {
    const { stdOut } = await runCommand("git", ["branch", "--show-current"], { cwd: dir, silent: true });
    return stdOut.trim();
  } catch (error) {
    return (error as { stdErr?: string }).stdErr ?? String(error);
  }
}

/** Description of the workspace for the GUI runner. */
export async function collectInfo(ws: Workspace): Promise<InfoStructure> {
  const info: InfoStructure = {
    projects: ws.installedProjects.map((p) => ({ code: p.code, supportTests: !!p.testFile, directory: p.folder, branch: "" })),
    additionalTests: getAdditionalTests(ws),
    messageBroker: getActualMessageBroker(ws),
    environmentFiles: getEnvironments(ws),
    gui: { branch: "" },
  };
  for (const entry of info.projects) {
    entry.branch = await getBranch(ws.path(entry.directory));
  }
  const guiDir = ws.path(ws.guiFolder);
  if (existsSync(guiDir)) {
    info.gui.branch = await getBranch(guiDir);
  }
  return info;
}

/** `-info`: prints the description as JSON, nothing else may be written to the output. */
export async function printInfo(ws: Workspace): Promise<void> {
  logger.raw(JSON.stringify(await collectInfo(ws), null, 2));
}
