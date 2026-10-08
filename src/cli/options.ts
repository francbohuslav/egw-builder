import { type ExtraInitCode, PROJECT_CODES, type ProjectCode } from "../domain/types";
import { BuilderError } from "../infra/errors";

/** What can be built: every project plus the npm packages and the GUI components of MR. */
export type BuildTarget = ProjectCode | "Npm" | "Gui";
/** What can be initialized: applications (not the merged one) and the extra servers. */
export type InitTarget = Exclude<ProjectCode, "MERGED"> | ExtraInitCode;
/** Applications which have JMeter tests (the merged app is tested through the others). */
export type TestTarget = Exclude<ProjectCode, "MERGED">;

/**
 * Everything the user can ask for. It is the single, fully parsed form of the command line, `last.json` is converted to it too.
 * Which steps run is decided only from these values, there are no questions asked interactively.
 */
export interface Options {
  /** Folder with all EGW repositories. */
  folder: string | undefined;
  /** Repeat the previous run, all other options are taken from `last.json`. */
  last: boolean;
  /** New version to be written to all projects. */
  version: string | undefined;
  /** Stop and remove docker containers. */
  clear: boolean;
  /** Regenerate the metamodel of Business Territory. */
  metamodel: boolean;
  /** Message broker to be set in application properties. */
  messageBroker: string | undefined;
  /** Use the merged application for inits and tests. */
  isMerged: boolean;
  /** Run unit tests while building. */
  unitTests: boolean;
  /** Wait for each started app before starting the next one. */
  runInSequence: boolean;
  /** Do not run the tests, only show results of the previous run. */
  onlyShowResults: boolean;
  /** Open console window with logs of AsyncJob and finish. */
  logAsyncJob: boolean;
  /** Print versions of the projects and finish. Machine readable. */
  getVersions: boolean;
  /** Print JSON with the description of the workspace and finish. Machine readable. */
  getInfo: boolean;
  /** Print technical details. Not persisted to `last.json`. */
  verbose: boolean;
  /** Print the syntax and finish. */
  help: boolean;
  environmentFile: string | undefined;
  payloadPersistenceStrategy: string | undefined;
  /** UID of the user, required by inits and tests. */
  uid: string | undefined;
  build: Set<BuildTarget>;
  run: Set<ProjectCode>;
  init: Set<InitTarget>;
  test: Set<TestTarget>;
  /** Special tests which are not tied to one application, e.g. "Quick" or "Web". */
  additionalTests: string[];
}

export function createDefaultOptions(): Options {
  return {
    folder: undefined,
    last: false,
    version: undefined,
    clear: false,
    metamodel: false,
    messageBroker: undefined,
    isMerged: false,
    unitTests: false,
    runInSequence: false,
    onlyShowResults: false,
    logAsyncJob: false,
    getVersions: false,
    getInfo: false,
    verbose: false,
    help: false,
    environmentFile: undefined,
    payloadPersistenceStrategy: undefined,
    uid: undefined,
    build: new Set(),
    run: new Set(),
    init: new Set(),
    test: new Set(),
    additionalTests: [],
  };
}

/** Human readable names of the applications, used by the help. */
export const PROJECT_LABELS: Record<ProjectCode, string> = {
  DG: "Datagateway",
  MR: "Message Registry",
  FTP: "FTP endpoint",
  EMAIL: "E-mail endpoint",
  ECP: "ECP endpoint",
  IEC62325: "IEC62325 endpoint",
  AS24: "AS24 endpoint",
  IEC60870: "IEC60870 endpoint",
  ACER: "ACER endpoint",
  KAFKA: "KAFKA endpoint",
  HTTP: "HTTP endpoint",
  MERGED: "merged application",
};

type FlagHandler = (options: Options) => void;
type ValueHandler = (options: Options, value: string) => void;

