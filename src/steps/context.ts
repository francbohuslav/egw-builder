import type { Options } from "../cli/options";
import type { Workspace } from "../domain/workspace";

/** Everything a step needs to know. Created once in `main.ts` after the options and the Java were resolved. */
export interface RunContext {
  ws: Workspace;
  options: Options;
  /** Folder of the JDK used for building and running the apps. Empty means the Java from PATH. */
  jdk: string;
}
