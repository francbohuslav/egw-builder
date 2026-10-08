import { existsSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_ENVIRONMENT_FILE } from "../domain/projects";
import { type ExtraInitCode, PROJECT_CODES } from "../domain/types";
import { BuilderError } from "../infra/errors";
import { readTextFile, writeTextFile } from "../infra/files";
import { ALL_APPLICATIONS, type BuildTarget, createDefaultOptions, type InitTarget, type Options, type TestTarget } from "./options";

/**
 * Persistence of the last run in `last.json`, which `-last` repeats.
 *
 * The file is shared with the GUI runner (C# `LastSaver`), which writes and reads the same flat shape:
 * `buildDG: true`, `runMR: false`, ... The runner is tolerant to missing and unknown keys, but the key names must not change.
 */

const BUILD_TARGETS: BuildTarget[] = [...PROJECT_CODES, "Npm", "Gui"];
const EXTRA_INITS: ExtraInitCode[] = ["ASYNC", "BSg02"];
const INIT_TARGETS: InitTarget[] = [...ALL_APPLICATIONS, ...EXTRA_INITS];
const TEST_TARGETS: TestTarget[] = ALL_APPLICATIONS;

export function getLastFilePath(builderDir: string): string {
  return join(builderDir, "last.json");
}

/** Converts options to the flat JSON shape of `last.json`. Only options which describe the work are stored. */
export function optionsToLastJson(options: Options): Record<string, unknown> {
  const json: Record<string, unknown> = {
    folder: options.folder,
    version: options.version ?? "",
    clear: options.clear,
    metamodel: options.metamodel,
    messageBroker: options.messageBroker,
    isMerged: options.isMerged,
    build: options.build.size > 0,
  };
  for (const target of BUILD_TARGETS) {
    json[`build${target}`] = options.build.has(target);
  }
  json.unitTests = options.unitTests;
  json.run = options.run.size > 0;
  for (const code of PROJECT_CODES) {
    json[`run${code}`] = options.run.has(code);
  }
  json.runInSequence = options.runInSequence;
  json.init = options.init.size > 0;
  for (const target of INIT_TARGETS) {
    json[`init${target}`] = options.init.has(target);
  }
  json.uid = options.uid;
  json.tests = options.test.size > 0 || options.additionalTests.length > 0;
  for (const target of TEST_TARGETS) {
    json[`test${target}`] = options.test.has(target);
  }
  json.additionalTests = options.additionalTests;
  json.environmentFile = options.environmentFile;
  json.payloadPersistenceStrategy = options.payloadPersistenceStrategy;
  json.onlyShowResults = options.onlyShowResults;
  return json;
}

/** Converts the flat JSON of `last.json` back to options. Missing keys mean "not selected". */
export function lastJsonToOptions(json: Record<string, unknown>): Options {
  const options = createDefaultOptions();
  const text = (key: string): string | undefined => (typeof json[key] === "string" && json[key] !== "" ? (json[key] as string) : undefined);
  const flag = (key: string): boolean => json[key] === true;

  options.last = true;
  options.folder = text("folder");
  options.version = text("version");
  options.clear = flag("clear");
  options.metamodel = flag("metamodel");
  options.messageBroker = text("messageBroker");
  options.isMerged = flag("isMerged");
  options.unitTests = flag("unitTests");
  options.runInSequence = flag("runInSequence");
  options.onlyShowResults = flag("onlyShowResults");
  options.uid = text("uid");
  options.environmentFile = text("environmentFile") ?? DEFAULT_ENVIRONMENT_FILE;
  options.payloadPersistenceStrategy = text("payloadPersistenceStrategy");
  options.additionalTests = Array.isArray(json.additionalTests) ? json.additionalTests.filter((t): t is string => typeof t === "string") : [];
  for (const target of BUILD_TARGETS) {
    if (flag(`build${target}`)) {
      options.build.add(target);
    }
  }
  for (const code of PROJECT_CODES) {
    if (flag(`run${code}`)) {
      options.run.add(code);
    }
  }
  for (const target of INIT_TARGETS) {
    if (flag(`init${target}`)) {
      options.init.add(target);
    }
  }
  for (const target of TEST_TARGETS) {
    if (flag(`test${target}`)) {
      options.test.add(target);
    }
  }
  return options;
}

export function saveLastOptions(builderDir: string, options: Options): void {
  writeTextFile(getLastFilePath(builderDir), JSON.stringify(optionsToLastJson(options), null, 4));
}

export function loadLastOptions(builderDir: string): Options {
  const file = getLastFilePath(builderDir);
  if (!existsSync(file)) {
    throw new BuilderError(`Cannot repeat the last run, ${file} does not exist yet.`, { showHelp: false });
  }
  try {
    return lastJsonToOptions(JSON.parse(readTextFile(file)));
  } catch (error) {
    throw new BuilderError(`File ${file} is not valid`, { cause: error });
  }
}
