const { existsSync, createWriteStream } = require("fs");
const axios = require("axios");
const { join } = require("path");
const util = require("util");
const stream = require("stream");
const decompress = require("decompress");
const pipeline = util.promisify(stream.pipeline);

class JMeter {
  async downloadIMissing() {
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
      console.log("Unziping JMeter...");
      await decompress(tempFile, folder);
      console.log("JMeter ready");
    }
  }
}

module.exports = new JMeter();
