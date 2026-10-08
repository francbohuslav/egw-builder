import { existsSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { BuilderError } from "../infra/errors";
import { readJsonFile } from "../infra/files";
import { logger } from "../infra/logger";
import { runCommand } from "../infra/process";
import { downloadAndUnpack } from "./download";

/** The GUI needs an old Node.js. Maps its major version (from `engines.node`) to the exact release to download. */
const NODE_RELEASES: Record<string, string> = {
  "12": "14.21.1",
  "16": "16.18.1",
  "18": "18.18.0",
};

/**
 * Finds out which Node.js the GUI needs (`engines.node` in its package.json) and downloads it if missing.
 * The builder's own Node.js is not used for the GUI build, because the GUI works only with its old one.
 *
 * @param guiFolder absolute folder of the GUI components
 * @returns folder of the Node.js for the GUI
 */
export async function detectAndDownloadNode(builderDir: string, guiFolder: string): Promise<string> {
  const packageJson = join(guiFolder, "package.json");
  const requiredVersion = readJsonFile<{ engines?: { node?: string } }>(packageJson).engines?.node ?? "";
  const major = requiredVersion.match(/(\d+)\.\d+\.\d+/)?.[1];
  if (!major) {
    throw new BuilderError(`Node.js version cannot be detected from '${requiredVersion}' in ${packageJson}`);
  }
  return await ensureNode(builderDir, major);
}

async function ensureNode(builderDir: string, majorVersion: string): Promise<string> {
  const release = NODE_RELEASES[majorVersion];
  if (!release) {
    throw new BuilderError(`Unsupported Node.js version '${majorVersion}', supported: ${Object.keys(NODE_RELEASES).join(", ")}`);
  }
  const folder = join(builderDir, "nodejs");
  mkdirSync(folder, { recursive: true });
  const destination = join(folder, majorVersion);
  if (!existsSync(destination)) {
    const archiveName = `node-v${release}-win-x64`;
    await downloadAndUnpack({
      label: `Node.js ${release}`,
      url: `https://nodejs.org/dist/v${release}/${archiveName}.zip`,
      tempFile: join(builderDir, "nodejs.zip"),
      destination: folder,
    });
    // The archive contains a folder named after the exact release, we address it by the major version
    renameSync(join(folder, archiveName), destination);
  }
  return destination;
}

/**
 * Arguments of `cmd` which run a command with the Node.js of the GUI in PATH.
 * Without a folder the command runs with the PATH as it is.
 */
export function cmdWithNode(nodeFolder: string | undefined, ...command: string[]): string[] {
  return nodeFolder ? ["/C", "set", `PATH=${nodeFolder};%PATH%`, "&", ...command] : ["/C", ...command];
}

export async function printNodeInfo(): Promise<void> {
  const { stdOut } = await runCommand("node", ["-v"], { silent: true });
  logger.info(`Node.js ${stdOut.trim()}`);
}
