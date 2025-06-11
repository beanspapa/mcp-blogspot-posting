import { z } from "zod";
import { BaseServer } from "./core/base-server.js";
import { ExampleService } from "./services/example-service.js";
import { IServerConfig } from "./types/server.js";
import { logger } from "./utils/logger.js";
import { pathToFileURL } from "node:url";

/**
 * Example MCP Server implementation
 * This demonstrates how to create a concrete server using the boilerplate
 */
export class ExampleMcpServer extends BaseServer {
  private exampleService: ExampleService;

  constructor(config?: Partial<IServerConfig>) {
    const defaultConfig: IServerConfig = {
      name: "example-mcp-server",
      version: "1.0.0",
      transport: "stdio",
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    };

    super({ ...defaultConfig, ...config });

    // Initialize services
    this.exampleService = new ExampleService({
      defaultData: {
        greeting: "Hello from MCP Server!",
        timestamp: new Date().toISOString(),
      },
      enableConnectionPool: true,
      maxConnections: 5,
    });
  }

  /**
   * Initialize server-specific components
   */
  protected async doInitialize(): Promise<void> {
    logger.info("Initializing Example MCP Server...");

    // Initialize services
    await this.exampleService.initialize();

    // Register tools
    this.registerTools();

    // Register resources
    this.registerResources();

    // Register prompts
    this.registerPrompts();

    logger.info("Example MCP Server initialization completed");
  }

  /**
   * Start server-specific components
   */
  protected async doStart(): Promise<void> {
    logger.info("Starting Example MCP Server components...");
    // Add any startup logic here
  }

  /**
   * Stop server-specific components
   */
  protected async doStop(): Promise<void> {
    logger.info("Stopping Example MCP Server components...");

    // Cleanup services
    await this.exampleService.cleanup();
  }

  /**
   * Register example tools
   */
  private registerTools(): void {
    // Echo tool
    this.getToolManager().registerTool({
      name: "echo",
      description: "Echo back the provided message",
      inputSchema: z.object({
        message: z.string().describe("The message to echo back"),
      }),
      handler: async (params) => {
        return {
          content: [
            {
              type: "text",
              text: `Echo: ${params.message}`,
            },
          ],
        };
      },
      service: "example",
    });

    // Get data tool
    this.getToolManager().registerTool({
      name: "get-data",
      description: "Get data from the example service",
      inputSchema: z.object({
        key: z.string().describe("The key to retrieve"),
      }),
      handler: async (params) => {
        const value = await this.exampleService.getData(params.key);
        return {
          content: [
            {
              type: "text",
              text: value ? JSON.stringify(value, null, 2) : "Key not found",
            },
          ],
        };
      },
      service: "example",
    });

    // Set data tool
    this.getToolManager().registerTool({
      name: "set-data",
      description: "Set data in the example service",
      inputSchema: z.object({
        key: z.string().describe("The key to set"),
        value: z.any().describe("The value to store"),
      }),
      handler: async (params) => {
        await this.exampleService.setData(params.key, params.value);
        return {
          content: [
            {
              type: "text",
              text: `Data set successfully: ${params.key} = ${JSON.stringify(params.value)}`,
            },
          ],
        };
      },
      service: "example",
    });

    // List keys tool
    this.getToolManager().registerTool({
      name: "list-keys",
      description: "List all keys in the example service",
      inputSchema: z.object({}),
      handler: async () => {
        const keys = await this.exampleService.getKeys();
        return {
          content: [
            {
              type: "text",
              text: `Available keys: ${keys.join(", ")}`,
            },
          ],
        };
      },
      service: "example",
    });

    // Async operation tool
    this.getToolManager().registerTool({
      name: "async-operation",
      description: "Perform an async operation with configurable duration",
      inputSchema: z.object({
        duration: z
          .number()
          .min(100)
          .max(10000)
          .default(1000)
          .describe("Duration in milliseconds"),
      }),
      handler: async (params) => {
        const result = await this.exampleService.performAsyncOperation(
          params.duration
        );
        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      },
      service: "example",
    });

    // 블로그 포스팅 MCP Tool 등록
    this.getToolManager().registerBloggerTools();
  }

