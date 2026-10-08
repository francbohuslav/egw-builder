// Colorizer of application logs, used by coloredGradle.cmd and asyncJobLogs.cmd:
//   java ... | node coloredGradle.js <CODE> <logFile>
// The code is TypeScript in `src/log-colorizer.ts`.
require("tsx/cjs");

require("./src/log-colorizer.ts").runColorizer(process.argv[2], process.argv[3]);
