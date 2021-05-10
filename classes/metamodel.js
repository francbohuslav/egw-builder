const fs = require("fs");
const core = require("../core");

class MetaModel {
    /**
     * @param {string} mainFolder
     * @param {IProject[]} projects
     * @param {IProject} project
     */
    async generateModel(mainFolder, projects, project) {
        await core.inLocationAsync(`${project.folder}/${project.server}/src/main/resources/config`, async () => {
            const tempFile = "metamodel-1.0.new.json";
            fs.copyFileSync("metamodel-1.0.json", tempFile);
            const addProfiles = this.getAdditionalProfiles(mainFolder, projects, project);
            const cmd =
                "egw-metamodel-generatorg01.cmd -p profiles.json" +
                addProfiles +
                " -m metamodel-1.0.new.json --mandatory-profiles Authorities Executives Auditors";
            //node C:\\Gateway\\_others\\egw_metamodelgeneratorg01\\egw_metamodelgeneratorg01\\cli.js
            console.log(project.code + ": " + cmd);
            const code = await core.runCommand(cmd);
            if (code.stdOut.indexOf("Profiles are not same !!!") > -1) {
                fs.unlinkSync(tempFile);
                core.showError("Error during metamodel");
            }
            const data = core.readTextFile(tempFile).replace(/uu-energygateway.*?\//g, "");
            core.writeTextFile(tempFile, data);
            if (this.getNormalizedString("metamodel-1.0.json") === this.getNormalizedString(tempFile)) {
                fs.unlinkSync(tempFile);
            } else {
                core.showMessage("Metamodel changed for " + project.code);
                fs.renameSync(tempFile, "metamodel-1.0.json");
            }
        });
    }

    /**
     * @param {IProject[]} projects
     * @param {IProject} project
     */
    getAdditionalProfiles(mainFolder, projects, project) {
        const adds = project.addProfilesFromLibraries || {};
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
}

module.exports = new MetaModel();
