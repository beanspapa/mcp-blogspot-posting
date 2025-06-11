import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ToolManager } from '../managers/tool-manager.js';
import { ResourceManager } from '../managers/resource-manager.js';
import { PromptManager } from '../managers/prompt-manager.js';

/**
 * Server configuration interface
 */
export interface IServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Server capabilities */
  capabilities?: {
    tools?: {};
    resources?: {};
    prompts?: {};
    sampling?: {};
  };
  /** Transport type */
  transport?: 'stdio' | 'http';
  /** Port for HTTP transport */
  port?: number;
  /** Environment-specific settings */
  environment?: 'development' | 'production' | 'test';
  /** Logging configuration */
  logging?: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableConsole: boolean;
  };
}

/**
 * Server state interface
 */
export interface IServerState {
  isInitialized: boolean;
  isRunning: boolean;
  startTime?: Date;
  lastError?: Error;
}

/**
 * Server context interface - passed to handlers
 */
export interface IServerContext {
  server: Server;
  config: IServerConfig;
  state: IServerState;
  toolManager: ToolManager;
  resourceManager: ResourceManager;
  promptManager: PromptManager;
}

/**
 * Server lifecycle hooks
 */
export interface IServerLifecycleHooks {
  beforeInitialize?: () => Promise<void>;
  afterInitialize?: () => Promise<void>;
  beforeStart?: () => Promise<void>;
  afterStart?: () => Promise<void>;
  beforeStop?: () => Promise<void>;
  afterStop?: () => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

/**
 * Server metrics interface
 */
export interface IServerMetrics {
  requestCount: number;
  errorCount: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
}

/**
 * Server info response
 */
export interface IServerInfo {
  name: string;
  version: string;
  capabilities: Record<string, any>;
  state: IServerState;
  metrics?: IServerMetrics;
} 