const prompt = require("prompt-sync")();
const { spawn } = require("child_process");

class Core {
    constructor() {
        this.locationHistory = [];
    }

    /**
     * Ask for user input
     * @param {string} question
     * @param {string} defaultValue
     * @return {string}
     */
    ask(question, defaultValue = null) {
        if (defaultValue === null) {
            question = question + " [Y/n]";
        } else {
            defaultValue = defaultValue.toUpperCase();
            question = question + " Default=" + defaultValue;
        }
        let answer = prompt(question + " ");
        answer = answer.toUpperCase();
        if (!defaultValue) {
            return answer === "" || answer === "Y";
        } else {
            answer = answer.toUpperCase();
            if (answer === "") {
                answer = defaultValue;
            }
            return answer;
        }
    }

    showMessage(message) {
        console.log("\x1b[36m%s\x1b[0m", message);
    }

    showError(message) {
        console.log("\x1b[31m%s\x1b[0m", message);
        prompt("press ENTER to continue ");
        process.exit(1);
    }

    /**
     *
     * @param {string} command
     * @param {string[]} args
     */
    async runCommand(command, ...args) {
        if (!args || args.length === 0) {
            if (command.indexOf(" ") > -1) {
                args = command.split(" ");
                command = args.shift();
            }
        } else {
            if (typeof args === "string") {
                args = args.split(" ");
            }
        }
        return new Promise((resolve) => {
            const context = spawn(command, args);
            context.stdout.on("data", (data) => {
                console.log(data.toString());
            });

            context.stderr.on("data", (data) => {
                if (data.toString().toLowerCase().indexOf("warn") > -1) {
                    console.log("\x1b[33m%s\x1b[0m", data);
                } else {
                    console.log("\x1b[31m%s\x1b[0m", data);
                }
            });

            context.on("error", (error) => {
                console.log("\x1b[31m%s\x1b[0m", error.message);
            });

            context.on("close", (code) => {
                resolve(code);
            });
        });
    }

    processExit(errorLevel, location) {
        if (errorLevel) {
            this.showError(`ERROR: ${errorLevel}` + (location ? " in " + location : ""));
        }
    }

    pushLocation(path) {
        const wd = process.cwd();
        this.locationHistory.push(wd);
        process.chdir(path);
    }

    popLocation() {
        if (this.locationHistory.length) {
            const wd = this.locationHistory.pop();
            process.chdir(wd);
            return wd;
        } else {
            this.showError("There is no location to pop");
        }
    }
}
module.exports = new Core();

/*
Colors reference

Reset = "\x1b[0m"
Bright = "\x1b[1m"
Dim = "\x1b[2m"
Underscore = "\x1b[4m"
Blink = "\x1b[5m"
Reverse = "\x1b[7m"
Hidden = "\x1b[8m"

FgBlack = "\x1b[30m"
FgRed = "\x1b[31m"
FgGreen = "\x1b[32m"
FgYellow = "\x1b[33m"
FgBlue = "\x1b[34m"
FgMagenta = "\x1b[35m"
FgCyan = "\x1b[36m"
FgWhite = "\x1b[37m"

BgBlack = "\x1b[40m"
BgRed = "\x1b[41m"
BgGreen = "\x1b[42m"
BgYellow = "\x1b[43m"
BgBlue = "\x1b[44m"
BgMagenta = "\x1b[45m"
BgCyan = "\x1b[46m"
BgWhite = "\x1b[47m"
*/
