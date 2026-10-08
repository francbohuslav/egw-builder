import { describe, expect, it } from "vitest";
import { CommandError } from "../src/infra/errors";
import { parseNetstatForPort, runCommand } from "../src/infra/process";
import { findTopProcessId, parseProcessList } from "../src/steps/kill";

describe("parseNetstatForPort", () => {
  const output = [
    "  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1180",
    "  TCP    0.0.0.0:80930          0.0.0.0:0              LISTENING       999",
    "  TCP    0.0.0.0:8093           0.0.0.0:0              LISTENING       4242",
    "  TCP    127.0.0.1:8094         0.0.0.0:0              LISTENING       777",
  ].join("\r\n");

  it("finds the PID of the exact port", () => {
    expect(parseNetstatForPort(output, 8093)).toBe("4242");
  });

  it("does not confuse a port with a longer one which starts the same", () => {
    expect(parseNetstatForPort(output, 8093)).not.toBe("999");
  });

  it("returns null if nothing listens there", () => {
    expect(parseNetstatForPort(output, 8095)).toBeNull();
    // only the 0.0.0.0 binding counts
    expect(parseNetstatForPort(output, 8094)).toBeNull();
  });
});

describe("process tree", () => {
  it("parses the JSON of PowerShell, also for a single process and for none", () => {
    expect(parseProcessList('[{"ParentProcessId":1,"ProcessId":2},{"ParentProcessId":2,"ProcessId":3}]')).toEqual([
      { parentProcessId: 1, processId: 2 },
      { parentProcessId: 2, processId: 3 },
    ]);
    expect(parseProcessList('{"ParentProcessId":1,"ProcessId":2}')).toEqual([{ parentProcessId: 1, processId: 2 }]);
    expect(parseProcessList("[]")).toEqual([]);
    expect(parseProcessList("")).toEqual([]);
  });

  it("climbs to the highest listed ancestor", () => {
    // 10 (cmd start) -> 20 (cmd coloredGradle) -> 30 (java); 5 (explorer) is not listed
    const processes = [
      { processId: 10, parentProcessId: 5 },
      { processId: 20, parentProcessId: 10 },
      { processId: 30, parentProcessId: 20 },
    ];
    expect(findTopProcessId(processes, 30)).toBe(10);
    expect(findTopProcessId(processes, 20)).toBe(10);
    expect(findTopProcessId(processes, 10)).toBe(10);
  });

  it("keeps a process which is not in the list", () => {
    expect(findTopProcessId([{ processId: 1, parentProcessId: 0 }], 99)).toBe(99);
  });

  it("does not loop forever when PIDs form a cycle", () => {
    const processes = [
      { processId: 1, parentProcessId: 2 },
      { processId: 2, parentProcessId: 1 },
    ];
    expect(findTopProcessId(processes, 1)).toBe(2);
  });
});

describe("runCommand", () => {
  it("returns the output", async () => {
    const { stdOut } = await runCommand(process.execPath, ["-e", "console.log('hello')"], { silent: true });
    expect(stdOut.trim()).toBe("hello");
  });

  it("passes arguments with spaces untouched", async () => {
    const { stdOut } = await runCommand(process.execPath, ["-e", "console.log(process.argv[1])", "a b  c"], { silent: true });
    expect(stdOut.trim()).toBe("a b  c");
  });

  it("rejects with the exit code and the output of a failed command", async () => {
    const error = await runCommand(process.execPath, ["-e", "console.error('boom'); process.exit(3)"], { silent: true }).catch((e) => e);
    expect(error).toBeInstanceOf(CommandError);
    expect(error.exitCode).toBe(3);
    expect(error.stdErr).toContain("boom");
  });

  it("rejects instead of hanging when the command does not exist", async () => {
    const error = await runCommand("this-command-does-not-exist-xyz", [], { silent: true }).catch((e) => e);
    expect(error).toBeInstanceOf(CommandError);
    expect(error.exitCode).toBeNull();
  });
});
