const prompt = require("prompt-sync")();
const core = require("./core");
const path = require("path");
const fs = require("fs");
const parseCsv = require("csv-parse/lib/sync");
const request = require("request");
const util = require("util");
const requestAsync = util.promisify(request);
const CommandLine = require("./command-line");
const last = require("./last");

let config = require("./config.default");
const info = require("./classes/info");
if (fs.existsSync("./config.js")) {
    config = require("./config");
}

const builderDir = __dirname;

/**
 * @typedef {Object} IProject Project
 * @property {string} code one of DG, MR, EMAIL, ECP, FTP
 * @property {string} folder folder of project e.g. "uu_energygateway_datagatewayg01"
 * @property {string} server folder of server module e.g. "uu_energygateway_datagatewayg01-server"
 * @property {string} hi folder of hi module of MR e.g. "uu_energygateway_messageregistryg01-hi"
 * @property {string} testFile e.g. "message-registr.jmx"
 * @property {string} port e.g. 8093
 * @property {string} webname e.g. "uu-energygateway-messageregistryg01"
 */

/**
 * @type {IProject[]}
 */
const projects = [
    {
        code: "DG",
        folder: config.folders.DG,
        server: "uu_energygateway_datagatewayg01-server",
        port: 8094,
        webname: "uu-energygateway-datagatewayg01",
        testFile: "datagateway.jmx",
    },
    {
        code: "MR",
        folder: config.folders.MR,
        server: "uu_energygateway_messageregistryg01-server",
        port: 8093,
        webname: "uu-energygateway-messageregistryg01",
        hi: "uu_energygateway_messageregistryg01-hi",
        testFile: "message-registry.jmx",
    },
    {
        code: "FTP",
        folder: config.folders.FTP,
        server: "uu_energygatewayg01_ftpendpoint-server",
        port: 8095,
        webname: "uu-energygatewayg01-ftpendpoint",
        testFile: "ftp_endpoint.jmx",
    },
    {
        code: "EMAIL",
        folder: config.folders.EMAIL,
        server: "uu_energygatewayg01_emailendpoint-server",
        port: 8096,
        webname: "uu-energygatewayg01-emailendpoint",
        testFile: "email_endpoint.jmx",
    },
    { code: "ECP", folder: config.folders.ECP, server: "uu_energygatewayg01_ecpendpoint-server", port: 8097, webname: "uu-energygatewayg01-ecpendpoint" },
];

const [DG, MR, FTP, EMAIL, ECP] = projects;

/**
 *
 * @param {IProject} project
 */
async function buildProject(project, isUnitTests) {
    if (await killProject(project)) {
        console.log("Killed running app");
    }
    if (project.code === "MR") {
        console.log("npm i");
        await core.inLocationAsync(project.folder + "/" + MR.hi, async () => {
            await core.runCommand("cmd /C npm i");
        });
    }

    await core.inLocationAsync(project.folder, async () => {
        let command = `cmd /C gradlew clean build`;
        if (!isUnitTests) {
            command += " -x test";
        }
        await core.runCommand(command);

        if (project.code === "MR") {
            fs.copyFileSync(MR.hi + "/env/tests-uu5-environment.json", MR.server + "/public/uu5-environment.json");
        }
    });
}

function getNormalizedString(file) {
    const data = fs.readFileSync(file, { encoding: "utf-8" }).toString();
    return data.replace(/\s+/g, "");
}

/**
 * @param {IProject} project
 */
