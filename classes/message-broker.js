const fs = require("fs");
const core = require("../core");
const { basename } = require("path");

class MessageBroker {
  /**
   * @param {string} type
   * @param {IProject[]} projects
   */
  changeMessageBroker(type, projects) {
    for (const project of projects) {
      const file = this._getApplicationPropertiesFilePath(project);
      if (fs.existsSync(file)) {
        const regex = new RegExp("^(#\\s*)(primaryMessageBroker.mbidUri=" + type + ")", "m");
        const originalData = core.readTextFile(file);
        let data = originalData.replace(/^\s*primaryMessageBroker\.mbidUri=/m, "#primaryMessageBroker.mbidUri=");
        data = data.replace(regex, "$2");
        if (data != originalData) {
          console.log(`Saving ${project.code}/.../${basename(file)}`);
          core.writeTextFile(file, data);
        }
      } else {
        core.showWarning(`File ${file} does not exist`);
      }
    }
  }

  /**
   * @param {IProject[]} projects
   * @returns {string}
   */
  getActualMessageBroker(projects) {
    let actual = "";
    for (const project of projects) {
      const file = this._getApplicationPropertiesFilePath(project);
      if (fs.existsSync(file)) {
        const originalData = core.readTextFile(file);
        const match = originalData.match(/^\s*primaryMessageBroker\.mbidUri=([a-z]+?)[^a-z]/im);
        if (!match) {
          return "error";
        }
        const mb = match[1];
        if (actual && actual != mb) {
          return "";
        }
        actual = mb;
      }
    }
    return actual;
  }

  /**
   * @param {IProject} project
   * @returns {string}
   */
  _getApplicationPropertiesFilePath(project) {
    let file = `${project.folder}/${project.server}/src/main/resources/application-development.properties`;
    if (!fs.existsSync(file)) {
      file = `${project.folder}/${project.server}/src/main/resources/application.properties`;
    }
    return file;
  }
}

module.exports = new MessageBroker();
