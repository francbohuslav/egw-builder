import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { JavaAppInfo, JavaVersion, Project } from "../domain/types";
import type { Workspace } from "../domain/workspace";
import { BuilderError } from "../infra/errors";
import { readTextFile, writeTextFile } from "../infra/files";
import { logger } from "../infra/logger";
import { downloadAndUnpack } from "./download";

/** Where each JDK comes from and whether the zip contains a wrapping folder which must be dropped. */
const JDK_DOWNLOADS: Record<JavaVersion, { url: string; strip: number }> = {
  "1.8": { url: "https://www.dropbox.com/scl/fi/f3oj86wjrzcrdvtj5jkfs/jdk1.8.0_421.zip?rlkey=i3gk3d0d2ojtxe0w27az2y5fz&dl=1", strip: 1 },
  "11": { url: "https://www.dropbox.com/s/ofb3m5ag3cy05k6/corretto-11.0.12.zip?dl=1", strip: 0 },
  "17": { url: "https://cdn.azul.com/zulu/bin/zulu17.44.15-ca-jdk17.0.8-win_x64.zip", strip: 1 },
  "21": { url: "https://cdn.azul.com/zulu/bin/zulu21.38.21-ca-jdk21.0.5-win_x64.zip", strip: 1 },
};

/** Folder where the builder keeps its downloaded JDKs. */
export function getJavaFolder(builderDir: string): string {
  return join(builderDir, "java");
}

/** Path of the `.bat` which runs JMeter with the right Java. */
export function getJmeterBat(builderDir: string): string {
  return join(getJavaFolder(builderDir), "runJmeter.bat");
}

/**
 * Detects the Java version, memory and main class of an application from its Gradle files.
 * The values are needed to start the app exactly like Gradle would.
 */
export function getSubAppJavaInfo(ws: Workspace, project: Project): JavaAppInfo {
  const serverGradle = join(ws.serverDir(project), "build.gradle");
  if (!existsSync(serverGradle)) {
    throw new BuilderError(`File ${serverGradle} not found`);
  }
  const javaMatch = readTextFile(serverGradle).match(/^\s*sourceCompatibility\s*=\s*([\d.]+)/m);
  if (!javaMatch?.[1]) {
    throw new BuilderError(`Can not detect sourceCompatibility in ${serverGradle}`);
  }
  const javaVersion = javaMatch[1] as JavaVersion;

  const projectGradle = join(ws.dir(project), "build.gradle");
  if (!existsSync(projectGradle)) {
    throw new BuilderError(`File ${projectGradle} not found`);
  }
  const projectGradleContent = readTextFile(projectGradle);

  let maxMemory = "1G";
  // applicationDefaultJvmArgs = ["-Xmx3g"]
  const memoryMatch = projectGradleContent.match(/applicationDefaultJvmArgs\s*=.*-xmx(\d+[gm])/im);
  if (memoryMatch?.[1]) {
    maxMemory = memoryMatch[1];
  } else {
    logger.error(`Can not detect applicationDefaultJvmArgs, using ${maxMemory}`);
  }

  // mainClassName = 'uu.energygateway.ftpendpoint.SubAppRunner'
  const mainClassMatch = projectGradleContent.match(/mainClassName\s*=.*(uu\..*\.SubAppRunner)/im);
  if (!mainClassMatch?.[1]) {
    throw new BuilderError(`Can not detect mainClassName in ${projectGradle}`);
  }
  return { javaVersion, maxMemory, mainClassName: mainClassMatch[1] };
}

export function describeJavaInfo(javaInfo: JavaAppInfo, jdk: string): string {
  const jdkText = jdk ? `. JDK ${jdk} used.` : ". Default Java used.";
  return `Java ${javaInfo.javaVersion} detected${jdkText} Max memory = ${javaInfo.maxMemory}`;
}

/** Downloads the JDK of the given version unless it is already there. Returns its folder. */
export async function ensureJdk(builderDir: string, javaVersion: JavaVersion): Promise<string> {
  const download = JDK_DOWNLOADS[javaVersion];
  if (!download) {
    throw new BuilderError(`Unsupported Java version '${javaVersion}', supported: ${Object.keys(JDK_DOWNLOADS).join(", ")}`);
  }
  const folder = getJavaFolder(builderDir);
  mkdirSync(folder, { recursive: true });
  const destination = join(folder, javaVersion);
  if (!existsSync(destination)) {
    await downloadAndUnpack({
      label: `Java ${javaVersion}`,
      url: download.url,
      tempFile: join(builderDir, "java.zip"),
      destination,
      strip: download.strip,
    });
  }
  return destination;
}

/**
 * Makes sure JMeter has a Java to run on (it needs 1.8 or 11) and creates `runJmeter.bat`, which sets that Java up
 * and starts JMeter. The batch file is the only thing which is called later.
 */
export async function ensureJavaForJmeter(builderDir: string): Promise<void> {
  const folder = getJavaFolder(builderDir);
  let javaVersion: JavaVersion;
  if (existsSync(join(folder, "1.8"))) {
    javaVersion = "1.8";
  } else if (existsSync(join(folder, "11"))) {
    javaVersion = "11";
  } else {
    await ensureJdk(builderDir, "1.8");
    javaVersion = "1.8";
  }
  const runner = getJmeterBat(builderDir);
  if (!existsSync(runner)) {
    const content = [
      "@echo off",
      `set JAVA_HOME=${join(folder, javaVersion)}`,
      "set PATH=%JAVA_HOME%/bin;%PATH%",
      `${join(builderDir, "jmeter", "bin", "jmeter.bat")} %*`,
    ];
    writeTextFile(runner, content.join("\r\n"));
  }
}