/** Options without a value, e.g. `-clear`. Keys are lower case, the command line is case insensitive. */
const FLAGS = new Map<string, FlagHandler>();
/** Options followed by a value, e.g. `-folder <name>`. */
const VALUE_FLAGS = new Map<string, ValueHandler>();

function defineFlag(name: string, handler: FlagHandler): void {
  FLAGS.set(name.toLowerCase(), handler);
}

function defineValueFlag(name: string, handler: ValueHandler): void {
  VALUE_FLAGS.set(name.toLowerCase(), handler);
}

defineFlag("-last", (o) => {
  o.last = true;
});
defineFlag("-clear", (o) => {
  o.clear = true;
});
defineFlag("-unitTests", (o) => {
  o.unitTests = true;
});
defineFlag("-metamodel", (o) => {
  o.metamodel = true;
});
defineFlag("-results", (o) => {
  o.onlyShowResults = true;
});
defineFlag("-runInSequence", (o) => {
  o.runInSequence = true;
});
defineFlag("-isMerged", (o) => {
  o.isMerged = true;
});
defineFlag("-logAsyncJob", (o) => {
  o.logAsyncJob = true;
});
defineFlag("-getVersions", (o) => {
  o.getVersions = true;
});
defineFlag("-info", (o) => {
  o.getInfo = true;
});
defineFlag("-verbose", (o) => {
  o.verbose = true;
});
for (const name of ["-help", "-h", "-?", "--help"]) {
  defineFlag(name, (o) => {
    o.help = true;
  });
}

defineValueFlag("-folder", (o, v) => {
  o.folder = v;
});
// Quotes are stripped, the GUI runner passes the version in them
defineValueFlag("-version", (o, v) => {
  o.version = v.replace(/^"/, "").replace(/"$/, "");
});
defineValueFlag("-environmentFile", (o, v) => {
  o.environmentFile = v;
});
defineValueFlag("-payloadPersistenceStrategy", (o, v) => {
  o.payloadPersistenceStrategy = v;
});
defineValueFlag("-messageBroker", (o, v) => {
  o.messageBroker = v;
});
defineValueFlag("-uid", (o, v) => {
  o.uid = v;
});
defineValueFlag("-tests", (o, v) => {
  o.additionalTests = v.split(",");
});

/** Applications which `-build`, `-run`, `-init` and `-test` select. The merged app is never part of "all" intentionally. */
export const ALL_APPLICATIONS: TestTarget[] = PROJECT_CODES.filter((c): c is TestTarget => c !== "MERGED");

// -build, -buildDG, ..., -buildNpm, -buildGui, -buildMRAll
defineFlag("-build", (o) => {
  for (const code of ALL_APPLICATIONS) {
    o.build.add(code);
  }
  o.build.add("Npm");
  o.build.add("Gui");
});
for (const code of PROJECT_CODES) {
  defineFlag(`-build${code}`, (o) => o.build.add(code));
  defineFlag(`-run${code}`, (o) => o.run.add(code));
}
defineFlag("-buildNpm", (o) => o.build.add("Npm"));
defineFlag("-buildGui", (o) => o.build.add("Gui"));
defineFlag("-buildMRAll", (o) => {
  o.build.add("MR");
  o.build.add("Npm");
  o.build.add("Gui");
});

defineFlag("-run", (o) => {
  for (const code of ALL_APPLICATIONS) {
    o.run.add(code);
  }
});

defineFlag("-init", (o) => {
  for (const code of ALL_APPLICATIONS) {
    o.init.add(code);
  }
  o.init.add("ASYNC");
  o.init.add("BSg02");
});
defineFlag("-initASYNC", (o) => o.init.add("ASYNC"));
defineFlag("-initBSg02", (o) => o.init.add("BSg02"));

defineFlag("-test", (o) => {
  for (const code of ALL_APPLICATIONS) {
    o.test.add(code);
  }
});
for (const code of ALL_APPLICATIONS) {
  defineFlag(`-init${code}`, (o) => o.init.add(code));
  defineFlag(`-test${code}`, (o) => o.test.add(code));
}

