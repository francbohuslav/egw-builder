import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Project } from "../domain/types";
import type { Workspace } from "../domain/workspace";
import { BuilderError } from "../infra/errors";
import { readJsonFile, readTextFile, writeJsonFile, writeTextFile } from "../infra/files";
import { logger } from "../infra/logger";

/** Versions found in the files of one project: file name -> version. */
export type VersionsByFile = Record<string, string>;

/** Version files of a project which are located relatively to the repository folder. */
function getProjectFiles(ws: Workspace, project: Project) {
  const projectDir = ws.dir(project);
  const serverDir = ws.serverDir(project);
  const metamodelDir = join(serverDir, "src", "main", "resources", "config");
  const mr = ws.project("MR");
  return {
    uuappJson: join(projectDir, "uuapp.json"),
    buildGradle: join(projectDir, "build.gradle"),
    configDir: join(serverDir, "config"),
    metamodels: ["metamodel-1.0.json", "metamodel-2.0.json"].map((name) => ({ name, file: join(metamodelDir, name) })),
    // The HI module has a package.json with a version too. Its folder name is taken from MR, so only MR (and projects named alike) have it.
    hiPackageJson: join(projectDir, mr.hi ?? "", "package.json"),
  };
}

function uuCloudDescriptors(configDir: string): string[] {
  return readdirSync(configDir).filter((f) => f.startsWith("uucloud"));
}

function errorText(error: unknown): string {
  return `PARSE ERROR:  ${error instanceof Error ? error.message : String(error)}`;
}

/** Reads versions from all files of the project. */
export function getProjectVersions(ws: Workspace, project: Project): VersionsByFile {
  const files = getProjectFiles(ws, project);
  const versions: VersionsByFile = {};

  try {
    versions["uuapp.json"] = readJsonFile<{ version: string }>(files.uuappJson).version;
  } catch (error) {
    versions["uuapp.json"] = errorText(error);
  }

  const gradleVersion = readTextFile(files.buildGradle).match(/version '(\S+)'/);
  if (!gradleVersion?.[1]) {
    throw new BuilderError(`Cannot find version in ${files.buildGradle}`);
  }
  versions["build.gradle"] = gradleVersion[1];

  for (const descriptor of uuCloudDescriptors(files.configDir)) {
    try {
      const json = readJsonFile<{ uuSubApp?: { version: string }; uuAppBoxDescriptor: { version: string } }>(join(files.configDir, descriptor));
      versions[descriptor] = json.uuSubApp?.version ?? json.uuAppBoxDescriptor.version;
    } catch (error) {
      versions[descriptor] = errorText(error);
    }
  }

  for (const { name, file } of files.metamodels) {
    if (existsSync(file)) {
      // The metamodel uses "-beta" where the others use "-SNAPSHOT"
      versions[name] = readJsonFile<{ version: string }>(file).version.replace("-beta", "-SNAPSHOT");
    }
  }

  if (existsSync(files.hiPackageJson)) {
    versions["package.json"] = readJsonFile<{ version: string }>(files.hiPackageJson).version;
  }
  return versions;
}

/**
 * Version of the project: a single string if all files agree, otherwise the versions per file (so the difference is visible).
 */
export function getProjectVersion(ws: Workspace, project: Project): string | VersionsByFile {
  const versions = getProjectVersions(ws, project);
  const unique = unifyVersions(Object.values(versions));
  return unique.length === 1 ? (unique[0] as string) : versions;
}

/** Version used to decide whether the IEC62325 copy of DG is needed: the one in build.gradle. */
export function getBuildGradleVersion(ws: Workspace, project: Project): string {
  const version = getProjectVersion(ws, project);
  return typeof version === "string" ? version : (version["build.gradle"] as string);
}

function unifyVersions(values: string[]): string[] {
  return [...new Set(values)];
}

/** Writes the version to all version files of the project. */
export function setProjectVersion(ws: Workspace, project: Project, newVersion: string): void {
  const files = getProjectFiles(ws, project);

  const uuapp = readJsonFile<{ version: string }>(files.uuappJson);
  uuapp.version = newVersion;
  writeJsonFile(files.uuappJson, uuapp);

  for (const descriptor of uuCloudDescriptors(files.configDir)) {
    const file = join(files.configDir, descriptor);
    const json = readJsonFile<{ uuSubApp?: { version: string }; uuAppBoxDescriptor: { version: string } }>(file);
    if (json.uuSubApp) {
      json.uuSubApp.version = newVersion;
    } else {
      json.uuAppBoxDescriptor.version = newVersion;
    }
    writeJsonFile(file, json);
  }

  for (const { file } of files.metamodels) {
    if (existsSync(file)) {
      const json = readJsonFile<{ version: string }>(file);
      json.version = newVersion.replace("SNAPSHOT", "beta");
      writeJsonFile(file, json);
    }
  }

  let gradle = readTextFile(files.buildGradle);
  gradle = gradle.replace(/version '.*'/, `version '${newVersion}'`);
  gradle = gradle.replace(/(egwLibrariesVersion\s*=\s*)".*"/, `$1"${newVersion}"`);
  writeTextFile(files.buildGradle, gradle);

  if (existsSync(files.hiPackageJson)) {
    const json = readJsonFile<{ version: string }>(files.hiPackageJson);
    json.version = newVersion;
    writeJsonFile(files.hiPackageJson, json);
  }
}

export function setProjectsVersions(ws: Workspace, newVersion: string): void {
  for (const project of ws.installedProjects) {
    setProjectVersion(ws, project, newVersion);
  }
}

/**
 * Prints versions of all installed projects and of the GUI.
 *
 * @param machineReadable plain text without colors and window title, for `-getVersions` consumed by the GUI runner
 */
export function printProjectsVersions(ws: Workspace, machineReadable: boolean): void {
  if (machineReadable) {
    logger.info("Actual versions");
  } else {
    logger.message("Actual versions");
  }
  const versions: Record<string, string | VersionsByFile> = {};
  for (const project of ws.installedProjects) {
    versions[project.code] = getProjectVersion(ws, project);
  }

  let codeWidth = 0;
  // A project with differing versions in its files is an object and never equals another project
  const allVersions = Object.values(versions);
  const unique = allVersions.every((v) => typeof v === "string") ? unifyVersions(allVersions as string[]) : allVersions;
  if (unique.length === 1) {
    logger.info(`All: ${unique[0]}`);
  } else {
    codeWidth = Math.max(...ws.installedProjects.map((p) => p.code.length));
    for (const [code, version] of Object.entries(versions)) {
      console.log(`${code.padStart(codeWidth, " ")}:`, version);
    }
  }

  const guiPackageJson = join(ws.path(ws.guiFolder), "package.json");
  if (existsSync(guiPackageJson)) {
    logger.info(`${"GUI".padStart(codeWidth, " ")}: ${readJsonFile<{ version: string }>(guiPackageJson).version}`);
  }
}
