import { describe, it, expect } from 'vitest';
import { isValidAction, parseTriggers, cleanScriptCode, validateTriggers } from './utils.js';

describe('isValidAction', () => {
  it('should return true for a valid click action', () => {
    const action = { type: 'click', selector: '#submit-btn' };
    expect(isValidAction(action)).toBe(true);
  });

  it('should return true for a valid type action with a value', () => {
    const action = { type: 'type', selector: '#username', value: 'john_doe' };
    expect(isValidAction(action)).toBe(true);
  });

  it('should return true for a valid nativeClick action', () => {
    const action = { type: 'nativeClick', selector: '.btn' };
    expect(isValidAction(action)).toBe(true);
  });

  it('should return true for a valid nativeType action with a value', () => {
    const action = { type: 'nativeType', selector: '#search', value: 'query' };
    expect(isValidAction(action)).toBe(true);
  });

  it('should return false for a type action without a value', () => {
    const action = { type: 'type', selector: '#username' };
    expect(isValidAction(action)).toBe(false);
  });

  it('should return false for a nativeType action without a value', () => {
    const action = { type: 'nativeType', selector: '#search' };
    expect(isValidAction(action)).toBe(false);
  });

  it('should return false for an invalid action type', () => {
    const action = { type: 'invalid_action', selector: '.menu' };
    expect(isValidAction(action)).toBe(false);
  });

  it('should return false for an empty selector', () => {
    const action = { type: 'click', selector: '   ' };
    expect(isValidAction(action)).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isValidAction(null)).toBe(false);
    expect(isValidAction(undefined)).toBe(false);
    expect(isValidAction('click')).toBe(false);
    expect(isValidAction(123)).toBe(false);
  });

  it('should return true for a valid readDom action', () => {
    const action = { type: 'readDom', selector: '.title', property: 'textContent' };
    expect(isValidAction(action)).toBe(true);
  });

  it('should return false for readDom action with missing or invalid property', () => {
    const action1 = { type: 'readDom', selector: '.title' };
    const action2 = { type: 'readDom', selector: '.title', property: '' };
    const action3 = { type: 'readDom', selector: '.title', property: 123 };
    expect(isValidAction(action1)).toBe(false);
    expect(isValidAction(action2)).toBe(false);
    expect(isValidAction(action3)).toBe(false);
  });

  it('should return true for a valid updateDom action', () => {
    const action = { type: 'updateDom', selector: '.title', property: 'style.color', value: 'red' };
    expect(isValidAction(action)).toBe(true);
  });

  it('should return false for updateDom action with missing/invalid property or value', () => {
    const action1 = { type: 'updateDom', selector: '.title', value: 'red' };
    const action2 = { type: 'updateDom', selector: '.title', property: '', value: 'red' };
    const action3 = { type: 'updateDom', selector: '.title', property: 'style.color' };
    expect(isValidAction(action1)).toBe(false);
    expect(isValidAction(action2)).toBe(false);
    expect(isValidAction(action3)).toBe(false);
  });
});

