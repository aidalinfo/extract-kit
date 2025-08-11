/**
 * Comprehensive error handling utilities for the office-to-markdown library
 */

import { 
  FileConversionException, 
  MissingDependencyException, 
  UnsupportedFormatException 
} from "../types/converter.js";

/**
 * Error codes for different types of failures
 */
export enum ErrorCode {
  // File-related errors
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  FILE_ACCESS_DENIED = "FILE_ACCESS_DENIED", 
  FILE_CORRUPTED = "FILE_CORRUPTED",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  
  // Format-related errors
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  INVALID_FILE_STRUCTURE = "INVALID_FILE_STRUCTURE",
  
  // Dependency errors
  MISSING_DEPENDENCY = "MISSING_DEPENDENCY",
  DEPENDENCY_VERSION_MISMATCH = "DEPENDENCY_VERSION_MISMATCH",
  
  // Conversion errors
  CONVERSION_FAILED = "CONVERSION_FAILED",
  HTML_PARSING_FAILED = "HTML_PARSING_FAILED",
  MARKDOWN_GENERATION_FAILED = "MARKDOWN_GENERATION_FAILED",
  PREPROCESSING_FAILED = "PREPROCESSING_FAILED",
  
  // Network errors (for future web support)
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  
  // General errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  INVALID_INPUT = "INVALID_INPUT"
}

/**
 * Enhanced error class with error codes and context
 */
