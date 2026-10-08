import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Project } from "../domain/types";
import { logger } from "../infra/logger";
import { runCommand } from "../infra/process";
import { cmdWithNode, detectAndDownloadNode } from "../tools/node";
import type { RunContext } from "./context";
import { killProject } from "./kill";

/** Copies the UU5 environment for the tests to the public folder of the MR server, so the built-in web server serves it. */
export function copyUu5Environment(ctx: RunContext): void {
  const { ws } = ctx;
  const mr = ws.project("MR");
  copyFileSync(join(ws.dir(mr), mr.hi ?? "", "env", "tests-uu5-environment.json"), join(ws.serverDir(mr), "public", "uu5-environment.json"));
}

/** Runs `npm` (or another command) in the folder with the Node.js of the GUI first in PATH. */
async function runWithNode(nodeFolder: string | undefined, cwd: string, ...command: string[]): Promise<void> {
  await runCommand("cmd", cmdWithNode(nodeFolder, ...command), { cwd });
}

/**
 * Installs npm packages and builds the GUI components of Message Registry (`-buildNpm`, `-buildGui`).
 *
 */
export async function buildGui(ctx: RunContext): Promise<void> {
  const { ws, options } = ctx;
  const guiDir = ws.path(ws.guiFolder);
  let nodeFolder: string | undefined;
  if (existsSync(guiDir)) {
    nodeFolder = await detectAndDownloadNode(ws.builderDir, guiDir);
    if (options.build.has("Npm")) {
      logger.info("Install NPM packages for UU5 lib");
      await runWithNode(nodeFolder, ws.path(ws.uu5libFolder), "npm", "ci");
    }
    if (options.build.has("Gui")) {
      logger.info("Build GUI components");
      await runWithNode(nodeFolder, guiDir, "npm", "run", "build");
    }
  }
  if (options.build.has("Npm")) {
    const mr = ws.project("MR");
    logger.info("Install NPM packages for HI");
    await runWithNode(nodeFolder, join(ws.dir(mr), mr.hi ?? ""), "npm", "ci");
  }
}

/** Builds one application by Gradle. A running instance is killed first, because it locks the built files. */
export async function buildProject(ctx: RunContext, project: Project): Promise<void> {
  const { ws, options, jdk } = ctx;
  if (await killProject(project)) {
    logger.info("Killed running app");
  }
  const nodeFolder = await detectAndDownloadNode(ws.builderDir, ws.path(ws.guiFolder));

  if (project.code === "MERGED") {
    const hiDir = join(ws.dir(project), project.hi ?? "");
    logger.info("Install NPM packages for HI");
    await runWithNode(nodeFolder, hiDir, "npm", "ci");
    logger.info("Build HI");
    await runWithNode(nodeFolder, hiDir, "npm", "run", "build");
  }

  const gradleArgs = ["gradlew", "clean", "build", "compileTestJava"];
  if (!options.unitTests) {
    gradleArgs.push("-x", "test");
  }
  // The web client of MR is built only on demand, otherwise Gradle would skip it
  if (project.code === "MR" && !options.build.has("Npm") && !options.build.has("Gui")) {
    gradleArgs.push("-Pno-build-client");
  }
  if (jdk) {
    gradleArgs.push(`-Dorg.gradle.java.home=${jdk}`);
  }
  await runWithNode(nodeFolder, ws.dir(project), ...gradleArgs);

  if (project.code === "MR") {
    copyUu5Environment(ctx);
  }
}
