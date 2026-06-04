export interface AutomationAction {
  type: 'click' | 'type' | 'scroll' | 'extract';
  selector: string;
  value?: string;
}

export interface ExtensionMessage<T = any> {
  source: 'background' | 'content' | 'sandbox' | 'dashboard';
  type: string;
  payload?: T;
}
