import { DOMParser } from "xmldom";
import * as xpath from "xpath";
import type { ProjectTestResult, TestStepResult } from "../domain/types";

/** A failed test which is already known has the task code at the end of its name, e.g. "some test - T123". */
const KNOWN_FAILURE_LABEL = /\sT[0-9]+$/;

/** Text of the first node matching the XPath relative to `context`, or undefined if there is none. */
function textOf(expression: string, context: Node): string | undefined {
  const node = xpath.select1(expression, context) as Node | undefined;
  return node?.textContent ?? undefined;
}

/**
 * Parses the XML result file of JMeter (listener format with `lb` = label and `s` = success attributes).
 * See https://svn.apache.org/repos/asf/jmeter/tags/v2_4/docs/usermanual/listeners.html
 */
export function parseTestSteps(content: string): TestStepResult[] {
  const doc = new DOMParser().parseFromString(content);
  const nodes = xpath.select("//*[@lb]", doc) as Element[];
  return nodes.map((node) => {
    const assertionResults = xpath.select("./assertionResult", node) as Element[];
    return {
      success: node.getAttribute("s") === "true",
      info: {
        label: node.getAttribute("lb") ?? "",
        asserts: assertionResults
          .filter((result) => textOf("./failure", result) === "true")
          .map((result) => (textOf("./failureMessage", result) ?? "").replace(/[\r\n]+/g, " ")),
        responseData: textOf("./responseData", node) ?? "",
      },
    };
  });
}

/**
 * Splits the steps by the outcome:
 * - `newFailed`: failed and nobody works on it yet
 * - `knownFailed`: failed, but already has the task code in its name
 * - `newPassed`: has the task code in its name, but passes now, so the code should be removed
 * - `allPassed`: all passed steps
 */
export function classifySteps(steps: readonly TestStepResult[]): ProjectTestResult {
  const isKnown = (step: TestStepResult) => KNOWN_FAILURE_LABEL.test(step.info.label);
  return {
    newFailed: steps.filter((s) => !s.success && !isKnown(s)).map((s) => s.info),
    newPassed: steps.filter((s) => s.success && isKnown(s)).map((s) => s.info),
    knownFailed: steps.filter((s) => !s.success && isKnown(s)).map((s) => s.info),
    allPassed: steps.filter((s) => s.success).map((s) => s.info),
  };
}

/** Formats seconds as `m:ss`. */
export function formatTime(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded - minutes * 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
