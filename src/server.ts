import { z } from "zod";
import { BaseServer } from "./core/base-server.js";
import { IServerConfig } from "./types/server.js";
import { logger } from "./utils/logger.js";
import { pathToFileURL } from "node:url";
import { createConfigWithPort } from "./config.js";

/**
 * Example MCP Server implementation
 * This demonstrates how to create a concrete server using the boilerplate
 */
export class BlogspotMcpServer extends BaseServer {
  constructor(config?: Partial<IServerConfig>) {
    const defaultConfig: IServerConfig = {
      name: "blogspot-mcp-server",
      version: "1.0.0",
      transport: "stdio",
      capabilities: {
        tools: {},
      },
    };

    super({ ...defaultConfig, ...config });
  }

  /**
   * Initialize server-specific components
   */
  protected async doInitialize(): Promise<void> {
    logger.info("Initializing Blogspot MCP Server...");
    // Register tools
    this.registerTools();
    logger.info("Blogspot MCP Server initialization completed");
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
    logger.info("Stopping Blogspot MCP Server components...");
    // No service cleanup needed
  }

  /**
   * Register example tools
   */
  private registerTools(): void {
    // 블로그 포스팅 MCP Tool 등록
    const port = parseInt(process.env.PORT || "3000", 10);
    const config = createConfigWithPort(port, {
      credentialPath: process.env.GOOGLE_CLIENT_SECRET_PATH,
      blogId: process.env.BLOG_ID || undefined,
    });
    this.getToolManager().registerBloggerTools(config);
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    const server = new BlogspotMcpServer();
    await server.start();
  } catch (err: unknown) {
    console.error("[FATAL] MCP 서버 실행 중 에러:", err);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    logger.error("Failed to start server:", error);
    process.exit(1);
  });
}
