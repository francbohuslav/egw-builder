/**
 * Error types of the builder.
 *
 * Code never terminates the process on its own. It throws a {@link BuilderError} and the single
 * handler in `main.ts` prints it and sets the exit code. This keeps stack traces and `cause` chains intact.
 */

export interface BuilderErrorOptions {
  /** Original error which led to this one. */
  cause?: unknown;
  /** Print the troubleshooting hint (link to the documentation) after the message. Default true. */
  showHelp?: boolean;
}

/** Expected failure of the builder (bad input, failed step, missing file...). */
export class BuilderError extends Error {
  /** When false, the error is a user mistake (bad arguments) and the troubleshooting hint would only be noise. */
  readonly showHelp: boolean;

  constructor(message: string, options: BuilderErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "BuilderError";
    this.showHelp = options.showHelp ?? true;
  }
}

export interface CommandErrorDetails {
  command: string;
  args: readonly string[];
  cwd: string;
  /** Exit code, or null when the process could not be started at all. */
  exitCode: number | null;
  stdOut: string;
  stdErr: string;
}

/** An external command failed (non-zero exit code or the process could not be started). */
export class CommandError extends BuilderError {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly exitCode: number | null;
  readonly stdOut: string;
  readonly stdErr: string;

  constructor(details: CommandErrorDetails, cause?: unknown) {
    const commandLine = [details.command, ...details.args].join(" ");
    const reason = details.exitCode === null ? "could not be started" : `failed with exit code ${details.exitCode}`;
    super(`Command ${reason}: ${commandLine}\n  in ${details.cwd}`, { cause });
    this.name = "CommandError";
    this.command = details.command;
    this.args = details.args;
    this.cwd = details.cwd;
    this.exitCode = details.exitCode;
    this.stdOut = details.stdOut;
    this.stdErr = details.stdErr;
  }
}

/** Returns a readable text of any thrown value, including the chain of causes. */
export function describeError(error: unknown): string {
  const lines: string[] = [];
  let current: unknown = error;
  let depth = 0;
  while (current !== undefined && current !== null && depth < 5) {
    if (current instanceof Error) {
      lines.push(depth === 0 ? current.message : `Caused by: ${current.message}`);
      current = current.cause;
    } else {
      lines.push(String(current));
      break;
    }
    depth++;
  }
  return lines.join("\n");
}

/** Throws {@link BuilderError} when the value is null or undefined, otherwise returns it. */
export function required<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new BuilderError(message);
  }
  return value;
}
