import { MESSAGE_TYPES } from '@flowscript/shared';
import { performNativeClick, performNativeType } from '@/utils/debugger-actions';
import { getSavedTriggers, watchTriggers, getRecordingStatus, watchRecordingStatus } from '@/utils/storage';
import { TriggerManager } from '@/utils/trigger-manager';
import { generatePrimarySelector, generateFallbackSelector } from '@/utils/selector-generator';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('FlowScript content script initialized.');

    // Initialize triggers
    initTriggers();

    // Listen for execution commands from the sidepanel
    browser.runtime.onMessage.addListener((message, sender) => {
      if (!message) return;

      if (message.source === 'dashboard') {
        if (message.type === MESSAGE_TYPES.EXECUTE_ACTION) {
          const { id, action, primaryColor } = message.payload;
          return executeAction(id, action, primaryColor);
        } else if (message.type === MESSAGE_TYPES.START_DOM_SELECT) {
          startDomSelector();
        } else if (message.type === MESSAGE_TYPES.STOP_DOM_SELECT) {
          cleanupDomSelector();
        }
      }
    });

    // Initialize recording status from storage
    getRecordingStatus().then((isRecordingActive) => {
      if (isRecordingActive) {
        startRecording();
      }
    }).catch(err => console.error('FlowScript: Failed to check recording status:', err));

    // Watch for recording status changes
    watchRecordingStatus((isRecordingActive) => {
      if (isRecordingActive) {
        startRecording();
      } else {
        stopRecording();
      }
    });
  },
});


function hasPrototypePollution(path: string): boolean {
  const parts = path.split('.');
  return parts.some(part => {
    const p = part.trim().toLowerCase();
    return p === '__proto__' || p === 'constructor' || p === 'prototype';
  });
}

function getNestedProperty(obj: any, path: string): any {
  if (hasPrototypePollution(path)) {
    return undefined;
  }
  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, obj);
}

function setNestedProperty(obj: any, path: string, value: any): boolean {
  if (hasPrototypePollution(path)) {
    throw new Error('Access denied: Prototype pollution keys are forbidden.');
  }
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part];
  }
  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
  return true;
}

function isElementVisible(el: HTMLElement): boolean {
  if (!el.ownerDocument.defaultView) return false;
  const style = el.ownerDocument.defaultView.getComputedStyle(el);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    el.offsetWidth > 0 &&
    el.offsetHeight > 0
  );
}

type ActionHandler = (element: HTMLElement, action: any) => Promise<any> | any;

const actionHandlers: Record<string, ActionHandler> = {
  click: (element) => {
    element.click();
    return true;
  },
  type: (element, action) => {
    const value = action.value || '';
    element.focus();
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      element.value = value;
    } else {
      element.innerText = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  },
  scroll: () => {
    // Already scrolled into view by the outer execution flow
    return true;
  },
  hover: (element) => {
    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    return true;
  },
  nativeClick: async (element, action) => {
    return performNativeClick(action.selector);
  },
  nativeType: async (element, action) => {
    return performNativeType(action.selector, action.value || '');
  },
  readDom: (element, action) => {
    const path = (action.property || 'textContent').trim();
    if (path.startsWith('attr:')) {
      const attrName = path.slice(5);
      return { success: true, value: element.getAttribute(attrName) || '' };
    }
    const resolvedPath = path === 'text' ? 'textContent' : path === 'html' ? 'innerHTML' : path;

    if (resolvedPath === '__exists') {
      return { success: true, value: true };
    }
    if (resolvedPath === '__isVisible') {
      return { success: true, value: isElementVisible(element) };
    }

    const value = getNestedProperty(element, resolvedPath);
    if (value === undefined && !path.includes('.')) {
      return { success: true, value: element.getAttribute(path) || '' };
    }
    return { success: true, value: value !== undefined ? value : '' };
  },
  updateDom: (element, action) => {
    const path = (action.property || '').trim();
    if (!path) {
      throw new Error('Property path is required for updateDom action');
    }
    const resolvedPath = path === 'text' ? 'textContent' : path === 'html' ? 'innerHTML' : path;
    const value = action.value;

    setNestedProperty(element, resolvedPath, value);

    if (resolvedPath === 'value') {
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return true;
  }
};

async function executeAction(id: number, action: any, primaryColor?: string) {
  try {
    const { type, selector } = action;
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      if (type === 'readDom') {
        const path = (action.property || 'textContent').trim();
        const resolvedPath = path === 'text' ? 'textContent' : path === 'html' ? 'innerHTML' : path;
        if (resolvedPath === '__exists' || resolvedPath === '__isVisible') {
          return { id, success: true, value: false };
        }
        return { id, success: true, value: null };
      }
      return { id, success: false, error: `Element not found for selector: "${selector}"` };
    }

    // Only scroll and flash for interactive/mutating actions (not readDom/scraping actions)
    if (type !== 'readDom') {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await flashElement(element, primaryColor);
    }

    const handler = actionHandlers[type];
    if (handler) {
      const result = await handler(element, action);
      if (typeof result === 'object' && result !== null && 'success' in result) {
        return { id, ...result };
      }
      return { id, success: !!result };
    }

    return { id, success: false, error: `Unsupported action type: "${type}"` };
  } catch (error: any) {
    return { id, success: false, error: error?.message || String(error) };
  }
}

