export interface FlowScriptDriver {
  click(selector: string): Promise<void>;
  type(selector: string, value: string): Promise<void>;
  scroll(selector: string): Promise<void>;
  hover(selector: string): Promise<void>;
  readDom(selector: string, property: string): Promise<any>;
  updateDom(selector: string, property: string, value: any): Promise<void>;
  
  // Navigation
  goto?(url: string): Promise<void>;
  navigate?(url: string): Promise<void>;

  // Native / CDP Helpers
  nativeClick?(selector: string): Promise<void>;
  nativeType?(selector: string, value: string): Promise<void>;
  press?(key: string): Promise<void>;
  typeActive?(value: string): Promise<void>;
  
  // Timing helper
  sleep(ms: number): Promise<void>;

  // Lifecycle
  close?(): Promise<void>;
}
