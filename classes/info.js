const fs = require("fs");
const core = require("../core");
const messageBroker = require("./message-broker");
const { assertAndReturn } = require("./utils");

class Info {
  /**
   * @param {IProject[]} projects
   * @param {IProject} MR
   */
  async getInfo(projects, MR) {
    const info = this.getTests(projects, MR);
    info.environmentFiles = this.getEnvironments(MR);
    await this.getBranches(info, MR);
    console.log(JSON.stringify(info, null, 2));
  }

  /**
   * @param {IProject[]} projects
   * @param {IProject} MR
   * @returns {InfoStructure}
   */
  getTests(projects, MR) {
    const tests = fs
      .readdirSync(`${MR.folder}/${MR.server}/src/test/jmeter/`)
      .filter((t) => t.match(/^tests_.*\.jmx$/))
      .map((t) => assertAndReturn(t.match(/^tests_(.*)\.jmx/))[1]);
    tests.push("Web");
    return {
      projects: projects
        .filter((p) => {
          return fs.existsSync(p.folder);
        })
        .map((p) => ({ code: p.code, supportTests: !!p.testFile, directory: p.folder, branch: "" })),
      additionalTests: tests,
      messageBroker: messageBroker.getActualMessageBroker(projects),
      environmentFiles: [],
      gui: {
        branch: "",
      },
    };
  }

  /**
   * @param {IProject} MR
   * @returns {string[]}
   */
  getEnvironments(MR) {
    return fs
      .readdirSync(`${MR.folder}/${MR.server}/src/test/jmeter/`)
      .filter((t) => t.match(/^env_localhost(_.+)?\.cfg/))
      .map((e) => e.replace(".cfg", ""));
  }

  /**
   * @param {InfoStructure} info
   * @param {IProject} MR
   */
  async getBranches(info, MR) {
    for (const project of info.projects) {
      if (fs.existsSync(project.directory)) {
        await core.inLocationAsync(project.directory, async () => {
          try {
            const { stdOut } = await core.runCommand("git branch --show-current", undefined, { disableStdOut: true });
            project.branch = stdOut.trim();
          } catch (err) {
            project.branch = /** @type {any} */ (err).stdErr;
          }
        });
      }
    }
    if (MR.gui && fs.existsSync(MR.gui)) {
      await core.inLocationAsync(MR.gui, async () => {
        try {
          const { stdOut } = await core.runCommand("git branch --show-current", undefined, { disableStdOut: true });
          info.gui.branch = stdOut.trim();
        } catch (err) {
          info.gui.branch = /** @type {any} */ (err).stdErr;
        }
      });
    }
  }
}

module.exports = new Info();
