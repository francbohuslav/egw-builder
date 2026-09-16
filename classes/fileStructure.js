const fs = require("fs");
const path = require("path");
const { assertAndReturn } = require("./utils");
const assert = require("assert");

class FileStructure {
  /**
   *
   * @param {IProject[]} projects
   */
  fixG01LocationInPaths(projects) {
    for (const project of projects) {
      if (!fs.existsSync(project.folder)) {
        // Project not installed, skipping
        continue;
      }
      const originalServerFolder = project.server;
      let serverFolder = `${project.folder}/${project.server}`;
      // Detect existence of build.gradle, because it is versioned
      if (fs.existsSync(`${serverFolder}/build.gradle`)) {
        // Server folder exists, skipping
        continue;
      }
      if (project.code === "FTP") {
        project.server = project.server.replace("uu_energygatewayg01_ftpendpoint", "uu_energygateway_ftpendpointg01");
        project.webName = project.webName.replace("uu-energygatewayg01-ftpendpoint", "uu-energygateway-ftpendpointg01");
      }
      if (project.code === "EMAIL") {
        project.server = project.server.replace("uu_energygatewayg01_emailendpoint", "uu_energygateway_emailendpointg01");
        project.webName = project.webName.replace("uu-energygatewayg01-emailendpoint", "uu-energygateway-emailendpointg01");
      }
      if (project.code === "ECP") {
        project.server = project.server.replace("uu_energygatewayg01_ecpendpoint", "uu_energygateway_ecpendpointg01");
        project.webName = project.webName.replace("uu-energygatewayg01-ecpendpoint", "uu-energygateway-ecpendpointg01");
      }
      serverFolder = `${project.folder}/${project.server}`;
      if (!fs.existsSync(serverFolder)) {
        throw new Error(`Server folder ${serverFolder} neither ${originalServerFolder} does not exist`);
      }
    }
  }

  /**
   * Add the folder path prefix according to the GUI package.json
   *
   * @param {IProject} MR
   * @param {Record<string, string>} folders
   */
  addGuiPrefixToPaths(MR, folders) {
    assert(MR.uu5lib);
    assert(MR.gui);
    const packageJson = path.join(MR.folder, assertAndReturn(MR.gui), "package.json");
    if (fs.existsSync(packageJson)) {
      MR.uu5lib = path.join(folders.MR, MR.uu5lib);
      MR.gui = path.join(folders.MR, MR.gui);
    } else {
      MR.uu5lib = path.join(folders.GUI, MR.uu5lib);
      MR.gui = path.join(folders.GUI, MR.gui);
    }
  }
}

module.exports = new FileStructure();
