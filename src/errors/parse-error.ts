import { OgieError } from "./ogie-error";

/**
 * Error for HTML parsing failures
 */
export class ParseError extends OgieError {
  constructor(message: string, url?: string, cause?: Error) {
    super(message, "PARSE_ERROR", url, cause);
    this.name = "ParseError";
  }
}

/**
 * Type guard to check if an error is a ParseError
 */
export const isParseError = (error: unknown): error is ParseError =>
  error instanceof ParseError;
