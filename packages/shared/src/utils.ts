import { AutomationAction, VALID_ACTION_TYPES } from './types.js';

/**
 * Validates whether the given object is a valid AutomationAction.
 */
export function isValidAction(action: any): action is AutomationAction {
  if (!action || typeof action !== 'object') return false;
  
  const hasValidType = (VALID_ACTION_TYPES as readonly string[]).includes(action.type);
  const hasValidSelector = typeof action.selector === 'string' && action.selector.trim().length > 0;
  
  if (!hasValidType || !hasValidSelector) return false;
  
  if (action.type === 'type' || action.type === 'nativeType') {
    return typeof action.value === 'string';
  }
  
  return true;
}

/**
 * Helper promise-based delay function.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
