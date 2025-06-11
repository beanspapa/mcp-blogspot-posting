// Re-export all types for easy importing
export * from './server.js';
export * from './tool.js';
export * from './resource.js';
export * from './config.js';

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Result types for async operations
export interface AsyncResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Generic handler function type
export type Handler<TInput = any, TOutput = any> = (input: TInput) => Promise<TOutput>;

// Lifecycle states
export type LifecycleState = 'stopped' | 'initializing' | 'running' | 'stopping' | 'error';

// Log levels
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'; 