export const VALID_ACTION_TYPES = ['click', 'type', 'scroll', 'extract', 'hover', 'nativeClick', 'nativeType', 'readDom', 'updateDom', 'typeActive', 'press'] as const;
export type AutomationActionType = typeof VALID_ACTION_TYPES[number];

export interface AutomationAction {
  type: AutomationActionType;
  selector: string;
  value?: any;
  property?: string;
}

export interface ExtensionMessage<T = any> {
  source: 'background' | 'content' | 'sandbox' | 'dashboard';
  type: string;
  payload?: T;
}

export interface BaseTrigger {
  type: 'hotkey' | 'expander' | 'load';
  triggerVal?: string;      // e.g., 'ctrl+shift+k' or ';;tq'
  functionName: string;    // e.g., 'test'
  urlPattern?: string;      // optional url match constraint
}

export interface HotkeyTrigger extends BaseTrigger {
  type: 'hotkey';
  triggerVal: string;
  displayLabel: string;    // e.g., 'Ctrl + Shift + K'
}

export interface ExpanderTrigger extends BaseTrigger {
  type: 'expander';
  triggerVal: string;
  expansionText: string;   // e.g., 'thank you very much'
}

export interface LoadTrigger extends BaseTrigger {
  type: 'load';
  urlPattern: string;
}

export type ParsedTrigger = HotkeyTrigger | ExpanderTrigger | LoadTrigger;


