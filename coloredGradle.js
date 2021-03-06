const fs = require("fs");
const os = require("os");

const stdin = process.openStdin();
const projectCode = process.argv[2];
const logFile = process.argv[3];
if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
}
title("starting");
fs.open(logFile, "w", function (err, fd) {
    if (err) {
        throw "could not open file: " + err;
    }

    stdin.on("data", function (chunk) {
        const lines = chunk.toString().split(/[\r\n]+/);
        lines.forEach((line) => {
            printLine(line.replace(/\s+$/, ""), fd);
        });
    });
});

let isError = false;
let isRunning = false;
let stackTraceLine = 0;
let color = "";
let prevLineTime = new Date().getTime();
/**
 *
 * @param {string} line input line
 */
function printLine(line, fd) {
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
        title("");
    } else if (isRunning && line.indexOf("MessageBrokerPublisher") > -1) {
        color = "36";
    } else if (
        (isRunning && (line.indexOf("IncomingMessageReceivedConsumer") > -1 || line.indexOf("DefaultIncomingMessageRecognizer") > -1)) ||
        line.indexOf("New message arrived") > -1
    ) {
        // Incoming messsage
        color = "44";
    } else if (isRunning && (line.match(/started.*route/i) || line.match(/finished.*route/i))) {
        // Unimportant message
        color = "90";
    } else {
        color = "37";
    }

    logToFile(fd, line);
    const shortLine = shortText(line);

    const now = new Date().getTime();
    if (now - prevLineTime > 10 * 1000) {
        console.log();
    }
    if (isError) {
        if (stackTraceLine < 5) {
            console.log("\x1b[31m%s\x1b[0m", shortLine);
        }
    } else if (isRunning) {
        console.log("\x1b[33m| \x1b[0m\x1b[%sm%s\x1b[0m", color, shortLine);
    } else {
        console.log("\x1b[%sm%s\x1b[0m", color, shortLine);
    }
    prevLineTime = now;
}

function shortText(line) {
    line = line.replace(/^(\S+)\s\[\S+\]/g, "$1");
    line = line.replace(/(\suu\.)\S+(\.[^\s.]+)/g, "$1.$2");
    line = line.replace(/(\sorg\.)\S+(\.[^\s.]+)/g, "$1.$2");
    line = line.replace(/11111111111111111111111111111111/g, "11...11");
    return line;
}

/**
 *
 * @param {number} fd
 * @param {string} line
 */
function logToFile(fd, line) {
    fs.appendFile(fd, line + os.EOL, function (err) {
        if (err) throw "error writing file: " + err;
    });
}

function title(message) {
    process.stdout.write(String.fromCharCode(27) + "]0;" + projectCode + " " + message + String.fromCharCode(7));
}

// for (let i = 0; i < 200; i++) {
//     console.log("\x1b[%sm%s\x1b[0m", i, i + "text");
// }

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
FgGray = "\x1b[90m"

BgBlack = "\x1b[40m"
BgRed = "\x1b[41m"
BgGreen = "\x1b[42m"
BgYellow = "\x1b[43m"
BgBlue = "\x1b[44m"
BgMagenta = "\x1b[45m"
BgCyan = "\x1b[46m"
BgWhite = "\x1b[47m"
*/
