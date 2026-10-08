import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { BuilderError } from "./errors";

/**
 * Small synchronous file helpers. The builder is a sequential CLI tool, so sync I/O keeps the code simple
 * and there is no concurrent work which could be blocked.
 */

export function readTextFile(file: string): string {
  return readFileSync(file, { encoding: "utf-8" });
}

export function writeTextFile(file: string, data: string): void {
  writeFileSync(file, data, { encoding: "utf-8" });
}

/** Reads and parses a JSON file. The error names the file, so a broken JSON is easy to locate. */
export function readJsonFile<T = Record<string, unknown>>(file: string): T {
  try {
    return JSON.parse(readTextFile(file)) as T;
  } catch (error) {
    throw new BuilderError(`Cannot read JSON file ${file}`, { cause: error });
  }
}

/** Writes JSON in the format used by the repositories (2 spaces). */
export function writeJsonFile(file: string, data: unknown, indent = 2): void {
  writeTextFile(file, JSON.stringify(data, null, indent));
}

export function removeFileIfExists(file: string): void {
  if (existsSync(file)) {
    unlinkSync(file);
  }
}
