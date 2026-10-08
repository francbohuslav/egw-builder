import { appendFileSync, closeSync, existsSync, openSync, unlinkSync } from "node:fs";
import { EOL } from "node:os";
import { decode } from "html-entities";
import { logger } from "./infra/logger";

/**
 * Colorizer of the application logs.
 *
 * The apps are started as `java ... | node coloredGradle.js <CODE> <logFile>` (see `coloredGradle.cmd`). This module reads the output of Java
 * from the standard input, writes every line unchanged to the log file and prints a shortened, colored version to the console.
 * Important lines (errors, received messages) stand out, noise is gray or hidden. The window title shows the state of the app.
 */

const COLORS = {
  red: "31",
  yellow: "33",
  cyan: "36",
  green: "32",
  bgBlue: "44",
  gray: "90",
  white: "37",
};

/** Lines which are never shown in the console (they are in the log file). They are repeated for every request. */
const HIDDEN_LINE_PATTERNS = [
  /OidcAuthentication.*authenticate invoked/,
  /\.OidcSession.*Initializing Identity and Client Application Identity values\./,
  /AuthenticationHandler - Creating new session with request 'SecurityContextHolderAwareRequestWrapper.*' and response 'org.springframework.security.web.header.HeaderWriterFilter/,
  /WARN.*ClientCredentialsHandler.*Missing configuration of OidcClient for a[ws]id.*and service oidcg02. Using/,
  /ERROR.*ClientCredentialsHandler.*Use case context not available, unable to get awid. Using/,
];

/** Lines of the running app which are gray, because they only say that the app is alive. */
const UNIMPORTANT_LINE_PATTERNS = [
  /started.*route/i,
  /finished.*route/i,
  /AsyncJobHelper/i,
  /JobPlanModel/i,
  /JobPlanController/i,
  /Trying to lock/i,
  /Unlocking the lock/i,
];

export function isLoggableLine(shortLine: string): boolean {
  return !HIDDEN_LINE_PATTERNS.some((pattern) => pattern.test(shortLine));
}

