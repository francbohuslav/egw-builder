const core = require("../core");

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

  showFailedSteps(steps) {
    for (const step of steps) {
      console.log("  \x1b[32m%s\x1b[0m", step.label);
      if (step.asserts) {
        for (let assert of step.asserts) {
          assert = assert.replace(/^Test failed: /, "");
          console.log("    \x1b[31m%s\x1b[0m", assert.substring(0, 180) + (assert.length > 180 ? "..." : ""));
        }
      }
    }
  }

  async runWebTests() {
    const newFailed = [];
    try {
      await core.runCommand(
        "SeleniumRunner.exe -nvd -r ..\\results -w 1 -f ..\\FirefoxPortable\\ -s full.scenario.json -c ..\\test-suites\\localhost.config.json ..\\test-suites\\gui"
      );
    } catch ({ code }) {
      newFailed.push({
        label: "Web tests failed. Opening report in browser.",
      });
      core.runCommandNoWait(`start ..\\results\\index.html`);
    }
    return { newFailed, newPassed: [], knownFailed: [] };
  }
}
module.exports = new Tests();
