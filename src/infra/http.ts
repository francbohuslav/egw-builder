import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { BuilderError } from "./errors";
import { logger } from "./logger";
import { delay } from "./process";

export interface WaitForUrlOptions {
  /** How long to wait for the first answer. Default 300 s. */
  timeoutSeconds?: number;
  /** Pause between attempts. Default 2000 ms. */
  intervalMs?: number;
  /** Timeout of one request. A hanging connection must not block the polling. Default 5000 ms. */
  requestTimeoutMs?: number;
}

/**
 * Polls the URL until the server answers. Any HTTP status counts as an answer, only a refused or timed out connection is a failure.
 * The application is considered ready as soon as it listens.
 *
 * @throws BuilderError when the server does not answer in time; `cause` is the last network error.
 */
export async function waitForUrl(url: string, options: WaitForUrlOptions = {}): Promise<void> {
  const { timeoutSeconds = 300, intervalMs = 2000, requestTimeoutMs = 5000 } = options;
  const deadline = Date.now() + timeoutSeconds * 1000;
  let lastError: unknown;
  let attempts = 0;
  while (Date.now() < deadline) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) });
      if (attempts > 0) {
        console.log("...ready!");
      }
      return;
    } catch (error) {
      lastError = error;
    }
    if (attempts === 0) {
      logger.info(`Pinging url ${url}`);
    }
    attempts++;
    process.stdout.write(".");
    await delay(intervalMs);
  }
  process.stdout.write("\n");
  throw new BuilderError(`Application is not ready: ${url} does not answer for ${timeoutSeconds} s`, { cause: lastError });
}

/** Downloads a file into `destination`. A partially downloaded file is removed on failure. */
export async function downloadFile(url: string, destination: string): Promise<void> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new BuilderError(`Download of ${url} failed: HTTP ${response.status} ${response.statusText}`);
  }
  try {
    await pipeline(Readable.fromWeb(response.body as unknown as NodeReadableStream), createWriteStream(destination));
  } catch (error) {
    await unlink(destination).catch(() => undefined);
    throw new BuilderError(`Download of ${url} failed`, { cause: error });
  }
}