export function isUnimportantLine(line: string): boolean {
  return UNIMPORTANT_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

/** Errors which happen on every start and do not need the attention (the window title is not switched to ERROR). */
export function isLowPriorityError(line: string): boolean {
  return line.includes("Mappings.json not found on path");
}

/** Lines which report a message arriving to or leaving the application. */
export function isReceivedMessage(line: string): boolean {
  if (line.includes("IncomingMessageReceivedConsumer") && !line.includes("Subscribing") && !line.includes("Subscription done")) {
    return true;
  }
  if (line.includes("DefaultIncomingMessageRecognizer")) {
    return true;
  }
  if (line.includes("FtpOutgoingMessageSenderConsumer") && !line.includes("Message will be processed by")) {
    return true;
  }
  if (
    line.includes("EmailOutgoingMessageSenderConsumer") &&
    !line.includes("Message will be processed by") &&
    !line.includes("RabbitMqMessageBroker")
  ) {
    return true;
  }
  return line.includes("New message arrived");
}

/** Shortens the line: removes the thread, abbreviates the well-known IDs and long package names. Stack trace lines stay intact. */
export function shortText(input: string): string {
  let line = input.replace(/^(\S+)\s\[\S+\]/g, "$1");
  line = line.replace(/11111111111111111111111111111111/g, "11...11");
  line = line.replace(/(\d\d)0000000000000000000000000000(\d\d)/g, "$1...$2");
  if (!/^\s+at/.test(line)) {
    line = line.replace(/(\suu\.)\S+(\.[^\s.]+)/g, "$1.$2");
    line = line.replace(/(\sorg\.)\S+(\.[^\s.]+)/g, "$1.$2");
  }
  return line;
}

/**
 * The log of the AsyncJob docker container is JSON wrapped in a docker compose prefix. Converts it to the format of the other apps.
 * A line which is not such JSON is returned only trimmed.
 */
export function convertDockerLine(input: string): string {
  let line = input.replace(/^\S+\s+\|/, "").trim();
  line = line.replace("TRACE_LOG", "").trim();
  const match = line.match(/^([A-Z]+)\s({.*})$/);
  if (match) {
    try {
      const json = JSON.parse(match[2] as string);
      line = `${String(json.eventTime).replace(/^.*T/, "").replace(",", ".")} [${json.threadName}] ${match[1]} ${json.logger} - ${decode(json.message)}`;
      if (json.stackTrace) {
        if (json.resourceUri) {
          line += `\n    resourceUri: ${decode(json.resourceUri)}`;
        }
        line += `\n${json.stackTrace}`;
      }
    } catch {
      // Not valid JSON, the line stays as it is
    }
  }
  return line.trim();
}

/** Keeps the state between lines (are we in a stack trace? is the app already running?) and prints them. */
export class LogColorizer {
  private isError = false;
  private isRunning = false;
  private containsError = false;
  private prevIsErrorToInform = false;
  private stackTraceLine = 0;
  private prevLineTime = Date.now();

  constructor(
    private readonly projectCode: string,
    private readonly write: (line: string) => void,
  ) {}

  /** Window title: `<CODE> <state>`. */
  title(message: string): void {
    process.stdout.write(`\x1b]0;${this.projectCode} ${message}\x07`);
  }

  /** Handles one line of the output: logs it and prints it colored. */
  processLine(line: string): void {
    const isErrorStart = /^\S+\s\S+\sERROR/.test(line);
    if (isErrorStart) {
      this.isError = true;
      this.stackTraceLine = 0;
    } else if (this.isError && /Caused by/.test(line)) {
      this.stackTraceLine = 3;
    } else if (/^\S+\s\[\S+\]\s/.test(line)) {
      this.isError = false;
      this.stackTraceLine = 0;
    } else {
      this.stackTraceLine++;
    }
    const isErrorToInform = isErrorStart && !isLowPriorityError(line);

    let color: string;
    if (line.includes("Started SubAppRunner")) {
      color = COLORS.yellow;
      this.isRunning = true;
      if (!this.containsError) {
        this.title("");
      }
    } else if (this.isRunning && line.includes("MessageBrokerPublisher")) {
      color = COLORS.cyan;
    } else if (this.isRunning && isReceivedMessage(line)) {
      color = line.includes("Message data:") || line.includes("Header data:") ? COLORS.green : COLORS.bgBlue;
    } else if (this.isRunning && isUnimportantLine(line)) {
      color = COLORS.gray;
    } else {
      color = COLORS.white;
    }
    if (!this.prevIsErrorToInform && isErrorToInform) {
      this.containsError = true;
      this.title("ERROR");
    }

    this.write(line);
    const short = shortText(line);

    const now = Date.now();
    if (now - this.prevLineTime > 10_000) {
      // A pause in the log is highlighted by an empty line
      console.log();
    }
    if (isLoggableLine(short)) {
      if (this.isError) {
        // Only the beginning of a stack trace is shown
        if (this.stackTraceLine < 5) {
          console.log(`\x1b[${COLORS.red}m%s\x1b[0m`, short);
        }
      } else if (this.isRunning) {
        console.log(`\x1b[${COLORS.yellow}m| \x1b[0m\x1b[%sm%s\x1b[0m`, color, short);
      } else {
        console.log("\x1b[%sm%s\x1b[0m", color, short);
      }
    }
    this.prevLineTime = now;
    this.prevIsErrorToInform = isErrorToInform;
  }
}

/** Reads stdin until it ends. `AsyncJob` is a docker log in JSON, it is converted first. */
export function runColorizer(projectCode: string, logFile: string): void {
  if (existsSync(logFile)) {
    unlinkSync(logFile);
  }
  const fd = openSync(logFile, "w");
  const colorizer = new LogColorizer(projectCode, (line) => appendFileSync(fd, line + EOL));
  colorizer.title("starting");

  const handleLine = (rawLine: string) => {
    const line = rawLine.replace(/\s+$/, "");
    if (line.trim() === "") {
      return;
    }
    if (projectCode === "AsyncJob") {
      for (const part of convertDockerLine(line).split("\n")) {
        colorizer.processLine(part);
      }
    } else {
      colorizer.processLine(line);
    }
  };

  // A chunk can end in the middle of a line, so the incomplete tail waits for the next chunk
  let pending = "";
  process.stdin.on("data", (chunk: Buffer) => {
    const parts = (pending + chunk.toString()).split(/[\r\n]+/);
    pending = parts.pop() ?? "";
    parts.forEach(handleLine);
  });
  process.stdin.on("end", () => {
    handleLine(pending);
    closeSync(fd);
    console.log("");
    logger.troubleshootingHelp();
  });
}
