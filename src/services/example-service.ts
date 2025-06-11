import { BaseService } from "./base-service.js";

/**
 * Example service implementation
 * This demonstrates how to create a concrete service
 */
export class ExampleService extends BaseService {
  private data: Map<string, any> = new Map();
  private connectionPool?: any;

  constructor(config?: any) {
    super("example", config);
  }

  protected async doInitialize(): Promise<void> {
    // Example initialization logic
    this.log("info", "Setting up data storage...");

    // Initialize data with default values if provided
    if (this.config.defaultData) {
      for (const [key, value] of Object.entries(this.config.defaultData)) {
        this.data.set(key, value);
      }
      this.log("info", `Loaded ${this.data.size} default data entries`);
    }

    // Simulate connection setup
    if (this.config.enableConnectionPool) {
      this.log("info", "Setting up connection pool...");
      this.connectionPool = {
        maxConnections: this.config.maxConnections || 10,
        activeConnections: 0,
      };
    }

    this.log("info", "Example service initialization completed");
  }

  protected async doCleanup(): Promise<void> {
    // Example cleanup logic
    this.log("info", "Cleaning up data storage...");
    this.data.clear();

    if (this.connectionPool) {
      this.log("info", "Closing connection pool...");
      this.connectionPool = undefined;
    }

    this.log("info", "Example service cleanup completed");
  }

  protected validateConfig(): void {
    // Example configuration validation
    if (
      this.config.maxConnections &&
      typeof this.config.maxConnections !== "number"
    ) {
      throw new Error("maxConnections must be a number");
    }

    if (this.config.maxConnections && this.config.maxConnections < 1) {
      throw new Error("maxConnections must be greater than 0");
    }
  }

  /**
   * Get data by key
   */
  async getData(key: string): Promise<any> {
    if (!this.isReady()) {
      throw new Error("Service not initialized");
    }

    this.log("debug", `Getting data for key: ${key}`);
    return this.data.get(key);
  }

  /**
   * Set data by key
   */
  async setData(key: string, value: any): Promise<void> {
    if (!this.isReady()) {
      throw new Error("Service not initialized");
    }

    this.log("debug", `Setting data for key: ${key}`);
    this.data.set(key, value);
  }

  /**
   * Delete data by key
   */
  async deleteData(key: string): Promise<boolean> {
    if (!this.isReady()) {
      throw new Error("Service not initialized");
    }

    this.log("debug", `Deleting data for key: ${key}`);
    return this.data.delete(key);
  }

  /**
   * Get all keys
   */
  async getKeys(): Promise<string[]> {
    if (!this.isReady()) {
      throw new Error("Service not initialized");
    }

    return Array.from(this.data.keys());
  }

  /**
   * Get data size
   */
  async getSize(): Promise<number> {
    if (!this.isReady()) {
      throw new Error("Service not initialized");
    }

    return this.data.size;
  }

  /**
   * Clear all data
   */
  async clearData(): Promise<void> {
    if (!this.isReady()) {
      throw new Error("Service not initialized");
    }

    this.log("info", "Clearing all data");
    this.data.clear();
  }

  /**
   * Simulate async operation
   */
  async performAsyncOperation(duration: number = 1000): Promise<string> {
    if (!this.isReady()) {
      throw new Error("Service not initialized");
    }

    this.log("info", `Starting async operation (${duration}ms)...`);

    return new Promise((resolve) => {
      setTimeout(() => {
        this.log("info", "Async operation completed");
        resolve(`Operation completed after ${duration}ms`);
      }, duration);
    });
  }

  /**
   * Get service metrics
   */
  getMetrics(): Record<string, any> {
    return {
      dataSize: this.data.size,
      connectionPool: this.connectionPool
        ? {
            maxConnections: this.connectionPool.maxConnections,
            activeConnections: this.connectionPool.activeConnections,
          }
        : null,
    };
  }
}