async function flashElement(element: HTMLElement, primaryColor: string = 'hsl(0 0% 98%)') {
  const originalOutline = element.style.outline;
  const originalOutlineOffset = element.style.outlineOffset;
  const originalTransition = element.style.transition;
  const originalBoxShadow = element.style.boxShadow;

  element.style.transition = 'outline 0.2s ease, box-shadow 0.2s ease';
  
  // Clean outline matching the extension theme's primary style variable
  element.style.outline = `3px solid ${primaryColor}`;
  element.style.outlineOffset = '2px';
  element.style.boxShadow = `0 0 15px ${primaryColor}`;

  await new Promise((resolve) => setTimeout(resolve, 600));

  element.style.outline = originalOutline;
  element.style.outlineOffset = originalOutlineOffset;
  element.style.boxShadow = originalBoxShadow;
  
  await new Promise((resolve) => setTimeout(resolve, 150));
  element.style.transition = originalTransition;
}

let triggerManager: TriggerManager | null = null;

async function initTriggers() {
  triggerManager = new TriggerManager(executeTriggerFunction);
  triggerManager.setup();

  try {
    const triggers = await getSavedTriggers();
    if (triggers) {
      triggerManager.update(triggers);
    }
  } catch (error) {
    console.error('FlowScript: Failed to initialize triggers:', error);
  }

  watchTriggers((newTriggers) => {
    triggerManager?.update(newTriggers || []);
  });
}

async function executeTriggerFunction(functionName: string) {
  console.log(`FlowScript: Firing trigger for function: ${functionName}()`);
  browser.runtime.sendMessage({
    source: 'content',
    type: 'RUN_TRIGGER_FUNCTION',
    payload: { functionName }
  }).catch((err) => {
    console.warn('FlowScript: Could not invoke trigger function. Is the sidepanel open?', err);
  });
}

let activeOverlay: HTMLDivElement | null = null;
let activeBadge: HTMLDivElement | null = null;
let inspecting = false;

