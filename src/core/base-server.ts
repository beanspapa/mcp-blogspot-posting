import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListResourcesRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  IServerConfig,
  IServerState,
  IServerContext,
} from "../types/server.js";
import { ToolManager } from "../managers/tool-manager.js";
import { ResourceManager } from "../managers/resource-manager.js";
import { PromptManager } from "../managers/prompt-manager.js";
import { logger } from "../utils/logger.js";
import { ErrorHandler } from "../utils/error-handler.js";

/**
 * Abstract base server class
 * All MCP servers should extend this class
 */
export abstract class BaseServer {
  protected server: Server;
  protected config: IServerConfig;
  protected state: IServerState;
  protected toolManager: ToolManager;
  protected resourceManager: ResourceManager;
  protected promptManager: PromptManager;

  constructor(config: IServerConfig) {
    this.config = config;
    this.state = {
      isInitialized: false,
      isRunning: false,
    };

    // Initialize managers
    this.toolManager = new ToolManager();
    this.resourceManager = new ResourceManager();
    this.promptManager = new PromptManager();

    // Create MCP server instance
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: config.capabilities || {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP protocol handlers
   */
  private setupHandlers(): void {
    // Tool handlers (항상 등록)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return await this.toolManager.listTools();
    });
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await this.toolManager.callTool(name, args);
    });

    // Resource handlers (capabilities.resources가 있을 때만)
    if (this.config.capabilities?.resources !== undefined) {
      this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
        return await this.resourceManager.listResources();
      });
      this.server.setRequestHandler(
        ReadResourceRequestSchema,
        async (request) => {
          const { uri } = request.params;
          return await this.resourceManager.readResource(uri);
        }
      );
    }

    // Prompt handlers (capabilities.prompts가 있을 때만)
    if (this.config.capabilities?.prompts !== undefined) {
      this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
        return await this.promptManager.listPrompts();
      });
      this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        return await this.promptManager.getPromptResult(name, args);
      });
    }
  }

  /**
   * Initialize the server
   */
  async initialize(): Promise<void> {
    if (this.state.isInitialized) {
      logger.warn("Server is already initialized");
      return;
    }

    try {
      logger.info(`Initializing MCP server '${this.config.name}'...`);

      // Call abstract initialization method
      await this.doInitialize();

      this.state.isInitialized = true;
      logger.info(`Server '${this.config.name}' initialized successfully`);
    } catch (error) {
      this.state.lastError =
        error instanceof Error ? error : new Error(String(error));
      ErrorHandler.handleServerError(error, "initialization");
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (!this.state.isInitialized) {
      await this.initialize();
    }

    if (this.state.isRunning) {
      logger.warn("Server is already running");
      return;
    }

    try {
      logger.info(`Starting MCP server '${this.config.name}'...`);

      // Setup transport
      const transport = this.createTransport();
      await this.server.connect(transport);

      this.state.isRunning = true;
      this.state.startTime = new Date();

      logger.info(`Server '${this.config.name}' started successfully`);

      // Call abstract start method
      await this.doStart();
    } catch (error) {
      this.state.lastError =
        error instanceof Error ? error : new Error(String(error));
      ErrorHandler.handleServerError(error, "startup");
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.state.isRunning) {
      logger.warn("Server is not running");
      return;
    }

    try {
      logger.info(`Stopping MCP server '${this.config.name}'...`);

      // Call abstract stop method
      await this.doStop();

      // Close server connection
      await this.server.close();

      this.state.isRunning = false;
      this.state.startTime = undefined;

      logger.info(`Server '${this.config.name}' stopped successfully`);
    } catch (error) {
      this.state.lastError =
        error instanceof Error ? error : new Error(String(error));
      ErrorHandler.handleServerError(error, "shutdown");
    }
  }

  /**
   * Create transport based on configuration
   */
  private createTransport() {
    switch (this.config.transport) {
      case "stdio":
      default:
        return new StdioServerTransport();
      // HTTP transport can be added here in the future
    }
  }

  /**
   * Get server context for handlers
   */
  protected getContext(): IServerContext {
    return {
      server: this.server,
      config: this.config,
      state: this.state,
      toolManager: this.toolManager,
      resourceManager: this.resourceManager,
      promptManager: this.promptManager,
    };
  }

  /**
   * Get server information
   */
  getServerInfo() {
    return {
      name: this.config.name,
      version: this.config.version,
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      state: this.state,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Get server metrics
   */
  getMetrics() {
    const uptime = this.state.startTime
      ? Date.now() - this.state.startTime.getTime()
      : 0;

    return {
      uptime,
      memoryUsage: process.memoryUsage(),
      tools: this.toolManager.getManagerStats(),
      resources: this.resourceManager.getManagerStats(),
      prompts: this.promptManager.getManagerStats(),
    };
  }

  /**
   * Abstract methods that subclasses must implement
   */
  protected abstract doInitialize(): Promise<void>;
  protected abstract doStart(): Promise<void>;
  protected abstract doStop(): Promise<void>;

  /**
   * Get tool manager
   */
  protected getToolManager(): ToolManager {
    return this.toolManager;
  }

  /**
   * Get resource manager
   */
  protected getResourceManager(): ResourceManager {
    return this.resourceManager;
  }

  /**
   * Get prompt manager
   */
  protected getPromptManager(): PromptManager {
    return this.promptManager;
  }

  /**
   * Check if server is ready
   */
  isReady(): boolean {
    return this.state.isInitialized && this.state.isRunning;
  }

  /**
   * Get server configuration
   */
  getConfig(): IServerConfig {
    return { ...this.config };
  }

  /**
   * Get server state
   */
  getState(): IServerState {
    return { ...this.state };
  }
}
