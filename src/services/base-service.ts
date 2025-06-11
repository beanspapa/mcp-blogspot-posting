import { IService } from '../types/config.js';
import { logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';

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
      logger.info(`Initializing service '${this.name}'...`);
      this.validateConfig();
      await this.doInitialize();
      this.isInitialized = true;
      logger.info(`Service '${this.name}' initialized successfully`);
    } catch (error) {
      ErrorHandler.handleServiceError(error, this.name);
    }
  }

  async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      logger.info(`Cleaning up service '${this.name}'...`);
      await this.doCleanup();
      this.isInitialized = false;
      logger.info(`Service '${this.name}' cleaned up successfully`);
    } catch (error) {
      ErrorHandler.handleServiceError(error, this.name);
    }
  }

  protected abstract doInitialize(): Promise<void>;
  protected abstract doCleanup(): Promise<void>;

  protected validateConfig(): void {
    // Override in subclasses if needed
  }

  protected log(level: 'error' | 'warn' | 'info' | 'debug', message: string, meta?: any): void {
    logger[level](`[${this.name}] ${message}`, meta);
  }
} 