describe('parseTriggers', () => {
  it('should parse a hotkey trigger with 2 arguments', () => {
    const code = `
      // @trigger('hotkey', 'ctrl+shift+k')
      async function testHotkey() {
        console.log('hotkey');
      }
    `;
    const triggers = parseTriggers(code);
    expect(triggers).toEqual([
      {
        type: 'hotkey',
        triggerVal: 'ctrl+shift+k',
        displayLabel: 'Ctrl + Shift + K',
        functionName: 'testHotkey'
      }
    ]);
  });

  it('should parse an expander trigger with 3 arguments', () => {
    const code = `
      @trigger('expander', ';;tq', 'thank you very much')
      const handleExpander = () => {
        console.log('expander');
      }
    `;
    const triggers = parseTriggers(code);
    expect(triggers).toEqual([
      {
        type: 'expander',
        triggerVal: ';;tq',
        expansionText: 'thank you very much',
        functionName: 'handleExpander'
      }
    ]);
  });

  it('should handle multi-line comments in between', () => {
    const code = `
      // @trigger('hotkey', 'alt+s')
      // Some comment here
      /* another comment */
      function savePage() {
        console.log('save');
      }
    `;
    const triggers = parseTriggers(code);
    expect(triggers).toEqual([
      {
        type: 'hotkey',
        triggerVal: 'alt+s',
        displayLabel: 'Alt + S',
        functionName: 'savePage'
      }
    ]);
  });

  it('should skip trigger if not followed by a function', () => {
    const code = `
      @trigger('hotkey', 'alt+s')
      const someConstant = 'value';
      function test() {}
    `;
    const triggers = parseTriggers(code);
    expect(triggers).toEqual([]);
  });

  it('should parse exported functions and variables', () => {
    const code = `
      // @trigger('hotkey', 'ctrl+shift+k')
      export async function testExported() {}

      // @trigger('expander', ';;tq', 'thanks')
      export const handleExported = () => {}
    `;
    const triggers = parseTriggers(code);
    expect(triggers).toEqual([
      {
        type: 'hotkey',
        triggerVal: 'ctrl+shift+k',
        displayLabel: 'Ctrl + Shift + K',
        functionName: 'testExported'
      },
      {
        type: 'expander',
        triggerVal: ';;tq',
        expansionText: 'thanks',
        functionName: 'handleExported'
      }
    ]);
  });

  it('should parse stacked triggers on a single function', () => {
    const code = `
      // @trigger('hotkey', 'alt+a')
      // @trigger('expander', ';;a', 'apple')
      function dualTrigger() {}
    `;
    const triggers = parseTriggers(code);
    expect(triggers).toEqual([
      {
        type: 'hotkey',
        triggerVal: 'alt+a',
        displayLabel: 'Alt + A',
        functionName: 'dualTrigger'
      },
      {
        type: 'expander',
        triggerVal: ';;a',
        expansionText: 'apple',
        functionName: 'dualTrigger'
      }
    ]);
  });

  it('should handle block comments with text not starting with *', () => {
    const code = `
      // @trigger('hotkey', 'ctrl+shift+k')
      /* 
         This is a description that does not
         start with asterisks on each line.
      */
      async function testBlockComment() {}
    `;
    const triggers = parseTriggers(code);
    expect(triggers).toEqual([
      {
        type: 'hotkey',
        triggerVal: 'ctrl+shift+k',
        displayLabel: 'Ctrl + Shift + K',
        functionName: 'testBlockComment'
      }
    ]);
  });
});

describe('cleanScriptCode', () => {
  it('should strip annotations from code', () => {
    const code = `
      // @trigger('hotkey', 'ctrl+shift+k')
      async function test() {
        console.log('test');
      }
    `;
    const cleaned = cleanScriptCode(code);
    expect(cleaned).not.toContain('@trigger');
  });

  it('should not strip @trigger if it is inside string literals', () => {
    const code = `
      // @trigger('hotkey', 'ctrl+shift+k')
      async function test() {
        console.log("Avoid using @trigger('hotkey', 'alt+j') here");
      }
    `;
    const cleaned = cleanScriptCode(code);
    expect(cleaned).toContain("@trigger('hotkey', 'alt+j')");
    expect(cleaned).not.toContain("ctrl+shift+k");
  });
});

describe('validateTriggers', () => {
  it('should return null for valid triggers', () => {
    const triggers = [
      { type: 'hotkey' as const, triggerVal: 'ctrl+shift+k', displayLabel: 'Ctrl + Shift + K', functionName: 'test1' },
      { type: 'expander' as const, triggerVal: ';;tq', expansionText: 'thanks', functionName: 'test2' }
    ];
    expect(validateTriggers(triggers)).toBeNull();
  });

  it('should allow stacked triggers on the same function', () => {
    const triggers = [
      { type: 'hotkey' as const, triggerVal: 'ctrl+shift+k', displayLabel: 'Ctrl + Shift + K', functionName: 'test1' },
      { type: 'expander' as const, triggerVal: ';;tq', expansionText: 'thanks', functionName: 'test1' }
    ];
    expect(validateTriggers(triggers)).toBeNull();
  });

  it('should detect duplicate hotkeys', () => {
    const triggers = [
      { type: 'hotkey' as const, triggerVal: 'ctrl+shift+k', displayLabel: 'Ctrl + Shift + K', functionName: 'test1' },
      { type: 'hotkey' as const, triggerVal: 'ctrl+shift+k', displayLabel: 'Ctrl + Shift + K', functionName: 'test2' }
    ];
    expect(validateTriggers(triggers)).toContain("Hotkey collision");
  });

  it('should detect duplicate expander shortcuts', () => {
    const triggers = [
      { type: 'expander' as const, triggerVal: ';;tq', expansionText: 'thanks', functionName: 'test1' },
      { type: 'expander' as const, triggerVal: ';;tq', expansionText: 'thank you', functionName: 'test2' }
    ];
    expect(validateTriggers(triggers)).toContain("Text expander collision");
  });
});

