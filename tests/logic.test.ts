import { describe, expect, it } from "vitest";
import { BuilderError } from "../src/infra/errors";
import { convertDockerLine, isLoggableLine, isReceivedMessage, shortText } from "../src/log-colorizer";
import { classifySteps, formatTime, parseTestSteps } from "../src/reports/results";
import { parseContainerIds } from "../src/steps/docker";
import { pickDataGatewayCopyFolder } from "../src/steps/iec-clone";
import { switchMessageBroker } from "../src/steps/message-broker";
import { validateRequiredProperties } from "../src/tools/jmeter";
import { cmdWithNode } from "../src/tools/node";

describe("JMeter result file", () => {
  const xml = `<?xml version="1.0"?>
<testResults version="1.2">
  <httpSample lb="create message" s="true"><responseData>ok</responseData></httpSample>
  <httpSample lb="send" s="false">
    <assertionResult><name>a</name><failure>true</failure><failureMessage>Test failed: bad
status</failureMessage></assertionResult>
    <assertionResult><name>b</name><failure>false</failure><failureMessage>fine</failureMessage></assertionResult>
    <responseData>{"error":1}</responseData>
  </httpSample>
  <httpSample lb="known problem T123" s="false"><responseData></responseData></httpSample>
  <httpSample lb="fixed already T7" s="true"><responseData></responseData></httpSample>
</testResults>`;

  it("parses steps with failed assertions only", () => {
    const steps = parseTestSteps(xml);
    expect(steps).toHaveLength(4);
    expect(steps[0]).toMatchObject({ success: true, info: { label: "create message", asserts: [], responseData: "ok" } });
    expect(steps[1]?.success).toBe(false);
    expect(steps[1]?.info.asserts).toEqual(["Test failed: bad status"]);
  });

  it("classifies by the task code at the end of the label", () => {
    const result = classifySteps(parseTestSteps(xml));
    expect(result.newFailed.map((s) => s.label)).toEqual(["send"]);
    expect(result.knownFailed.map((s) => s.label)).toEqual(["known problem T123"]);
    expect(result.newPassed.map((s) => s.label)).toEqual(["fixed already T7"]);
    expect(result.allPassed.map((s) => s.label)).toEqual(["create message", "fixed already T7"]);
  });

  it("formats time as m:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65.4)).toBe("1:05");
    expect(formatTime(3600)).toBe("60:00");
  });
});

describe("validateRequiredProperties", () => {
  const jmx = "{__P(env)} {__P(uid, none)} {__P( server_dir )} {__P(big_file_size_kb,10)}";

  it("drops -J parameters which the plan does not read and keeps the rest", () => {
    const result = validateRequiredProperties(jmx, "x.jmx", ["-n", "-t", "x.jmx", "-Jenv=a", "-Juid=u", "-Jserver_dir=s", "-Junused=1"]);
    expect(result).toEqual(["-n", "-t", "x.jmx", "-Jenv=a", "-Juid=u", "-Jserver_dir=s"]);
  });

  it("fails when the plan reads a property which was not passed", () => {
    expect(() => validateRequiredProperties(jmx, "x.jmx", ["-Jenv=a"])).toThrow(/server_dir, uid/);
  });

  it("does not require properties which have a default in the plan", () => {
    expect(() => validateRequiredProperties("{__P(enableAsyncJob)}", "x.jmx", [])).not.toThrow();
  });
});

describe("docker", () => {
  it("takes container IDs from the listing without the header and the empty line", () => {
    const output = "CONTAINER ID   IMAGE   NAMES\nabcdef123456   mongo   egw-tests_mongo\n\n";
    expect(parseContainerIds(output)).toEqual(["abcdef123456"]);
    expect(parseContainerIds("CONTAINER ID   IMAGE\n")).toEqual([]);
  });
});

describe("IEC62325 copy of DG", () => {
  const dg = "uu_energygateway_datagatewayg01";
  const none = () => false;

  it("uses the first listed copy when none exists", () => {
    expect(pickDataGatewayCopyFolder([`${dg}_iec`, `${dg}_other`, dg], dg, "iec", none)).toBe(`${dg}_iec`);
  });

  it("prefers an existing copy", () => {
    expect(pickDataGatewayCopyFolder([`${dg}_iec`, `${dg}_other`, dg], dg, "iec", (p) => p === `${dg}_other`)).toBe(`${dg}_other`);
  });

  it("fails when the original folder is first or nothing is listed", () => {
    expect(() => pickDataGatewayCopyFolder([dg, `${dg}_iec`], dg, "iec", none)).toThrow(BuilderError);
    expect(() => pickDataGatewayCopyFolder([], dg, "iec", none)).toThrow(BuilderError);
  });
});

describe("message broker", () => {
  const properties = ["primaryMessageBroker.mbidUri=amqp://localhost", "#primaryMessageBroker.mbidUri=kafka://localhost", "other=1"].join("\n");

  it("switches the active broker line", () => {
    const changed = switchMessageBroker(properties, "kafka");
    expect(changed).toBe(["#primaryMessageBroker.mbidUri=amqp://localhost", "primaryMessageBroker.mbidUri=kafka://localhost", "other=1"].join("\n"));
  });

  it("is idempotent", () => {
    const once = switchMessageBroker(properties, "kafka");
    expect(switchMessageBroker(once, "kafka")).toBe(once);
  });

  it("does not treat the type as a regular expression", () => {
    expect(() => switchMessageBroker(properties, "(")).not.toThrow();
  });
});

describe("Node.js for the GUI", () => {
  it("puts the folder first in PATH for the command", () => {
    expect(cmdWithNode("C:\\n", "npm", "ci")).toEqual(["/C", "set", "PATH=C:\\n;%PATH%", "&", "npm", "ci"]);
    expect(cmdWithNode(undefined, "npm", "ci")).toEqual(["/C", "npm", "ci"]);
  });
});

describe("log colorizer", () => {
  it("shortens thread, ids and package names, but not stack traces", () => {
    expect(shortText("12:00:00.000 [main] INFO uu.energygateway.ftp.Some message")).toBe("12:00:00.000 INFO uu...Some message");
    expect(shortText("x 11111111111111111111111111111111 y")).toBe("x 11...11 y");
    const trace = "    at uu.energygateway.ftp.Some.method(Some.java:1)";
    expect(shortText(trace)).toBe(trace);
  });

  it("hides the repeated authentication noise", () => {
    expect(isLoggableLine("... OidcAuthentication x authenticate invoked")).toBe(false);
    expect(isLoggableLine("something else")).toBe(true);
  });

  it("recognizes received messages but not the subscription", () => {
    expect(isReceivedMessage("IncomingMessageReceivedConsumer got it")).toBe(true);
    expect(isReceivedMessage("IncomingMessageReceivedConsumer Subscribing")).toBe(false);
  });

  it("converts the JSON log of the AsyncJob container", () => {
    const json = JSON.stringify({ eventTime: "2024-01-01T12:00:00,123", threadName: "t1", logger: "Log", message: "a &amp; b" });
    expect(convertDockerLine(`asyncJob  | INFO ${json}`)).toBe("12:00:00.123 [t1] INFO Log - a & b");
    expect(convertDockerLine("asyncJob  | plain text")).toBe("plain text");
  });
});
