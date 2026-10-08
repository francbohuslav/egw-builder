import { copyFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { Project } from "../domain/types";
import type { Workspace } from "../domain/workspace";
import { BuilderError } from "../infra/errors";
import { readTextFile, writeTextFile } from "../infra/files";
import { logger } from "../infra/logger";
import { runCommand } from "../infra/process";

/** The generator prints this when the profiles in the metamodel differ from the ones in the libraries. */
const PROFILES_MISMATCH_MESSAGE = "Profiles are not same !!!";

/** Whitespace is not significant in the JSON, so only a real change counts as "metamodel changed". */
function normalize(file: string): string {
  return readTextFile(file).replace(/\s+/g, "");
}

/**
 * `-p <profiles.json>` arguments for the libraries listed in `project.libraryProfiles`.
 * The paths use the root with a slash and are given to the generator in exactly this form.
 */
export function getLibraryProfileArgs(ws: Workspace, project: Project): string[] {
  return Object.entries(project.libraryProfiles).flatMap(([libraryName, projectCode]) => {
    const owner = ws.project(projectCode);
    return ["-p", `${ws.root}/${owner.folder}/${libraryName}/src/main/resources/config/profiles.json`];
  });
}

/** Regenerates `metamodel-1.0.json` (and `metamodel-2.0.json` if the project has one) of the project. */
export async function generateMetamodel(ws: Workspace, project: Project): Promise<void> {
  const configDir = join(ws.serverDir(project), "src", "main", "resources", "config");
  logger.info(project.code);
  await generateMetamodelVersion(ws, project, configDir, 1);
  if (existsSync(join(configDir, "metamodel-2.0.json"))) {
    await generateMetamodelVersion(ws, project, configDir, 2);
  }
}

async function generateMetamodelVersion(ws: Workspace, project: Project, configDir: string, version: 1 | 2): Promise<void> {
  logger.info(`...${version}`);
  const metamodelFile = join(configDir, `metamodel-${version}.0.json`);
  const tempFile = join(configDir, `metamodel-${version}.0.new.json`);
  copyFileSync(metamodelFile, tempFile);
  const args = [
    "-p",
    "profiles.json",
    ...getLibraryProfileArgs(ws, project),
    "-m",
    `metamodel-${version}.0.new.json`,
    "--mandatory-profiles",
    "Authorities",
    "Executives",
    "Auditors",
  ];
  // The generator is an npm command (a .cmd file), which can be started only through the shell
  const { stdOut } = await runCommand("egw-metamodel-generatorg01.cmd", args, { cwd: configDir, shell: true });
  if (stdOut.includes(PROFILES_MISMATCH_MESSAGE)) {
    unlinkSync(tempFile);
    throw new BuilderError(`Error during metamodel of ${project.code}: ${PROFILES_MISMATCH_MESSAGE}\n  in ${configDir}`);
  }
  // Removes the "uu-energygateway.../" path prefixes from the generated file
  writeTextFile(tempFile, readTextFile(tempFile).replace(/uu-energygateway.*?\//g, ""));
  if (normalize(metamodelFile) === normalize(tempFile)) {
    unlinkSync(tempFile);
  } else {
    logger.message(`Metamodel changed for ${project.code}`);
    renameSync(tempFile, metamodelFile);
  }
}
