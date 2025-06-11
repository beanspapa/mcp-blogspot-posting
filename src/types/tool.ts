import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Tool configuration interface
 */
export interface IToolConfig {
  /** Tool name (unique identifier) */
  name: string;
  /** Tool description */
  description: string;
  /** Input schema for validation */
  inputSchema: z.ZodObject<any>;
  /** Tool handler function */
  handler: ToolHandler;
  /** Associated service name (optional) */
  service?: string;
  /** Tool metadata */
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
    author?: string;
  };
  /** Tool options */
  options?: {
    timeout?: number;
    retries?: number;
    cache?: boolean;
  };
}

/**
 * Tool handler function type
 */
export type ToolHandler = (
  params: any,
  context?: IToolContext
) => Promise<CallToolResult>;

/**
 * Tool context passed to handlers
 */
export interface IToolContext {
  toolName: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Tool execution result
 */
export interface IToolExecutionResult {
  success: boolean;
  result?: CallToolResult;
  error?: Error;
  executionTime: number;
  metadata?: Record<string, any>;
}

/**
 * Tool registry entry
 */
export interface IToolRegistryEntry {
  config: IToolConfig;
  registeredAt: Date;
  lastUsed?: Date;
  usageCount: number;
  errorCount: number;
}

/**
 * Tool list item for MCP protocol
 */
export interface IToolListItem {
  [key: string]: any; // Index signature for compatibility
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Tool execution statistics
 */
export interface IToolStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecuted?: Date;
}

/**
 * Tool validation result
 */
export interface IToolValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
