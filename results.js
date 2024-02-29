const xpath = require("xpath");
const tests = require("./classes/tests");
const core = require("./core");
const dom = require("xmldom").DOMParser;

/**
 * @typedef {Object} ITestResult
 * @property {string} label
 * @property {bool} success
 */

class Results {
  constructor() {}

  /**
   * @param {string} content
   * @returns {ITestResult[]}
   */
  getSteps(content) {
    const results = [];
    const doc = new dom().parseFromString(content);
    // https://svn.apache.org/repos/asf/jmeter/tags/v2_4/docs/usermanual/listeners.html .. format description
    const nodes = xpath.select("//*[@lb]", doc);
    nodes.forEach((n) =>
      results.push({
        info: {
          label: n.getAttribute("lb"),
          asserts: xpath
            .select("./assertionResult", n)
            .filter((fn) => xpath.select1("./failure", fn).textContent == "true")
            .map((fn) => xpath.select1("./failureMessage", fn).textContent.replace(/[\r\n]+/g, " ")),
          responseData: xpath.select1("./responseData", n).textContent,
        },
        success: n.getAttribute("s") == "true",
      })
    );
    return results;
  }

  printInitReport(resultsFile) {
    const steps = this.getSteps(core.readTextFile(resultsFile));
    const failed = steps.filter((step) => !step.success && !step.info.label.match(/\sT[0-9]+$/)).map((step) => step.info);
    tests.showFailedSteps(failed, true);
  }

  printReport(MR, newPassed, newFailed, knownFailed, allPassed, startedDate) {
    core.writeTextFile(
      `${MR.folder}/${MR.server}/src/test/jmeter/logs/testResults.json`,
      JSON.stringify(
        {
          PASSED: newPassed,
          FAILED_NEW: newFailed,
          FAILED_KNOWN: knownFailed,
        },
        null,
        2
      )
    );

    core.showMessage("\n\n======== TESTS SUMMARY =======");
    const now = new Date();
    console.log("Started:", startedDate.toLocaleString());
    console.log("Finished:", now.toLocaleString());
    console.log("=>", this.formatTime((now.getTime() - startedDate.getTime()) / 1000), "minutes");

    tests.showFailedTests(newPassed, newFailed);
    if (Object.keys(newFailed).length || Object.keys(newPassed).length) {
      core.showError("Tests failed. Watch message above.", false);
    } else {
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
    core.showSuccess(`Passed: ${Object.values(allPassed).reduce((p, c) => p + c.length, 0)}`);
    Object.entries(allPassed).forEach(([key, passed]) => {
      core.showSuccess(` - ${key}: ${passed.length}`);
    });
    core.showWarning(`Failed and fix in progress: ${Object.values(knownFailed).reduce((p, c) => p + c.length, 0)}`);
    const failedCount = Object.values(newFailed).reduce((p, c) => p + c.length, 0);
    if (failedCount) {
      core.showError(`New failed tests: ${failedCount}`, false);
    }
    if (Object.keys(newFailed).length || Object.keys(newPassed).length) {
      core.showError("", false);
      core.showError("    █████                                        █████", false);
      core.showError("   ███████                                      ███████", false);
      core.showError("   ███████           ███████████████            ███████", false);
      core.showError("    ████████       ███████████████████        ████████", false);
      core.showError("        █████     █████████████████████     █████", false);
      core.showError("          █████  ███████████████████████  █████", false);
      core.showError("            ██  █████████████████████████  ██", false);
      core.showError("               ███████    ██████    ██████", false);
      core.showError("               ██████      ████      █████", false);
      core.showError("               ██████      ████      █████", false);
      core.showError("                ██████    ██████    █████", false);
      core.showError("                 ███████████  ██████████", false);
      core.showError("                  ██████████  █████████", false);
      core.showError("              ██   ███████████████████   ██", false);
      core.showError("              ████  ████ █ █ █ █ ████  ████", false);
      core.showError("             █████   ███ █ █ █ █ ███   █████", false);
      core.showError("           █████      █████████████      █████", false);
      core.showError("         ████          ███████████          ████", false);
      core.showError("      █████              ███████              █████", false);
      core.showError("     ███████                                 ███████", false);
      core.showError("      █████                                   █████", false);
      core.showError("", false);
    }
  }

  formatTime(totalSeconds) {
    totalSeconds = Math.round(totalSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

module.exports = new Results();
