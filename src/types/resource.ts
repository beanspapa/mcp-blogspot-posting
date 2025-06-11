import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Resource configuration interface
 */
export interface IResourceConfig {
  /** Resource name (unique identifier) */
  name: string;
  /** Resource URI or URI template */
  uri: string;
  /** Resource description */
  description?: string;
  /** MIME type */
  mimeType?: string;
  /** Resource handler function */
  handler: ResourceHandler;
  /** Associated service name (optional) */
  service?: string;
  /** Resource metadata */
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
    author?: string;
  };
  /** Resource options */
  options?: {
    cache?: boolean;
    cacheTTL?: number;
    maxSize?: number;
  };
}

/**
 * Resource handler function type
 */
export type ResourceHandler = (
  uri: URL,
  context?: IResourceContext
) => Promise<ReadResourceResult>;

/**
 * Resource context passed to handlers
 */
export interface IResourceContext {
  resourceName: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Resource execution result
 */
export interface IResourceExecutionResult {
  success: boolean;
  result?: ReadResourceResult;
  error?: Error;
  executionTime: number;
  metadata?: Record<string, any>;
}

/**
 * Resource registry entry
 */
export interface IResourceRegistryEntry {
  config: IResourceConfig;
  registeredAt: Date;
  lastAccessed?: Date;
  accessCount: number;
  errorCount: number;
}

/**
 * Resource list item for MCP protocol
 */
export interface IResourceListItem {
  [key: string]: any;
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * Resource template for dynamic resources
 */
export interface IResourceTemplate {
  pattern: string;
  parameters: string[];
  description?: string;
}

/**
 * Resource access statistics
 */
export interface IResourceStats {
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  averageResponseTime: number;
  lastAccessed?: Date;
  cacheHitRate?: number;
}

/**
 * Resource validation result
 */
export interface IResourceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
