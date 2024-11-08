const fs = require("fs");
const axios = require("axios");
const { join } = require("path");
const util = require("util");
const stream = require("stream");
const decompress = require("decompress");
const core = require("../core");
const pipeline = util.promisify(stream.pipeline);

class Java {
  /**
   * @param {IProject} project
   * @returns {IJavaAppInfo}
   */
  getSubAppJavaInfo(project) {
    let file = `${project.folder}/${project.server}/build.gradle`;
    if (!fs.existsSync(file)) {
      throw new Error(`File ${file} not found`);
    }
    let originalData = core.readTextFile(file);
    let match = originalData.match(/^\s*sourceCompatibility\s*=\s*([\d.]+)/m);
    if (!match) {
      throw new Error(`Can not detect sourceCompatibility in ${file}`);
    }
    const javaVersion = /** @type {IJavaVersion} */ (match[1]);

    file = `${project.folder}/build.gradle`;
    if (!fs.existsSync(file)) {
      throw new Error(`File ${file} not found`);
    }
    originalData = core.readTextFile(file);
    let maxMemory = "1G";
    // applicationDefaultJvmArgs = ["-Xmx3g"]
    match = originalData.match(/applicationDefaultJvmArgs\s*=.*-xmx(\d+[gm])/im);
    if (!match) {
      core.showError(`Can not detect applicationDefaultJvmArgs, using ${maxMemory}`, false);
    } else {
      maxMemory = match[1];
    }

    // mainClassName = 'uu.energygateway.ftpendpoint.SubAppRunner'
    match = originalData.match(/mainClassName\s*=.*(uu\..*\.SubAppRunner)/im);
    if (!match) {
      throw new Error(`Can not detect mainClassName`);
    }
    const mainClassName = match[1];
    return { javaVersion, maxMemory, mainClassName };
  }

  /**
   * @param {IJavaAppInfo} javaInfo
   * @param {string} JDK
   */
  printInfo(javaInfo, JDK) {
    let str = `Java ${javaInfo.javaVersion} detected`;
    if (JDK) {
      str += `. JDK ${JDK} used.`;
    } else {
      str += ". Default Java used.";
    }
    str += ` Max memory = ${javaInfo.maxMemory}`;
    console.log(str);
  }

  async downloadIfMissingJavaForJmeter() {
    const folder = join(__dirname, "..", "java");
    let suitableJavaVersion = "";
    if (fs.existsSync(join(folder, "1.8"))) {
      suitableJavaVersion = "1.8";
    } else if (fs.existsSync(join(folder, "11"))) {
      suitableJavaVersion = "11";
    } else {
      await this.downloadIfMissing("1.8");
      suitableJavaVersion = "1.8";
    }
    const jmeterRunner = join(folder, "runJmeter.bat");
    if (!fs.existsSync(jmeterRunner)) {
      const content = [
        "@echo off",
        `set JAVA_HOME=${join(folder, suitableJavaVersion)}`,
        "set PATH=%JAVA_HOME%/bin;%PATH%",
        `${join(__dirname, "..", "jmeter", "bin", "jmeter.bat")} %*`,
      ];
      core.writeTextFile(jmeterRunner, content.join("\r\n"));
    }
  }

  /**
   * @param {IJavaVersion} javaVersion
   * @returns {Promise<string>} path to JAVA folder
   */
  async downloadIfMissing(javaVersion) {
    const folder = join(__dirname, "..", "java");
    fs.mkdirSync(folder, { recursive: true });
    const download = { uri: "https://www.dropbox.com/s/7z9agtdakccb7uz/jdk1.8.0_211.zip?dl=1", removeSubFolder: true };
    if (javaVersion === "11") {
      download.uri = "https://www.dropbox.com/s/ofb3m5ag3cy05k6/corretto-11.0.12.zip?dl=1";
      download.removeSubFolder = false;
    }
    if (javaVersion === "17") {
      download.uri = "https://cdn.azul.com/zulu/bin/zulu17.44.15-ca-jdk17.0.8-win_x64.zip";
      download.removeSubFolder = true;
    }
    if (javaVersion === "21") {
      download.uri = "https://cdn.azul.com/zulu/bin/zulu21.38.21-ca-jdk21.0.5-win_x64.zip";
      download.removeSubFolder = true;
    }
    const javaDestFolder = join(folder, javaVersion);
    if (!fs.existsSync(javaDestFolder)) {
      console.log(`Downloading Java ${javaVersion}...`);
      // @ts-ignore
      const response = await axios({
        method: "get",
        url: download.uri,
        responseType: "stream",
      });
      const tempFile = join(__dirname, "..", `java.zip`);
      await pipeline(response.data, fs.createWriteStream(tempFile));
      console.log("Unzipping Java...");
      await decompress(tempFile, javaDestFolder, { strip: download.removeSubFolder ? 1 : 0 });
      fs.unlinkSync(tempFile);
      console.log("Java ready");
    }
    return javaDestFolder;
  }
}

module.exports = new Java();
