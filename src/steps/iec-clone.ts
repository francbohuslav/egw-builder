import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Workspace } from "../domain/workspace";
import { BuilderError } from "../infra/errors";
import { readTextFile } from "../infra/files";
import { logger } from "../infra/logger";

/** Since this major version of DG the IEC62325 endpoint uses the original DG folder directly. */
const FIRST_VERSION_WITHOUT_COPY = 4;

/** Folders of DG which are not needed in the copy (and would only slow the copying and the build down). */
const EXCLUDED_FROM_COPY = [".git", ".gradle", "docker", "build", "jenkins"];

/**
 * Finds the path of the DG copy in `settings.gradle` of IEC62325.
 *
 * The settings list alternative paths to DG. The copy is the one which precedes the original DG folder.
 * An already existing copy is preferred, otherwise the first listed one is going to be created.
 *
 * @param paths all paths starting with the DG folder name found in the settings, in the order of the file
 * @param exists tells whether a path (relative to the root) exists
 * @throws BuilderError when there is no path, or the original DG folder is listed first (nothing to copy to)
 */
export function pickDataGatewayCopyFolder(paths: readonly string[], dgFolder: string, iecFolder: string, exists: (path: string) => boolean): string {
  if (paths.length === 0) {
    throw new BuilderError(`Can not find path to datagateway in ${iecFolder}/settings.gradle, thus copy of DG for IEC62325 will not be created.`);
  }
  let firstListed = "";
  let firstExisting = "";
  for (const path of paths) {
    if (path === dgFolder) {
      break;
    }
    firstListed ||= path;
    if (!firstExisting && exists(path)) {
      firstExisting = path;
    }
  }
  if (!firstListed) {
    throw new BuilderError(
      `File ${iecFolder}/settings.gradle leads to original DG folder. Copy of DG for IEC62325 will not be created.\n` +
        `Modify path to DG in ${iecFolder}/settings.gradle and builder creates copy of DG for you. Condition to copy of DG must be before original DG folder.`,
    );
  }
  return firstExisting || firstListed;
}

/**
 * Older versions of the IEC62325 endpoint need their own copy of DG (they build against a modified one).
 * The copy is created from scratch each time, so it never contains leftovers of a previous version.
 *
 * @param dgVersion version of DG, the copy is skipped for 4.0.0 and newer
 */
export function cloneDataGatewayForIec(ws: Workspace, dgVersion: string): void {
  const major = Number.parseInt(dgVersion.match(/^(\d+)\./)?.[1] ?? "", 10);
  if (Number.isNaN(major)) {
    throw new BuilderError(`Can not detect major version from '${dgVersion}'`);
  }
  if (major >= FIRST_VERSION_WITHOUT_COPY) {
    logger.info(`IEC62325 copy is not needed for major version ${major}`);
    return;
  }
  const dg = ws.project("DG");
  const iec = ws.project("IEC62325");
  const settings = readTextFile(join(ws.dir(iec), "settings.gradle"));
  const escapedDgFolder = dg.folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const paths = [...settings.matchAll(new RegExp(`${escapedDgFolder}[^\\"']*`, "g"))].map((m) => m[0]);
  const copyFolder = pickDataGatewayCopyFolder(paths, dg.folder, iec.folder, (p) => existsSync(ws.path(p)));

  const copyDir = ws.path(copyFolder);
  if (existsSync(copyDir)) {
    logger.message(`Removing old ${copyFolder}...`);
    rmSync(copyDir, { recursive: true, force: true });
  }
  logger.message(`Copying ${dg.folder} to ${copyFolder}`);
  const dgDir = ws.dir(dg);
  const excluded = EXCLUDED_FROM_COPY.map((name) => join(dgDir, name));
  cpSync(dgDir, copyDir, { recursive: true, filter: (source) => !excluded.includes(source) });
}
