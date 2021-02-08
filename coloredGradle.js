const stdin = process.openStdin();

stdin.on("data", function (chunk) {
    const lines = chunk.toString().split(/[\r\n]+/);
    lines.forEach((line) => {
        printLine(line.replace(/\s+$/, ""));
    });
});

let isError = false;
let isRunning = false;
let stackTraceLine = 0;
let color = "";
/**
 *
 * @param {string} line input line
 */
function printLine(line) {
    if (line.trim() === "") {
        return;
    }
    if (line.match(/^\S+\s\S+\sERROR/)) {
        isError = true;
        stackTraceLine = 0;
    } else if (line.match(/^\s+at\s/)) {
        isError = true;
        stackTraceLine++;
    } else if (line.match(/^\S+\s\[\S+\]\s/)) {
        isError = false;
        stackTraceLine = 0;
    }

    if (line.indexOf("Started SubAppRunner") > -1) {
        color = "33";
        isRunning = true;
    } else {
        color = line.indexOf("MessageBrokerPublisher") > -1 ? "36" : "37";
    }

    if (isError) {
        if (stackTraceLine < 5) {
            console.log("\x1b[31m%s\x1b[0m", line);
        }
    } else if (isRunning) {
        console.log("\x1b[33m| \x1b[0m\x1b[%sm%s\x1b[0m", color, line);
    } else {
        console.log("\x1b[%sm%s\x1b[0m", color, line);
    }
}

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
