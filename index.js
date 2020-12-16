const prompt = require("prompt-sync")();
const core = require("./core");
const path = require("path");
const fs = require("fs");
const parseCsv = require("csv-parse/lib/sync");
const request = require("request");
const util = require("util");
const requestAsync = util.promisify(request);
const CommandLine = require("./command-line");

let config = require("./config.default");
const { showError } = require("./core");
if (fs.existsSync("./config.js")) {
    config = require("./config");
}

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
    { code: "DG", folder: config.folders.DG, server: "uu_energygateway_datagatewayg01-server", port: 8094, webname: "uu-energygateway-datagatewayg01" },
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
const runableProjects = [DG, MR, FTP, EMAIL, ECP];

/**
 *
 * @param {IProject} project
 */
async function buildProject(project) {
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
        await core.runCommand("gradle build -x test");
        if (project.code === "MR") {
            fs.copyFileSync(MR.hi + "/env/tests-uu5-environment.json", MR.server + "/public/uu5-environment.json");
        }
    });

    core.showMessage(`${project.code} - ok`);
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
        await core.runCommand("metamodel-generatorg01.cmd -p profiles.json -m metamodel-1.0.new.json --mandatory-profiles Authorities Executives Auditors");
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
function printProjectVersion(project) {
    core.inLocation(project.folder, () => {
        const versions = {};
        versions["uuapp.json"] = JSON.parse(core.readTextFile("uuapp.json")).version;
        versions["build.gradle"] = core.readTextFile("build.gradle").match(/version '(\S+)'/)[1];
        versions["uucloud-development.json"] = JSON.parse(core.readTextFile(project.server + "/config/uucloud-development.json")).uuSubApp.version;
        versions["metamodel-1.0.json"] = JSON.parse(core.readTextFile(project.server + "/src/main/resources/config/metamodel-1.0.json")).version;
        if (fs.existsSync(MR.hi + "/package.json")) {
            versions["package.json"] = JSON.parse(core.readTextFile(MR.hi + "/package.json")).version;
        }
        const uniqueVersions = Object.values(versions).filter((value, index, self) => self.indexOf(value) == index);
        if (uniqueVersions.length === 1) {
            console.log(project.code + ":", uniqueVersions[0]);
        } else {
            console.log(project.code + ":", versions);
        }
    });
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

        json = JSON.parse(core.readTextFile(project.server + "/src/main/resources/config/metamodel-1.0.json"));
        json.version = newVersion.replace("SNAPSHOT", "beta");
        core.writeTextFile(project.server + "/src/main/resources/config/metamodel-1.0.json", JSON.stringify(json, null, 2));

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

function printProjectsVersions() {
    core.showMessage("Actual versions");
    for (const project of projects) {
        printProjectVersion(project);
    }
}

function setProjectsVersions(newVersion) {
    for (const project of projects) {
        setProjectVersion(project, newVersion);
    }
}

async function waitForApplicationIsReady(project) {
    const seconds = 120;
    const url = `http://localhost:${project.port}/${project.webname}/00000000000000000000000000000000-11111111111111111111111111111111/ignoreThisRequest`;
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
async function runInitCommands(project, yourUid) {
    await waitForApplicationIsReady(project);

    const projectCode = project.code;
    const initFile = projectCode === "DG" ? "init-tests_DG.jmx" : "init-tests.jmx";
    const { stdOut } = await core.runCommand("docker", [
        "run",
        "--rm",
        "-v",
        process.cwd() + ":/jmeter",
        "egaillardon/jmeter-plugins",
        ...("-n -t jmeter/" + initFile + " -l jmeter/logs/results" + projectCode + ".csv -j jmeter/logs/logs" + projectCode + ".log -Juid=" + yourUid).split(
            " "
        ),
    ]);
    if (stdOut.match(/Err:\s+[1-9]/g)) {
        core.showError(`Init commands of ${projectCode} failed`);
    }
}

/**
 * @param {IProject} project
 */
async function killProject(project) {
    const processId = await core.getProcessIdByPort(project.port);
    if (!processId) {
        console.log(`Application ${project.code} is not running. Nothing to kill, maybe tomorrow.`);
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

/**
 * @param {IProject} project
 * @param {string} testFile
 */
async function runTests(project, testFile) {
    await waitForApplicationIsReady(project);

    const resultsFile = "logs/results" + project.code + ".csv";
    const logFile = "logs/logs" + project.code + ".log";
    fs.existsSync(resultsFile) && fs.unlinkSync(resultsFile);
    fs.existsSync(logFile) && fs.unlinkSync(logFile);
    const ftpDataDir = path.resolve(process.cwd() + "/../../../../../" + FTP.folder + "/docker/egw-tests/data");
    if (!fs.existsSync(ftpDataDir)) {
        core.showError(ftpDataDir + " does not exists");
    }
    const rest = ("-n -t " + testFile + " -l " + resultsFile + " -j " + logFile + " -Jhost=host.docker.internal").split(" ");
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
        const cmd = new CommandLine(process.argv.slice(2));
        if (process.argv.length == 2) {
            core.showMessage("Syntaxe");
            console.log(process.argv.join(" ") + " [OPTIONS]");
            console.log("Options:");
            console.log("  -folder <name>       - Name of folder where all projects are stored, mandatory.");
            console.log("  -version <ver>       - Version to be stored in build.gradle, uucloud-developmnet.json, ...etc.");
            console.log("  -clear               - Shutdown and remove docker containers.");
            console.log("  -build               - Builds apps by gradle.");
            console.log("  -metamodel           - Regenerates metamodel for Business Territory.");
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
            console.log("");
            console.log("  -test                - Tests all subApps by jmeter");
            console.log("  -testMR              - Tests Message Registry by jmeter");
            console.log("  -testFTP             - Tests FTP endpoint by jmeter");
            console.log("  -testEMAIL           - Tests E-mail endpoint by jmeter");
            console.log("");
            console.log("You will be asked interactively if there is none of option (expcept folder) used on command line.");
        }

        let folder = cmd.folder;

        if (!folder) {
            folder = prompt("Folder: ");
        }
        if (!folder) {
            core.showError("Terminated by user");
        }
        core.showMessage(`Using folder ${folder}`);
        process.chdir(folder);
        if (cmd.interactively) {
            printProjectsVersions();
        }
        // console.log(cmd);
        // console.log(cmd.version);

        const newVersion = cmd.interactively ? prompt("Set version [enter = no change]: ") : cmd.version;
        if (!cmd.interactively) {
            if (cmd.version) {
                console.log("Set version to " + cmd.version);
            } else {
                console.log("Set version? no");
            }
        }
        if (newVersion === null) {
            core.showError("Terminated by user");
        }

        const isClearDocker = cmd.getCmdValue("clear", "Clear docker?");
        const isBuild = cmd.getCmdValue("build", "Build?");
        const isModel = cmd.getCmdValue("metamodel", "Generate metamodel?");

        // Runs
        const isRun = cmd.interactively ? cmd.getCmdValue("run", "Run app?") : cmd.runDG || cmd.runMR || cmd.runFTP || cmd.runEMAIL || cmd.runECP;
        if (!isRun && !cmd.interactively) {
            console.log("Run app? no");
        }
        if (isRun) {
            console.log("Which app?");
        }
        const isRunPerProject = {};
        for (const project of runableProjects) {
            isRunPerProject[project.code] = isRun && cmd.getCmdValue("run" + project.code, "... " + project.code + "?");
        }

        // Inits
        const isRunInit = cmd.interactively
            ? cmd.getCmdValue("init", "Run init app?")
            : cmd.initDG || cmd.initMR || cmd.initFTP || cmd.initEMAIL || cmd.initECP;
        if (!isRunInit && !cmd.interactively) {
            console.log("Run app? no");
        }
        if (isRunInit) {
            console.log("Which app?");
        }
        const isInitPerProject = {};
        for (const project of runableProjects) {
            isInitPerProject[project.code] = isRunInit && cmd.getCmdValue("init" + project.code, "... " + project.code + "?");
        }

        let yourUid = "";
        if (isInitPerProject["MR"]) {
            if (cmd.uid) {
                console.log("Your OID: " + cmd.uid);
            }
            yourUid = cmd.uid || prompt("Your UID: ");
            if (!yourUid) {
                core.showError("Terminated by user");
            }
        }

        // Tests
        const isTests = cmd.interactively ? cmd.getCmdValue("tests", "Run tests?") : cmd.testMR || cmd.testFTP || cmd.testEMAIL;
        if (!isTests && !cmd.interactively) {
            console.log("Run tests? no");
        }
        if (isTests) {
            console.log("Which tests?");
        }
        const isTestsMR = isTests && cmd.getCmdValue("testMR", "... MR?");
        const isTestsFTP = isTests && cmd.getCmdValue("testFTP", "... FTP?");
        const isTestsEMAIL = isTests && cmd.getCmdValue("testEMAIL", "... EMAIL?");
        if (newVersion && newVersion.match(/^\d/)) {
            setProjectsVersions(newVersion);
        }

        if (isClearDocker) {
            core.showMessage("Clearing docker...");
            for (const project of runableProjects) {
                if (fs.existsSync(project.folder + "/docker/egw-tests/docker-compose.yml")) {
                    await core.inLocationAsync(project.folder + "/docker/egw-tests", stopComposer);
                }
            }
        }
        if (isBuild || isRun) {
            core.showMessage("Starting docker...");
            for (const project of runableProjects) {
                if (fs.existsSync(project.folder + "/docker/egw-tests/docker-compose.yml")) {
                    await core.inLocationAsync(project.folder + "/docker/egw-tests", async () => await core.runCommand("docker-compose up -d"));
                }
            }
        }

        for (const project of projects) {
            if (isBuild) {
                await buildProject(project);
            }
            if (isModel) {
                await generateModel(project);
            }
        }

        if (isRun) {
            core.showMessage("Starting apps...");
            for (const project of runableProjects) {
                if (isRunPerProject[project.code]) {
                    core.showMessage("..." + project.code);
                    if (await killProject(project)) {
                        console.log("Killed previous");
                    }
                    core.inLocation(project.folder, () => {
                        core.runCommandNoWait('start "' + project.code + '" /MIN gradlew start -x test');
                    });
                }
                await core.delay(1000);
            }
        }
        if (isRunInit) {
            core.showMessage("Starting inits...");
            for (const project of runableProjects) {
                if (isInitPerProject[project.code]) {
                    core.showMessage("..." + project.code);
                    // Folder mapped to docker must contain also insomnia-workspace, thus we are in upper folder
                    await core.inLocationAsync(project.folder + "/" + project.server + "/src/test/", async () => {
                        await runInitCommands(project, yourUid);
                    });
                }
            }
            core.showMessage("Killing apps...");
            const killedApps = [];
            for (const project of [FTP, EMAIL, ECP]) {
                if (isInitPerProject[project.code]) {
                    core.showMessage("..." + project.code);
                    if (await killProject(project)) {
                        killedApps.push(project);
                    }
                }
            }
            if (killedApps.length) {
                core.showMessage("Starting killed apps again...");
                for (const project of killedApps) {
                    core.showMessage("..." + project.code);
                    core.inLocation(project.folder, () => {
                        core.runCommandNoWait('start "' + project.code + '" /MIN gradlew start -x test');
                    });
                    await core.delay(1000);
                }
            }
        }

        if (isTests) {
            core.showMessage("Starting tests...");
            await core.inLocationAsync(MR.folder + "/" + MR.server + "/src/test/jmeter/", async () => {
                const knownFailed = {};
                const newFailed = {};
                const newPassed = {};
                for (const project of [isTestsMR ? MR : null, isTestsFTP ? FTP : null, isTestsEMAIL ? EMAIL : null]) {
                    if (project) {
                        core.showMessage("..." + project.code);
                        const report = await runTests(project, project.testFile);
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
