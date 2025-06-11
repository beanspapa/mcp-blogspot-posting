import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Validation utility class
 */
export class Validator {
  /**
   * Validate data against a Zod schema
   */
  static validateSchema<T>(data: unknown, schema: z.ZodSchema<T>): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map((e) => {
          const path = e.path.length > 0 ? ` at ${e.path.join('.')}` : '';
          return `${e.message}${path}`;
        });
        throw new McpError(
          ErrorCode.InvalidParams,
          `Validation failed: ${errorMessages.join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Validate that a required field is present
   */
  static validateRequired(value: any, fieldName: string): void {
    if (value === undefined || value === null) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Required field '${fieldName}' is missing`
      );
    }
  }

  /**
   * Validate that a value is a string
   */
  static validateString(value: any, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' must be a string`
      );
    }
    return value;
  }

  /**
   * Validate that a value is a number
   */
  static validateNumber(value: any, fieldName: string): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' must be a valid number`
      );
    }
    return value;
  }

  /**
   * Validate that a value is a boolean
   */
  static validateBoolean(value: any, fieldName: string): boolean {
    if (typeof value !== 'boolean') {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' must be a boolean`
      );
    }
    return value;
  }

  /**
   * Validate that a value is an array
   */
  static validateArray(value: any, fieldName: string): any[] {
    if (!Array.isArray(value)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' must be an array`
      );
    }
    return value;
  }

  /**
   * Validate that a value is an object
   */
  static validateObject(value: any, fieldName: string): Record<string, any> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' must be an object`
      );
    }
    return value;
  }

  /**
   * Validate that a string matches a pattern
   */
  static validatePattern(value: string, pattern: RegExp, fieldName: string): string {
    if (!pattern.test(value)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' does not match required pattern`
      );
    }
    return value;
  }

  /**
   * Validate that a number is within a range
   */
  static validateRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): number {
    if (value < min || value > max) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' must be between ${min} and ${max}`
      );
    }
    return value;
  }

  /**
   * Validate that a string has a minimum length
   */
  static validateMinLength(value: string, minLength: number, fieldName: string): string {
    if (value.length < minLength) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' must be at least ${minLength} characters long`
      );
    }
    return value;
  }

  /**
   * Validate that a string has a maximum length
   */
  static validateMaxLength(value: string, maxLength: number, fieldName: string): string {
    if (value.length > maxLength) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' must be no more than ${maxLength} characters long`
      );
    }
    return value;
  }

  /**
   * Validate that a value is one of the allowed values
   */
  static validateEnum<T>(value: any, allowedValues: T[], fieldName: string): T {
    if (!allowedValues.includes(value)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' must be one of: ${allowedValues.join(', ')}`
      );
    }
    return value;
  }

  /**
   * Validate URL format
   */
  static validateUrl(value: string, fieldName: string): URL {
    try {
      return new URL(value);
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' must be a valid URL`
      );
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(value: string, fieldName: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Field '${fieldName}' must be a valid email address`
      );
    }
    return value;
  }

  /**
   * Validate that all required fields are present in an object
   */
  static validateRequiredFields(
    obj: Record<string, any>,
    requiredFields: string[]
  ): void {
    for (const field of requiredFields) {
      this.validateRequired(obj[field], field);
    }
  }

  /**
   * Safe validation that returns a result object instead of throwing
   */
  static safeValidateSchema<T>(
    data: unknown,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; error: string } {
    try {
      const validatedData = this.validateSchema(data, schema);
      return { success: true, data: validatedData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }
} 