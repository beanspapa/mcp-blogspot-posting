import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { logInfo, logWarning, logError } from "./logger.js";

/**
 * Error handling utility class
 */
export class ErrorHandler {
  /**
   * Handle tool execution errors
   */
  static handleToolError(error: unknown, toolName: string): never {
    if (error instanceof McpError) {
      logError(`Tool '${toolName}' failed: ` + error.message);
      throw error;
    }

    if (error instanceof Error) {
      logError(`Tool '${toolName}' failed: ` + error.message);
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error.message}`
      );
    }

    logError(`Tool '${toolName}' failed with unknown error: ` + error);
    throw new McpError(
      ErrorCode.InternalError,
      "Tool execution failed with unknown error"
    );
  }

  /**
   * Handle resource access errors
   */
  static handleResourceError(error: unknown, uri: string): never {
    if (error instanceof McpError) {
      logError(`Resource '${uri}' failed: ` + error.message);
      throw error;
    }

    if (error instanceof Error) {
      logError(`Resource '${uri}' failed: ` + error.message);
      throw new McpError(
        ErrorCode.InternalError,
        `Resource access failed: ${error.message}`
      );
    }

    logError(`Resource '${uri}' failed with unknown error: ` + error);
    throw new McpError(
      ErrorCode.InternalError,
      "Resource access failed with unknown error"
    );
  }

  /**
   * Handle prompt execution errors
   */
  static handlePromptError(error: unknown, promptName: string): never {
    if (error instanceof McpError) {
      logError(`Prompt '${promptName}' failed: ` + error.message);
      throw error;
    }

    if (error instanceof Error) {
      logError(`Prompt '${promptName}' failed: ` + error.message);
      throw new McpError(
        ErrorCode.InternalError,
        `Prompt execution failed: ${error.message}`
      );
    }

    logError(`Prompt '${promptName}' failed with unknown error: ` + error);
    throw new McpError(
      ErrorCode.InternalError,
      "Prompt execution failed with unknown error"
    );
  }

  /**
   * Handle service initialization errors
   */
  static handleServiceError(error: unknown, serviceName: string): never {
    if (error instanceof McpError) {
      logError(`Service '${serviceName}' failed: ` + error.message);
      throw error;
    }

    if (error instanceof Error) {
      logError(`Service '${serviceName}' failed: ` + error.message);
      throw new McpError(
        ErrorCode.InternalError,
        `Service operation failed: ${error.message}`
      );
    }

    logError(`Service '${serviceName}' failed with unknown error: ` + error);
    throw new McpError(
      ErrorCode.InternalError,
      "Service operation failed with unknown error"
    );
  }

  /**
   * Handle server initialization errors
   */
  static handleServerError(error: unknown, context: string): never {
    if (error instanceof McpError) {
      logError(`Server error in ${context}: ` + error.message);
      throw error;
    }

    if (error instanceof Error) {
      logError(`Server error in ${context}: ` + error.message);
      throw new McpError(
        ErrorCode.InternalError,
        `Server operation failed: ${error.message}`
      );
    }

    logError(`Server error in ${context} with unknown error: ` + error);
    throw new McpError(
      ErrorCode.InternalError,
      "Server operation failed with unknown error"
    );
  }

  /**
   * Create a validation error
   */
  static createValidationError(message: string): McpError {
    return new McpError(ErrorCode.InvalidParams, message);
  }

  /**
   * Create a not found error
   */
  static createNotFoundError(resource: string, identifier: string): McpError {
    return new McpError(
      ErrorCode.InvalidRequest,
      `${resource} '${identifier}' not found`
    );
  }

  /**
   * Create an internal error
   */
  static createInternalError(message: string): McpError {
    return new McpError(ErrorCode.InternalError, message);
  }

  /**
   * Create a method not found error
   */
  static createMethodNotFoundError(method: string): McpError {
    return new McpError(
      ErrorCode.MethodNotFound,
      `Method '${method}' not found`
    );
  }

  /**
   * Create an invalid request error
   */
  static createInvalidRequestError(message: string): McpError {
    return new McpError(ErrorCode.InvalidRequest, message);
  }

  /**
   * Safely execute an async function and handle errors
   */
  static async safeExecute<T>(
    fn: () => Promise<T>,
    errorHandler: (error: unknown) => never
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      errorHandler(error);
    }
  }

  /**
   * Wrap a function with error handling
   */
  static wrapWithErrorHandling<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    errorHandler: (error: unknown, ...args: TArgs) => never
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs): Promise<TReturn> => {
      try {
        return await fn(...args);
      } catch (error) {
        errorHandler(error, ...args);
      }
    };
  }

  /**
   * Log and rethrow error with additional context
   */
  static logAndRethrow(error: unknown, context: string): never {
    if (error instanceof Error) {
      logError(`Error in ${context}: ` + error.message);
      logInfo("Stack trace: " + error.stack);
    } else {
      logError(`Unknown error in ${context}: ` + error);
    }
    throw error;
  }

  /**
   * Convert any error to McpError
   */
  static toMcpError(
    error: unknown,
    defaultMessage = "Unknown error occurred"
  ): McpError {
    if (error instanceof McpError) {
      return error;
    }

    if (error instanceof Error) {
      return new McpError(ErrorCode.InternalError, error.message);
    }

    return new McpError(ErrorCode.InternalError, defaultMessage);
  }

  /**
   * Check if error is of specific type
   */
  static isErrorType(error: unknown, errorCode: ErrorCode): boolean {
    return error instanceof McpError && error.code === errorCode;
  }

  /**
   * Get error message from any error type
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "Unknown error occurred";
  }
}
