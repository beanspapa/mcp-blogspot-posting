import {
  IToolConfig,
  IToolRegistryEntry,
  IToolListItem,
  IToolExecutionResult,
  IToolContext,
} from "../types/tool.js";
import {
  CallToolResult,
  ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { logInfo, logWarning, logError } from "../utils/logger.js";
import { ErrorHandler } from "../utils/error-handler.js";
import { Validator } from "../utils/validation.js";
import GoogleAuth from "../lib/googleAuth.js";
import { TokenManager } from "../lib/tokenManager.js";
import BloggerService from "../services/bloggerService.js";
import { z } from "zod";
import { BlogPost } from "../types/bloggerTypes.js";

/**
 * Tool manager class for registering and executing tools
 */
export class ToolManager {
  private tools: Map<string, IToolRegistryEntry> = new Map();

  /**
   * Register a tool
   */
  registerTool(config: IToolConfig): void {
    try {
      // Validate tool configuration
      this.validateToolConfig(config);

      // Check for duplicate names
      if (this.tools.has(config.name)) {
        throw ErrorHandler.createInvalidRequestError(
          `Tool '${config.name}' is already registered`
        );
      }

      // Create registry entry
      const entry: IToolRegistryEntry = {
        config,
        registeredAt: new Date(),
        usageCount: 0,
        errorCount: 0,
      };

      this.tools.set(config.name, entry);
      logInfo(`Tool '${config.name}' registered successfully`);
    } catch (error) {
      ErrorHandler.handleToolError(error, config.name);
    }
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    const deleted = this.tools.delete(name);
    if (deleted) {
      logInfo(`Tool '${name}' unregistered successfully`);
    } else {
      logWarning(`Tool '${name}' not found for unregistration`);
    }
    return deleted;
  }

  /**
   * Get tool configuration
   */
  getTool(name: string): IToolConfig | undefined {
    const entry = this.tools.get(name);
    return entry?.config;
  }

  /**
   * Check if tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * List all tools (MCP protocol)
   */
  async listTools(): Promise<ListToolsResult> {
    const tools: IToolListItem[] = Array.from(this.tools.values()).map(
      (entry) => {
        const shape = entry.config.inputSchema._def.shape();
        const properties = Object.keys(shape).reduce(
          (acc, key) => {
            const field = shape[key];
            acc[key] = {
              type: field._def.typeName,
              description: field.description,
            };
            return acc;
          },
          {} as Record<string, any>
        );

        const required = Object.keys(properties).filter(
          (key) => !shape[key].isOptional()
        );

        return {
          name: entry.config.name,
          description: entry.config.description,
          inputSchema: {
            type: "object",
            properties,
            required: required.length > 0 ? required : undefined,
          },
        };
      }
    );

    return { tools };
  }

  /**
   * Execute a tool
   */
  async callTool(
    name: string,
    params: any,
    context?: IToolContext
  ): Promise<CallToolResult> {
    const entry = this.tools.get(name);
    if (!entry) {
      throw ErrorHandler.createNotFoundError("Tool", name);
    }

    const startTime = Date.now();
    let result: CallToolResult;
    let error: Error | undefined;

    try {
      // Validate input parameters
      const validatedParams = Validator.validateSchema(
        params,
        entry.config.inputSchema
      );

      // Create execution context
      const executionContext: IToolContext = {
        toolName: name,
        requestId: context?.requestId || `tool-${Date.now()}`,
        userId: context?.userId,
        metadata: context?.metadata,
      };

      logInfo(
        `Executing tool '${name}' with params: ` +
          JSON.stringify(validatedParams)
      );

      // Execute the tool
      result = await entry.config.handler(validatedParams, executionContext);

      // Update usage statistics
      entry.usageCount++;
      entry.lastUsed = new Date();

      logInfo(`Tool '${name}' executed successfully`);
      return result;
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      entry.errorCount++;
      logError(`Tool '${name}' execution failed: ` + error.message);
      ErrorHandler.handleToolError(error, name);
    } finally {
      const executionTime = Date.now() - startTime;
      logInfo(`Tool '${name}' execution time: ${executionTime}ms`);
    }
  }

  /**
   * Get tool execution statistics
   */
  getToolStats(name: string): IToolExecutionResult | undefined {
    const entry = this.tools.get(name);
    if (!entry) {
      return undefined;
    }

    return {
      success: entry.errorCount === 0 || entry.usageCount > entry.errorCount,
      executionTime: 0, // This would need to be tracked per execution
      metadata: {
        totalExecutions: entry.usageCount,
        errorCount: entry.errorCount,
        lastUsed: entry.lastUsed,
        registeredAt: entry.registeredAt,
      },
    };
  }

  /**
   * Get all tool statistics
   */
  getAllToolStats(): Record<string, IToolExecutionResult> {
    const stats: Record<string, IToolExecutionResult> = {};

    for (const [name, entry] of this.tools) {
      stats[name] = {
        success: entry.errorCount === 0 || entry.usageCount > entry.errorCount,
        executionTime: 0,
        metadata: {
          totalExecutions: entry.usageCount,
          errorCount: entry.errorCount,
          lastUsed: entry.lastUsed,
          registeredAt: entry.registeredAt,
        },
      };
    }

    return stats;
  }

  /**
   * Clear all tools
   */
  clearTools(): void {
    const count = this.tools.size;
    this.tools.clear();
    logInfo(`Cleared ${count} tools`);
  }

  /**
   * Get tools by service
   */
  getToolsByService(serviceName: string): IToolConfig[] {
    return Array.from(this.tools.values())
      .filter((entry) => entry.config.service === serviceName)
      .map((entry) => entry.config);
  }

  /**
   * Validate tool configuration
   */
  private validateToolConfig(config: IToolConfig): void {
    Validator.validateRequired(config.name, "name");
    Validator.validateString(config.name, "name");
    Validator.validateRequired(config.description, "description");
    Validator.validateString(config.description, "description");
    Validator.validateRequired(config.inputSchema, "inputSchema");
    Validator.validateRequired(config.handler, "handler");

    if (typeof config.handler !== "function") {
      throw ErrorHandler.createValidationError(
        "Tool handler must be a function"
      );
    }

    // Validate tool name format (alphanumeric, underscore, hyphen)
    const namePattern = /^[a-zA-Z0-9_-]+$/;
    if (!namePattern.test(config.name)) {
      throw ErrorHandler.createValidationError(
        "Tool name must contain only alphanumeric characters, underscores, and hyphens"
      );
    }
  }

  /**
   * Get manager statistics
   */
  getManagerStats(): {
    totalTools: number;
    totalExecutions: number;
    totalErrors: number;
    toolsByService: Record<string, number>;
  } {
    let totalExecutions = 0;
    let totalErrors = 0;
    const toolsByService: Record<string, number> = {};

    for (const entry of this.tools.values()) {
      totalExecutions += entry.usageCount;
      totalErrors += entry.errorCount;

      const service = entry.config.service || "default";
      toolsByService[service] = (toolsByService[service] || 0) + 1;
    }

    return {
      totalTools: this.tools.size,
      totalExecutions,
      totalErrors,
      toolsByService,
    };
  }

  /**
   * 블로그 포스팅 MCP Tool 등록
   */
  registerBloggerTools({
    bloggerService,
    blogId,
    googleAuth,
  }: {
    bloggerService: any;
    blogId: string;
    googleAuth: any;
  }): void {
    // blog-post 단일 포스팅 Tool
    this.registerTool({
      name: "blog-post",
      description: "Google Blogger에 새 포스트를 작성합니다.",
      inputSchema: z.object({
        title: z.string().describe("포스트 제목"),
        content: z.string().describe("포스트 내용(HTML)"),
        labels: z.array(z.string()).optional().describe("라벨 목록"),
        isDraft: z.boolean().optional().describe("초안 여부"),
      }),
      handler: async (params) => {
        // 인증 토큰 확인
        const tokens = TokenManager.loadTokens();
        if (!tokens || !tokens.access_token) {
          return {
            content: [
              {
                type: "text",
                text: "인증 토큰이 없습니다. 먼저 인증을 완료하세요.",
              },
            ],
            isError: true,
          };
        }
        googleAuth.setCredentials(tokens);
        try {
          if (!blogId) {
            return {
              content: [
                {
                  type: "text",
                  text: `서버에 블로그 ID(BLOG_ID)가 설정되어 있지 않습니다.`,
                },
              ],
              isError: true,
            };
          }
          const postData = {
            title: params.title,
            content: params.content,
            labels: params.labels,
            isDraft: params.isDraft === undefined ? true : params.isDraft,
          };
          const result = await bloggerService.createPost(blogId, postData);
          return {
            content: [
              {
                type: "text",
                text: `포스트 작성 성공!\nURL: ${result.url}\n제목: ${result.title}`,
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          return {
            content: [
              { type: "text", text: `포스트 작성 실패: ${error.message}` },
            ],
            isError: true,
          };
        }
      },
      service: "blogger",
    });

    // blog-batch-post 배치 포스팅 Tool
    this.registerTool({
      name: "blog-batch-post",
      description: "Google Blogger에 여러 포스트를 한 번에 작성합니다.",
      inputSchema: z.object({
        posts: z
          .array(
            z.object({
              title: z.string(),
              content: z.string(),
              labels: z.array(z.string()).optional(),
              isDraft: z.boolean().optional(),
            })
          )
          .describe("포스트 배열"),
      }),
      handler: async (params) => {
        const tokens = TokenManager.loadTokens();
        if (!tokens || !tokens.access_token) {
          return {
            content: [
              {
                type: "text",
                text: "인증 토큰이 없습니다. 먼저 인증을 완료하세요.",
              },
            ],
            isError: true,
          };
        }
        googleAuth.setCredentials(tokens);
        try {
          if (!blogId) {
            return {
              content: [
                {
                  type: "text",
                  text: `서버에 블로그 ID(BLOG_ID)가 설정되어 있지 않습니다.`,
                },
              ],
              isError: true,
            };
          }
          // 각 포스트의 isDraft 기본값 true 적용
          const posts = (params.posts as BlogPost[]).map((p) => ({
            ...p,
            isDraft: p.isDraft === undefined ? true : p.isDraft,
          }));
          const results = await bloggerService.batchCreatePosts(blogId, posts);
          const successCount = results.filter((r: any) => r.success).length;
          const failCount = results.length - successCount;
          return {
            content: [
              {
                type: "text",
                text: `배치 포스팅 완료! 성공: ${successCount}, 실패: ${failCount}`,
              },
              { type: "text", text: JSON.stringify(results, null, 2) },
            ],
            isError: failCount > 0,
          };
        } catch (error: any) {
          return {
            content: [
              { type: "text", text: `배치 포스팅 실패: ${error.message}` },
            ],
            isError: true,
          };
        }
      },
      service: "blogger",
    });
  }
}
