const fs = require("fs");
const core = require("../core");

class Java {
  /**
   * @param {import("..").IProject} DG
   */
  getJavaVersion(project) {
    const file = `${project.folder}/${project.server}/build.gradle`;
    if (!fs.existsSync(file)) {
      throw new Error(`File ${file} not found`);
    }
    const originalData = core.readTextFile(file);
    const match = originalData.match(/^\s*targetCompatibility\s*=\s*([\d.]+)/m);
    if (!match) {
      throw new Error(`Can not detect targetCompatility in ${file}`);
    }
    return match[1];
  }

  printInfo(javaVersion, JDK) {
    let str = `Java ${javaVersion} detected`;
    if (JDK) {
      str += `. JDK ${JDK} used.`;
    } else {
      str += ". Default Java used";
    }
    console.log(str);
  }
}

module.exports = new Java();
