import { describe, it, expect, beforeEach } from 'vitest';
import { FlowScriptEngine, MockDriver, CallbackDriver } from '../index.js';

describe('FlowScript Core Engine & Drivers', () => {
  let driver: MockDriver;
  let engine: FlowScriptEngine;

  beforeEach(() => {
    driver = new MockDriver();
    engine = new FlowScriptEngine({ driver, defaultTimeoutMs: 2000 });
  });

  describe('MockDriver', () => {
    it('records actions correctly', async () => {
      await driver.click('#btn');
      await driver.type('#input', 'hello');
      
      expect(driver.actions).toHaveLength(2);
      expect(driver.actions[0].action).toBe('click');
      expect(driver.actions[0].args).toEqual(['#btn']);
      expect(driver.actions[1].action).toBe('type');
      expect(driver.actions[1].args).toEqual(['#input', 'hello']);
    });

    it('sets and reads mock DOM state', async () => {
      driver.setMockDom('.label', 'textContent', 'Hello World');
      const text = await driver.readDom('.label', 'textContent');
      expect(text).toBe('Hello World');
    });

    it('clears state on reset', async () => {
      await driver.click('.btn');
      driver.reset();
      expect(driver.actions).toHaveLength(0);
      expect(driver.domState.size).toBe(0);
    });
  });

  describe('CallbackDriver', () => {
    it('dispatches actions to callback handler', async () => {
      const calls: { action: string; args: any[] }[] = [];
      const cbDriver = new CallbackDriver(async (action, args) => {
        calls.push({ action, args });
        if (action === 'readDom') return 'custom text';
      });

      await cbDriver.click('.submit');
      const val = await cbDriver.readDom('.message', 'textContent');

      expect(calls).toEqual([
        { action: 'click', args: ['.submit'] },
        { action: 'readDom', args: ['.message', 'textContent'] }
      ]);
      expect(val).toBe('custom text');
    });
  });

  describe('FlowScriptEngine Execution', () => {
    it('executes user script with auto-awaiting actions', async () => {
      const script = `
        click('#login-button');
        type('#username', 'testuser');
      `;

      const result = await engine.run(script);

      expect(result.success).toBe(true);
      expect(driver.actions.map(a => a.action)).toEqual(['click', 'type']);
      expect(driver.actions[0].args).toEqual(['#login-button']);
      expect(driver.actions[1].args).toEqual(['#username', 'testuser']);
      expect(result.logs.some(l => l.message.includes('CLICK: #login-button'))).toBe(true);
    });

    it('supports ElementHandle queries and chained actions', async () => {
      driver.setMockDom('#welcome', 'textContent', 'Welcome back!');

      const script = `
        const btn = query('#welcome');
        const text = await btn.getText();
        await btn.click();
        return text;
      `;

      const result = await engine.run(script);

      expect(result.success).toBe(true);
      expect(result.value).toBe('Welcome back!');
      expect(driver.actions.some(a => a.action === 'readDom')).toBe(true);
      expect(driver.actions.some(a => a.action === 'click')).toBe(true);
    });

    it('handles runtime errors gracefully without throwing', async () => {
      const script = `
        throw new Error('Something went wrong in script');
      `;

      const result = await engine.run(script);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Something went wrong in script');
      expect(result.logs.some(l => l.type === 'error')).toBe(true);
    });

    it('enforces execution timeout', async () => {
      const sleepDriver = new MockDriver({ enableRealSleep: true });
      const fastEngine = new FlowScriptEngine({ driver: sleepDriver, defaultTimeoutMs: 50 });
      const script = `
        await sleep(200);
      `;

      const result = await fastEngine.run(script);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('executes trigger functions via runTrigger', async () => {
      const script = `
        // @trigger('hotkey', 'ctrl+shift+k')
        async function runAutoFill() {
          await click('.auto-fill-btn');
        }
      `;

      const result = await engine.runTrigger(script, 'runAutoFill');

      expect(result.success).toBe(true);
      expect(driver.actions).toHaveLength(1);
      expect(driver.actions[0].action).toBe('click');
      expect(driver.actions[0].args).toEqual(['.auto-fill-btn']);
    });
  });
});
