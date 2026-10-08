import { unlinkSync } from "node:fs";
import decompress from "decompress";
import { BuilderError } from "../infra/errors";
import { downloadFile } from "../infra/http";
import { logger } from "../infra/logger";

export interface DownloadAndUnpackOptions {
  /** Name of the tool for messages, e.g. "Java 11". */
  label: string;
  url: string;
  /** Temporary zip file. It is removed after unpacking. */
  tempFile: string;
  /** Folder where the content of the zip is unpacked. */
  destination: string;
  /** Number of leading path segments to drop from the zip entries, 1 removes a wrapping folder. */
  strip?: number;
}

/** Downloads a zip archive of a tool and unpacks it. Used for JDK, Node.js and JMeter. */
export async function downloadAndUnpack(options: DownloadAndUnpackOptions): Promise<void> {
  const { label, url, tempFile, destination, strip = 0 } = options;
  logger.info(`Downloading ${label}...`);
  await downloadFile(url, tempFile);
  try {
    logger.info(`Unzipping ${label}...`);
    await decompress(tempFile, destination, { strip });
  } catch (error) {
    throw new BuilderError(`Unzipping of ${label} failed`, { cause: error });
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {
      // The temporary file is only a leftover, never fail because of it
    }
  }
  logger.info(`${label} ready`);
}
