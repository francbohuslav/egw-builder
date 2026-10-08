/** Shared types of the builder. */

/** Codes of all EGW applications handled by the builder. */
export const PROJECT_CODES = ["DG", "MR", "FTP", "EMAIL", "ECP", "IEC62325", "AS24", "IEC60870", "ACER", "KAFKA", "HTTP", "MERGED"] as const;
export type ProjectCode = (typeof PROJECT_CODES)[number];

/** Inits which do not belong to any application project. */
export type ExtraInitCode = "ASYNC" | "BSg02";

export type JavaVersion = "1.8" | "11" | "17" | "21";

export interface Project {
  code: ProjectCode;
  /** Folder of the repository, relative to the EGW root folder, e.g. "uu_energygateway_datagatewayg01". */
  folder: string;
  /** Folder of the server module in the repository, e.g. "uu_energygateway_datagatewayg01-server". */
  server: string;
  /** Folder of the HI (web client) module in the repository. Only MR and MERGED have it. */
  hi?: string;
  /** JMeter test of the application, e.g. "message-registry.jmx". Applications without a test have none. */
  testFile?: string;
  port: number;
  /** Name of the application in URL, e.g. "uu-energygateway-messageregistryg01". */
  webName: string;
  /** Libraries whose `profiles.json` is merged into the metamodel of this project: library folder -> project which contains it. */
  libraryProfiles: Record<string, ProjectCode>;
}

export interface JavaAppInfo {
  javaVersion: JavaVersion;
  maxMemory: string;
  mainClassName: string;
}

export interface TestStepInfo {
  label: string;
  asserts: string[];
  responseData: string;
}

export interface TestStepResult {
  success: boolean;
  info: TestStepInfo;
}

/** Result of one JMeter test file. */
export interface ProjectTestResult {
  newFailed: TestStepInfo[];
  newPassed: TestStepInfo[];
  knownFailed: TestStepInfo[];
  allPassed: TestStepInfo[];
}

/** Test steps grouped by the test name (project code or additional test name). */
export type TestStepsByName = Record<string, TestStepInfo[]>;

/** Output of `-info`. It is consumed by the GUI runner, do not change the shape. */
export interface InfoStructure {
  projects: {
    code: ProjectCode;
    supportTests: boolean;
    directory: string;
    branch: string;
  }[];
  gui: {
    branch: string;
  };
  additionalTests: string[];
  messageBroker: string;
  environmentFiles: string[];
}
