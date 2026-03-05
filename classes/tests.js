const core = require("../core");
const fs = require("fs");
const path = require("path");

class Tests {
  showFailedTests(newPassed, newFailed) {
    if (Object.keys(newPassed).length) {
      core.showMessage("There are tests marked as failed, but already passed. Remove task code from test name.");
      Object.keys(newPassed).forEach((testName) => {
        console.log("\x1b[1m\x1b[33m%s\x1b[0m", testName);
        for (const step of newPassed[testName]) {
          console.log("  \x1b[32m%s\x1b[0m", step.label);
        }
      });
    }
    console.log("");
    if (Object.keys(newFailed).length) {
      core.showMessage("There are failed tests. Create task in Sprintman and add code at end of test name. E.g. 'some test - T123'.");
      Object.keys(newFailed).forEach((testName) => {
        console.log("\x1b[1m\x1b[33m%s\x1b[0m", testName);
        this.showFailedSteps(newFailed[testName]);
      });
    }
    console.log("");
  }

  showFailedSteps(steps, withResponse = false) {
    for (const step of steps) {
      console.log("  \x1b[32m%s\x1b[0m", step.label);
      if (step.asserts) {
        for (let assert of step.asserts) {
          assert = assert.replace(/^Test failed: /, "");
          console.log("    \x1b[31m%s\x1b[0m", assert.substring(0, 180) + (assert.length > 180 ? "..." : ""));
        }
      }
      if (withResponse) {
        core.showMessage("    Response data");
        console.log(
          step.responseData
            .replace(/\\t/g, "  ")
            .replace(/\\r/g, "")
            .replace(/\\n/g, "\n")
            .split("\n")
            .map((l) => "        " + l)
            .join("\n")
        );
      }
    }
  }

  /**
   * Returns a map of project code to last modification Date of the project's JMX file.
   * Only projects with existing testFile and existing file on disk are included.
   * When an item is a string instead of IProject, it is used as the key and the filename is that string + ".jmx".
   *
   * @param {(IProject | string)[]} projects
   * @param {string} baseDir directory where JMX files are located
   * @returns {Record<string, Date>}
   */
  getJmxLastModifiedDates(projects, baseDir) {
    /** @type {Record<string, Date>} */
    const result = {};
    for (const item of projects) {
      const isString = typeof item === "string";
      const code = isString ? item : item.code;
      const fileName = `testResults${code}.xml`;
      if (!fileName) {
        continue;
      }
      const filePath = path.join(baseDir, "logs", fileName);
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const stat = fs.statSync(filePath);
      result[code] = stat.mtime;
    }
    return result;
  }

  /**
   *
   * @param {CommandLine} cmd
   * @returns {Promise<IProjectTestResult>}
   */
  async runWebTests(cmd) {
    /** @type {ITestResultInfo[]} */
    const newFailed = [];
    /** @type {ITestResultInfo[]} */
    const allPassed = [];
    if (!cmd.onlyShowResults) {
      try {
        await core.runCommand(
          "SeleniumRunner.exe -nvd -r ..\\results -w 1 -f ..\\FirefoxPortable\\ -s frontend_quick_test.scenario.json -c ..\\test-suites\\localhost.config.json ..\\test-suites\\gui"
        );
        allPassed.push({
          label: "Web tests passed.",
          asserts: [],
          responseData: "",
        });
      } catch (ex) {
        newFailed.push({
          label: "Web tests failed. Opening report in browser.",
          asserts: [],
          responseData: "",
        });
        core.runCommandNoWait(`start ..\\results\\index.html`);
      }
    }
    return { newFailed, newPassed: [], knownFailed: [], allPassed };
  }
}
module.exports = new Tests();
