import { describe, expect, it } from "vitest";
import { lastJsonToOptions, optionsToLastJson } from "../src/cli/last";
import { getHelp, parseArguments } from "../src/cli/options";
import { BuilderError } from "../src/infra/errors";

describe("parseArguments", () => {
  it("is case insensitive for options but not for values", () => {
    const options = parseArguments(["-FOLDER", "../V6_4", "-BuildDG", "-initbsg02", "-uid", "12-8835-1"]);
    expect(options.folder).toBe("../V6_4");
    expect([...options.build]).toEqual(["DG"]);
    expect([...options.init]).toEqual(["BSg02"]);
    expect(options.uid).toBe("12-8835-1");
  });

  it("-build selects all applications, npm and GUI but not the merged app", () => {
    const { build } = parseArguments(["-build"]);
    expect(build.has("DG")).toBe(true);
    expect(build.has("HTTP")).toBe(true);
    expect(build.has("Npm")).toBe(true);
    expect(build.has("Gui")).toBe(true);
    expect(build.has("MERGED")).toBe(false);
  });

  it("-buildMRAll selects MR with npm and GUI", () => {
    expect([...parseArguments(["-buildMRAll"]).build].sort()).toEqual(["Gui", "MR", "Npm"]);
  });

  it("-init selects the applications and both extra servers", () => {
    const { init } = parseArguments(["-init"]);
    expect(init.has("ASYNC")).toBe(true);
    expect(init.has("BSg02")).toBe(true);
    expect(init.has("MERGED" as never)).toBe(false);
  });

  it("-run does not start the merged app, -runMERGED does", () => {
    expect(parseArguments(["-run"]).run.has("MERGED")).toBe(false);
    expect(parseArguments(["-runMERGED"]).run.has("MERGED")).toBe(true);
  });

  it("splits additional tests and strips quotes from the version", () => {
    const options = parseArguments(["-tests", "Quick,Web", "-version", '"6.5.0-SNAPSHOT"']);
    expect(options.additionalTests).toEqual(["Quick", "Web"]);
    expect(options.version).toBe("6.5.0-SNAPSHOT");
  });

  it("rejects an unknown option instead of ignoring it", () => {
    expect(() => parseArguments(["-buildDGG"])).toThrow(BuilderError);
  });

  it("rejects an option without its value", () => {
    expect(() => parseArguments(["-folder"])).toThrow(/needs a value/);
  });

  it("the help mentions every option which has a flag", () => {
    const help = getHelp("node index").join("\n");
    for (const flag of ["-buildKAFKA", "-runMERGED", "-initBSg02", "-testHTTP", "-tests", "-last"]) {
      expect(help).toContain(flag);
    }
  });
});

describe("last.json", () => {
  /** Shape written by the GUI runner (C# `Structure`), see EgwBuilderRunner. */
  const runnerJson = {
    folder: "C:\\Gateway\\v6_4",
    version: "",
    clear: true,
    metamodel: false,
    messageBroker: "amqp",
    isMerged: false,
    build: true,
    buildDG: true,
    buildMR: true,
    buildNpm: false,
    buildGui: false,
    buildFTP: true,
    run: true,
    runDG: true,
    runMR: true,
    runFTP: true,
    runMERGED: false,
    init: true,
    initDG: true,
    initASYNC: true,
    initBSg02: false,
    uid: "3167-3373-3998-0000",
    tests: false,
    testDG: false,
    additionalTests: ["Quick"],
    environmentFile: "env_localhost_A",
    payloadPersistenceStrategy: "Azure",
  };

  it("reads the file written by the GUI runner", () => {
    const options = lastJsonToOptions(runnerJson);
    expect(options.last).toBe(true);
    expect(options.folder).toBe("C:\\Gateway\\v6_4");
    expect(options.version).toBeUndefined();
    expect([...options.build].sort()).toEqual(["DG", "FTP", "MR"]);
    expect([...options.run].sort()).toEqual(["DG", "FTP", "MR"]);
    expect([...options.init].sort()).toEqual(["ASYNC", "DG"]);
    expect(options.test.size).toBe(0);
    expect(options.additionalTests).toEqual(["Quick"]);
    expect(options.environmentFile).toBe("env_localhost_A");
    expect(options.payloadPersistenceStrategy).toBe("Azure");
  });

  it("falls back to the default environment when the file has none", () => {
    expect(lastJsonToOptions({ folder: "x" }).environmentFile).toBe("env_localhost_builder");
  });

  it("writes the keys which the GUI runner reads", () => {
    const json = optionsToLastJson(parseArguments(["-folder", "x", "-buildDG", "-runMR", "-initASYNC", "-testFTP", "-tests", "Quick"]));
    expect(json).toMatchObject({
      folder: "x",
      build: true,
      buildDG: true,
      buildMR: false,
      buildNpm: false,
      run: true,
      runMR: true,
      runMERGED: false,
      init: true,
      initASYNC: true,
      initBSg02: false,
      tests: true,
      testFTP: true,
      additionalTests: ["Quick"],
    });
  });

  it("survives a round trip", () => {
    const original = parseArguments([
      "-folder",
      "x",
      "-build",
      "-run",
      "-init",
      "-test",
      "-uid",
      "u",
      "-isMerged",
      "-clear",
      "-environmentFile",
      "env",
    ]);
    const restored = lastJsonToOptions(JSON.parse(JSON.stringify(optionsToLastJson(original))));
    expect(restored).toMatchObject({ folder: "x", uid: "u", isMerged: true, clear: true, environmentFile: "env" });
    expect([...restored.build].sort()).toEqual([...original.build].sort());
    expect([...restored.run].sort()).toEqual([...original.run].sort());
    expect([...restored.init].sort()).toEqual([...original.init].sort());
    expect([...restored.test].sort()).toEqual([...original.test].sort());
  });
});
