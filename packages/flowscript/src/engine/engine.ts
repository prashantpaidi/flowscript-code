import { FlowScriptDriver } from '../drivers/driver.js';
import { ElementHandle } from './element.js';
import { compileScript } from './compiler.js';
import { EngineLogEntry, EngineRunResult, RunOptions } from '../types.js';

export interface EngineConfig {
  driver: FlowScriptDriver;
  defaultTimeoutMs?: number;
  onLog?: (entry: EngineLogEntry) => void;
}

export class FlowScriptEngine {
  private driver: FlowScriptDriver;
  private defaultTimeoutMs: number;
  private globalOnLog?: (entry: EngineLogEntry) => void;

  // Cached trigger compilation
  private lastCompiledTriggerCode: string | null = null;
  private compiledTriggerFunctions: Record<string, Function> = {};

  constructor(config: EngineConfig) {
    this.driver = config.driver;
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 30000;
    this.globalOnLog = config.onLog;
  }

  getDriver(): FlowScriptDriver {
    return this.driver;
  }

  setDriver(driver: FlowScriptDriver): void {
    this.driver = driver;
  }

  private createEnvironment(logs: EngineLogEntry[], onLog?: (entry: EngineLogEntry) => void) {
    const emitLog = (type: EngineLogEntry['type'], message: string) => {
      const entry: EngineLogEntry = {
        type,
        message,
        timestamp: Date.now()
      };
      logs.push(entry);
      if (onLog) onLog(entry);
      if (this.globalOnLog) this.globalOnLog(entry);
    };

    const env: Record<string, any> = {
      goto: (url: string) => {
        emitLog('step', `GOTO: ${url}`);
        if (this.driver.goto) {
          return this.driver.goto(url);
        } else if (this.driver.navigate) {
          return this.driver.navigate(url);
        }
        return Promise.resolve();
      },
      navigate: (url: string) => {
        emitLog('step', `NAVIGATE: ${url}`);
        if (this.driver.navigate) {
          return this.driver.navigate(url);
        } else if (this.driver.goto) {
          return this.driver.goto(url);
        }
        return Promise.resolve();
      },
      click: (selector: string) => {
        emitLog('step', `CLICK: ${selector}`);
        return this.driver.click(selector);
      },
      type: (selector: string, value: string) => {
        emitLog('step', `TYPE: "${value}" into ${selector}`);
        return this.driver.type(selector, value);
      },
      scroll: (selector: string) => {
        emitLog('step', `SCROLL: ${selector}`);
        return this.driver.scroll(selector);
      },
      hover: (selector: string) => {
        emitLog('step', `HOVER: ${selector}`);
        return this.driver.hover(selector);
      },
      readDom: (selector: string, property: string = 'textContent') => {
        emitLog('step', `READ DOM: "${property}" from ${selector}`);
        return this.driver.readDom(selector, property);
      },
      updateDom: (selector: string, property: string, value: any) => {
        emitLog('step', `UPDATE DOM: set "${property}" to "${value}" on ${selector}`);
        return this.driver.updateDom(selector, property, value);
      },
      nativeClick: (selector: string) => {
        emitLog('step', `NATIVE CLICK: ${selector}`);
        if (this.driver.nativeClick) {
          return this.driver.nativeClick(selector);
        }
        return this.driver.click(selector);
      },
      nativeType: (selector: string, value: string) => {
        emitLog('step', `NATIVE TYPE: "${value}" into ${selector}`);
        if (this.driver.nativeType) {
          return this.driver.nativeType(selector, value);
        }
        return this.driver.type(selector, value);
      },
      press: (key: string) => {
        emitLog('step', `PRESS: "${key}"`);
        if (this.driver.press) {
          return this.driver.press(key);
        }
        return Promise.resolve();
      },
      typeActive: (value: string) => {
        emitLog('step', `TYPE ACTIVE: "${value}"`);
        if (this.driver.typeActive) {
          return this.driver.typeActive(value);
        }
        return Promise.resolve();
      },
      sleep: (ms: number) => {
        emitLog('step', `SLEEP: ${ms}ms`);
        return this.driver.sleep(ms);
      },
      query: (selector: string) => {
        return new ElementHandle([selector], this.driver);
      },
      ElementHandle,
      console: {
        log: (...args: any[]) => {
          const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
          emitLog('log', msg);
        },
        error: (...args: any[]) => {
          const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
          emitLog('error', msg);
        },
        warn: (...args: any[]) => {
          const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
          emitLog('log', `[WARN] ${msg}`);
        },
        info: (...args: any[]) => {
          const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
          emitLog('log', msg);
        }
      }
    };

    return { env, emitLog };
  }

  async run<T = any>(code: string, options: RunOptions = {}): Promise<EngineRunResult<T>> {
    const startTime = Date.now();
    const logs: EngineLogEntry[] = [];
    const { env, emitLog } = this.createEnvironment(logs, options.onLog);

    emitLog('log', 'Starting execution...');
    const compiled = compileScript(code, { autoAwait: true, stripTriggers: true });

    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    let timeoutHandle: any;

    try {
      const scopeKeys = Object.keys(env);
      const scopeValues = Object.values(env);

      const runnerFunc = new Function(
        ...scopeKeys,
        `return (async () => {
          ${compiled.code}
        })();`
      );

      const executionPromise = runnerFunc(...scopeValues);

      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const value = await Promise.race([executionPromise, timeoutPromise]);
      clearTimeout(timeoutHandle);

      emitLog('log', 'Execution completed successfully.');
      return {
        success: true,
        value,
        logs,
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      const errorMsg = err?.message || String(err);
      emitLog('error', `Execution failed: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        logs,
        durationMs: Date.now() - startTime
      };
    }
  }

  async runTrigger<T = any>(
    code: string, 
    functionName: string, 
    options: RunOptions = {}
  ): Promise<EngineRunResult<T>> {
    const startTime = Date.now();
    const logs: EngineLogEntry[] = [];
    const { env, emitLog } = this.createEnvironment(logs, options.onLog);

    emitLog('log', `Executing trigger function: ${functionName}...`);

    try {
      if (this.lastCompiledTriggerCode !== code) {
        emitLog('log', 'Compiling script and caching trigger functions...');
        const compiled = compileScript(code, { autoAwait: true, stripTriggers: true });
        const triggers = compiled.triggers;
        const uniqueFuncNames = Array.from(new Set(triggers.map(t => t.functionName)));

        const returnStatement = `return {
          ${uniqueFuncNames.map(name => `${name}: typeof ${name} !== 'undefined' ? ${name} : undefined`).join(',\n')}
        };`;

        const scopeKeys = Object.keys(env);
        const scopeValues = Object.values(env);

        const compilerFunc = new Function(
          ...scopeKeys,
          `return (async () => {
            ${compiled.code}
            ${returnStatement}
          })();`
        );

        this.compiledTriggerFunctions = await compilerFunc(...scopeValues);
        this.lastCompiledTriggerCode = code;
      }

      const targetFn = this.compiledTriggerFunctions[functionName];
      if (typeof targetFn !== 'function') {
        throw new Error(`Trigger function '${functionName}' is not defined or registered in the script.`);
      }

      const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
      let timeoutHandle: any;

      const executionPromise = targetFn();
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Trigger execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const value = await Promise.race([executionPromise, timeoutPromise]);
      clearTimeout(timeoutHandle);

      emitLog('log', `Trigger function '${functionName}' completed.`);
      return {
        success: true,
        value,
        logs,
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      emitLog('error', `Trigger function '${functionName}' failed: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        logs,
        durationMs: Date.now() - startTime
      };
    }
  }
}
