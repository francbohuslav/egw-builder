const xpath = require("xpath");
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
                label: n.getAttribute("lb"),
                success: n.getAttribute("s") == "true",
            })
        );
        return results;
    }
}

module.exports = new Results();
