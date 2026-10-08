/**
 * Console output of the builder.
 *
 * Everything the user sees goes through this module, so the colors are defined in one place and
 * `-verbose` can reveal more details (every command, its exit code and duration) without touching the callers.
 */

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgCyan: "\x1b[46m",
} as const;

class Logger {
  /** Prints every executed command (with its working directory). Switched on once the real work starts. */
  echoCommands = false;
  /** Prints technical details (exit codes, durations, resolved paths). Set by `-verbose`. */
  verbose = false;

  /** Section header. Also puts the text to the window title, so a long build can be tracked from the taskbar. */
  message(text: string): void {
    console.log(`${ANSI.cyan}%s${ANSI.reset}`, text);
    process.stdout.write(`\x1b]0;EB: ${text}\x07`);
  }

  /** Plain text without any decoration. */
  info(text = ""): void {
    console.log(text);
  }

  success(text: string): void {
    console.log(`${ANSI.green}%s${ANSI.reset}`, text);
  }

  warning(text: string): void {
    console.log(`${ANSI.yellow}%s${ANSI.reset}`, text);
  }

  error(text: string): void {
    console.log(`${ANSI.red}%s${ANSI.reset}`, text);
  }

  /** Echo of an executed command. Printed only when {@link echoCommands} is on. */
  command(text: string): void {
    if (this.echoCommands) {
      console.log(`${ANSI.magenta}%s${ANSI.reset}`, text);
    }
  }

  /** Technical detail, printed only with `-verbose`. */
  debug(text: string): void {
    if (this.verbose) {
      console.log(`${ANSI.white}[debug] %s${ANSI.reset}`, text);
    }
  }

  /** Prints a text exactly as given (no title change, no color). Used for machine readable output. */
  raw(text: string): void {
    console.log(text);
  }

  /** The framed box shown after a failure. */
  troubleshootingHelp(): void {
    const url = "https://uuapp.plus4u.net/uu-bookkit-maing01/c250fdbbe5af44c28cdbdd050c5febf4/book/page?code=troubleshooting";
    const message = `Go to page ${ANSI.green}${url}${ANSI.reset} and search how to solve that.`;
    // The frame is as wide as the visible text, the color codes do not count
    const visibleLength = `Go to page ${url} and search how to solve that.`.length;
    const line = `${ANSI.bold}${ANSI.bgCyan}${ANSI.white}${"=".repeat(visibleLength)}${ANSI.reset}`;
    console.log(line);
    console.log("");
    console.log(`${ANSI.bold}${ANSI.red}Damned, ERROR!!!${ANSI.reset}`);
    console.log(message);
    console.log("");
    console.log(line);
    console.log("");
  }
}

export const logger = new Logger();
export { ANSI };
