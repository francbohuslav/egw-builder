const prompt = require("prompt-sync")();
const core = require("./core");
const path = require("path");
const fs = require("fs");
const fse = require("fs-extra");
const request = require("request");
const util = require("util");
const requestAsync = util.promisify(request);
const CommandLine = require("./command-line");
const results = require("./results");
const last = require("./last");
const metamodel = require("./classes/metamodel");
const tests = require("./classes/tests");

/** @type {{folders: Record<string, string>, JDK: Record<string, string>}} */
let config = require("./config.default");
const info = require("./classes/info");
const messageBroker = require("./classes/message-broker");
const java = require("./classes/java");
const jmeter = require("./classes/jmeter");
const nodeJs = require("./classes/node");
const help = require("./classes/help");
const { assertAndReturn } = require("./classes/utils");

if (fs.existsSync("./config.js")) {
  // @ts-ignore
  config = require("./config");
}
let JDK = "";

const builderDir = __dirname;

/**
 * @type {IProject[]}
 */
const projects = [
  {
    code: "DG",
    folder: config.folders.DG,
    server: "uu_energygateway_datagatewayg01-server",
    port: 8094,
    webName: "uu-energygateway-datagatewayg01",
    testFile: "datagateway.jmx",
    addProfilesFromLibraries: (isVersion11) =>
      isVersion11
        ? {}
        : {
            "uu_energygateway_datagatewayg01-server-lib": "DG",
            "uu_energygateway_datagatewayg01-config": "DG",
            "uu_energygateway_datagatewayg01-business-territory": "DG",
          },
  },
  {
    code: "MR",
    folder: config.folders.MR,
    server: "uu_energygateway_messageregistryg01-server",
    port: 8093,
    webName: "uu-energygateway-messageregistryg01",
    hi: "uu_energygateway_messageregistryg01-hi",
    uu5lib: "uu_energygateway_uu5lib",
    gui: "uu_energygateway_uu5lib/uu_energygateway_guig01",
    testFile: "message-registry.jmx",
    addProfilesFromLibraries: (isVersion11) =>
      isVersion11
        ? {}
        : {
            "uu_energygateway_datagatewayg01-config": "DG",
            "uu_energygateway_datagatewayg01-async": "DG",
            "uu_energygateway_datagatewayg01-business-territory": "DG",
            "uu_energygateway_messageregistryg01-uulib": "MR",
          },
  },
  {
    code: "FTP",
    folder: config.folders.FTP,
    server: "uu_energygatewayg01_ftpendpoint-server",
    port: 8095,
    webName: "uu-energygatewayg01-ftpendpoint",
    testFile: "ftp_endpoint.jmx",
    addProfilesFromLibraries: (isVersion11) =>
      isVersion11
        ? {}
        : {
            "uu_energygateway_datagatewayg01-config": "DG",
            "uu_energygateway_datagatewayg01-endpoint": "DG",
            "uu_energygateway_datagatewayg01-async": "DG",
            "uu_energygateway_datagatewayg01-business-territory": "DG",
            "uu_energygateway_ftpendpointg01-uulib": "FTP",
          },
  },
  {
    code: "EMAIL",
    folder: config.folders.EMAIL,
    server: "uu_energygatewayg01_emailendpoint-server",
    port: 8096,
    webName: "uu-energygatewayg01-emailendpoint",
    testFile: "email_endpoint.jmx",
    addProfilesFromLibraries: (isVersion11) =>
      isVersion11
        ? {}
        : {
            "uu_energygateway_datagatewayg01-config": "DG",
            "uu_energygateway_datagatewayg01-endpoint": "DG",
            "uu_energygateway_datagatewayg01-async": "DG",
            "uu_energygateway_datagatewayg01-business-territory": "DG",
            "uu_energygateway_emailendpointg01-uulib": "EMAIL",
          },
  },
  {
    code: "ECP",
    folder: config.folders.ECP,
    server: "uu_energygatewayg01_ecpendpoint-server",
    port: 8097,
    webName: "uu-energygatewayg01-ecpendpoint",
    testFile: "ecp_endpoint.jmx",
    addProfilesFromLibraries: (isVersion11) =>
      isVersion11
        ? {}
        : {
            "uu_energygateway_datagatewayg01-config": "DG",
            "uu_energygateway_datagatewayg01-endpoint": "DG",
            "uu_energygateway_datagatewayg01-business-territory": "DG",
            "uu_energygateway_ecpendpointg01-uulib": "ECP",
          },
  },
  {
    code: "IEC62325",
    folder: config.folders.IEC62325,
    server: "uu_energygateway_iec62325endpointg01-server",
    port: 8098,
    webName: "uu-energygateway-iec62325endpointg01",
    testFile: "iec62325_endpoint.jmx",
    addProfilesFromLibraries: (isVersion11) =>
      isVersion11
        ? {}
        : {
            "uu_energygateway_datagatewayg01-config": "DG",
            "uu_energygateway_datagatewayg01-endpoint": "DG",
            "uu_energygateway_datagatewayg01-business-territory": "DG",
          },
  },
  {
    code: "AS24",
    folder: config.folders.AS24,
    server: "uu_energygateway_as24endpointg01-server",
    port: 8099,
    webName: "uu-energygateway-as24endpointg01",
    testFile: "as24_endpoint.jmx",
    addProfilesFromLibraries: (isVersion11) =>
      isVersion11
        ? {}
        : {
            "uu_energygateway_datagatewayg01-config": "DG",
            "uu_energygateway_datagatewayg01-endpoint": "DG",
            "uu_energygateway_datagatewayg01-business-territory": "DG",
            "uu_energygateway_as2endpoint-uulib": "AS24",
            "uu_energygateway_as4endpoint-uulib": "AS24",
          },
  },
  {
    code: "IEC60870",
    folder: config.folders.IEC60870,
    server: "uu_energygateway_iec60870-5-endpointg01-server",
    port: 8100,
    webName: "uu-energygateway-iec60870endpointg01",
    testFile: "iec60870_endpoint.jmx",
    addProfilesFromLibraries: () => ({
      "uu_energygateway_datagatewayg01-config": "DG",
      "uu_energygateway_datagatewayg01-endpoint": "DG",
      "uu_energygateway_datagatewayg01-business-territory": "DG",
    }),
  },
  {
    code: "ACER",
    folder: config.folders.ACER,
    server: "uu_energygateway_acerendpointg01-server",
    port: 8101,
    webName: "uu-energygateway-acerendpointg01",
    testFile: "acer_endpoint.jmx",
    addProfilesFromLibraries: () => ({
      "uu_energygateway_datagatewayg01-config": "DG",
      "uu_energygateway_datagatewayg01-endpoint": "DG",
      "uu_energygateway_datagatewayg01-business-territory": "DG",
    }),
  },
  {
    code: "KAFKA",
    folder: config.folders.KAFKA,
    server: "uu_energygateway_kafkaendpointg01-server",
    port: 8102,
    webName: "uu-energygateway-kafkaendpointg01",
    testFile: "kafka_endpoint.jmx",
    addProfilesFromLibraries: () => ({
      "uu_energygateway_datagatewayg01-config": "DG",
      "uu_energygateway_datagatewayg01-endpoint": "DG",
      "uu_energygateway_datagatewayg01-business-territory": "DG",
    }),
  },
  {
    code: "MERGED",
    folder: config.folders.MERGED,
    server: "uu_energygateway_mergedg01-server",
    hi: "uu_energygateway_mergedg01-hi",
    port: 8800,
    webName: "uu-energygateway-mergedg01",
  },
];