async function generateModel(project) {
    await core.inLocationAsync(`${project.folder}/${project.server}/src/main/resources/config`, async () => {
        const tempFile = "metamodel-1.0.new.json";
        fs.copyFileSync("metamodel-1.0.json", tempFile);
        const code = await core.runCommand(
            "metamodel-generatorg01.cmd -p profiles.json -m metamodel-1.0.new.json --mandatory-profiles Authorities Executives Auditors"
        );
        if (code.stdOut.indexOf("Profiles are not same !!!") > -1) {
            fs.unlinkSync(tempFile);
            core.showError("Error during metamodel");
        }
        const data = core.readTextFile(tempFile).replace(/uu-energygateway.*?\//g, "");
        core.writeTextFile(tempFile, data);
        if (getNormalizedString("metamodel-1.0.json") === getNormalizedString(tempFile)) {
            fs.unlinkSync(tempFile);
        } else {
            core.showMessage("Metamodel changed for " + project.code);
            fs.renameSync(tempFile, "metamodel-1.0.json");
        }
    });
}

/**
 * @param {IProject} project
 */
function getProjectVersion(project) {
    const versions = {};
    core.inLocation(project.folder, () => {
        versions["uuapp.json"] = JSON.parse(core.readTextFile("uuapp.json")).version;
        versions["build.gradle"] = core.readTextFile("build.gradle").match(/version '(\S+)'/)[1];
        versions["uucloud-development.json"] = JSON.parse(core.readTextFile(project.server + "/config/uucloud-development.json")).uuSubApp.version;
        if (fs.existsSync(project.server + "/src/main/resources/config/metamodel-1.0.json")) {
            versions["metamodel-1.0.json"] = JSON.parse(core.readTextFile(project.server + "/src/main/resources/config/metamodel-1.0.json")).version.replace(
                "-beta",
                "-SNAPSHOT"
            );
        }
        if (fs.existsSync(MR.hi + "/package.json")) {
            versions["package.json"] = JSON.parse(core.readTextFile(MR.hi + "/package.json")).version;
        }
    });
    const uniqueVersions = Object.values(versions).filter((value, index, self) => self.indexOf(value) == index);
    if (uniqueVersions.length === 1) {
        return uniqueVersions[0];
    } else {
        return versions;
    }
}

/**
 * @param {IProject} project
 * @param {string} newVersion
 */
function setProjectVersion(project, newVersion) {
    core.inLocation(project.folder, () => {
        let json = JSON.parse(core.readTextFile("uuapp.json"));
        json.version = newVersion;
        core.writeTextFile("uuapp.json", JSON.stringify(json, null, 2));

        json = JSON.parse(core.readTextFile(project.server + "/config/uucloud-development.json"));
        json.uuSubApp.version = newVersion;
        core.writeTextFile(project.server + "/config/uucloud-development.json", JSON.stringify(json, null, 2));

        if (fs.existsSync(project.server + "/src/main/resources/config/metamodel-1.0.json")) {
            json = JSON.parse(core.readTextFile(project.server + "/src/main/resources/config/metamodel-1.0.json"));
            json.version = newVersion.replace("SNAPSHOT", "beta");
            core.writeTextFile(project.server + "/src/main/resources/config/metamodel-1.0.json", JSON.stringify(json, null, 2));
        }
        let content = core.readTextFile("build.gradle");
        content = content.replace(/version '.*'/, `version '${newVersion}'`);
        core.writeTextFile("build.gradle", content);

        if (fs.existsSync(MR.hi + "/package.json")) {
            json = JSON.parse(core.readTextFile(MR.hi + "/package.json"));
            json.version = newVersion;
            core.writeTextFile(MR.hi + "/package.json", JSON.stringify(json, null, 2));
        }
    });
}

function printProjectsVersions(cmd) {
    if (cmd.getVersions) {
        console.log("Actual versions");
    } else {
        core.showMessage("Actual versions");
    }
    const projectVersions = {};
    for (const project of projects) {
        if (fs.existsSync(project.folder)) {
            projectVersions[project.code] = getProjectVersion(project);
        }
    }
    const uniqueVersions = Object.values(projectVersions).filter((value, index, self) => self.indexOf(value) == index);
    if (uniqueVersions.length === 1) {
        console.log("All:", uniqueVersions[0]);
    } else {
        for (const project of projects) {
            console.log(project.code + ":", projectVersions[project.code]);
        }
    }
}

function setProjectsVersions(newVersion) {
    for (const project of projects) {
        if (fs.existsSync(project.folder)) {
            setProjectVersion(project, newVersion);
        }
    }
}

async function waitForApplicationIsReady(project) {
    const seconds = 180;
    const url = `http://localhost:${project.port}/${project.webname}/00000000000000000000000000000001/sys/getHealth`;
    for (let counter = seconds; counter > 0; counter -= 2) {
        try {
            await requestAsync(url, { json: true });
            if (counter != seconds) {
                console.log("...ready!");
            }
            return;
        } catch (err) {
            // Do not care
        }
        if (counter == seconds) {
            console.log("Pinging url " + url);
        }
        console.log("Web is not ready, waiting... " + counter + " seconds left");
        await core.delay(2000);
    }
    core.showError("Application is not ready");
}

/**
 *
 * @param {IProject} project
 * @param {string} yourUid
 */
async function runInitCommands(project, yourUid, envFolder) {
    await waitForApplicationIsReady(project);

    const projectCode = project.code;
    const initFile = projectCode === "DG" ? "init-tests_DG.jmx" : "init-tests.jmx";
    const resultsFile = "jmeter/logs/initResults" + projectCode + ".csv";
    const logFile = "jmeter/logs/initLogs" + projectCode + ".log";
    fs.existsSync(resultsFile) && fs.unlinkSync(resultsFile);
    fs.existsSync(logFile) && fs.unlinkSync(logFile);
    const { stdOut } = await core.runCommand("docker", [
        "run",
        "--rm",
        "--name",
        "egw-run-init",
        "-v",
        process.cwd() + ":/jmeter",
        "-v",
        envFolder + ":/envs",
        "--network=egw-tests_default",
        "egaillardon/jmeter-plugins",
        ...(
            "-n -t jmeter/" +
            initFile +
            " -l " +
            resultsFile +
            " -j " +
            logFile +
            " -Jhost=host.docker.internal -Jenv=env_localhost_builder.cfg -Jenv_dir=/envs -Juid=" +
            yourUid
        ).split(" "),
    ]);
    if (stdOut.match(/Err:\s+[1-9]/g)) {
        core.showError(`Init commands of ${projectCode} failed`);
    }
}

async function runInitCommandsAsyncJob(envFolder) {
    const initFile = "init-tests_ASYNC_JOB.jmx";
    const resultsFile = "jmeter/logs/initResultsASYNC.csv";
    const logFile = "jmeter/logs/initLogsASYNC.log";
    fs.existsSync(resultsFile) && fs.unlinkSync(resultsFile);
    fs.existsSync(logFile) && fs.unlinkSync(logFile);
    const { stdOut } = await core.runCommand("docker", [
        "run",
        "--rm",
        "--name",
        "egw-run-init",
        "-v",
        process.cwd() + ":/jmeter",
        "-v",
        envFolder + ":/envs",
        "--network=egw-tests_default",
        "egaillardon/jmeter-plugins",
        ...`-n -t jmeter/${initFile} -l ${resultsFile} -j ${logFile} -Jhost=host.docker.internal -Jenv=env_localhost_builder.cfg -Jenv_dir=/envs`.split(" "),
    ]);
    if (stdOut.match(/Err:\s+[1-9]/g)) {
        core.showError(`Init commands of ASYNC failed`);
    }
}

/**
 * @param {IProject} project
 */
async function killProject(project) {
    const processId = await core.getProcessIdByPort(project.port);
    if (!processId) {
        //console.log(`Application ${project.code} is not running. Nothing to kill, maybe tomorrow.`);
        return false;
    }
    const res = await core.runCommand(
        "wmic",
        ["process", "where", "Name='java.exe' or Name='cmd.exe' or Name='conhost.exe'", "Get", "ProcessId,ParentProcessId"],
        { disableStdOut: true }
    );
    const lines = res.stdOut.split(/[\r\n]+/);
    const colNames = lines[0].trim().split(/\s+/);
    if (colNames[0] !== "ParentProcessId") {
        core.showError("Sorry, wrong columns", false);
    }
    const parentIds = {};
    lines.forEach((line) => {
        const [parentId, processId] = line.trim().split(/\s+/);
        parentIds[processId] = parentId;
    });
    let topProcessId = processId;
    while (parentIds[parentIds[topProcessId]]) {
        topProcessId = parentIds[topProcessId];
    }
    console.log(`Killing process tree ${processId}.`);
    await core.runCommand(`taskkill /F /T /PID ${topProcessId}`);
    return true;
}

async function stopComposer() {
    try {
        await core.runCommand("docker-compose down");
    } catch (e) {
        // Errors ignored
    }
}

async function cleanDockers() {
    const { stdOut } = await core.runCommand("docker container ls -a --filter name=egw-tests_mongo");
    const containerIds = stdOut
        .split("\n")
        .slice(1) // remove header
        .map((l) => l.split(" ")[0]) // take id
        .filter((id) => id.length > 10); // remove empty line
    for (const id of containerIds) {
        console.log("Stop docker ...");
        await core.runCommand("docker container stop " + id);
        console.log("Remove docker ...");
        await core.runCommand("docker container rm " + id);
    }
    await core.runCommand("docker system prune --volumes -f");
}

/**
 * @param {IProject} project
 * @param {string} testFile
 */
async function runTests(project, testFile, isVersion11) {
    await waitForApplicationIsReady(project);

    const resultsFile = "logs/testResults" + project.code + ".csv";
    const logFile = "logs/testLogs" + project.code + ".log";
    fs.existsSync(resultsFile) && fs.unlinkSync(resultsFile);
    fs.existsSync(logFile) && fs.unlinkSync(logFile);
    const ftpDataDir = path.resolve(process.cwd() + "/../../../../../" + FTP.folder + "/docker/egw-tests/data");
    if (!fs.existsSync(ftpDataDir)) {
        core.showError(ftpDataDir + " does not exists");
    }
    let restStr = "-n -t " + testFile + " -l " + resultsFile + " -j " + logFile + " ";
    restStr += isVersion11 ? "-Jhost=host.docker.internal" : "-Jenv=env_localhost_builder.cfg";
    const rest = restStr.split(" ");
    if (project == FTP) {
        rest.push("-Jftp_data_dir=/ftpdata");
    }
    if (project == EMAIL) {
        rest.push("-Jsmtp_host=smtp");
        rest.push("-Jsmtp_port=80");
    }
    await core.runCommand("docker", [
        "run",
        "--rm",
        "--name",
        "egw-run-test",
        "-v",
        process.cwd() + ":/jmeter",
        "-v",
        ftpDataDir + ":/ftpdata",
        "--network=egw-tests_default",
        "egaillardon/jmeter-plugins",
        ...rest,
    ]);
    const steps = parseCsv(core.readTextFile(resultsFile)).slice(1);
    const knownFailed = steps.filter((step) => step[7] !== "true" && step[2].match(/\sT[0-9]+$/));
    const newFailed = steps.filter((step) => step[7] !== "true" && !step[2].match(/\sT[0-9]+$/));
    const newPassed = steps.filter((step) => step[7] === "true" && step[2].match(/\sT[0-9]+$/));
    return { newFailed, newPassed, knownFailed };
}

async function run() {
    try {
        let cmd = new CommandLine(process.argv.slice(2));
        if (process.argv.length == 2) {
            core.showMessage("Syntaxe");
            console.log(process.argv.join(" ") + " [OPTIONS]");
            console.log("Options:");
            console.log("  -folder <name>       - Name of folder where all projects are stored, mandatory.");
            console.log("  -last                - Execute with settings from previous run.");
            console.log("");
            console.log("  -version <ver>       - Version to be stored in build.gradle, uucloud-developmnet.json, ...etc.");
            console.log("  -clear               - Shutdown and remove docker containers.");
            console.log("  -unitTests           - Build or run with unit tests. Option -build or -run* muset be used.");
            console.log("  -metamodel           - Regenerates metamodel for Business Territory.");
            console.log("");
            console.log("  -build               - Builds all apps by gradle");
            console.log("  -buildDG             - Builds Datagateway");
            console.log("  -buildMR             - Builds Message Registry");
            console.log("  -buildFTP            - Builds FTP endpoint");
            console.log("  -buildEMAIL          - Builds E-mail endpoint");
            console.log("  -buildECP            - Builds ECP endpoint");
            console.log("");
            console.log("  -run                 - Runs all subApps");
            console.log("  -runDG               - Runs Datagateway");
            console.log("  -runMR               - Runs Message Registry");
            console.log("  -runFTP              - Runs FTP endpoint");
            console.log("  -runEMAIL            - Runs E-mail endpoint");
            console.log("  -runECP              - Runs ECP endpoint");
            console.log("");
            console.log("  -init <your-uid>     - Runs init commands of all apps (creates workspace, sets permissions)");
            console.log("  -initDG              - Runs init commands of Datagateway");
            console.log("  -initMR <your-uid>   - Runs init commands of Message Registry");
            console.log("  -initFTP             - Runs init commands of FTP endpoint");
            console.log("  -initEMAIL           - Runs init commands of E-mail endpoint");
            console.log("  -initECP             - Runs init commands of ECP endpoint");
            console.log("  -initASYNC           - Runs init commands of AsyncJob server");
            console.log("");
            console.log("  -test                - Tests all subApps by jmeter");
            console.log("  -testDG              - Tests Datagateway by jmeter");
            console.log("  -testMR              - Tests Message Registry by jmeter");
            console.log("  -testFTP             - Tests FTP endpoint by jmeter");
            console.log("  -testEMAIL           - Tests E-mail endpoint by jmeter");
            console.log("");
            console.log("You will be asked interactively if there is none of option (expcept folder) used on command line.");
        }

        if (cmd.last) {
            cmd = last.loadSettings();
        }

        if (!cmd.folder) {
            cmd.folder = prompt("Folder: ");
        }
        if (!cmd.folder) {
            core.showError("Terminated by user");
        }
        cmd.folder = path.resolve(cmd.folder);
        if (cmd.enableConsole) {
            core.showMessage(`Using folder ${cmd.folder}`);
        }
        process.chdir(cmd.folder);
        const isVersion11 = !fs.existsSync(`${MR.folder}/${MR.server}/src/test/jmeter/env_localhost.cfg`);
        if (isVersion11 && cmd.enableConsole) {
            core.showMessage("This is 1.1.* version, apps will be restarted after init.");
        }

        const runableProjects = [DG, MR, FTP, EMAIL, ECP];

        if (cmd.interactively || cmd.getVersions) {
            printProjectsVersions(cmd);
            if (cmd.getVersions) {
                return;
            }
        }
        if (cmd.getInfo) {
            info.getInfo(projects);
            return;
        }
        // console.log(cmd);
        // console.log(cmd.version);

        cmd.version = cmd.interactively ? prompt("Set version [enter = no change]: ") : cmd.version;
        if (!cmd.interactively) {
            if (cmd.version) {
                console.log("Set version to " + cmd.version);
            } else {
                console.log("Set version? no");
            }
        }
        if (cmd.version === null) {
            core.showError("Terminated by user");
        }

        cmd.getCmdValue("clear", "Clear docker?");
        cmd.getCmdValue("metamodel", "Generate metamodel?");

        // Build
        const isBuild = cmd.interactively
            ? cmd.getCmdValue("build", "Build app?")
            : cmd.buildDG || cmd.buildMR || cmd.buildFTP || cmd.buildEMAIL || cmd.buildECP;
        if (!isBuild && !cmd.interactively) {
            console.log("Build app? no");
        }
        if (isBuild) {
            console.log("Which app to build?");
        }
        const isBuildPerProject = {};
        for (const project of projects) {
            isBuildPerProject[project.code] = isBuild && cmd.getCmdValue("build" + project.code, "... " + project.code + "?");
        }
        cmd.unitTests = isBuild && cmd.getCmdValue("unitTests", "Build or run with unit tests?");

        // Runs
        const isRun = cmd.interactively ? cmd.getCmdValue("run", "Run app?") : cmd.runDG || cmd.runMR || cmd.runFTP || cmd.runEMAIL || cmd.runECP;
        if (!isRun && !cmd.interactively) {
            console.log("Run app? no");
        }
        if (isRun) {
            console.log("Which app to run?");
        }
        const isRunPerProject = {};
        for (const project of runableProjects) {
            isRunPerProject[project.code] = isRun && cmd.getCmdValue("run" + project.code, "... " + project.code + "?");
        }

        // Inits
        const isRunInit = cmd.interactively
            ? cmd.getCmdValue("init", "Run init app?")
            : cmd.initDG || cmd.initMR || cmd.initFTP || cmd.initEMAIL || cmd.initECP || cmd.initASYNC;
        if (!isRunInit && !cmd.interactively) {
            console.log("Run init app? no");
        }
        if (isRunInit) {
            console.log("Which init?");
        }
        const isInitPerProject = {};
        for (const project of runableProjects) {
            isInitPerProject[project.code] = isRunInit && cmd.getCmdValue("init" + project.code, "... " + project.code + "?");
        }
        isInitPerProject.ASYNC = isRunInit && cmd.getCmdValue("initASYNC", "... AsyncJob server?");

        if (isInitPerProject["MR"]) {
            if (cmd.uid) {
                console.log("Your OID: " + cmd.uid);
            }
            cmd.uid = cmd.uid || prompt("Your UID: ");
            if (!cmd.uid) {
                core.showError("Terminated by user");
            }
        }

        // Tests
        const isTests = cmd.interactively ? cmd.getCmdValue("tests", "Run tests?") : cmd.testDG || cmd.testMR || cmd.testFTP || cmd.testEMAIL;
        if (!isTests && !cmd.interactively) {
            console.log("Run tests? no");
        }
        if (isTests) {
            console.log("Which tests?");
        }
        const isTestsDG = !isVersion11 && isTests && cmd.getCmdValue("testDG", "... DG?");
        const isTestsMR = isTests && cmd.getCmdValue("testMR", "... MR?");
        const isTestsFTP = isTests && cmd.getCmdValue("testFTP", "... FTP?");
        const isTestsEMAIL = isTests && cmd.getCmdValue("testEMAIL", "... EMAIL?");

        if (!cmd.last) {
            last.saveSettings(cmd);
        }

        if (cmd.version && cmd.version.match(/^\d/)) {
            setProjectsVersions(cmd.version);
        }

        if (cmd.clear) {
            core.showMessage("Clearing docker...");
            for (const project of runableProjects) {
                if (fs.existsSync(project.folder + "/docker/egw-tests/docker-compose.yml")) {
                    await core.inLocationAsync(`${project.folder}/docker/egw-tests`, stopComposer);
                }
                if (project.code == "DG") {
                    await cleanDockers();
                }
            }
        }
        if (isBuild || isRun) {
            core.showMessage("Starting docker...");
            for (const project of runableProjects) {
                if (fs.existsSync(project.folder + "/docker/egw-tests/docker-compose.yml")) {
                    await core.inLocationAsync(`${project.folder}/docker/egw-tests`, async () => await core.runCommand("docker-compose up -d"));
                }
            }
        }

        if (cmd.metamodel) {
            core.showMessage("Generating metamodel...");
            for (const project of projects) {
                if (fs.existsSync(project.folder)) {
                    await generateModel(project);
                }
            }
        }

        if (isBuild) {
            core.showMessage("Building apps...");
            for (const project of projects) {
                if (isBuildPerProject[project.code]) {
                    core.showMessage(`Building ${project.code} ...`);
                    await buildProject(project, cmd.unitTests);
                    core.showMessage(`${project.code} - build ok`);
                }
            }
        }

        if (isRun) {
            core.showMessage("Starting apps...");
            for (const project of runableProjects) {
                if (isRunPerProject[project.code]) {
                    core.showMessage("Starting " + project.code);
                    if (await killProject(project)) {
                        console.log("Killed previous");
                    }
                    core.inLocation(project.folder, () => {
                        let command = `start "${project.code}" /MIN ${builderDir}\\coloredGradle ${builderDir} ${project.code} ${path.join(
                            cmd.folder,
                            "log-" + project.code + ".log"
                        )}`;
                        // If build is present, unit tests are executed by it
                        if (!cmd.unitTests || isBuild) {
                            command += " -x test";
                        }
                        core.runCommandNoWait(command);
                    });
                }
                await core.delay(1000);
            }
        }
        if (isRunInit) {
            core.showMessage("Starting inits...");
            if (isInitPerProject.ASYNC) {
                core.showMessage("Init AsyncJob");
                // Folder mapped to docker must contain also insomnia-workspace, thus we are in upper folder
                await core.inLocationAsync(`${DG.folder}/${DG.server}/src/test/`, async () => {
                    await runInitCommandsAsyncJob(`${cmd.folder}/${MR.folder}/${MR.server}/src/test/jmeter`);
                });
            }
            for (const project of runableProjects) {
                if (isInitPerProject[project.code]) {
                    core.showMessage("Init " + project.code);
                    // Folder mapped to docker must contain also insomnia-workspace, thus we are in upper folder
                    await core.inLocationAsync(`${project.folder}/${project.server}/src/test/`, async () => {
                        await runInitCommands(project, cmd.uid, `${cmd.folder}/${MR.folder}/${MR.server}/src/test/jmeter`);
                    });
                }
            }
            if (isVersion11) {
                core.showMessage("Killing apps...");
                const killedApps = [];
                for (const project of [FTP, EMAIL, ECP]) {
                    if (isInitPerProject[project.code]) {
                        core.showMessage(`Killing ${project.code}`);
                        if (await killProject(project)) {
                            killedApps.push(project);
                        }
                    }
                }
                if (killedApps.length) {
                    core.showMessage("Starting killed apps again...");
                    for (const project of killedApps) {
                        core.showMessage(`Starting ${project.code}`);
                        core.inLocation(project.folder, () => {
                            let command = `start "${project.code}" /MIN gradlew start`;
                            // If build or run is present, unit tests are executed by it
                            if (!cmd.unitTests || isBuild || isRun) {
                                command += " -x test";
                            }
                            core.runCommandNoWait(command);
                        });
                        await core.delay(1000);
                    }
                }
            }
        }

        if (isTests) {
            core.showMessage("Starting tests...");
            await core.inLocationAsync(`${MR.folder}/${MR.server}/src/test/jmeter/`, async () => {
                const knownFailed = {};
                const newFailed = {};
                const newPassed = {};
                for (const project of [isTestsDG ? DG : null, isTestsMR ? MR : null, isTestsFTP ? FTP : null, isTestsEMAIL ? EMAIL : null]) {
                    if (project) {
                        core.showMessage(`Testing ${project.code}`);
                        const report = await runTests(project, project.testFile, isVersion11);
                        if (report.newFailed.length) {
                            newFailed[project.code] = report.newFailed.map((step) => step[2]);
                        }
                        if (report.newPassed.length) {
                            newPassed[project.code] = report.newPassed.map((step) => step[2]);
                        }
                        if (report.knownFailed.length) {
                            knownFailed[project.code] = report.knownFailed.map((step) => step[2]);
                        }
                    }
                }

                if (Object.keys(newPassed).length) {
                    core.showMessage("There are tests marked as failed, but already passed. Remove task code from test name.");
                    console.log(newPassed);
                }
                if (Object.keys(newFailed).length) {
                    core.showMessage("There are failed tests. Create task in Sprintman and add code at end of test name. E.g. 'some test - T123'.");
                    console.log(newFailed);
                }
                if (Object.keys(newFailed).length || Object.keys(newPassed).length) {
                    core.showError("Tests failed. Watch message above.");
                }
                if (!Object.keys(newFailed).length && !Object.keys(newPassed).length) {
                    core.showSuccess("All tests passed as expected.");
                    core.showSuccess("");
                    core.showSuccess("            ████                ");
                    core.showSuccess("          ███ ██                ");
                    core.showSuccess("          ██   █                ");
                    core.showSuccess("          ██   ██               ");
                    core.showSuccess("           ██   ███             ");
                    core.showSuccess("            ██    ██            ");
                    core.showSuccess("            ██     ███          ");
                    core.showSuccess("             ██      ██         ");
                    core.showSuccess("        ███████       ██        ");
                    core.showSuccess("     █████              ███ ██  ");
                    core.showSuccess("    ██     ████          ██████ ");
                    core.showSuccess("    ██  ████  ███             ██");
                    core.showSuccess("    ██        ███             ██");
                    core.showSuccess("     ██████████ ███           ██");
                    core.showSuccess("     ██        ████           ██");
                    core.showSuccess("     ███████████  ██          ██");
                    core.showSuccess("       ██       ████     ██████ ");
                    core.showSuccess("       ██████████ ██    ███ ██  ");
                    core.showSuccess("          ██     ████ ███       ");
                    core.showSuccess("          █████████████         ");
                    core.showSuccess("");
                }
                if (Object.keys(knownFailed).length) {
                    core.showWarning(`Some tests are marked as failed in ${Object.keys(knownFailed).join(", ")}.`);
                }
            });
        }

        core.showMessage("DONE");
    } catch (err) {
        core.showError(err);
    }
}

run();
