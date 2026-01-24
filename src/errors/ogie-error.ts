import type { ErrorCode } from "./types";

/**
 * Base error class for all ogie errors
 */
export class OgieError extends Error {
  readonly code: ErrorCode;
  readonly url?: string;

  constructor(message: string, code: ErrorCode, url?: string, cause?: Error) {
    super(message, { cause });
    this.name = "OgieError";
    this.code = code;
    this.url = url;
  }
}

/**
 * Type guard to check if an error is an OgieError
 */
export const isOgieError = (error: unknown): error is OgieError =>
  error instanceof OgieError;
