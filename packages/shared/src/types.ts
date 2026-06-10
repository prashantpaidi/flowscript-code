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
  type: 'hotkey' | 'expander';
  triggerVal: string;      // e.g., 'ctrl+shift+k' or ';;tq'
  functionName: string;    // e.g., 'test'
}

export interface HotkeyTrigger extends BaseTrigger {
  type: 'hotkey';
  displayLabel: string;    // e.g., 'Ctrl + Shift + K'
}

export interface ExpanderTrigger extends BaseTrigger {
  type: 'expander';
  expansionText: string;   // e.g., 'thank you very much'
}

export type ParsedTrigger = HotkeyTrigger | ExpanderTrigger;

