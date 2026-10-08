import { existsSync } from "node:fs";
import { join } from "node:path";
import { BuilderError } from "../infra/errors";
import { readTextFile } from "../infra/files";
import { downloadAndUnpack } from "./download";

/** Properties which a JMX may read by `__P(...)` but which need not be passed, because the JMX has a default. */
const OPTIONAL_PROPERTIES = new Set(["big_file_size_kb", "enableAsyncJob"]);

/** Downloads JMeter into the `jmeter` folder of the builder unless it is already there. */
export async function ensureJmeter(builderDir: string): Promise<void> {
  if (!existsSync(join(builderDir, "jmeter"))) {
    await downloadAndUnpack({
      label: "JMeter",
      url: "https://www.dropbox.com/s/bc9z1s28k952g0p/jmeter.zip?dl=1",
      tempFile: join(builderDir, "jmeter.zip"),
      destination: builderDir,
    });
  }
}

/**
 * Compares the `-Jname=value` parameters with the properties the JMX reads by `__P(name...)`.
 * JMeter silently uses a wrong value for a property it did not receive, so a missing one is rather an error.
 * Parameters which the JMX does not read are dropped (the same set of parameters is built for every test file).
 *
 * @param jmxContent text of the test file
 * @param testFile name of the test file, for the error message only
 * @param params all JMeter arguments
 * @returns the arguments without the superfluous `-J` ones
 * @throws BuilderError when the JMX reads a property which was not passed
 */
export function validateRequiredProperties(jmxContent: string, testFile: string, params: readonly string[]): string[] {
  const referencedInJmx = new Set<string>();
  for (const match of jmxContent.matchAll(/__P\(\s*([^,)\s]+)\s*(?:,|\))/g)) {
    if (match[1]) {
      referencedInJmx.add(match[1]);
    }
  }

  const propertyName = (param: string): string | undefined => param.match(/^-J([^=\s]+)=/)?.[1];

  const provided = new Set<string>();
  for (const param of params) {
    const name = propertyName(param);
    if (name) {
      provided.add(name);
    }
  }

  const missing = [...referencedInJmx].filter((name) => !OPTIONAL_PROPERTIES.has(name) && !provided.has(name)).sort();
  if (missing.length > 0) {
    throw new BuilderError(
      `Missing JMeter properties for ${testFile}: ${missing.join(", ")}. Pass them as -Jname=value (names come from __P(...) in the JMX).`,
    );
  }

  return params.filter((param) => {
    const name = propertyName(param);
    return !name || referencedInJmx.has(name);
  });
}

/** Reads the test file and validates the parameters, see {@link validateRequiredProperties}. */
export function validateRequiredPropertiesOfFile(testFile: string, params: readonly string[]): string[] {
  if (!existsSync(testFile)) {
    throw new BuilderError(`JMeter test file "${testFile}" does not exist, can not validate required __P(...) parameters.`);
  }
  return validateRequiredProperties(readTextFile(testFile), testFile, params);
}
