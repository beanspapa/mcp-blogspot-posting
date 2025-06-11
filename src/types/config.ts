import { z } from "zod";
import { IToolConfig } from "./tool.js";
import { IResourceConfig } from "./resource.js";

/**
 * Prompt configuration interface
 */
export interface IPromptConfig {
  /** Prompt name (unique identifier) */
  name: string;
  /** Prompt description */
  description?: string;
  /** Prompt arguments schema */
  arguments?: IPromptArgument[];
  /** Prompt handler function */
  handler: (
    params: Record<string, any>,
    context: any
  ) => Promise<IPromptResult>;
  /** Associated service name (optional) */
  service?: string;
  /** Prompt metadata */
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
    author?: string;
  };
}

/**
 * Prompt handler function type
 */
export type PromptHandler = (
  params: any,
  context?: IPromptContext
) => Promise<IPromptResult>;

/**
 * Prompt context passed to handlers
 */
export interface IPromptContext {
  promptName: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Prompt result interface
 */
export interface IPromptResult {
  messages: IPromptMessage[];
}

/**
 * Service configuration interface
 */
export interface IServiceConfig {
  /** Service name */
  name: string;
  /** Service class or factory function */
  implementation: ServiceImplementation;
  /** Service configuration options */
  options?: Record<string, any>;
  /** Service dependencies */
  dependencies?: string[];
  /** Service lifecycle hooks */
  hooks?: {
    beforeInitialize?: () => Promise<void>;
    afterInitialize?: () => Promise<void>;
    beforeDestroy?: () => Promise<void>;
    afterDestroy?: () => Promise<void>;
  };
}

/**
 * Service implementation type
 */
export type ServiceImplementation = new (config?: any) => IService;

/**
 * Service interface
 */
export interface IService {
  getName(): string;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  isReady(): boolean;
}

/**
 * Middleware configuration interface
 */
export interface IMiddlewareConfig {
  /** Middleware name */
  name: string;
  /** Middleware implementation */
  implementation: IMiddleware;
  /** Middleware order (lower numbers execute first) */
  order?: number;
  /** Middleware options */
  options?: Record<string, any>;
}

/**
 * Middleware interface
 */
export interface IMiddleware {
  /** Execute before request processing */
  before?(context: any): Promise<any>;
  /** Execute after request processing */
  after?(context: any, result: any): Promise<any>;
  /** Execute on error */
  error?(context: any, error: Error): Promise<any>;
}

/**
 * Plugin configuration interface
 */
export interface IPluginConfig {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin implementation */
  implementation: IPlugin;
  /** Plugin options */
  options?: Record<string, any>;
  /** Plugin dependencies */
  dependencies?: string[];
}

/**
 * Plugin interface
 */
export interface IPlugin {
  name: string;
  version: string;
  initialize(server: any): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Complete server configuration
 */
export interface ICompleteServerConfig {
  /** Basic server configuration */
  server: {
    name: string;
    version: string;
    transport?: "stdio" | "http";
    port?: number;
    environment?: "development" | "production" | "test";
  };
  /** Logging configuration */
  logging?: {
    level: "error" | "warn" | "info" | "debug";
    enableConsole: boolean;
    enableFile?: boolean;
    filePath?: string;
  };
  /** Tools configuration */
  tools?: IToolConfig[];
  /** Resources configuration */
  resources?: IResourceConfig[];
  /** Prompts configuration */
  prompts?: IPromptConfig[];
  /** Services configuration */
  services?: IServiceConfig[];
  /** Middleware configuration */
  middleware?: IMiddlewareConfig[];
  /** Plugins configuration */
  plugins?: IPluginConfig[];
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export interface IPromptMessage {
  role: "user" | "assistant";
  content: ContentPart;
}

export interface IPromptArgument {
  [key: string]: any;
  name: string;
  description?: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
}

export interface IPromptListItem {
  [key: string]: any; // Index signature for compatibility
  name: string;
  description?: string;
  arguments?: IPromptArgument[];
}
