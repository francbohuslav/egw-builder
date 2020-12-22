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
            if (ar == "-unittests") {
                this.unitTests = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-metamodel") {
                this.metamodel = true;
                this.interactively = false;
                continue;
            }

            if (ar == "-run") {
                this.runDG = true;
                this.runMR = true;
                this.runFTP = true;
                this.runEMAIL = true;
                this.runECP = true;
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
            if (ar == "-runecp") {
                this.runECP = true;
                this.interactively = false;
                continue;
            }

            if (ar == "-init") {
                this.initDG = true;
                this.initMR = true;
                this.initFTP = true;
                this.initEMAIL = true;
                this.initECP = true;
                this.initASYNC = true;
                this.uid = pars.shift();
                this.interactively = false;
                continue;
            }
            if (ar == "-initdg") {
                this.initDG = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-initmr") {
                this.initMR = true;
                this.uid = pars.shift();
                this.interactively = false;
                continue;
            }
            if (ar == "-initftp") {
                this.initFTP = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-initemail") {
                this.initEMAIL = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-initecp") {
                this.initECP = true;
                this.interactively = false;
                continue;
            }
            if (ar == "-initasync") {
                this.initASYNC = true;
                this.interactively = false;
                continue;
            }

            if (ar == "-test") {
                this.testMR = true;
                this.testFTP = true;
                this.testEMAIL = true;
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
