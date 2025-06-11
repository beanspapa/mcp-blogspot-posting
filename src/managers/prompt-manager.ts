import {
  IPromptConfig,
  IPromptContext,
  IPromptResult,
  IPromptListItem,
} from "../types/config.js";
import {
  GetPromptResult,
  ListPromptsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../utils/logger.js";
import { ErrorHandler } from "../utils/error-handler.js";
import { Validator } from "../utils/validation.js";

/**
 * Prompt registry entry
 */
interface IPromptRegistryEntry {
  config: IPromptConfig;
  registeredAt: Date;
  lastUsed?: Date;
  usageCount: number;
  errorCount: number;
}

/**
 * Prompt manager class for registering and executing prompts
 */
export class PromptManager {
  private prompts: Map<string, IPromptRegistryEntry> = new Map();

  /**
   * Register a prompt
   */
  registerPrompt(config: IPromptConfig): void {
    try {
      // Validate prompt configuration
      this.validatePromptConfig(config);

      // Check for duplicate names
      if (this.prompts.has(config.name)) {
        throw ErrorHandler.createInvalidRequestError(
          `Prompt '${config.name}' is already registered`
        );
      }

      // Create registry entry
      const entry: IPromptRegistryEntry = {
        config,
        registeredAt: new Date(),
        usageCount: 0,
        errorCount: 0,
      };

      this.prompts.set(config.name, entry);
      logger.info(`Prompt '${config.name}' registered successfully`);
    } catch (error) {
      ErrorHandler.handlePromptError(error, config.name);
    }
  }

  /**
   * Unregister a prompt
   */
  unregisterPrompt(name: string): boolean {
    const deleted = this.prompts.delete(name);
    if (deleted) {
      logger.info(`Prompt '${name}' unregistered successfully`);
    } else {
      logger.warn(`Prompt '${name}' not found for unregistration`);
    }
    return deleted;
  }

  /**
   * Get prompt configuration
   */
  getPrompt(name: string): IPromptConfig | undefined {
    const entry = this.prompts.get(name);
    return entry?.config;
  }

  /**
   * Check if prompt exists
   */
  hasPrompt(name: string): boolean {
    return this.prompts.has(name);
  }

  /**
   * Get all registered prompt names
   */
  getPromptNames(): string[] {
    return Array.from(this.prompts.keys());
  }

  /**
   * List all prompts (MCP protocol)
   */
  async listPrompts(): Promise<ListPromptsResult> {
    const prompts: IPromptListItem[] = Array.from(this.prompts.values()).map(
      (entry) => ({
        name: entry.config.name,
        description: entry.config.description,
        arguments: entry.config.arguments,
      })
    );

    return { prompts };
  }

  /**
   * Get a prompt (MCP protocol)
   */
  async getPromptResult(
    name: string,
    params: any,
    context?: IPromptContext
  ): Promise<GetPromptResult> {
    const entry = this.prompts.get(name);
    if (!entry) {
      throw ErrorHandler.createNotFoundError("Prompt", name);
    }

    const startTime = Date.now();
    let result: IPromptResult;
    let error: Error | undefined;

    try {
      // Validate input parameters against prompt arguments schema
      if (entry.config.arguments) {
        this.validatePromptArguments(params, entry.config.arguments);
      }

      // Create execution context
      const executionContext: IPromptContext = {
        promptName: name,
        requestId: context?.requestId || `prompt-${Date.now()}`,
        userId: context?.userId,
        metadata: context?.metadata,
      };

      logger.debug(`Executing prompt '${name}' with params:`, params);

      // Execute the prompt
      result = await entry.config.handler(params, executionContext);

      // Update usage statistics
      entry.usageCount++;
      entry.lastUsed = new Date();

      logger.debug(`Prompt '${name}' executed successfully`);

      // Convert to MCP format
      return {
        description: entry.config.description,
        messages: result.messages as any,
      };
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      entry.errorCount++;
      logger.error(`Prompt '${name}' execution failed:`, error.message);
      ErrorHandler.handlePromptError(error, name);
    } finally {
      const executionTime = Date.now() - startTime;
      logger.debug(`Prompt '${name}' execution time: ${executionTime}ms`);
    }
  }

  /**
   * Validate prompt arguments
   */
  private validatePromptArguments(
    params: any,
    argumentsSchema: Record<string, any>
  ): void {
    if (!params || typeof params !== "object") {
      throw ErrorHandler.createValidationError(
        "Prompt parameters must be an object"
      );
    }

    // Check required arguments
    for (const [argName, argConfig] of Object.entries(argumentsSchema)) {
      if (argConfig.required && !(argName in params)) {
        throw ErrorHandler.createValidationError(
          `Required argument '${argName}' is missing`
        );
      }

      // Basic type validation
      if (argName in params && argConfig.type) {
        const value = params[argName];
        const expectedType = argConfig.type;

        if (expectedType === "string" && typeof value !== "string") {
          throw ErrorHandler.createValidationError(
            `Argument '${argName}' must be a string`
          );
        }
        if (expectedType === "number" && typeof value !== "number") {
          throw ErrorHandler.createValidationError(
            `Argument '${argName}' must be a number`
          );
        }
        if (expectedType === "boolean" && typeof value !== "boolean") {
          throw ErrorHandler.createValidationError(
            `Argument '${argName}' must be a boolean`
          );
        }
        if (expectedType === "array" && !Array.isArray(value)) {
          throw ErrorHandler.createValidationError(
            `Argument '${argName}' must be an array`
          );
        }
      }
    }
  }

  /**
   * Get prompt execution statistics
   */
  getPromptStats(name: string):
    | {
        success: boolean;
        executionTime: number;
        metadata: Record<string, any>;
      }
    | undefined {
    const entry = this.prompts.get(name);
    if (!entry) {
      return undefined;
    }

    return {
      success: entry.errorCount === 0 || entry.usageCount > entry.errorCount,
      executionTime: 0, // This would need to be tracked per execution
      metadata: {
        totalExecutions: entry.usageCount,
        errorCount: entry.errorCount,
        lastUsed: entry.lastUsed,
        registeredAt: entry.registeredAt,
      },
    };
  }

  /**
   * Get all prompt statistics
   */
  getAllPromptStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, entry] of this.prompts) {
      stats[name] = {
        success: entry.errorCount === 0 || entry.usageCount > entry.errorCount,
        executionTime: 0,
        metadata: {
          totalExecutions: entry.usageCount,
          errorCount: entry.errorCount,
          lastUsed: entry.lastUsed,
          registeredAt: entry.registeredAt,
        },
      };
    }

    return stats;
  }

  /**
   * Clear all prompts
   */
  clearPrompts(): void {
    const count = this.prompts.size;
    this.prompts.clear();
    logger.info(`Cleared ${count} prompts`);
  }

  /**
   * Get prompts by service
   */
  getPromptsByService(serviceName: string): IPromptConfig[] {
    return Array.from(this.prompts.values())
      .filter((entry) => entry.config.service === serviceName)
      .map((entry) => entry.config);
  }

  /**
   * Validate prompt configuration
   */
  private validatePromptConfig(config: IPromptConfig): void {
    Validator.validateRequired(config.name, "name");
    Validator.validateString(config.name, "name");
    Validator.validateRequired(config.handler, "handler");

    if (typeof config.handler !== "function") {
      throw ErrorHandler.createValidationError(
        "Prompt handler must be a function"
      );
    }

    // Validate prompt name format (alphanumeric, underscore, hyphen)
    const namePattern = /^[a-zA-Z0-9_-]+$/;
    if (!namePattern.test(config.name)) {
      throw ErrorHandler.createValidationError(
        "Prompt name must contain only alphanumeric characters, underscores, and hyphens"
      );
    }

    // Validate arguments schema if provided
    if (config.arguments) {
      if (
        typeof config.arguments !== "object" ||
        Array.isArray(config.arguments)
      ) {
        throw ErrorHandler.createValidationError(
          "Prompt arguments must be an object"
        );
      }
    }
  }

  /**
   * Get manager statistics
   */
  getManagerStats(): {
    totalPrompts: number;
    totalExecutions: number;
    totalErrors: number;
    promptsByService: Record<string, number>;
  } {
    let totalExecutions = 0;
    let totalErrors = 0;
    const promptsByService: Record<string, number> = {};

    for (const entry of this.prompts.values()) {
      totalExecutions += entry.usageCount;
      totalErrors += entry.errorCount;

      const service = entry.config.service || "default";
      promptsByService[service] = (promptsByService[service] || 0) + 1;
    }

    return {
      totalPrompts: this.prompts.size,
      totalExecutions,
      totalErrors,
      promptsByService,
    };
  }
}
