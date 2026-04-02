const { existsSync, createWriteStream, unlinkSync, readFileSync } = require("fs");
const axios = require("axios");
const { join } = require("path");
const util = require("util");
const stream = require("stream");
const decompress = require("decompress");
const pipeline = util.promisify(stream.pipeline);

class JMeter {
  async downloadIfMissing() {
    const folder = join(__dirname, "..");
    const tempFile = join(__dirname, "..", "jmeter.zip");
    if (!existsSync(join(folder, "jmeter"))) {
      console.log("Downloading JMeter...");
      const response = await axios({
        method: "get",
        url: "https://www.dropbox.com/s/bc9z1s28k952g0p/jmeter.zip?dl=1",
        responseType: "stream",
      });

      await pipeline(response.data, createWriteStream(tempFile));
      console.log("Unzipping JMeter...");
      await decompress(tempFile, folder);
      console.log("JMeter ready");
      unlinkSync(tempFile);
    }
  }

  /**
   * Reads property names from `__P(...)` in the JMX; every name except `ignoredProperties` must be passed as `-Jname=value`.
   * Surplus `-J...` entries that do not match any name from the JMX are removed from `params`.
   *
   * @param {string} testFile
   * @param {string[]} params mutated in place
   */
  validateRequiredProperties(testFile, params) {
    /** Property names that may appear in JMX `__P(...)` but need not be passed as `-J` (defaults in JMX are enough). */
    const ignoredProperties = new Set(["big_file_size_kb", "enableAsyncJob"]);

    if (!existsSync(testFile)) {
      throw new Error(`JMeter test file "${testFile}" does not exist, can not validate required __P(...) parameters.`);
    }

    const jmx = readFileSync(testFile, { encoding: "utf-8" }).toString();
    /** @type {Set<string>} */
    const referencedInJmx = new Set();
    for (const match of jmx.matchAll(/__P\(\s*([^,)\s]+)\s*(?:,|\))/g)) {
      if (match[1]) {
        referencedInJmx.add(match[1]);
      }
    }

    /** @type {Set<string>} */
    const provided = new Set();
    for (const param of params) {
      const m = param.match(/^-J([^=\s]+)=/);
      if (m && m[1]) {
        provided.add(m[1]);
      }
    }

    /** @type {string[]} */
    const missing = [];
    for (const name of referencedInJmx) {
      if (!ignoredProperties.has(name) && !provided.has(name)) {
        missing.push(name);
      }
    }
    if (missing.length > 0) {
      missing.sort();
      throw new Error(
        `Missing JMeter properties for ${testFile}: ${missing.join(", ")}. ` + `Pass them as -Jname=value (names come from __P(...) in the JMX).`,
      );
    }

    /** @type {string[]} */
    const kept = [];
    for (const param of params) {
      const m = param.match(/^-J([^=\s]+)=/);
      if (m && m[1] && !referencedInJmx.has(m[1])) {
        continue;
      }
      kept.push(param);
    }
    params.splice(0, params.length, ...kept);
  }
}

module.exports = new JMeter();