const [DG, MR, FTP, EMAIL, ECP, IEC62325, AS24, IEC60870, ACER, KAFKA, MERGED] = projects;

/**
 * @param {string | string[]} command
 */
function addJDKtoGradle(command, withQuotes = "") {
  if (JDK) {
    if (typeof command === "string") {
      return `${command} ${withQuotes}-Dorg.gradle.java.home=${JDK}${withQuotes}`;
    }
    command.push(`${withQuotes}-Dorg.gradle.java.home=${JDK}${withQuotes}`);
  }
  return command;
}

/**
 * @param {IProject} project
 * @param {boolean} isUnitTests
 */
async function buildProject(project, isUnitTests) {
  if (await killProject(project)) {
    console.log("Killed running app");
  }
  const buildFronted = true;
  let pathPrefix = "";
  if (buildFronted && project.code === "MR") {
    if (fs.existsSync(project.folder + "/" + MR.gui)) {
      const nodeJsFolder = await nodeJs.detectAndDownload(project.folder + "/" + MR.gui);
      pathPrefix = ` set PATH=${nodeJsFolder};%PATH% &`;
      await core.inLocationAsync(project.folder + "/" + MR.uu5lib, async () => {
        console.log("Install NPM packages for UU5 lib");
        await core.runCommand(`cmd /C${pathPrefix} npm ci`);
      });
      await core.inLocationAsync(project.folder + "/" + MR.gui, async () => {
        // Build of GUI is not necessary for node 18
        if (fs.existsSync(project.folder + "/" + MR.gui + "/package-lock.json")) {
          console.log("Install NPM packages for GUI components");
          await core.runCommand(`cmd /C${pathPrefix} npm ci`);
        }
        console.log("Build GUI components");
        await core.runCommand(`cmd /C${pathPrefix} npm run build`);
      });
    }
    console.log("Install NPM packages for HI");
    await core.inLocationAsync(project.folder + "/" + MR.hi, async () => {
      await core.runCommand(`cmd /C${pathPrefix} npm ci`);
    });
  }

  if (project.code === "MERGED") {
    console.log("Install NPM packages for HI");
    await core.inLocationAsync(project.folder + "/" + MERGED.hi, async () => {
      await core.runCommand(`cmd /C${pathPrefix} npm ci`);
      console.log("Build HI");
      await core.runCommand(`cmd /C${pathPrefix} npm run build`);
    });
  }

  await core.inLocationAsync(project.folder, async () => {
    let args = `/C${pathPrefix} gradlew clean build compileTestJava`;
    if (!isUnitTests) {
      args += " -x test";
    }
    if (!buildFronted && project.code === "MR") {
      args += " -Pno-build-client";
    }
    await core.runCommand("cmd", addJDKtoGradle(args.split(" ")));
    if (project.code === "MR") {
      fs.copyFileSync(MR.hi + "/env/tests-uu5-environment.json", MR.server + "/public/uu5-environment.json");
    }
  });
}

/**
 * @param {IProject} project
 */
