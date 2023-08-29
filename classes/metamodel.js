const fs = require("fs");
const core = require("../core");

class MetaModel {
  /**
   * @param {string} mainFolder
   * @param {IProject[]} projects
   * @param {IProject} project
   * @param {boolean} isVersion11
   */
  async generateModel(mainFolder, projects, project, isVersion11) {
    await core.inLocationAsync(`${project.folder}/${project.server}/src/main/resources/config`, async () => {
      console.log(project.code);
      await this._generateMetamodelVersion(mainFolder, projects, project, isVersion11, 1);
      await this._generateMetamodelVersion(mainFolder, projects, project, false, 2);
    });
  }

  /**
   * @param {IProject[]} projects
   * @param {IProject} project
   */
  getAdditionalProfiles(mainFolder, projects, project, isVersion11) {
    let adds = {};
    if (project.addProfilesFromLibraries) {
      adds = project.addProfilesFromLibraries(isVersion11);
    }
    const parts = [];
    Object.entries(adds).forEach(([libraryName, projectCode]) => {
      const otherProject = projects.filter((p) => p.code == projectCode)[0];
      parts.push(` -p ${mainFolder}/${otherProject.folder}/${libraryName}/src/main/resources/config/profiles.json`);
    });
    return parts.join("");
  }

  getNormalizedString(file) {
    const data = fs.readFileSync(file, { encoding: "utf-8" }).toString();
    return data.replace(/\s+/g, "");
  }

  /**
   * @param {string} mainFolder
   * @param {IProject[]} projects
   * @param {IProject} project
   * @param {boolean} isVersion11
   * @param {1|2} metamodelVersion
   */
  async _generateMetamodelVersion(mainFolder, projects, project, isVersion11, metamodelVersion) {
    console.log("..." + metamodelVersion);
    const tempFile = `metamodel-${metamodelVersion}.0.new.json`;
    fs.copyFileSync(`metamodel-${metamodelVersion}.0.json`, tempFile);
    const addProfiles = this.getAdditionalProfiles(mainFolder, projects, project, isVersion11);
    const cmd = `egw-metamodel-generatorg01.cmd -p profiles.json${addProfiles} -m metamodel-${metamodelVersion}.0.new.json --mandatory-profiles Authorities Executives Auditors`;
    //node C:\\Gateway\\_others\\egw_metamodelgeneratorg01\\egw_metamodelgeneratorg01\\cli.js
    const code = await core.runCommand(cmd);
    if (code.stdOut.indexOf("Profiles are not same !!!") > -1) {
      console.log("in " + process.cwd());
      console.log(project.code + ": " + cmd);
      fs.unlinkSync(tempFile);
      core.showError("Error during metamodel");
    }
    const data = core.readTextFile(tempFile).replace(/uu-energygateway.*?\//g, "");
    core.writeTextFile(tempFile, data);
    if (this.getNormalizedString(`metamodel-${metamodelVersion}.0.json`) === this.getNormalizedString(tempFile)) {
      fs.unlinkSync(tempFile);
    } else {
      core.showMessage("Metamodel changed for " + project.code);
      fs.renameSync(tempFile, `metamodel-${metamodelVersion}.0.json`);
    }
  }
}

module.exports = new MetaModel();
