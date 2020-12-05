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
    core.pushLocation(project);
    const code = await core.runCommand("gradle build -x test");
    core.processExit(code, project);
    core.showMessage(`${project} - ok`);
    core.popLocation();
}

function getNormalizedString(file) {
    const data = fs.readFileSync(file, { encoding: "utf-8" }).toString();
    return data.replace(/\s+/g, "");
}

async function generateModel(project, server) {
    core.pushLocation(`${project}/${server}/src/main/resources/config`);
    //. $genmodel
    const tempFile = "metamodel-1.0.new.json";
    fs.copyFileSync("metamodel-1.0.json", tempFile);
    const code = await core.runCommand(
        "metamodel-generatorg01.cmd -p profiles.json -m metamodel-1.0.new.json --mandatory-profiles Authorities Executives Auditors"
    );
    core.processExit(code, project);

    let data = fs.readFileSync(tempFile, { encoding: "utf-8" }).toString();
    data = data.replace(/uu-energygateway.*?\//g, "");
    fs.writeFileSync(tempFile, data, { encoding: "utf-8" });
    if (getNormalizedString("metamodel-1.0.json") === getNormalizedString(tempFile)) {
        fs.unlinkSync(tempFile);
    } else {
        core.showMessage("Metamodel changed for " + project);
        fs.renameSync(tempFile, "metamodel-1.0.json");
    }

    core.popLocation();
}

async function run() {
    let [version] = process.argv.slice(2);

    core.showMessage(`Using version ${version}`);

    if (!version) {
        version = prompt("Version: ");
    }
    const isBuild = false && core.ask("Build?");
    const isModel = true || core.ask("Generate metamodel?");

    process.chdir(`../${version}/`);

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
