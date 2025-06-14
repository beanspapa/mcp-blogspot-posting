import { IService } from "../types/config.js";
import { logInfo, logWarning, logError } from "../utils/logger.js";
import { ErrorHandler } from "../utils/error-handler.js";

/**
 * Abstract base service class
 */
export abstract class BaseService implements IService {
  protected name: string;
  protected config: any;
  protected isInitialized: boolean = false;

  constructor(name: string, config?: any) {
    this.name = name;
    this.config = config || {};
  }

  getName(): string {
    return this.name;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logInfo(`Initializing service '${this.name}'...`);
      this.validateConfig();
      await this.doInitialize();
      this.isInitialized = true;
      logInfo(`Service '${this.name}' initialized successfully`);
    } catch (error) {
      ErrorHandler.handleServiceError(error, this.name);
    }
  }

  async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      logInfo(`Cleaning up service '${this.name}'...`);
      await this.doCleanup();
      this.isInitialized = false;
      logInfo(`Service '${this.name}' cleaned up successfully`);
    } catch (error) {
      ErrorHandler.handleServiceError(error, this.name);
    }
  }

  protected abstract doInitialize(): Promise<void>;
  protected abstract doCleanup(): Promise<void>;

  protected validateConfig(): void {
    // Override in subclasses if needed
  }

  protected log(
    level: "error" | "warn" | "info" | "debug",
    message: string,
    meta?: any
  ): void {
    const msg = `[${this.name}] ${message}`;
    if (level === "error") logError(msg);
    else if (level === "warn") logWarning(msg);
    else logInfo(msg);
  }
}
