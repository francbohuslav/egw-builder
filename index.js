const prompt = require("prompt-sync")();
const core = require("./core");
const fs = require("fs");

const projects = [
    ["uu_energygateway_datagatewayg01", "uu_energygateway_datagatewayg01-server"],
    ["uu_energygateway_messageregistryg01", "uu_energygateway_messageregistryg01-server"],
    ["uu_energygateway_ecpendpointg01", "uu_energygatewayg01_ecpendpoint-server"],
    ["uu_energygateway_emailendpointg01", "uu_energygatewayg01_emailendpoint-server"],
    ["uu_energygateway_ftpendpointg01", "uu_energygatewayg01_ftpendpoint-server"],
];

async function buildProject(project) {
    await core.inLocationAsync(project, async () => {
        const code = await core.runCommand("gradle build -x test");
        core.processExit(code, project);
        core.showMessage(`${project} - ok`);
    });
}

function getNormalizedString(file) {
    const data = fs.readFileSync(file, { encoding: "utf-8" }).toString();
    return data.replace(/\s+/g, "");
}

async function generateModel(project, server) {
    await core.inLocationAsync(`${project}/${server}/src/main/resources/config`, async () => {
        const tempFile = "metamodel-1.0.new.json";
        fs.copyFileSync("metamodel-1.0.json", tempFile);
        const code = await core.runCommand(
            "metamodel-generatorg01.cmd -p profiles.json -m metamodel-1.0.new.json --mandatory-profiles Authorities Executives Auditors"
        );
        core.processExit(code, project);

        const data = core.readTextFile(tempFile).replace(/uu-energygateway.*?\//g, "");
        core.writeTextFile(tempFile, data);
        if (getNormalizedString("metamodel-1.0.json") === getNormalizedString(tempFile)) {
            fs.unlinkSync(tempFile);
        } else {
            core.showMessage("Metamodel changed for " + project);
            fs.renameSync(tempFile, "metamodel-1.0.json");
        }
    });
}

function printProjectVersion(project, server) {
    core.inLocation(project, () => {
        const versions = {};

        versions["uuapp.json"] = JSON.parse(core.readTextFile("uuapp.json")).version;
        versions["build.gradle"] = core.readTextFile("build.gradle").match(/version '(\S+)'/)[1];
        versions["uucloud-development.json"] = JSON.parse(core.readTextFile(server + "/config/uucloud-development.json")).uuSubApp.version;
        versions["metamodel-1.0.json"] = JSON.parse(core.readTextFile(server + "/src/main/resources/config/metamodel-1.0.json")).version;
        if (fs.existsSync("uu_energygateway_messageregistryg01-hi/package.json")) {
            versions["package.json"] = JSON.parse(core.readTextFile("uu_energygateway_messageregistryg01-hi/package.json")).version;
        }
        const uniqueVersions = Object.values(versions).filter((value, index, self) => self.indexOf(value) == index);
        if (uniqueVersions.length === 1) {
            console.log(project + ":", uniqueVersions[0]);
        } else {
            console.log(project + ":", versions);
        }
    });
}

function setProjectVersion(project, server, newVersion) {
    core.inLocation(project, () => {
        let json = JSON.parse(core.readTextFile("uuapp.json"));
        json.version = newVersion;
        core.writeTextFile("uuapp.json", JSON.stringify(json, null, 2));

        json = JSON.parse(core.readTextFile(server + "/config/uucloud-development.json"));
        json.uuSubApp.version = newVersion;
        core.writeTextFile(server + "/config/uucloud-development.json", JSON.stringify(json, null, 2));

        json = JSON.parse(core.readTextFile(server + "/src/main/resources/config/metamodel-1.0.json"));
        json.version = newVersion.replace("SNAPSHOT", "beta");
        core.writeTextFile(server + "/src/main/resources/config/metamodel-1.0.json", JSON.stringify(json, null, 2));

        let content = core.readTextFile("build.gradle");
        content = content.replace(/version '.*'/, `version '${newVersion}'`);
        core.writeTextFile("build.gradle", content);

        if (fs.existsSync("uu_energygateway_messageregistryg01-hi/package.json")) {
            json = JSON.parse(core.readTextFile("uu_energygateway_messageregistryg01-hi/package.json"));
            json.version = newVersion;
            core.writeTextFile("uu_energygateway_messageregistryg01-hi/package.json", JSON.stringify(json, null, 2));
        }
    });
}

function printProjectsVersions() {
    core.showMessage("Actual versions");
    for (const row of projects) {
        printProjectVersion(row[0], row[1]);
    }
}

function setProjectsVersions(newVersion) {
    for (const row of projects) {
        setProjectVersion(row[0], row[1], newVersion);
    }
}

async function run() {
    let [branch] = process.argv.slice(2);

    core.showMessage(`Using branch ${branch}`);

    if (!branch) {
        branch = prompt("Branch: ");
    }
    process.chdir(`../${branch}/`);
    const isBuild = core.ask("Build?");
    const isModel = core.ask("Generate metamodel?");

    printProjectsVersions();
    const newVersion = prompt("Set version [enter = no change]: ");
    if (newVersion) {
        setProjectsVersions(newVersion);
    }

    if (isBuild) {
        core.showMessage("Starting docker...");
        await core.inLocationAsync("uu_energygateway_datagatewayg01/docker/egw-tests", async () => {
            await core.runCommand("docker-compose up -d");
        });
        await core.inLocationAsync("uu_energygateway_ftpendpointg01/docker/egw-tests", async () => {
            await core.runCommand("docker-compose up -d");
        });
    }

    for (const row of projects) {
        const [project, server] = row;
        if (isBuild) {
            await buildProject(project);
        }
        if (isModel) {
            await generateModel(project, server);
        }
    }

    core.showMessage("DONE");
}

run();
