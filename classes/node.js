const { existsSync, createWriteStream, unlinkSync, mkdirSync, renameSync } = require("fs");
const axios = require("axios");
const { join } = require("path");
const util = require("util");
const stream = require("stream");
const decompress = require("decompress");
const core = require("../core");
const pipeline = util.promisify(stream.pipeline);

class NodeJs {
  /**
   * @param {string} guiFolder
   * @returns {Promise<string>} path to Node.js folder
   */
  async detectAndDownload(guiFolder) {
    const requiredVersion = JSON.parse(core.readTextFile(join(guiFolder, "package.json"))).engines.node;
    const match = requiredVersion.match(/(\d+)\.\d+\.\d+/);
    if (!match) {
      core.showError(`Node.js version cannot be detected from '${requiredVersion}'`);
    }
    const nodeJsMajorVersion = match[1];
    return await this.downloadIMissing(nodeJsMajorVersion);
  }

  /**
   * @param {string} nodeJsMajorVersion
   * @returns {Promise<string>} path to Node.js folder
   */
  async downloadIMissing(nodeJsMajorVersion) {
    const folder = join(__dirname, "..", "nodejs");
    mkdirSync(folder, { recursive: true });
    let nodeJsVersion = "14.21.1";
    if (nodeJsMajorVersion === "16") {
      nodeJsVersion = "16.18.1";
    }
    const nodeJsFolder = join(folder, nodeJsMajorVersion);
    if (!existsSync(nodeJsFolder)) {
      console.log(`Downloading Node.js ${nodeJsVersion}...`);
      const response = await axios({
        method: "get",
        url: `https://nodejs.org/dist/v${nodeJsVersion}/node-v${nodeJsVersion}-win-x64.zip`,
        responseType: "stream",
      });
      const tempFile = join(__dirname, "..", `nodejs.zip`);
      await pipeline(response.data, createWriteStream(tempFile));
      console.log("Unziping Node.js...");
      await decompress(tempFile, folder);
      unlinkSync(tempFile);
      renameSync(join(folder, `node-v${nodeJsVersion}-win-x64`), nodeJsFolder);
      console.log("Node.js ready");
    }
    return nodeJsFolder;
  }
}

module.exports = new NodeJs();
