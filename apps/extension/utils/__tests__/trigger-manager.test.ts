import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  TriggerManager,
  HotkeyTriggerStrategy,
  ExpanderTriggerStrategy,
  LoadTriggerStrategy,
} from '../trigger-manager';
import { ParsedTrigger, HotkeyTrigger, ExpanderTrigger, LoadTrigger } from '@flowscript/shared';

describe('trigger-manager fire sites', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires the hotkey callback with the full trigger object (including fileId)', () => {
    const cb = vi.fn();
    const strategy = new HotkeyTriggerStrategy();
    strategy.setup(cb);
    const trigger: HotkeyTrigger = {
      type: 'hotkey',
      triggerVal: 'ctrl+shift+k',
      displayLabel: 'Ctrl + Shift + K',
      functionName: 'openMenu',
      fileId: 'file-a',
    };
    strategy.update([trigger]);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true }));

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(trigger);
    strategy.destroy();
  });

  it('does not fire hotkeys whose urlPattern does not match the current page', () => {
    const cb = vi.fn();
    const strategy = new HotkeyTriggerStrategy();
    strategy.setup(cb);
    const trigger: HotkeyTrigger = {
      type: 'hotkey',
      triggerVal: 'ctrl+shift+k',
      displayLabel: 'Ctrl + Shift + K',
      functionName: 'openMenu',
      fileId: 'file-a',
      urlPattern: 'https://nowhere.example/*',
    };
    strategy.update([trigger]);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true }));

    expect(cb).not.toHaveBeenCalled();
    strategy.destroy();
  });

  it('fires the expander callback with the full trigger object (including fileId)', () => {
    const execCommandSpy = vi.fn(() => true);
    (document as any).execCommand = execCommandSpy;
    const cb = vi.fn();
    const strategy = new ExpanderTriggerStrategy();
    strategy.setup(cb);
    const trigger: ExpanderTrigger = {
      type: 'expander',
      triggerVal: ';;tq',
      expansionText: 'thank you',
      functionName: 'autoGreet',
      fileId: 'file-b',
    };
    strategy.update([trigger]);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.value = 'hello ;;tq';
    input.setSelectionRange(input.value.length, input.value.length);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(execCommandSpy).toHaveBeenCalledWith('insertText', false, 'thank you');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(trigger);
    strategy.destroy();
    input.remove();
    delete (document as any).execCommand;
  });

  it('expands the text manually when execCommand is unavailable', () => {
    (document as any).execCommand = vi.fn(() => false);
    const cb = vi.fn();
    const strategy = new ExpanderTriggerStrategy();
    strategy.setup(cb);
    const trigger: ExpanderTrigger = {
      type: 'expander',
      triggerVal: ';;tq',
      expansionText: 'thank you',
      functionName: 'autoGreet',
      fileId: 'file-b',
    };
    strategy.update([trigger]);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.value = 'hello ;;tq';
    input.setSelectionRange(input.value.length, input.value.length);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(input.value).toBe('hello thank you');
    expect(cb).toHaveBeenCalledWith(trigger);
    strategy.destroy();
    input.remove();
    delete (document as any).execCommand;
  });

  it('fires the load callback with the full trigger object (including fileId)', () => {
    const cb = vi.fn();
    const strategy = new LoadTriggerStrategy();
    strategy.setup(cb);
    const trigger: LoadTrigger = {
      type: 'load',
      urlPattern: '*',
      functionName: 'onPageLoad',
      fileId: 'file-c',
    };
    strategy.update([trigger]);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(trigger);
    strategy.destroy();
  });

  it('forwards the full matched trigger through TriggerManager to the runtime callback', () => {
    const onTriggerFired = vi.fn();
    const manager = new TriggerManager(onTriggerFired);
    manager.setup();
    const triggers: ParsedTrigger[] = [
      {
        type: 'hotkey',
        triggerVal: 'ctrl+alt+f',
        displayLabel: 'Ctrl + Alt + F',
        functionName: 'fillForm',
        fileId: 'file-x',
      },
    ];
    manager.update(triggers);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, altKey: true }));

    expect(onTriggerFired).toHaveBeenCalledTimes(1);
    expect(onTriggerFired).toHaveBeenCalledWith(triggers[0]);
    manager.destroy();
  });
});
