import { OgieError } from "./ogie-error";

/**
 * Error for HTTP/network failures
 */
export class FetchError extends OgieError {
  readonly statusCode?: number;

  constructor(
    message: string,
    url: string,
    statusCode?: number,
    cause?: Error
  ) {
    super(message, "FETCH_ERROR", url, cause);
    this.name = "FetchError";
    this.statusCode = statusCode;
  }
}

/**
 * Type guard to check if an error is a FetchError
 */
export const isFetchError = (error: unknown): error is FetchError =>
  error instanceof FetchError;
