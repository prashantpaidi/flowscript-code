export interface AutomationAction {
  type: 'click' | 'type' | 'scroll' | 'extract' | 'hover' | 'nativeClick' | 'nativeType';
  selector: string;
  value?: string;
}

export interface ExtensionMessage<T = any> {
  source: 'background' | 'content' | 'sandbox' | 'dashboard';
  type: string;
  payload?: T;
}