  /**
   * Register example resources
   */
  private registerResources(): void {
    // Server info resource
    this.getResourceManager().registerResource({
      name: "server-info",
      uri: "mcp://example/server-info",
      description: "Get server information and metrics",
      mimeType: "application/json",
      handler: async () => {
        const info = this.getServerInfo();
        return {
          contents: [
            {
              uri: "mcp://example/server-info",
              mimeType: "application/json",
              text: JSON.stringify(info, null, 2),
            },
          ],
        };
      },
      service: "example",
    });

    // Service metrics resource
    this.getResourceManager().registerResource({
      name: "service-metrics",
      uri: "mcp://example/service-metrics",
      description: "Get example service metrics",
      mimeType: "application/json",
      handler: async () => {
        const metrics = this.exampleService.getMetrics();
        return {
          contents: [
            {
              uri: "mcp://example/service-metrics",
              mimeType: "application/json",
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      },
      service: "example",
    });

    // Data dump resource
    this.getResourceManager().registerResource({
      name: "data-dump",
      uri: "mcp://example/data-dump",
      description: "Get all data from the example service",
      mimeType: "application/json",
      handler: async () => {
        const keys = await this.exampleService.getKeys();
        const data: Record<string, any> = {};

        for (const key of keys) {
          data[key] = await this.exampleService.getData(key);
        }

        return {
          contents: [
            {
              uri: "mcp://example/data-dump",
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      },
      service: "example",
    });
  }

  /**
   * Register example prompts
   */
  private registerPrompts(): void {
    // Greeting prompt
    this.getPromptManager().registerPrompt({
      name: "generate-greeting",
      description: "Generate a personalized greeting message",
      arguments: [
        {
          name: "name",
          type: "string",
          description: "The name of the person to greet",
          required: true,
        },
        {
          name: "language",
          type: "string",
          description: "The language of the greeting (e.g., 'en', 'es', 'fr')",
          required: false,
        },
      ],
      handler: async (params) => {
        const { name, language = "en" } = params;
        let greeting = `Hello, ${name}!`;

        // Dummy logic based on language
        if (language === "es") {
          greeting = `¡Hola, ${name}!`;
        } else if (language === "fr") {
          greeting = `Bonjour, ${name}!`;
        }

        return {
          messages: [
            {
              role: "assistant",
              content: { type: "text", text: greeting },
            },
          ],
        };
      },
      service: "example",
    });

    // Data summary prompt
    this.getPromptManager().registerPrompt({
      name: "data-summary",
      description: "Generate a summary of the stored data",
      arguments: [],
      handler: async () => {
        const keys = await this.exampleService.getKeys();
        const size = await this.exampleService.getSize();

        const summary = `The example service currently stores ${size} data entries with the following keys: ${keys.join(", ")}.`;

        return {
          messages: [
            {
              role: "assistant",
              content: {
                type: "text",
                text: summary,
              },
            },
          ],
        };
      },
      service: "example",
    });

    // Summarize text prompt
    this.getPromptManager().registerPrompt({
      name: "summarize-text",
      description: "Summarize a long text into a few sentences",
      arguments: [
        {
          name: "text",
          type: "string",
          description: "The text to summarize",
          required: true,
        },
        {
          name: "length",
          type: "string",
          description: "Desired summary length ('short', 'medium', 'long')",
          required: false,
        },
      ],
      handler: async (params) => {
        const { text, length = "medium" } = params;
        const summary = `This is a '${length}' summary of the text: "${text.substring(0, 30)}..."`;
        return {
          messages: [
            {
              role: "assistant",
              content: { type: "text", text: summary },
            },
          ],
        };
      },
      service: "example",
    });

    // Simple prompt with no arguments
    this.getPromptManager().registerPrompt({
      name: "get-random-quote",
      description: "Get a random inspirational quote",
      arguments: [],
      handler: async () => {
        const quotes = [
          "The only way to do great work is to love what you do.",
          "Strive not to be a success, but rather to be of value.",
          "The mind is everything. What you think you become.",
        ];
        const randomIndex = Math.floor(Math.random() * quotes.length);
        return {
          messages: [
            {
              role: "assistant",
              content: { type: "text", text: quotes[randomIndex] },
            },
          ],
        };
      },
      service: "example",
    });
  }
}

/**
 * Main entry point
 */
async function main() {
  const server = new ExampleMcpServer();

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  // Start the server
  await server.start();
}

// Run if this file is executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    logger.error("Failed to start server:", error);
    process.exit(1);
  });
}
