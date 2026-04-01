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
   * Validate that all __P(name,...) properties used in JMX are provided via params as -Jname=value arguments.
   *
   * @param {string} testFile
   * @param {string[]} params
   */
  validateRequiredProperties(testFile, params) {
    const ignoredProperties = new Set(["big_file_size_kb", "enableAsyncJob"]);

    if (!existsSync(testFile)) {
      throw new Error(`JMeter test file "${testFile}" does not exist, can not validate required __P(...) parameters.`);
    }

    /** @type {Set<string>} */
    const providedPropertyNames = new Set();
    for (const param of params) {
      const match = param.match(/^-J([^=\s]+)=/);
      if (match && match[1]) {
        providedPropertyNames.add(match[1]);
      }
    }

    const testFileContent = readFileSync(testFile, { encoding: "utf-8" }).toString();
    /** @type {Set<string>} */
    const requiredProperties = new Set();
    for (const match of testFileContent.matchAll(/__P\(\s*([^,)\s]+)\s*(?:,|\))/g)) {
      if (match[1] && !ignoredProperties.has(match[1])) {
        requiredProperties.add(match[1]);
      }
    }

    const missingProperties = [];
    for (const requiredProperty of requiredProperties) {
      if (!providedPropertyNames.has(requiredProperty)) {
        missingProperties.push(requiredProperty);
      }
    }
    if (missingProperties.length > 0) {
      missingProperties.sort();
      console.log("Provided properties: " + Array.from(providedPropertyNames).join(", "));
      console.log("Required properties: " + Array.from(requiredProperties).join(", "));
      throw new Error(
        `Missing JMeter properties for ${testFile}: ${missingProperties.join(", ")}. ` +
          `Required properties are taken from __P(...) occurrences in the JMX file and must be passed via -Jname=value.`,
      );
    }
  }
}

module.exports = new JMeter();
