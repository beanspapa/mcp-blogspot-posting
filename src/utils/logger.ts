import { LogLevel } from "../types/index.js";

/**
 * Logger configuration interface
 */
export interface ILoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile?: boolean;
  filePath?: string;
  isDevelopment?: boolean;
}

/**
 * Logger class with MCP-compatible output handling
 */
export class Logger {
  private static instance: Logger;
  private config: ILoggerConfig;
  private isDevelopment: boolean;

  private constructor(config?: Partial<ILoggerConfig>) {
    this.isDevelopment = process.env.NODE_ENV !== "production";
    this.config = {
      level: "info",
      enableConsole: this.isDevelopment,
      isDevelopment: this.isDevelopment,
      ...config,
    };

    // 개발 환경에서 mcps-logger 활성화
    if (this.isDevelopment && this.config.enableConsole) {
      this.initializeMcpsLogger().catch((err) => {
        console.warn("Failed to initialize mcps-logger:", err);
      });
    }
  }

  /**
   * Get singleton logger instance
   */
  static getInstance(config?: Partial<ILoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Initialize mcps-logger for development
   */
  private async initializeMcpsLogger(): Promise<void> {
    try {
      await import("mcps-logger/console");
    } catch (error) {
      // mcps-logger가 없는 경우 무시
      console.warn("mcps-logger not available, using standard console");
    }
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };

    return levels[level] <= levels[this.config.level];
  }

  /**
   * Format log message
   */
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  /**
   * Core logging method
   */
  log(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);

    if (this.config.enableConsole) {
      if (this.isDevelopment) {
        // 개발 환경에서는 mcps-logger를 통해 출력
        console[level](formattedMessage);
      } else {
        // 프로덕션에서는 stderr만 사용 (MCP 호환성)
        if (level === "error") {
          console.error(formattedMessage);
        }
      }
    }

    // 파일 로깅 (향후 구현 가능)
    if (this.config.enableFile && this.config.filePath) {
      this.writeToFile(formattedMessage);
    }
  }

  /**
   * Write log to file (placeholder for future implementation)
   */
  private writeToFile(message: string): void {
    // TODO: Implement file logging
    // This could use fs.appendFile or a logging library like winston
  }

  /**
   * Error level logging
   */
  error(message: string, meta?: any): void {
    this.log("error", message, meta);
  }

  /**
   * Warning level logging
   */
  warn(message: string, meta?: any): void {
    this.log("warn", message, meta);
  }

  /**
   * Info level logging
   */
  info(message: string, meta?: any): void {
    this.log("info", message, meta);
  }

  /**
   * Debug level logging
   */
  debug(message: string, meta?: any): void {
    this.log("debug", message, meta);
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<ILoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ILoggerConfig {
    return { ...this.config };
  }
}

/**
 * Default logger instance
 */
export const logger = Logger.getInstance();
