import { existsSync } from "node:fs";
import { join } from "node:path";
import { BuilderError } from "../infra/errors";
import { type JavaVersion, PROJECT_CODES } from "./types";

/** Keys of `folders`: all projects plus the repository with GUI components. */
export const FOLDER_KEYS = [...PROJECT_CODES, "GUI"] as const;
export type FolderKey = (typeof FOLDER_KEYS)[number];

export interface BuilderConfig {
  /** Folder of each repository, relative to the EGW root folder. */
  folders: Record<FolderKey, string>;
  /** Optional paths to JDKs. A missing one is downloaded automatically. */
  JDK: Partial<Record<JavaVersion, string>>;
}

/**
 * Loads `config.default.js` and, if present, the user's `config.js` which replaces it.
 * Both files are CommonJS modules (`module.exports = {...}`) so existing local `config.js` files keep working.
 */
export function loadConfig(builderDir: string): BuilderConfig {
  const localFile = join(builderDir, "config.js");
  const file = existsSync(localFile) ? localFile : join(builderDir, "config.default.js");
  let raw: unknown;
  try {
    raw = require(file);
  } catch (error) {
    throw new BuilderError(`Cannot load config file ${file}`, { cause: error });
  }
  return validateConfig(raw, file);
}

/** Checks the shape of the loaded config, so a typo in `config.js` is reported at the start and not as `undefined/...` paths later. */
export function validateConfig(raw: unknown, file: string): BuilderConfig {
  if (typeof raw !== "object" || raw === null) {
    throw new BuilderError(`Config ${file} must export an object`);
  }
  const { folders, JDK } = raw as { folders?: Record<string, unknown>; JDK?: Record<string, unknown> };
  if (typeof folders !== "object" || folders === null) {
    throw new BuilderError(`Config ${file} must contain object "folders"`);
  }
  for (const key of FOLDER_KEYS) {
    if (typeof folders[key] !== "string" || folders[key] === "") {
      throw new BuilderError(`Config ${file}: folders.${key} must be a non-empty string`);
    }
  }
  return { folders: folders as Record<FolderKey, string>, JDK: (JDK ?? {}) as BuilderConfig["JDK"] };
}
