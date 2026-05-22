const fs = require("fs");

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
}

module.exports = new FileStructure();
