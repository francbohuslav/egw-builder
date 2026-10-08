import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import type { Project } from "../domain/types";
import type { Workspace } from "../domain/workspace";
import { readTextFile, writeTextFile } from "../infra/files";
import { logger } from "../infra/logger";

/** The server reads its configuration from `application-development.properties` if present, otherwise from `application.properties`. */
function getPropertiesFile(ws: Workspace, project: Project): string {
  const resources = join(ws.serverDir(project), "src", "main", "resources");
  const development = join(resources, "application-development.properties");
  return existsSync(development) ? development : join(resources, "application.properties");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Switches the message broker: comments out the active `primaryMessageBroker.mbidUri=` line and
 * uncomments the one for the requested broker (the file keeps one line per broker).
 */
export function switchMessageBroker(content: string, type: string): string {
  const commented = content.replace(/^\s*primaryMessageBroker\.mbidUri=/m, "#primaryMessageBroker.mbidUri=");
  return commented.replace(new RegExp(`^(#\\s*)(primaryMessageBroker\\.mbidUri=${escapeRegExp(type)})`, "m"), "$2");
}

/** Sets the message broker in all installed projects. */
export function changeMessageBroker(ws: Workspace, type: string): void {
  for (const project of ws.installedProjects) {
    const file = getPropertiesFile(ws, project);
    if (!existsSync(file)) {
      logger.warning(`File ${file} does not exist`);
      continue;
    }
    const original = readTextFile(file);
    const changed = switchMessageBroker(original, type);
    if (changed !== original) {
      logger.info(`Saving ${project.code}/.../${basename(file)}`);
      writeTextFile(file, changed);
    }
  }
}

/**
 * Message broker which is set in the installed projects.
 *
 * @returns the broker name, "" if the projects disagree or none is installed, "error" if a file has no broker line
 */
export function getActualMessageBroker(ws: Workspace): string {
  let actual = "";
  for (const project of ws.installedProjects) {
    const file = getPropertiesFile(ws, project);
    if (!existsSync(file)) {
      continue;
    }
    const match = readTextFile(file).match(/^\s*primaryMessageBroker\.mbidUri=([a-z]+?)[^a-z]/im);
    if (!match?.[1]) {
      return "error";
    }
    if (actual && actual !== match[1]) {
      return "";
    }
    actual = match[1];
  }
  return actual;
}