function startDomSelector() {
  if (inspecting) {
    cleanupDomSelector();
  }
  inspecting = true;

  // Create highlight overlay with beautiful modern styling (blue overlay with subtle glow)
  activeOverlay = document.createElement('div');
  activeOverlay.style.position = 'fixed';
  activeOverlay.style.pointerEvents = 'none';
  activeOverlay.style.zIndex = '2147483647';
  activeOverlay.style.border = '2px solid #0ea5e9'; // sky-500
  activeOverlay.style.background = 'rgba(14, 165, 233, 0.12)';
  activeOverlay.style.boxShadow = '0 0 12px rgba(14, 165, 233, 0.4)';
  activeOverlay.style.borderRadius = '4px';
  activeOverlay.style.transition = 'all 0.1s cubic-bezier(0.16, 1, 0.3, 1)';
  activeOverlay.style.display = 'none';
  document.body.appendChild(activeOverlay);

  // Create floating info badge
  activeBadge = document.createElement('div');
  activeBadge.style.position = 'fixed';
  activeBadge.style.pointerEvents = 'none';
  activeBadge.style.zIndex = '2147483647';
  activeBadge.style.background = '#0f172a'; // slate-900
  activeBadge.style.color = '#f8fafc'; // slate-50
  activeBadge.style.padding = '4px 8px';
  activeBadge.style.borderRadius = '4px';
  activeBadge.style.fontFamily = 'monospace';
  activeBadge.style.fontSize = '10px';
  activeBadge.style.fontWeight = 'bold';
  activeBadge.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
  activeBadge.style.border = '1px solid #334155';
  activeBadge.style.whiteSpace = 'nowrap';
  activeBadge.style.transition = 'all 0.1s cubic-bezier(0.16, 1, 0.3, 1)';
  activeBadge.style.display = 'none';
  document.body.appendChild(activeBadge);

  // Event handlers
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('click', handleSelectClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
}

function cleanupDomSelector() {
  inspecting = false;
  
  if (activeOverlay && activeOverlay.parentNode) {
    activeOverlay.parentNode.removeChild(activeOverlay);
  }
  activeOverlay = null;

  if (activeBadge && activeBadge.parentNode) {
    activeBadge.parentNode.removeChild(activeBadge);
  }
  activeBadge = null;

  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('click', handleSelectClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
}

function handleMouseOver(e: MouseEvent) {
  if (!inspecting || !activeOverlay || !activeBadge) return;
  const target = e.target as HTMLElement;
  if (!target || target === activeOverlay || target === activeBadge) return;

  const rect = target.getBoundingClientRect();
  
  // Update overlay position/size
  activeOverlay.style.display = 'block';
  activeOverlay.style.top = `${rect.top}px`;
  activeOverlay.style.left = `${rect.left}px`;
  activeOverlay.style.width = `${rect.width}px`;
  activeOverlay.style.height = `${rect.height}px`;

  // Build badge text: e.g. "div.container | 300x200"
  let identifier = target.tagName.toLowerCase();
  if (target.id) {
    identifier += `#${target.id}`;
  } else if (target.className && typeof target.className === 'string') {
    const classes = target.className.trim().split(/\s+/).filter(c => c && !c.includes(':') && c.length < 20);
    if (classes.length > 0) {
      identifier += `.${classes.join('.')}`;
    }
  }
  
  activeBadge.style.display = 'block';
  activeBadge.textContent = `${identifier} (${Math.round(rect.width)} × ${Math.round(rect.height)})`;

  // Position badge nicely above or below overlay
  const badgeHeight = 22;
  let badgeTop = rect.top - badgeHeight - 6;
  if (badgeTop < 0) {
    // If not enough space above, position below the element
    badgeTop = rect.bottom + 6;
  }
  let badgeLeft = rect.left;
  if (badgeLeft + activeBadge.offsetWidth > window.innerWidth) {
    badgeLeft = window.innerWidth - activeBadge.offsetWidth - 10;
  }
  if (badgeLeft < 0) {
    badgeLeft = 10;
  }

  activeBadge.style.top = `${badgeTop}px`;
  activeBadge.style.left = `${badgeLeft}px`;
}

function handleSelectClick(e: MouseEvent) {
  if (!inspecting) return;
  
  // Hijack the click event
  e.preventDefault();
  e.stopPropagation();

  const target = e.target as HTMLElement;
  if (target) {
    const primary = generatePrimarySelector(target);
    const fallback = generateFallbackSelector(target);

    // Send selection back to dashboard sidepanel
    browser.runtime.sendMessage({
      source: 'content',
      type: MESSAGE_TYPES.DOM_ELEMENT_SELECTED,
      payload: { primary, fallback }
    }).catch(err => console.warn('FlowScript: Failed to send selected selector:', err));
  }

  cleanupDomSelector();
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    
    // Notify sidepanel about abort
    browser.runtime.sendMessage({
      source: 'content',
      type: MESSAGE_TYPES.DOM_SELECT_ABORTED
    }).catch(err => console.warn('FlowScript: Failed to send select abort:', err));

    cleanupDomSelector();
  }
}

let recording = false;

function startRecording() {
  if (recording) return;
  recording = true;
  console.log('FlowScript: Recording started.');

  window.addEventListener('click', handleRecordClick, true);
  window.addEventListener('change', handleRecordChange, true);
}

function stopRecording() {
  if (!recording) return;
  recording = false;
  console.log('FlowScript: Recording stopped.');

  window.removeEventListener('click', handleRecordClick, true);
  window.removeEventListener('change', handleRecordChange, true);
}

function handleRecordClick(e: MouseEvent) {
  if (!recording) return;
  const target = e.target as HTMLElement;
  if (!target) return;

  // Filter out clicks on text inputs, textareas, and selects to avoid double actions during typing/selecting
  const isTextInput = target instanceof HTMLTextAreaElement || 
    (target instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset', 'image'].includes(target.type));
  const isSelect = target instanceof HTMLSelectElement;

  if (isTextInput || isSelect) {
    return;
  }

  const primary = generatePrimarySelector(target);
  if (primary) {
    browser.runtime.sendMessage({
      source: 'content',
      type: MESSAGE_TYPES.RECORDED_ACTION,
      payload: { type: 'click', selector: primary }
    }).catch(err => console.warn('FlowScript: Failed to send recorded click:', err));
  }
}

function handleRecordChange(e: Event) {
  if (!recording) return;
  const target = e.target as HTMLElement;
  if (!target) return;

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    // Checkbox and radio change states are automated and simulated via clicks, ignore them here
    if (target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')) {
      return;
    }

    const primary = generatePrimarySelector(target);
    if (primary) {
      browser.runtime.sendMessage({
        source: 'content',
        type: MESSAGE_TYPES.RECORDED_ACTION,
        payload: { type: 'type', selector: primary, value: target.value }
      }).catch(err => console.warn('FlowScript: Failed to send recorded type action:', err));
    }
  }
}

