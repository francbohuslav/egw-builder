const fs = require("fs");
const core = require("../core");

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
    const javaVersion = match[1];

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
}

module.exports = new Java();
