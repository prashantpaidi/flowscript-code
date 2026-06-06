import { browser } from 'wxt/browser';
import { MESSAGE_TYPES } from '@flowscript/shared';

/**
 * Queries the active tab in the current window.
 */
export async function queryActiveTab(): Promise<browser.tabs.Tab> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    throw new Error('No active web page found. Click on the tab you want to automate.');
  }
  return tab;
}

/**
 * Sends a message to the specified tab's content script to execute a given automation action.
 */
export async function executeActionOnTab(
  id: number,
  action: any,
  primaryColor: string = 'hsl(0 0% 98%)',
  targetTabId?: number
): Promise<any> {
  const tabId = targetTabId !== undefined ? targetTabId : (await queryActiveTab()).id;
  
  if (tabId === undefined) {
    throw new Error('Target tab is not defined.');
  }

  const response = await browser.tabs.sendMessage(tabId, {
    source: 'dashboard',
    type: MESSAGE_TYPES.EXECUTE_ACTION,
    payload: { id, action, primaryColor }
  });

  return response || { id, success: false, error: 'No response from content script.' };
}
