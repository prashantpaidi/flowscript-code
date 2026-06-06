export const VALID_ACTION_TYPES = ['click', 'type', 'scroll', 'extract', 'hover', 'nativeClick', 'nativeType'] as const;
export type AutomationActionType = typeof VALID_ACTION_TYPES[number];

export interface AutomationAction {
  type: AutomationActionType;
  selector: string;
  value?: string;
}

export interface ExtensionMessage<T = any> {
  source: 'background' | 'content' | 'sandbox' | 'dashboard';
  type: string;
  payload?: T;
}
