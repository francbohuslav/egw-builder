const core = require("../core");

class Tests {
    showFailedTests(newPassed, newFailed) {
        if (Object.keys(newPassed).length) {
            core.showMessage("There are tests marked as failed, but already passed. Remove task code from test name.");
            console.log(newPassed);
        }
        if (Object.keys(newFailed).length) {
            core.showMessage("There are failed tests. Create task in Sprintman and add code at end of test name. E.g. 'some test - T123'.");
            console.log(newFailed);
        }
    }
}
module.exports = new Tests();
