export type ActionType = 
  | 'goto'
  | 'navigate'
  | 'click' 
  | 'type' 
  | 'scroll' 
  | 'hover' 
  | 'nativeClick' 
  | 'nativeType' 
  | 'readDom' 
  | 'updateDom' 
  | 'typeActive' 
  | 'press' 
  | 'sleep';

export interface DriverActionCall {
  action: ActionType;
  args: any[];
  timestamp: number;
}

export interface EngineLogEntry {
  type: 'log' | 'error' | 'step';
  message: string;
  timestamp: number;
}

export interface EngineRunResult<T = any> {
  success: boolean;
  value?: T;
  error?: string;
  logs: EngineLogEntry[];
  durationMs: number;
}

export interface RunOptions {
  timeoutMs?: number;
  onLog?: (entry: EngineLogEntry) => void;
  context?: Record<string, any>;
}
