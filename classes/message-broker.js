const fs = require("fs");
const core = require("../core");

class MessageBroker {
    /**
     * @param {string} type
     * @param {import("..").IProject[]} projects
     */
    changeMessageBroker(type, projects) {
        for (const project of projects) {
            const file = `${project.folder}/${project.server}/src/main/resources/application.properties`;
            const regex = new RegExp("^(#\\s*)(primaryMessageBroker.mbidUri=" + type + ")", "m");
            if (fs.existsSync(file)) {
                const originalData = core.readTextFile(file);
                let data = originalData.replace(/^\s*primaryMessageBroker\.mbidUri=/m, "#primaryMessageBroker.mbidUri=");
                data = data.replace(regex, "$2");
                if (data != originalData) {
                    console.log(`Saving ${project.code}/.../application.properties`);
                    core.writeTextFile(file, data);
                }
            } else {
                core.showWarning(`File ${file} does not exist`);
            }
        }
    }

    getActualMessageBroker(projects) {
        let actual = "";
        for (const project of projects) {
            const file = `${project.folder}/${project.server}/src/main/resources/application.properties`;
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
}

module.exports = new MessageBroker();
