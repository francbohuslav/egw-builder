import { spawn } from "node:child_process";
import { CommandError } from "./errors";
import { ANSI, logger } from "./logger";

export interface RunOptions {
  /** Working directory of the command. Default is the directory of the builder process. */
  cwd?: string;
  /** Do not echo the output of the command to the console (it is still returned). */
  silent?: boolean;
  /** Run through the shell. Needed for `.bat` / `.cmd` files. */
  shell?: boolean;
}

export interface RunResult {
  stdOut: string;
  stdErr: string;
}

/**
 * Runs an external command and waits for its end.
 *
 * Arguments are passed as an array (never split by spaces), so paths with spaces work.
 * Rejects with {@link CommandError} when the process cannot be started or ends with a non-zero exit code;
 * the error carries the whole captured output.
 */
export function runCommand(command: string, args: readonly string[] = [], options: RunOptions = {}): Promise<RunResult> {
  const cwd = options.cwd ?? process.cwd();
  return new Promise((resolve, reject) => {
    let stdOut = "";
    let stdErr = "";
    let settled = false;
    const startedAt = Date.now();
    logger.command(`${cwd}> ${[command, ...args].join(" ")}`);

    const spawnArgs = options.shell ? args.map(quoteForShell) : [...args];
    const child = spawn(command, spawnArgs, { cwd, shell: options.shell });

    child.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdOut += text;
      if (!options.silent) {
        console.log(text);
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      const text = data.toString();
      stdErr += text;
      if (!options.silent) {
        // Many tools print warnings to stderr, do not paint them as errors
        const color = text.toLowerCase().includes("warn") ? ANSI.yellow : ANSI.red;
        console.log(`${color}%s${ANSI.reset}`, text);
      }
    });

    // 'error' is emitted when the process cannot be spawned (e.g. ENOENT). 'close' may not follow, so settle here.
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new CommandError({ command, args, cwd, exitCode: null, stdOut, stdErr }, error));
    });

    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }
      settled = true;
      logger.debug(`exit code ${exitCode} after ${Date.now() - startedAt} ms: ${command}`);
      if (exitCode) {
        reject(new CommandError({ command, args, cwd, exitCode, stdOut, stdErr }));
      } else {
        resolve({ stdOut, stdErr });
      }
    });
  });
}

/** With `shell: true` Node joins the arguments by spaces without any quoting, so an argument with a space would fall apart. */
function quoteForShell(arg: string): string {
  return /\s/.test(arg) && !/^".*"$/.test(arg) ? `"${arg}"` : arg;
}

/**
 * Starts a command line in a separate process and does not wait for it.
 *
 * The command line is interpreted by the shell, which is what `start "title" /MIN ...` needs to open a new console window.
 * The process cannot be observed or killed from here.
 */
export function startDetached(commandLine: string, cwd?: string): void {
  logger.command(`${cwd ?? process.cwd()}> ${commandLine}`);
  const child = spawn(commandLine, [], { cwd, detached: true, shell: true, stdio: "ignore" });
  child.unref();
}

/** Finds the PID which listens on the given port by `netstat`, or null if nothing listens there. */
export async function getProcessIdByPort(port: number): Promise<string | null> {
  const { stdOut } = await runCommand("netstat", ["-ano"], { silent: true });
  return parseNetstatForPort(stdOut, port);
}

/**
 * Extracts PID of the first line of `netstat -ano` output, which belongs to the given port.
 * Only `0.0.0.0:<port>` bindings are considered, like the apps are started.
 */
export function parseNetstatForPort(netstatOutput: string, port: number): string | null {
  const portPattern = new RegExp(`0\\.0\\.0\\.0:${port}\\s`);
  const line = netstatOutput.split(/[\r\n]+/).find((l) => portPattern.test(l));
  return line?.match(/\d+\s*$/)?.[0].trim() ?? null;
}

/** Waits the given time. */
export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
