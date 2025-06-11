import {
  IResourceConfig,
  IResourceRegistryEntry,
  IResourceListItem,
  IResourceExecutionResult,
  IResourceContext,
} from '../types/resource.js';
import { ReadResourceResult, ListResourcesResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { Validator } from '../utils/validation.js';

/**
 * Resource manager class for registering and accessing resources
 */
export class ResourceManager {
  private resources: Map<string, IResourceRegistryEntry> = new Map();

  /**
   * Register a resource
   */
  registerResource(config: IResourceConfig): void {
    try {
      // Validate resource configuration
      this.validateResourceConfig(config);

      // Check for duplicate names
      if (this.resources.has(config.name)) {
        throw ErrorHandler.createInvalidRequestError(
          `Resource '${config.name}' is already registered`
        );
      }

      // Create registry entry
      const entry: IResourceRegistryEntry = {
        config,
        registeredAt: new Date(),
        accessCount: 0,
        errorCount: 0,
      };

      this.resources.set(config.name, entry);
      logger.info(`Resource '${config.name}' registered successfully`);
    } catch (error) {
      ErrorHandler.handleResourceError(error, config.name);
    }
  }

  /**
   * Unregister a resource
   */
  unregisterResource(name: string): boolean {
    const deleted = this.resources.delete(name);
    if (deleted) {
      logger.info(`Resource '${name}' unregistered successfully`);
    } else {
      logger.warn(`Resource '${name}' not found for unregistration`);
    }
    return deleted;
  }

  /**
   * Get resource configuration
   */
  getResource(name: string): IResourceConfig | undefined {
    const entry = this.resources.get(name);
    return entry?.config;
  }

  /**
   * Check if resource exists
   */
  hasResource(name: string): boolean {
    return this.resources.has(name);
  }

  /**
   * Get all registered resource names
   */
  getResourceNames(): string[] {
    return Array.from(this.resources.keys());
  }

  /**
   * List all resources (MCP protocol)
   */
  async listResources(): Promise<ListResourcesResult> {
    const resources: IResourceListItem[] = Array.from(this.resources.values()).map((entry) => ({
      uri: entry.config.uri,
      name: entry.config.name,
      description: entry.config.description,
      mimeType: entry.config.mimeType,
    }));

    return { resources };
  }

  /**
   * Read a resource
   */
  async readResource(uri: string, context?: IResourceContext): Promise<ReadResourceResult> {
    // Find resource by URI or name
    const entry = this.findResourceByUri(uri);
    if (!entry) {
      throw ErrorHandler.createNotFoundError('Resource', uri);
    }

    const startTime = Date.now();
    let result: ReadResourceResult;
    let error: Error | undefined;

    try {
      // Parse URI
      const parsedUri = new URL(uri);

      // Create execution context
      const executionContext: IResourceContext = {
        resourceName: entry.config.name,
        requestId: context?.requestId || `resource-${Date.now()}`,
        userId: context?.userId,
        metadata: context?.metadata,
      };

      logger.debug(`Reading resource '${entry.config.name}' from URI: ${uri}`);

      // Execute the resource handler
      result = await entry.config.handler(parsedUri, executionContext);

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = new Date();

      logger.debug(`Resource '${entry.config.name}' read successfully`);
      return result;
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      entry.errorCount++;
      logger.error(`Resource '${entry.config.name}' read failed:`, error.message);
      ErrorHandler.handleResourceError(error, uri);
    } finally {
      const executionTime = Date.now() - startTime;
      logger.debug(`Resource '${entry.config.name}' read time: ${executionTime}ms`);
    }
  }

  /**
   * Find resource by URI
   */
  private findResourceByUri(uri: string): IResourceRegistryEntry | undefined {
    // First try exact URI match
    for (const entry of this.resources.values()) {
      if (entry.config.uri === uri) {
        return entry;
      }
    }

    // Then try pattern matching for template URIs
    for (const entry of this.resources.values()) {
      if (this.matchesUriPattern(uri, entry.config.uri)) {
        return entry;
      }
    }

    // Finally try name-based lookup
    const resourceName = this.extractResourceNameFromUri(uri);
    if (resourceName && this.resources.has(resourceName)) {
      return this.resources.get(resourceName);
    }

    return undefined;
  }

  /**
   * Check if URI matches a pattern
   */
  private matchesUriPattern(uri: string, pattern: string): boolean {
    // Simple pattern matching - can be enhanced for more complex patterns
    if (!pattern.includes('{') && !pattern.includes('*')) {
      return uri === pattern;
    }

    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\{[^}]+\}/g, '([^/]+)') // Replace {param} with capture group
      .replace(/\*/g, '.*'); // Replace * with .*

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(uri);
  }

  /**
   * Extract resource name from URI
   */
  private extractResourceNameFromUri(uri: string): string | undefined {
    try {
      const parsedUri = new URL(uri);
      const pathParts = parsedUri.pathname.split('/').filter(Boolean);
      return pathParts[pathParts.length - 1]; // Return last path segment
    } catch {
      return undefined;
    }
  }

  /**
   * Get resource access statistics
   */
  getResourceStats(name: string): IResourceExecutionResult | undefined {
    const entry = this.resources.get(name);
    if (!entry) {
      return undefined;
    }

    return {
      success: entry.errorCount === 0 || entry.accessCount > entry.errorCount,
      executionTime: 0, // This would need to be tracked per access
      metadata: {
        totalAccesses: entry.accessCount,
        errorCount: entry.errorCount,
        lastAccessed: entry.lastAccessed,
        registeredAt: entry.registeredAt,
      },
    };
  }

  /**
   * Get all resource statistics
   */
  getAllResourceStats(): Record<string, IResourceExecutionResult> {
    const stats: Record<string, IResourceExecutionResult> = {};
    
    for (const [name, entry] of this.resources) {
      stats[name] = {
        success: entry.errorCount === 0 || entry.accessCount > entry.errorCount,
        executionTime: 0,
        metadata: {
          totalAccesses: entry.accessCount,
          errorCount: entry.errorCount,
          lastAccessed: entry.lastAccessed,
          registeredAt: entry.registeredAt,
        },
      };
    }

    return stats;
  }

  /**
   * Clear all resources
   */
  clearResources(): void {
    const count = this.resources.size;
    this.resources.clear();
    logger.info(`Cleared ${count} resources`);
  }

  /**
   * Get resources by service
   */
  getResourcesByService(serviceName: string): IResourceConfig[] {
    return Array.from(this.resources.values())
      .filter((entry) => entry.config.service === serviceName)
      .map((entry) => entry.config);
  }

  /**
   * Validate resource configuration
   */
  private validateResourceConfig(config: IResourceConfig): void {
    Validator.validateRequired(config.name, 'name');
    Validator.validateString(config.name, 'name');
    Validator.validateRequired(config.uri, 'uri');
    Validator.validateString(config.uri, 'uri');
    Validator.validateRequired(config.handler, 'handler');

    if (typeof config.handler !== 'function') {
      throw ErrorHandler.createValidationError('Resource handler must be a function');
    }

    // Validate resource name format (alphanumeric, underscore, hyphen)
    const namePattern = /^[a-zA-Z0-9_-]+$/;
    if (!namePattern.test(config.name)) {
      throw ErrorHandler.createValidationError(
        'Resource name must contain only alphanumeric characters, underscores, and hyphens'
      );
    }

    // Validate URI format (basic check)
    try {
      new URL(config.uri);
    } catch {
      // If it's not a valid URL, check if it's a pattern
      if (!config.uri.includes('{') && !config.uri.includes('*')) {
        throw ErrorHandler.createValidationError('Resource URI must be a valid URL or pattern');
      }
    }
  }

  /**
   * Get manager statistics
   */
  getManagerStats(): {
    totalResources: number;
    totalAccesses: number;
    totalErrors: number;
    resourcesByService: Record<string, number>;
  } {
    let totalAccesses = 0;
    let totalErrors = 0;
    const resourcesByService: Record<string, number> = {};

    for (const entry of this.resources.values()) {
      totalAccesses += entry.accessCount;
      totalErrors += entry.errorCount;

      const service = entry.config.service || 'default';
      resourcesByService[service] = (resourcesByService[service] || 0) + 1;
    }

    return {
      totalResources: this.resources.size,
      totalAccesses,
      totalErrors,
      resourcesByService,
    };
  }
} 