const core = require("./core");

class CommandLine {
    /**
     *
     * @param {string[]} pars arguments of aaplication
     */
    constructor(pars) {
        this.interactively = true;
        while (pars.length > 0) {
            const ar = pars.shift().toLowerCase();
            if (ar == "-folder") {
                this.folder = pars.shift();
                continue;
            }
            if (ar == "-version") {
                this.version = pars.shift().replace(/^"/, "").replace(/"$/, "");
                this.interactively = false;
                continue;
            }
            if (ar == "-clear") {
                this.clear = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-build") {
                this.build = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-metamodel") {
                this.metamodel = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-rundg") {
                this.runDG = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-runmr") {
                this.runMR = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-runftp") {
                this.runFTP = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-runemail") {
                this.runEMAIL = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-init") {
                this.init = true;
                this.uid = pars.shift();
                this.interactively = false;
                continue;
            }
            if (ar == "-testmr") {
                this.testMR = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-testftp") {
                this.testFTP = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-testemail") {
                this.testEMAIL = true;
                this.interactively = false;
                continue;
            }
        }
    }

    getCmdValue(property, question) {
        const value = this[property];
        if ((value !== null && value !== undefined) || !this.interactively) {
            console.log(question + " " + (value ? "yes" : "no"));
            return value;
        }
        return core.ask(question);
    }
}

module.exports = CommandLine;
