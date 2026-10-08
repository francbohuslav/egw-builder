// Entry point of the builder. The code is TypeScript in `src/`, `tsx` runs it directly (no build step).
// The file stays a plain `index.js`, because `node index ...` is how the GUI runner and the .bat files start the builder.
try {
  require("tsx/cjs");
} catch (error) {
  console.error("Cannot load 'tsx'. Run 'npm ci' in the builder folder first.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

require("./src/main.ts")
  .main(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode;
  });