/**
 * Parses the command line arguments (without `node` and the script name).
 *
 * @throws BuilderError for an unknown option or a missing value; silently ignoring a typo would run something else than the user wanted.
 */
export function parseArguments(args: readonly string[]): Options {
  const options = createDefaultOptions();
  const rest = [...args];
  while (rest.length > 0) {
    const arg = rest.shift() as string;
    const key = arg.toLowerCase();
    const flag = FLAGS.get(key);
    if (flag) {
      flag(options);
      continue;
    }
    const valueFlag = VALUE_FLAGS.get(key);
    if (valueFlag) {
      const value = rest.shift();
      if (value === undefined) {
        throw new BuilderError(`Option ${arg} needs a value.`, { showHelp: false });
      }
      valueFlag(options, value);
      continue;
    }
    throw new BuilderError(`Unknown option ${arg}. Run without arguments or with -help to see the syntax.`, { showHelp: false });
  }
  return options;
}

/** Text of `-help`. It is generated from {@link PROJECT_LABELS}, so a new project cannot be forgotten there. */
export function getHelp(scriptName: string): string[] {
  const lines: string[] = [
    `${scriptName} [OPTIONS]`,
    "Options:",
    "  -folder <name>       - Name of folder where all projects are stored, mandatory.",
    "  -last                - Execute with settings from previous run.",
    "",
    "  -version <ver>       - Version to be stored in build.gradle, uucloud-*.json, ...etc.",
    "  -clear               - Shutdown and remove docker containers.",
    "  -unitTests           - Build or run with unit tests. Option -build or -run* must be used.",
    "  -metamodel           - Regenerates metamodel for Business Territory.",
    "  -logAsyncJob         - Shows console windows for AsyncJob",
    "  -runInSequence       - SubApps are started gradually.",
    "  -isMerged            - Merged application will be used for inits, tests, etc.",
    "  -environmentFile <f> - Environment file <f> will be used. Default: first env_localhost* file of MR",
    "  -payloadPersistenceStrategy <s> - Sets payload persistence strategy.",
    "  -messageBroker <b>   - Sets message broker in application properties.",
    "  -results             - Do not run tests, only show results of the previous run.",
    "  -getVersions         - Prints versions of projects.",
    "  -info                - Prints JSON description of the workspace.",
    "  -verbose             - Prints technical details (exit codes, durations).",
    "",
    "  -build               - Builds all apps by gradle",
    "  -buildMRAll          - Builds Message Registry backend and frontend",
    "  -buildNpm            - Install node modules",
    "  -buildGui            - Builds GUI components",
  ];
  const section = (prefix: string, verb: (label: string) => string, codes: readonly ProjectCode[], extras: [string, string][] = []) => {
    lines.push("");
    for (const code of codes) {
      lines.push(`${`  -${prefix}${code}`.padEnd(23)}- ${verb(PROJECT_LABELS[code])}`);
    }
    for (const [name, description] of extras) {
      lines.push(`${`  -${name}`.padEnd(23)}- ${description}`);
    }
  };
  section("build", (l) => `Builds ${l}`, PROJECT_CODES);
  lines.push("", "  -run                 - Runs all subApps");
  section("run", (l) => `Runs ${l}`, PROJECT_CODES);
  lines.push("", "  -init                - Runs init commands of all apps (creates workspace, sets permissions)");
  section("init", (l) => `Runs init commands of ${l}`, ALL_APPLICATIONS, [
    ["initASYNC", "Runs init commands of AsyncJob server"],
    ["initBSg02", "Runs init commands of BSg02"],
  ]);
  lines.push("  -uid <your-uid>      - UID of actual user");
  lines.push("", "  -test                - Tests all subApps by jmeter");
  section("test", (l) => `Tests ${l} by jmeter`, ALL_APPLICATIONS);
  lines.push("  -tests <t1>,<t2>,... - Runs special tests (use command -info to detect them)");
  return lines;
}