export class OfficeToMarkdownError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, any>;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    super(message);
    this.name = "OfficeToMarkdownError";
    this.code = code;
    this.context = context;
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OfficeToMarkdownError);
    }
  }

  /**
   * Convert to JSON for logging or API responses
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
  /**
   * Wrap a function with error handling
   */
  static async wrapAsync<T>(
    fn: () => Promise<T>,
    errorContext?: Record<string, any>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw ErrorHandler.enhanceError(error, errorContext);
    }
  }

  /**
   * Wrap a synchronous function with error handling
   */
  static wrap<T>(
    fn: () => T,
    errorContext?: Record<string, any>
  ): T {
    try {
      return fn();
    } catch (error) {
      throw ErrorHandler.enhanceError(error, errorContext);
    }
  }

  /**
   * Enhance an error with additional context and proper error codes
   */
  static enhanceError(
    error: unknown,
    context?: Record<string, any>
  ): OfficeToMarkdownError {
    // If it's already our enhanced error, just return it
    if (error instanceof OfficeToMarkdownError) {
      return error;
    }

    // Handle known error types
    if (error instanceof FileConversionException) {
      return new OfficeToMarkdownError(
        error.message,
        ErrorCode.CONVERSION_FAILED,
        context,
        error.originalError
      );
    }

    if (error instanceof MissingDependencyException) {
      return new OfficeToMarkdownError(
        error.message,
        ErrorCode.MISSING_DEPENDENCY,
        context,
        error instanceof Error ? error : undefined
      );
    }

    if (error instanceof UnsupportedFormatException) {
      return new OfficeToMarkdownError(
        error.message,
        ErrorCode.UNSUPPORTED_FORMAT,
        context,
        error instanceof Error ? error : undefined
      );
    }

    // Handle standard Error types
    if (error instanceof Error) {
      const code = ErrorHandler.getErrorCodeFromMessage(error.message);
      return new OfficeToMarkdownError(
        error.message,
        code,
        context,
        error
      );
    }

    // Handle non-Error objects
    const message = typeof error === "string" ? error : "Unknown error occurred";
    return new OfficeToMarkdownError(
      message,
      ErrorCode.UNKNOWN_ERROR,
      { ...context, originalError: error },
      undefined
    );
  }

  /**
   * Attempt to determine error code from error message
   */
  private static getErrorCodeFromMessage(message: string): ErrorCode {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("no such file") || lowerMessage.includes("file not found")) {
      return ErrorCode.FILE_NOT_FOUND;
    }

    if (lowerMessage.includes("permission denied") || lowerMessage.includes("access denied")) {
      return ErrorCode.FILE_ACCESS_DENIED;
    }

    if (lowerMessage.includes("corrupted") || lowerMessage.includes("invalid zip")) {
      return ErrorCode.FILE_CORRUPTED;
    }

    if (lowerMessage.includes("too large") || lowerMessage.includes("file size")) {
      return ErrorCode.FILE_TOO_LARGE;
    }

    if (lowerMessage.includes("timeout")) {
      return ErrorCode.TIMEOUT_ERROR;
    }

    if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
      return ErrorCode.NETWORK_ERROR;
    }

    if (lowerMessage.includes("html") || lowerMessage.includes("parse")) {
      return ErrorCode.HTML_PARSING_FAILED;
    }

    if (lowerMessage.includes("markdown")) {
      return ErrorCode.MARKDOWN_GENERATION_FAILED;
    }

    return ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Create a file-related error
   */
  static createFileError(
    filePath: string,
    originalError: Error,
    operation: string = "process"
  ): OfficeToMarkdownError {
    let code = ErrorCode.UNKNOWN_ERROR;
    let message = `Failed to ${operation} file: ${filePath}`;

    if (originalError.message.includes("ENOENT")) {
      code = ErrorCode.FILE_NOT_FOUND;
      message = `File not found: ${filePath}`;
    } else if (originalError.message.includes("EACCES")) {
      code = ErrorCode.FILE_ACCESS_DENIED;
      message = `Access denied to file: ${filePath}`;
    } else if (originalError.message.includes("EMFILE") || originalError.message.includes("ENFILE")) {
      code = ErrorCode.FILE_ACCESS_DENIED;
      message = `Too many open files. Cannot access: ${filePath}`;
    }

    return new OfficeToMarkdownError(
      message,
      code,
      { filePath, operation },
      originalError
    );
  }

  /**
   * Create a conversion-specific error
   */
  static createConversionError(
    phase: "preprocessing" | "docx-to-html" | "html-to-markdown" | "unknown",
    originalError: Error,
    context?: Record<string, any>
  ): OfficeToMarkdownError {
    let code = ErrorCode.CONVERSION_FAILED;
    let message = `Conversion failed during ${phase}`;

    switch (phase) {
      case "preprocessing":
        code = ErrorCode.PREPROCESSING_FAILED;
        message = "Failed to preprocess document (math equations, etc.)";
        break;
      case "docx-to-html":
        code = ErrorCode.CONVERSION_FAILED;
        message = "Failed to convert DOCX to HTML";
        break;
      case "html-to-markdown":
        code = ErrorCode.MARKDOWN_GENERATION_FAILED;
        message = "Failed to convert HTML to Markdown";
        break;
    }

    return new OfficeToMarkdownError(
      `${message}: ${originalError.message}`,
      code,
      { phase, ...context },
      originalError
    );
  }

  /**
   * Log error with appropriate level
   */
  static logError(error: OfficeToMarkdownError | Error, logger?: any): void {
    const logFn = logger || console;
    
    if (error instanceof OfficeToMarkdownError) {
      // Use structured logging if available
      if (typeof logFn.error === "function") {
        logFn.error("Conversion error:", error.toJSON());
      } else {
        console.error("Conversion error:", error.message, error.context);
      }
    } else {
      if (typeof logFn.error === "function") {
        logFn.error("Unexpected error:", error);
      } else {
        console.error("Unexpected error:", error);
      }
    }
  }

  /**
   * Check if error is recoverable (e.g., retry might help)
   */
  static isRecoverable(error: OfficeToMarkdownError | Error): boolean {
    if (error instanceof OfficeToMarkdownError) {
      const recoverableCodes = [
        ErrorCode.NETWORK_ERROR,
        ErrorCode.TIMEOUT_ERROR,
        ErrorCode.FILE_ACCESS_DENIED, // Sometimes temporary
      ];
      return recoverableCodes.includes(error.code);
    }

    return false;
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: OfficeToMarkdownError | Error): string {
    if (!(error instanceof OfficeToMarkdownError)) {
      return "An unexpected error occurred during conversion.";
    }

    switch (error.code) {
      case ErrorCode.FILE_NOT_FOUND:
        return "The specified file could not be found. Please check the file path and try again.";
      
      case ErrorCode.FILE_ACCESS_DENIED:
        return "Permission denied. Please check file permissions and ensure the file is not open in another application.";
      
      case ErrorCode.FILE_CORRUPTED:
        return "The file appears to be corrupted or invalid. Please try with a different file.";
      
      case ErrorCode.FILE_TOO_LARGE:
        return "The file is too large to process. Please try with a smaller file.";
      
      case ErrorCode.UNSUPPORTED_FORMAT:
        return "This file format is not supported. Currently supported formats: DOCX.";
      
      case ErrorCode.MISSING_DEPENDENCY:
        return "A required component is missing. Please reinstall the library.";
      
      case ErrorCode.CONVERSION_FAILED:
        return "The document could not be converted. The file may be corrupted or contain unsupported elements.";
      
      case ErrorCode.NETWORK_ERROR:
        return "Network error occurred. Please check your internet connection and try again.";
      
      case ErrorCode.TIMEOUT_ERROR:
        return "The operation timed out. Please try again with a smaller file.";
      
      default:
        return error.message || "An error occurred during conversion.";
    }
  }
}

/**
 * Decorator for automatic error handling (if decorators are enabled)
 */
export function handleErrors(
  errorContext?: Record<string, any>
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const enhancedError = ErrorHandler.enhanceError(error, {
          method: propertyName,
          ...errorContext
        });
        ErrorHandler.logError(enhancedError);
        throw enhancedError;
      }
    };

    return descriptor;
  };
}