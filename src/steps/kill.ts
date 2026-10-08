import type { Project } from "../domain/types";
import { logger } from "../infra/logger";
import { getProcessIdByPort, runCommand } from "../infra/process";

export interface ProcessInfo {
  processId: number;
  parentProcessId: number;
}

/**
 * PowerShell prints the processes as JSON, so no text table has to be parsed.
 * `@(...)` makes the result an array even for a single process and `[]` for none.
 * (`wmic`, which was used before, is removed from new Windows versions.)
 */
const LIST_PROCESSES_SCRIPT =
  "ConvertTo-Json -Compress -InputObject @(Get-CimInstance Win32_Process" +
  " | Where-Object { @('java.exe','cmd.exe','conhost.exe') -contains $_.Name }" +
  " | ForEach-Object { [pscustomobject]@{ ParentProcessId = [int]$_.ParentProcessId; ProcessId = [int]$_.ProcessId } })";

/** Parses the JSON printed by {@link LIST_PROCESSES_SCRIPT}. */
export function parseProcessList(json: string): ProcessInfo[] {
  const parsed: unknown = JSON.parse(json.trim() || "[]");
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.map((item) => {
    const { ProcessId, ParentProcessId } = item as { ProcessId: number; ParentProcessId: number };
    return { processId: ProcessId, parentProcessId: ParentProcessId };
  });
}

/**
 * Finds the root of the process tree which the given process belongs to.
 *
 * The app is started as `cmd (start) -> cmd (coloredGradle) -> java + node`. Killing only the java process would leave the console
 * window open, so the whole tree is killed from its top. The top is the highest ancestor which is a listed (java / cmd / conhost) process.
 * Ancestors which are not listed (explorer, the builder...) must not be touched.
 */
export function findTopProcessId(processes: readonly ProcessInfo[], processId: number): number {
  const parentOf = new Map(processes.map((p) => [p.processId, p.parentProcessId]));
  const visited = new Set<number>([processId]);
  let top = processId;
  while (true) {
    const parent = parentOf.get(top);
    // Stop when the parent is not a listed process, or when PIDs were reused and form a cycle
    if (!parent || !parentOf.has(parent) || visited.has(parent)) {
      return top;
    }
    top = parent;
    visited.add(top);
  }
}

/**
 * Kills the application of the project if it listens on its port.
 *
 * @returns true if some process was killed
 */
export async function killProject(project: Project): Promise<boolean> {
  const pid = await getProcessIdByPort(project.port);
  if (!pid) {
    return false;
  }
  const processId = Number(pid);
  let topProcessId = processId;
  try {
    const { stdOut } = await runCommand("powershell", ["-NoProfile", "-NonInteractive", "-Command", LIST_PROCESSES_SCRIPT], { silent: true });
    topProcessId = findTopProcessId(parseProcessList(stdOut), processId);
  } catch (error) {
    // The listening process is still killed (with its children), only its console window may stay open
    logger.warning(
      `Cannot detect process tree of ${project.code}, killing the process ${processId} only: ${error instanceof Error ? error.message : error}`,
    );
  }
  logger.info(`Killing process tree ${processId}.`);
  await runCommand("taskkill", ["/F", "/T", "/PID", String(topProcessId)]);
  return true;
}