function getProjectVersion(project) {
  /** @type {Record<string, string>} */
  const versions = {};
  core.inLocation(project.folder, () => {
    try {
      versions["uuapp.json"] = JSON.parse(core.readTextFile("uuapp.json")).version;
    } catch (ex) {
      versions["uuapp.json"] = "PARSE ERROR:  " + /** @type {Error} */ (ex).message;
    }
    const match = core.readTextFile("build.gradle").match(/version '(\S+)'/);
    if (!match) {
      throw new Error("Cannot find version in build.gradle");
    }
    versions["build.gradle"] = match[1];
    const uuCloudDescriptors = fs.readdirSync(project.server + "/config/").filter((f) => f.startsWith("uucloud"));
    uuCloudDescriptors.forEach((uuCloudDescriptor) => {
      try {
        const json = JSON.parse(core.readTextFile(project.server + "/config/" + uuCloudDescriptor));
        versions[uuCloudDescriptor] = json.uuSubApp?.version ?? json.uuAppBoxDescriptor.version;
      } catch (ex) {
        versions[uuCloudDescriptor] = "PARSE ERROR:  " + /** @type {Error} */ (ex).message;
      }
    });
    if (fs.existsSync(project.server + "/src/main/resources/config/metamodel-1.0.json")) {
      versions["metamodel-1.0.json"] = JSON.parse(core.readTextFile(project.server + "/src/main/resources/config/metamodel-1.0.json")).version.replace(
        "-beta",
        "-SNAPSHOT"
      );
    }
    if (fs.existsSync(project.server + "/src/main/resources/config/metamodel-2.0.json")) {
      versions["metamodel-2.0.json"] = JSON.parse(core.readTextFile(project.server + "/src/main/resources/config/metamodel-2.0.json")).version.replace(
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
    const uuCloudDescriptors = fs.readdirSync(project.server + "/config/").filter((f) => f.startsWith("uucloud"));
    uuCloudDescriptors.forEach((uuCloudDescriptor) => {
      json = JSON.parse(core.readTextFile(project.server + "/config/" + uuCloudDescriptor));
      if (json.uuSubApp) {
        json.uuSubApp.version = newVersion;
      } else {
        json.uuAppBoxDescriptor.version = newVersion;
      }
      core.writeTextFile(project.server + "/config/" + uuCloudDescriptor, JSON.stringify(json, null, 2));
    });
    if (fs.existsSync(project.server + "/src/main/resources/config/metamodel-1.0.json")) {
      json = JSON.parse(core.readTextFile(project.server + "/src/main/resources/config/metamodel-1.0.json"));
      json.version = newVersion.replace("SNAPSHOT", "beta");
      core.writeTextFile(project.server + "/src/main/resources/config/metamodel-1.0.json", JSON.stringify(json, null, 2));
    }
    if (fs.existsSync(project.server + "/src/main/resources/config/metamodel-2.0.json")) {
      json = JSON.parse(core.readTextFile(project.server + "/src/main/resources/config/metamodel-2.0.json"));
      json.version = newVersion.replace("SNAPSHOT", "beta");
      core.writeTextFile(project.server + "/src/main/resources/config/metamodel-2.0.json", JSON.stringify(json, null, 2));
    }
    let content = core.readTextFile("build.gradle");
    content = content.replace(/version '.*'/, `version '${newVersion}'`);
    content = content.replace(/(egwLibrariesVersion\s*=\s*)".*"/, `$1"${newVersion}"`);
    core.writeTextFile("build.gradle", content);

    if (fs.existsSync(MR.hi + "/package.json")) {
      json = JSON.parse(core.readTextFile(MR.hi + "/package.json"));
      json.version = newVersion;
      core.writeTextFile(MR.hi + "/package.json", JSON.stringify(json, null, 2));
    }
  });
}

/**
 * @param {CommandLine} cmd
 */
function printProjectsVersions(cmd) {
  if (cmd.getVersions) {
    console.log("Actual versions");
  } else {
    core.showMessage("Actual versions");
  }
  const projectVersions = /** @type {Record<string, any>} */ ({});
  for (const project of projects) {
    if (fs.existsSync(project.folder)) {
      projectVersions[project.code] = getProjectVersion(project);
    }
  }
  const uniqueVersions = Object.values(projectVersions).filter((value, index, self) => self.indexOf(value) == index);
  if (uniqueVersions.length === 1) {
    console.log("All:", uniqueVersions[0]);
  } else {
    const maxCodeLength = projects.map((p) => p.code.length).reduce((p, c) => Math.max(p, c));
    for (const project of projects) {
      console.log(project.code.padStart(maxCodeLength, " ") + ":", projectVersions[project.code]);
    }
  }
}

/**
 * @param {string} newVersion
 */
function setProjectsVersions(newVersion) {
  for (const project of projects) {
    if (fs.existsSync(project.folder)) {
      setProjectVersion(project, newVersion);
    }
  }
}

/**
 * @param {string} url
 */
async function waitForApp(url) {
  const seconds = 300;
  for (let counter = seconds; counter > 0; counter -= 2) {
    try {
      // @ts-ignore
      await requestAsync(url, { json: true, family: 4 });
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
    process.stdout.write(".");
    await core.delay(2000);
  }
  process.stdout.write("\n");
  core.showError("Application is not ready");
}

/**
 * @param {IProject} project
 */
async function waitForApplicationIsReady(project) {
  // 127.0.0.1 is used instead of localhost because of IPv4
  await waitForApp(`http://127.0.0.1:${project.port}/${project.webName}/00000000000000000000000000000001/sys/getHealth`);
}

/**
 *
 * @param {IProject} project
 * @param {CommandLine} cmd
 * @param {string} serverDir
 * @param {boolean} isMergedVersion
 */
async function runInitCommands(project, cmd, serverDir, isMergedVersion) {
  await jmeter.downloadIfMissing();
  await waitForApplicationIsReady(isMergedVersion ? MERGED : project);

  const projectCode = project.code;
  const initFile = `inits/init_${projectCode}.jmx`;
  const resultsFile = "logs/initResults" + projectCode + ".xml";
  const logFile = "logs/initLogs" + projectCode + ".log";
  fs.existsSync(resultsFile) && fs.unlinkSync(resultsFile);
  fs.existsSync(logFile) && fs.unlinkSync(logFile);
  const projectDir = path.resolve(process.cwd() + "/../../../../../" + project.folder);
  const params = `-n -t ${initFile} -j ${logFile} -Jenv=${cmd.environmentFile}${
    isMergedVersion ? "_merged" : ""
  }.cfg -Jinsomnia_dir=${serverDir}/src/test/insomnia -Jserver_dir=${serverDir} -Jproject_dir=${projectDir} -Juid=${cmd.uid}`.split(" ");
  const { stdOut } = await core.runCommand(getJmeterBat(), params, undefined, { shell: true });
  if (stdOut.match(/Err:\s+[1-9]/g)) {
    results.printInitReport(resultsFile);
    core.showError(`Init commands of ${projectCode} failed`);
  }
}

/**
 *
 * @param {boolean} isMergedVersion
 * @param {CommandLine} cmd
 */
async function runInitCommandsAsyncJob(isMergedVersion, cmd) {
  await jmeter.downloadIfMissing();
  const initFile = "inits/init_ASYNC_JOB.jmx";
  const resultsFile = "logs/initResultsASYNC.xml";
  const logFile = `logs/initLogsASYNC.log`;
  fs.existsSync(resultsFile) && fs.unlinkSync(resultsFile);
  fs.existsSync(logFile) && fs.unlinkSync(logFile);
  const { stdOut } = await core.runCommand(
    getJmeterBat(),
    `-n -t ${initFile} -j ${logFile} -Jenv=${cmd.environmentFile + (isMergedVersion ? "_merged" : "")}.cfg`,
    undefined,
    { shell: true }
  );
  if (stdOut.match(/Err:\s+[1-9]/g)) {
    results.printInitReport(resultsFile);
    core.showError(`Init commands of ASYNC failed`);
  }
}

/**
 * @returns {string}
 */
function getJmeterBat() {
  return path.join(__dirname, "java", "runJmeter.bat");
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
  /** @type {Record<string, string>} */
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
    await core.runCommand("docker compose kill");
    await core.runCommand("docker compose down");
  } catch (e) {
    // Errors ignored
  }
}

async function cleanDockers() {
  let { stdOut } = await core.runCommand("docker container ls -a --filter name=egw-tests_mongo");
  const containerIds = stdOut
    .split("\n")
    .slice(1) // remove header
    .map((l) => l.split(" ")[0]) // take id
    .filter((id) => id.length > 10); // remove empty line
  stdOut = (await core.runCommand("docker container ls -a --filter name=egw-run-test")).stdOut;
  const testsId = stdOut
    .split("\n")
    .slice(1) // remove header
    .map((l) => l.split(" ")[0]) // take id
    .filter((id) => id.length > 10)[0]; // remove empty line
  if (testsId) {
    containerIds.push(testsId);
  }
  for (const id of containerIds) {
    console.log("Stop docker ...");
    await core.runCommand("docker container stop " + id);
    console.log("Remove docker ...");
    await core.runCommand("docker container rm " + id);
  }
}

/**
 * @returns {string}
 */
function getFtpDataDir() {
  const isMultipleEnv = fs.existsSync(path.resolve(process.cwd() + "/../../../../../" + FTP.folder + "/docker/egw-tests/data/data_A/incoming1/.gitkeep"));
  const ftpDataDir = path.resolve(process.cwd() + "/../../../../../" + FTP.folder + (isMultipleEnv ? "/docker/egw-tests" : "/docker/egw-tests/data"));
  if (!fs.existsSync(ftpDataDir)) {
    core.showError(ftpDataDir + " does not exists");
  }
  return ftpDataDir;
}

/**
 * @param {string | IProject} projectOrString
 * @param {boolean} isVersion11
 * @param {string | null} serverFolder
 * @param {string} serverFolderDG
 * @param {string} serverFolderFTP
 * @param {boolean} isMergedVersion
 * @param {CommandLine} cmd
 * @returns {Promise<IProjectTestResult | null>}
 */
async function runProjectTests(projectOrString, isVersion11, serverFolder, serverFolderDG, serverFolderFTP, isMergedVersion, cmd) {
  await jmeter.downloadIfMissing();
  /** @type {string} */
  const projectCode = typeof projectOrString === "string" ? projectOrString : projectOrString.code;
  const project = typeof projectOrString === "string" ? null : projectOrString;
  let testFile = null;
  if (project) {
    if (!cmd.onlyShowResults) {
      await waitForApplicationIsReady(isMergedVersion ? MERGED : project);
    }
    testFile = project.testFile;
  } else {
    testFile = `tests_${projectCode}.jmx`;
  }
  const resultsFile = "logs/testResults" + projectCode + ".xml";
  const logFile = "logs/testLogs" + projectCode + ".log";
  if (!cmd.onlyShowResults) {
    fs.existsSync(resultsFile) && fs.unlinkSync(resultsFile);
    fs.existsSync(logFile) && fs.unlinkSync(logFile);
    let restStr = "-n -t " + testFile + " -j " + logFile + " ";
    restStr += isVersion11 ? "-Jhost=localhost" : "-Jenv=" + cmd.environmentFile + (isMergedVersion ? "_merged" : "") + ".cfg";
    const params = restStr.split(" ");
    if (project) {
      const projectDir = path.resolve(process.cwd() + "/../../../../../" + project.folder);
      params.push("-Jproject_dir=" + projectDir);
    }
    params.push("-Jftp_data_dir=" + getFtpDataDir());
    params.push(`-Jproject_FTP=${cmd.folder}/${FTP.folder}`);
    if (serverFolder) {
      params.push("-Jinsomnia_dir=" + serverFolder + "/src/test/insomnia");
      params.push("-Jserver_dir=" + serverFolder);
    }
    if (serverFolderDG) {
      params.push("-Jinsomnia_dir_DG=" + serverFolderDG + "/src/test/insomnia");
      params.push("-Jserver_dir_DG=" + serverFolderDG);
    }
    if (serverFolderFTP) {
      params.push("-Jinsomnia_dir_FTP=" + serverFolderFTP + "/src/test/insomnia");
      params.push("-Jserver_dir_FTP=" + serverFolderFTP);
    }
    if (isVersion11 && project == EMAIL) {
      params.push("-Jsmtp_host=smtp");
      params.push("-Jsmtp_port=80");
    }
    await core.runCommand(getJmeterBat(), params, undefined, { shell: true });
  }
  if (fs.existsSync(resultsFile)) {
    const steps = results.getSteps(core.readTextFile(resultsFile));
    const knownFailed = steps.filter((step) => !step.success && step.info.label.match(/\sT[0-9]+$/)).map((step) => step.info);
    const newFailed = steps.filter((step) => !step.success && !step.info.label.match(/\sT[0-9]+$/)).map((step) => step.info);
    const newPassed = steps.filter((step) => step.success && step.info.label.match(/\sT[0-9]+$/)).map((step) => step.info);
    const allPassed = steps.filter((step) => step.success).map((step) => step.info);
    return { newFailed, newPassed, knownFailed, allPassed };
  } else {
    // Test report not generated, can happen for onlyShowResults
    return null;
  }
}

/**
 * @param {string} DGversion
 */
function cloneDataGatewayForIec(DGversion) {
  const majorVersion = parseInt(assertAndReturn(DGversion.match(/^(\d+)\./))[0]);
  if (majorVersion >= 4) {
    // Copy is not needed
    console.log(`IEC62325 copy is not needed for major version ${majorVersion}`);
    return;
  }
  const settings = core.readTextFile(`${IEC62325.folder}/settings.gradle`);
  const matches = [...settings.matchAll(new RegExp(`${DG.folder}[^\\"']*`, "g"))];
  if (!matches || matches.length == 0) {
    core.showError(`Can not find path to datagateway in ${IEC62325.folder}/settings.gradle, thus copy of DG for IEC62325 will not be created.`);
    return;
  }
  let preferredFolder = "";
  let firstNotExistingFolder = "";
  for (let i = 0; i < matches.length; i++) {
    const folder = matches[i][0];
    if (folder == DG.folder) {
      if (firstNotExistingFolder || preferredFolder) {
        break;
      }
      core.showError(
        `File ${IEC62325.folder}/settings.gradle leads to original DG folder. Copy of DG for IEC62325 will not be not created.\n` +
          `Modify path to DG in ${IEC62325.folder}/settings.gradle and builder creates copy of DG for you. Condition to copy of DG must be before original DG folder.`
      );
      return;
    }
    if (!firstNotExistingFolder) {
      firstNotExistingFolder = folder;
    }
    if (!preferredFolder && fs.existsSync(folder)) {
      preferredFolder = folder;
    }
  }
  const dgCopyFolder = preferredFolder || firstNotExistingFolder;
  if (fs.existsSync(dgCopyFolder)) {
    core.showMessage(`Removing old ${dgCopyFolder}...`);
    fse.removeSync(dgCopyFolder);
  }
  core.showMessage(`Copying ${DG.folder} to ${dgCopyFolder}`);
  const exclusions = [
    ".git",
    ".gradle",
    "docker",
    "build",
    "jenkins",
    // Exclude server-lib too
    // "uu_energygateway_datagatewayg01-server",
  ].map((e) => path.join(DG.folder, e));
  fse.copySync(DG.folder, dgCopyFolder, {
    filter: (src) => {
      if (exclusions.indexOf(src) > -1) {
        return false;
      }
      return true;
    },
  });
}

/**
 * @param {IProject} project
 * @param {CommandLine} cmd
 */
async function runApp(project, cmd) {
  const folder = assertAndReturn(cmd.folder);
  fs.mkdirSync(path.join(folder, "logs"), {
    recursive: true,
  });
  const subAppJavaInfo = java.getSubAppJavaInfo(project);
  core.inLocation(path.join(project.folder, project.server), () => {
    const command = `start "${project.code}" /MIN ${builderDir}\\coloredGradle ${builderDir} ${project.code} ${path.join(
      folder,
      "logs",
      project.code + ".log"
    )} ${subAppJavaInfo.mainClassName} ${JDK || "default"} -Xmx${subAppJavaInfo.maxMemory}`;
    core.runCommandNoWait(command);
  });
}

/**
 * @param {CommandLine} cmd
 */
async function logAsyncJob(cmd) {
  const folder = assertAndReturn(cmd.folder);
  fs.mkdirSync(path.join(folder, "logs"), {
    recursive: true,
  });
  core.inLocation(`${DG.folder}/docker/egw-tests`, () => {
    const command = `start "AsyncJob" /MAX ${builderDir}\\asyncJobLogs.cmd ${builderDir} ${path.join(folder, "logs", "AsyncJob.log")}`;
    core.runCommandNoWait(command);
  });
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
      console.log("  -version <ver>       - Version to be stored in build.gradle, uucloud-*.json, ...etc.");
      console.log("  -clear               - Shutdown and remove docker containers.");
      console.log("  -unitTests           - Build or run with unit tests. Option -build or -run* muset be used.");
      console.log("  -metamodel           - Regenerates metamodel for Business Territory.");
      console.log("  -logAsyncJob         - Shows console windows for AsyncJob");
      console.log("  -runInSequence       - SubApps are started gradually.");
      console.log("  -isMerged            - Merged application will be used for inits, tests, etc.");
      console.log("  -environmentFile <f> - Environment file <f> will be used. Default: env_localhost_builder");
      console.log("");
      console.log("  -build               - Builds all apps by gradle");
      console.log("  -buildDG             - Builds Datagateway");
      console.log("  -buildMR             - Builds Message Registry");
      console.log("  -buildFTP            - Builds FTP endpoint");
      console.log("  -buildEMAIL          - Builds E-mail endpoint");
      console.log("  -buildECP            - Builds ECP endpoint");
      console.log("  -buildIEC62325       - Builds IEC62325 endpoint");
      console.log("  -buildAS24           - Builds AS24 endpoint");
      console.log("  -buildIEC60870       - Builds IEC60870 endpoint");
      console.log("  -buildACER           - Builds ACER endpoint");
      console.log("  -buildKAFKA          - Builds KAFKA endpoint");
      console.log("  -buildMERGED         - Builds merged application");
      console.log("");
      console.log("  -run                 - Runs all subApps");
      console.log("  -runDG               - Runs Datagateway");
      console.log("  -runMR               - Runs Message Registry");
      console.log("  -runFTP              - Runs FTP endpoint");
      console.log("  -runEMAIL            - Runs E-mail endpoint");
      console.log("  -runECP              - Runs ECP endpoint");
      console.log("  -runIEC62325         - Runs IEC62325 endpoint");
      console.log("  -runAS24             - Runs AS24 endpoint");
      console.log("  -runIEC60870         - Runs IEC60870 endpoint");
      console.log("  -runACER             - Runs ACER endpoint");
      console.log("  -runKAFKA            - Runs KAFKA endpoint");
      console.log("  -runMERGED           - Runs merged application");
      console.log("");
      console.log("  -init                - Runs init commands of all apps (creates workspace, sets permissions)");
      console.log("  -initDG              - Runs init commands of Datagateway");
      console.log("  -initMR              - Runs init commands of Message Registry");
      console.log("  -initFTP             - Runs init commands of FTP endpoint");
      console.log("  -initEMAIL           - Runs init commands of E-mail endpoint");
      console.log("  -initECP             - Runs init commands of ECP endpoint");
      console.log("  -initIEC62325        - Runs init commands of IEC62325 endpoint");
      console.log("  -initAS24            - Runs init commands of AS24 endpoint");
      console.log("  -initIEC60870        - Runs init commands of IEC60870 endpoint");
      console.log("  -initACER            - Runs init commands of ACER endpoint");
      console.log("  -initKAFKA           - Runs init commands of KAFKA endpoint");
      console.log("  -initASYNC           - Runs init commands of AsyncJob server");
      console.log("  -uid <your-uid>      - UID of actual user");
      console.log("");
      console.log("  -test                - Tests all subApps by jmeter");
      console.log("  -testDG              - Tests Datagateway by jmeter");
      console.log("  -testMR              - Tests Message Registry by jmeter");
      console.log("  -testFTP             - Tests FTP endpoint by jmeter");
      console.log("  -testEMAIL           - Tests E-mail endpoint by jmeter");
      console.log("  -testECP             - Tests ECP endpoint by jmeter");
      console.log("  -testIEC62325        - Tests IEC62325 endpoint by jmeter");
      console.log("  -testAS24            - Tests AS24 endpoint by jmeter");
      console.log("  -testIEC60870        - Tests IEC60870 endpoint by jmeter");
      console.log("  -testACER            - Tests ACER endpoint by jmeter");
      console.log("  -testKAFKA           - Tests KAFKA endpoint by jmeter");
      console.log("  -tests <t1>,<t2>,... - Runs special tests (use command -info to detect them)");
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
    const isVersion11 =
      !fs.existsSync(`${MR.folder}/${MR.server}/src/test/jmeter/env_localhost.cfg`) &&
      !fs.existsSync(`${MR.folder}/${MR.server}/src/test/jmeter/env_localhost_A.cfg`);
    if (isVersion11 && cmd.enableConsole) {
      core.showMessage("This is 1.1.* version, apps will be restarted after init.");
    }

    const runnableProjects = [DG, MR, FTP, EMAIL, ECP];
    if (fs.existsSync(IEC62325.folder)) {
      runnableProjects.push(IEC62325);
    }
    if (fs.existsSync(AS24.folder)) {
      runnableProjects.push(AS24);
    }
    if (fs.existsSync(IEC60870.folder)) {
      runnableProjects.push(IEC60870);
    }
    if (fs.existsSync(ACER.folder)) {
      runnableProjects.push(ACER);
    }
    if (fs.existsSync(KAFKA.folder)) {
      runnableProjects.push(KAFKA);
    }

    if (fs.existsSync(MERGED.folder)) {
      runnableProjects.push(MERGED);
    }
    const DGversions = getProjectVersion(DG);
    const DGversion = typeof DGversions === "string" ? DGversions : DGversions["build.gradle"];

    if (cmd.interactively || cmd.getVersions) {
      printProjectsVersions(cmd);
      if (cmd.getVersions) {
        return;
      }
    }
    if (cmd.logAsyncJob) {
      logAsyncJob(cmd);
      return;
    }
    if (cmd.getInfo) {
      await info.getInfo(projects, MR);
      return;
    }

    const subAppJavaInfo = java.getSubAppJavaInfo(DG);
    if (config.JDK && config.JDK[subAppJavaInfo.javaVersion]) {
      JDK = config.JDK[subAppJavaInfo.javaVersion];
    } else {
      JDK = await java.downloadIfMissing(subAppJavaInfo.javaVersion);
    }
    await java.downloadIfMissingJavaForJmeter();

    java.printInfo(subAppJavaInfo, JDK);
    console.log((await core.runCommand("java", "-version", { disableStdOut: true }, { cwd: path.join(JDK, "bin") })).stdErr);

    await nodeJs.printInfo();
    console.log("");

    if (!cmd.environmentFile) {
      const envs = info.getEnvironments(MR);
      cmd.environmentFile = envs[0];
    }
    // console.log(cmd);
    // console.log(cmd.version);
    console.log("Environment file: " + cmd.environmentFile);
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
    cmd.getCmdValue("isMerged", "Run as merged application?");

    const isMergedVersion = cmd.isMerged;

    // Build
    const isBuild = cmd.interactively
      ? cmd.getCmdValue("build", "Build app?")
      : cmd.buildDG ||
        cmd.buildMR ||
        cmd.buildFTP ||
        cmd.buildEMAIL ||
        cmd.buildECP ||
        cmd.buildIEC62325 ||
        cmd.buildAS24 ||
        cmd.buildIEC60870 ||
        cmd.buildACER ||
        cmd.buildKAFKA ||
        cmd.buildMERGED;
    if (!isBuild && !cmd.interactively) {
      console.log("Build app? no");
    }
    if (isBuild) {
      console.log("Which app to build?");
    }
    /** @type {Partial<Record<IProjectCode, boolean>>} */
    const isBuildPerProject = {};
    for (const project of projects) {
      isBuildPerProject[project.code] = isBuild && cmd.getCmdValue("build" + project.code, "... " + project.code + "?");
    }
    cmd.unitTests = isBuild && cmd.getCmdValue("unitTests", "Build or run with unit tests?");

    // Runs
    const isRun = cmd.interactively
      ? cmd.getCmdValue("run", "Run app?")
      : cmd.runDG ||
        cmd.runMR ||
        cmd.runFTP ||
        cmd.runEMAIL ||
        cmd.runECP ||
        cmd.runIEC62325 ||
        cmd.runAS24 ||
        cmd.runIEC60870 ||
        cmd.runACER ||
        cmd.runKAFKA ||
        cmd.runMERGED;
    if (!isRun && !cmd.interactively) {
      console.log("Run app? no");
    }
    if (isRun) {
      console.log("Which app to run?");
    }
    /** @type {Partial<Record<IProjectCode, boolean>>} */
    const isRunPerProject = {};
    for (const project of runnableProjects) {
      isRunPerProject[project.code] = isRun && cmd.getCmdValue("run" + project.code, "... " + project.code + "?");
    }

    // Inits
    const isRunInit = cmd.interactively
      ? cmd.getCmdValue("init", "Run init app?")
      : cmd.initDG ||
        cmd.initMR ||
        cmd.initFTP ||
        cmd.initEMAIL ||
        cmd.initECP ||
        cmd.initIEC62325 ||
        cmd.initAS24 ||
        cmd.initIEC60870 ||
        cmd.initACER ||
        cmd.initKAFKA ||
        cmd.initASYNC;
    if (!isRunInit && !cmd.interactively) {
      console.log("Run init app? no");
    }
    if (isRunInit) {
      console.log("Which init?");
    }
    /** @type {Partial<Record<IProjectCodeWithAsync, boolean>>} */
    const isInitPerProject = {};
    for (const project of runnableProjects) {
      isInitPerProject[project.code] = isRunInit && cmd.getCmdValue("init" + project.code, "... " + project.code + "?");
    }
    isInitPerProject.ASYNC = isRunInit && cmd.getCmdValue("initASYNC", "... AsyncJob server?");

    if (isRunInit) {
      if (cmd.uid) {
        console.log("Your OID: " + cmd.uid);
      }
      cmd.uid = cmd.uid || prompt("Your UID: ");
      if (!cmd.uid) {
        core.showError("Terminated by user");
      }
      if (
        (cmd.initDG ||
          cmd.initMR ||
          cmd.initFTP ||
          cmd.initEMAIL ||
          cmd.initECP ||
          cmd.initIEC62325 ||
          cmd.initAS24 ||
          cmd.initIEC60870 ||
          cmd.initACER ||
          cmd.initKAFKA) &&
        !cmd.uid
      ) {
        core.showError("UID must be set along with inits");
      }
    }

    // Tests
    const isTests = cmd.interactively
      ? cmd.getCmdValue("tests", "Run tests?")
      : cmd.testDG ||
        cmd.testMR ||
        cmd.testFTP ||
        cmd.testEMAIL ||
        cmd.testECP ||
        cmd.testIEC62325 ||
        cmd.testAS24 ||
        cmd.testIEC60870 ||
        cmd.testACER ||
        cmd.testKAFKA ||
        (cmd.additionalTests && cmd.additionalTests.length);
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
    const isTestsECP = isTests && cmd.getCmdValue("testECP", "... ECP?");
    const isTestsIEC62325 = isTests && cmd.getCmdValue("testIEC62325", "... IEC62325?");
    const isTestsAS24 = isTests && cmd.getCmdValue("testAS24", "... AS24?");
    const isTestsIEC60870 = isTests && cmd.getCmdValue("testIEC60870", "... IEC60870?");
    const isTestsACER = isTests && cmd.getCmdValue("testACER", "... ACER?");
    const isTestsKAFKA = isTests && cmd.getCmdValue("testKAFKA", "... KAFKA?");

    if (!cmd.last) {
      last.saveSettings(cmd);
    }

    if (cmd.version && cmd.version.match(/^\d/)) {
      setProjectsVersions(cmd.version);
    }

    core.debugCommands = true;

    if (cmd.clear) {
      core.showMessage("Clearing docker...");
      for (const project of runnableProjects) {
        if (fs.existsSync(project.folder + "/docker/egw-tests/docker-compose.yml")) {
          await core.inLocationAsync(`${project.folder}/docker/egw-tests`, stopComposer);
        }
        if (project.code == "DG") {
          await cleanDockers();
        }
      }
    }
    if (cmd.unitTests || isRun) {
      core.showMessage("Starting docker...");
      for (const project of runnableProjects) {
        if (
          ((isBuild && isBuildPerProject[project.code] && cmd.unitTests) ||
            (isRun && isRunPerProject[project.code]) ||
            (isRun && isRunPerProject[MERGED.code])) &&
          fs.existsSync(project.folder + "/docker/egw-tests/docker-compose.yml")
        ) {
          await core.inLocationAsync(project.folder, async () => {
            if (fs.existsSync("before-start.cmd")) {
              await core.runCommand(`before-start.cmd`, undefined, undefined, { shell: true });
            }
          });
          await core.inLocationAsync(`${project.folder}/docker/egw-tests`, async () => {
            await core.runCommand("docker compose up -d");
          });
        }
      }
    }

    if (cmd.metamodel) {
      core.showMessage("Generating metamodel...");
      for (const project of projects) {
        if (fs.existsSync(project.folder)) {
          await metamodel.generateModel(cmd.folder, projects, project, isVersion11);
        }
      }
    }

    if (cmd.messageBroker) {
      core.showMessage(`Setting message broker to ${cmd.messageBroker}`);
      for (const project of projects) {
        if (fs.existsSync(project.folder)) {
          messageBroker.changeMessageBroker(cmd.messageBroker, projects);
        }
      }
    }

    if (isBuild) {
      core.showMessage("Building apps...");
      for (const project of projects) {
        if (isBuildPerProject[project.code]) {
          if (project.code == IEC62325.code) {
            cloneDataGatewayForIec(DGversion);
          }
          core.showMessage(`Building ${project.code} ...`);
          await buildProject(project, cmd.unitTests);
          core.showMessage(`${project.code} - build ok`);
        }
      }
    }

    if (isRun) {
      core.showMessage("Starting apps...");
      let prevProject = null;
      for (const project of runnableProjects) {
        if (isRunPerProject[project.code]) {
          if (prevProject != null && cmd.runInSequence) {
            await waitForApplicationIsReady(prevProject);
          }
          core.showMessage("Starting " + project.code);
          if (await killProject(project)) {
            console.log("Killed previous");
          }
          if (project.code == IEC62325.code && !(isBuild && isBuildPerProject[IEC62325.code])) {
            cloneDataGatewayForIec(DGversion);
          }
          if (project.code === MR.code) {
            console.log("Copying tests-uu5-environment.json to server/public");
            fs.copyFileSync(MR.folder + "/" + MR.hi + "/env/tests-uu5-environment.json", MR.folder + "/" + MR.server + "/public/uu5-environment.json");
          }
          await runApp(project, cmd);
          await core.delay(1000);
          prevProject = project;
        }
      }
    }
    if (isRunInit) {
      core.showMessage("Starting inits...");
      if (isInitPerProject.ASYNC) {
        await waitForApp(`http://localhost:10090/uu-asyncjobg01-main/99000000000000000000000000000000/sys/getHealth`);
        core.showMessage("Init AsyncJob");
        await core.inLocationAsync(`${MR.folder}/${MR.server}/src/test/jmeter/`, async () => {
          await runInitCommandsAsyncJob(isMergedVersion, cmd);
        });
      }
      for (const project of runnableProjects) {
        if (isInitPerProject[project.code]) {
          core.showMessage("Init " + project.code);
          // Folder mapped to docker must contain also bruno or insomnia, thus we are in upper folder
          await core.inLocationAsync(`${MR.folder}/${MR.server}/src/test/jmeter`, async () => {
            await runInitCommands(project, cmd, `${cmd.folder}/${project.folder}/${project.server}`, isMergedVersion);
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
      if (isRun || isRunInit) {
        core.showMessage("Waiting 10s before tests...");
        await core.delay(10000);
      }
      core.showMessage("Starting tests...");

      const startedDate = new Date();
      /** @type {Record<string, ITestResultInfo[]>} */
      const knownFailed = {};
      /** @type {Record<string, ITestResultInfo[]>} */
      const newFailed = {};
      /** @type {Record<string, ITestResultInfo[]>} */
      const newPassed = {};
      /** @type {Record<string, ITestResultInfo[]>} */
      const allPassed = {};
      const projectList = [
        ...[
          isTestsDG ? DG : null,
          isTestsMR ? MR : null,
          isTestsFTP ? FTP : null,
          isTestsEMAIL ? EMAIL : null,
          isTestsECP ? ECP : null,
          isTestsIEC62325 ? IEC62325 : null,
          isTestsAS24 ? AS24 : null,
          isTestsIEC60870 ? IEC60870 : null,
          isTestsACER ? ACER : null,
          isTestsKAFKA ? KAFKA : null,
        ],
        ...(cmd.additionalTests || []),
      ];
      for (const project of projectList) {
        if (project) {
          const isProjectTest = typeof project !== "string";
          const testCode = isProjectTest ? project.code : project;
          if (!cmd.onlyShowResults) {
            core.showMessage(`Testing ${testCode}`);
          }
          let report = /** @type {IProjectTestResult | null} */ (null);
          if (testCode.toLowerCase() == "web") {
            await core.inLocationAsync(`${MR.folder}/${MR.server}/src/test/web/bin`, async () => {
              report = await tests.runWebTests(cmd);
            });
          } else {
            await core.inLocationAsync(`${MR.folder}/${MR.server}/src/test/jmeter/`, async () => {
              report = await runProjectTests(
                project,
                isVersion11,
                isProjectTest ? `${cmd.folder}/${project.folder}/${project.server}` : null,
                `${cmd.folder}/${DG.folder}/${DG.server}`,
                `${cmd.folder}/${FTP.folder}/${FTP.server}`,
                isMergedVersion,
                cmd
              );
            });
          }
          if (report) {
            if (report.newFailed.length) {
              newFailed[testCode] = report.newFailed;
            }
            if (report.newPassed.length) {
              newPassed[testCode] = report.newPassed;
            }
            if (report.allPassed?.length) {
              allPassed[testCode] = report.allPassed;
            }
            if (report.knownFailed?.length) {
              knownFailed[testCode] = report.knownFailed;
            }
            const projectPassedTests = report.newPassed.length ? { [testCode]: report.newPassed } : {};
            const projectFailedTests = report.newFailed.length ? { [testCode]: report.newFailed } : {};

            if (!cmd.onlyShowResults) {
              tests.showFailedTests(projectPassedTests, projectFailedTests);
            }
          }
        }
      }

      results.printReport(MR, newPassed, newFailed, knownFailed, allPassed, startedDate);
    }

    core.showMessage("DONE");
  } catch (err) {
    core.showError(/** @type {Error} */ (err));
    help.printTroubleShootHelp();
    core.showError("");
  }
}

run();
