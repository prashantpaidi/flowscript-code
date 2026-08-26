import { ParsedTrigger, HotkeyTrigger, ExpanderTrigger, matchUrlPattern } from '@flowscript/shared';

export interface TriggerStrategy {
  setup(executeCallback: (functionName: string) => void): void;
  update(triggers: ParsedTrigger[]): void;
  destroy(): void;
}

export class HotkeyTriggerStrategy implements TriggerStrategy {
  private activeHotkeys: HotkeyTrigger[] = [];
  private executeCallback: ((functionName: string) => void) | null = null;

  setup(executeCallback: (functionName: string) => void): void {
    this.executeCallback = executeCallback;
    window.addEventListener('keydown', this.handleKeyDown);
  }

  update(triggers: ParsedTrigger[]): void {
    const currentUrl = window.location.href;
    this.activeHotkeys = triggers
      .filter((t): t is HotkeyTrigger => t.type === 'hotkey')
      .filter((t) => !t.urlPattern || matchUrlPattern(t.urlPattern, currentUrl));
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.executeCallback = null;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;

    const target = event.target as HTMLElement;
    const isInput = target && (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable
    );

    // If inside an input element, only trigger hotkeys that use modifiers (Ctrl, Alt, Meta)
    if (isInput && !event.ctrlKey && !event.altKey && !event.metaKey) {
      return;
    }

    for (const trigger of this.activeHotkeys) {
      if (this.matchHotkey(event, trigger.triggerVal)) {
        event.preventDefault();
        event.stopPropagation();
        this.executeCallback?.(trigger.functionName);
        break;
      }
    }
  };

  private matchHotkey(event: KeyboardEvent, hotkey: string): boolean {
    const parts = hotkey.toLowerCase().split('+').map(p => p.trim());
    let ctrlRequired = false;
    let shiftRequired = false;
    let altRequired = false;
    let metaRequired = false;
    let targetKey = '';

    for (const part of parts) {
      if (part === 'ctrl' || part === 'control') {
        ctrlRequired = true;
      } else if (part === 'shift') {
        shiftRequired = true;
      } else if (part === 'alt' || part === 'option' || part === 'opt') {
        altRequired = true;
      } else if (part === 'meta' || part === 'cmd' || part === 'command' || part === 'win') {
        metaRequired = true;
      } else {
        targetKey = part;
      }
    }

    if (event.ctrlKey !== ctrlRequired) return false;
    if (event.shiftKey !== shiftRequired) return false;
    if (event.altKey !== altRequired) return false;
    if (event.metaKey !== metaRequired) return false;

    let normalizedTargetKey = targetKey;
    if (normalizedTargetKey === 'space') {
      normalizedTargetKey = ' ';
    }

    return event.key.toLowerCase() === normalizedTargetKey;
  }
}

export class ExpanderTriggerStrategy implements TriggerStrategy {
  private activeExpanders: ExpanderTrigger[] = [];
  private executeCallback: ((functionName: string) => void) | null = null;
  private isExpanding = false;

  setup(executeCallback: (functionName: string) => void): void {
    this.executeCallback = executeCallback;
    window.addEventListener('input', this.handleInput);
  }

  update(triggers: ParsedTrigger[]): void {
    const currentUrl = window.location.href;
    this.activeExpanders = triggers
      .filter((t): t is ExpanderTrigger => t.type === 'expander')
      .filter((t) => !t.urlPattern || matchUrlPattern(t.urlPattern, currentUrl))
      .sort((a, b) => b.triggerVal.length - a.triggerVal.length);
  }

  destroy(): void {
    window.removeEventListener('input', this.handleInput);
    this.executeCallback = null;
  }

  private handleInput = (event: Event): void => {
    if (this.isExpanding) return;

    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return;
    }

    const value = target.value;
    const cursor = target.selectionStart || 0;
    const beforeCursor = value.substring(0, cursor);

    for (const trigger of this.activeExpanders) {
      if (beforeCursor.endsWith(trigger.triggerVal)) {
        this.isExpanding = true;
        try {
          const start = cursor - trigger.triggerVal.length;
          const expansion = trigger.expansionText;

          // Try using document.execCommand first to preserve browser undo/redo stack
          target.focus();
          target.setSelectionRange(start, cursor);
          const success = document.execCommand('insertText', false, expansion);

          if (!success) {
            // Fallback if execCommand is not supported or fails
            target.value = value.substring(0, start) + expansion + value.substring(cursor);
            const newCursor = start + expansion.length;
            target.setSelectionRange(newCursor, newCursor);
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
          }

          this.executeCallback?.(trigger.functionName);
        } finally {
          this.isExpanding = false;
        }
        break;
      }
    }
  };
}

export class LoadTriggerStrategy implements TriggerStrategy {
  private activeLoadTriggers: ParsedTrigger[] = [];
  private executeCallback: ((functionName: string) => void) | null = null;
  private executedFunctions = new Set<string>();
  private lastUrl = '';

  setup(executeCallback: (functionName: string) => void): void {
    this.executeCallback = executeCallback;
    this.executedFunctions.clear();
    this.lastUrl = window.location.href;
    this.checkAndExecute();
  }

  update(triggers: ParsedTrigger[]): void {
    const currentUrl = window.location.href;
    if (currentUrl !== this.lastUrl) {
      this.executedFunctions.clear();
      this.lastUrl = currentUrl;
    }
    this.activeLoadTriggers = triggers
      .filter((t) => t.type === 'load')
      .filter((t) => t.urlPattern && matchUrlPattern(t.urlPattern, currentUrl));
    
    this.checkAndExecute();
  }

  destroy(): void {
    this.executeCallback = null;
    this.activeLoadTriggers = [];
    this.executedFunctions.clear();
    this.lastUrl = '';
  }

  private checkAndExecute(): void {
    if (!this.executeCallback || this.activeLoadTriggers.length === 0) {
      return;
    }
    for (const trigger of this.activeLoadTriggers) {
      if (!this.executedFunctions.has(trigger.functionName)) {
        this.executedFunctions.add(trigger.functionName);
        this.executeCallback(trigger.functionName);
      }
    }
  }
}

export class TriggerManager {
  private strategies: TriggerStrategy[] = [];
  private onTriggerFired: (functionName: string) => void;

  constructor(onTriggerFired: (functionName: string) => void) {
    this.onTriggerFired = onTriggerFired;
    this.strategies = [
      new HotkeyTriggerStrategy(),
      new ExpanderTriggerStrategy(),
      new LoadTriggerStrategy()
    ];
  }

  setup(): void {
    const callback = (functionName: string) => {
      this.onTriggerFired(functionName);
    };

    for (const strategy of this.strategies) {
      strategy.setup(callback);
    }
  }

  update(triggers: ParsedTrigger[]): void {
    for (const strategy of this.strategies) {
      strategy.update(triggers);
    }
  }

  destroy(): void {
    for (const strategy of this.strategies) {
      strategy.destroy();
    }
  }
}
