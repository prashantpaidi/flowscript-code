import { MESSAGE_TYPES, sleep, cleanScriptCode, parseTriggers } from '@flowscript/shared';

const pendingActions = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
let actionIdCounter = 0;

// Persistent compilation cache for trigger state
let lastCompiledCode: string | null = null;
let compiledFunctions: Record<string, Function> = {};

// Dynamic Action Registry defining scalable commands
interface ActionRegistryItem {
  name: string;
  createPayload: (...args: any[]) => any;
  formatLog: (payload: any) => string;
}

const ACTION_REGISTRY: ActionRegistryItem[] = [
  {
    name: 'click',
    createPayload: (selector: string) => ({ type: 'click', selector }),
    formatLog: (act) => `CLICK: ${act.selector}`
  },
  {
    name: 'type',
    createPayload: (selector: string, value: string) => ({ type: 'type', selector, value }),
    formatLog: (act) => `TYPE: "${act.value}" into ${act.selector}`
  },
  {
    name: 'scroll',
    createPayload: (selector: string) => ({ type: 'scroll', selector }),
    formatLog: (act) => `SCROLL TO: ${act.selector}`
  },
  {
    name: 'hover',
    createPayload: (selector: string) => ({ type: 'hover', selector }),
    formatLog: (act) => `HOVER OVER: ${act.selector}`
  },
  {
    name: 'nativeClick',
    createPayload: (selector: string) => ({ type: 'nativeClick', selector }),
    formatLog: (act) => `NATIVE CLICK: ${act.selector}`
  },
  {
    name: 'nativeType',
    createPayload: (selector: string, value: string) => ({ type: 'nativeType', selector, value }),
    formatLog: (act) => `NATIVE TYPE: "${act.value}" into ${act.selector}`
  },
  {
    name: 'readDom',
    createPayload: (selector: string, property: string = 'textContent') => ({ type: 'readDom', selector, property }),
    formatLog: (act) => `READ DOM: property "${act.property}" from ${act.selector}`
  },
  {
    name: 'updateDom',
    createPayload: (selector: string, property: string, value: any) => ({ type: 'updateDom', selector, property, value }),
    formatLog: (act) => `UPDATE DOM: set "${act.property}" to "${typeof act.value === 'object' ? JSON.stringify(act.value) : act.value}" on ${act.selector}`
  }
];

// Initialize and bind registry actions to globalThis dynamically
ACTION_REGISTRY.forEach(({ name, createPayload }) => {
  (globalThis as any)[name] = (...args: any[]) => {
    const payload = createPayload(...args);
    return sendAction(payload);
  };
});

// Bind utility sleep helper
(globalThis as any).sleep = sleep;

// Redirect logs to parent sidepanel console
const logToParent = (type: 'log' | 'error' | 'step', message: string) => {
  window.parent.postMessage({
    source: 'sandbox',
    type: MESSAGE_TYPES.CONSOLE_LOG,
    payload: { type, message, timestamp: Date.now() }
  }, '*');
};

const originalLog = console.log;
const originalError = console.error;

console.log = (...args: any[]) => {
  originalLog(...args);
  const formatted = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  logToParent('log', formatted);
};

console.error = (...args: any[]) => {
  originalError(...args);
  const formatted = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  logToParent('error', formatted);
};

function formatActionLog(action: any): string {
  const registryItem = ACTION_REGISTRY.find(item => item.name === action.type);
  if (registryItem) {
    return registryItem.formatLog(action);
  }
  return `${action.type.toUpperCase()}: ${action.selector}${action.value ? ` (${action.value})` : ''}`;
}

function sendAction(action: any): Promise<any> {
  const id = ++actionIdCounter;
  return new Promise((resolve, reject) => {
    pendingActions.set(id, { resolve, reject });
    
    // Log the step initiation using the formatter registry
    const logMsg = formatActionLog(action);
    logToParent('step', logMsg);

    window.parent.postMessage({
      source: 'sandbox',
      type: MESSAGE_TYPES.EXECUTE_ACTION,
      payload: { id, action }
    }, '*');
  });
}

// Listen for messages from Side Panel
window.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === MESSAGE_TYPES.RUN_CODE) {
    const { code } = data.payload;
    try {
      logToParent('log', 'Starting execution...');
      
      // Clear compile cache on script manual start
      lastCompiledCode = null;
      compiledFunctions = {};
      
      // Wrap code in async function so await is allowed
      const executionFunction = new Function(`
        return (async () => {
          ${code}
        })();
      `);
      
      await executionFunction();
      
      logToParent('log', 'Execution completed successfully.');
      window.parent.postMessage({
        source: 'sandbox',
        type: MESSAGE_TYPES.EXECUTION_COMPLETE,
        payload: { success: true }
      }, '*');
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      logToParent('error', `Execution failed: ${errMsg}`);
      window.parent.postMessage({
        source: 'sandbox',
        type: MESSAGE_TYPES.EXECUTION_COMPLETE,
        payload: { success: false, error: errMsg }
      }, '*');
    }
  } else if (data.type === 'RUN_TRIGGER') {
    const { code, functionName } = data.payload;
    try {
      logToParent('log', `Executing trigger function: ${functionName}...`);
      
      if (code !== lastCompiledCode) {
        logToParent('log', 'Compiling script and caching trigger functions...');
        const cleanCode = cleanScriptCode(code);
        const triggers = parseTriggers(code);
        const uniqueFuncNames = Array.from(new Set(triggers.map(t => t.functionName)));
        
        const returnStatement = `return {
          ${uniqueFuncNames.map(name => `${name}: typeof ${name} !== 'undefined' ? ${name} : undefined`).join(',\n')}
        };`;

        const actionNames = [...ACTION_REGISTRY.map(act => act.name), 'sleep'];
        const origActions: Record<string, any> = {};
        
        // Neutralise top-level actions dynamically during compilation
        for (const name of actionNames) {
          origActions[name] = (globalThis as any)[name];
          (globalThis as any)[name] = async () => {};
        }

        try {
          const executionFunction = new Function(`
            return (async () => {
              ${cleanCode}
              ${returnStatement}
            })();
          `);
          
          compiledFunctions = await executionFunction();
        } finally {
          // Restore action implementations immediately after compilation
          for (const name of actionNames) {
            (globalThis as any)[name] = origActions[name];
          }
        }
        lastCompiledCode = code;
      }

      const targetFn = compiledFunctions[functionName];
      if (typeof targetFn === 'function') {
        await targetFn();
      } else {
        throw new Error(`Function '${functionName}' is not defined or registered as a trigger in the script.`);
      }
      
      logToParent('log', `Trigger function '${functionName}' completed.`);
      window.parent.postMessage({
        source: 'sandbox',
        type: MESSAGE_TYPES.EXECUTION_COMPLETE,
        payload: { success: true }
      }, '*');
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      logToParent('error', `Trigger function '${functionName}' failed: ${errMsg}`);
      window.parent.postMessage({
        source: 'sandbox',
        type: MESSAGE_TYPES.EXECUTION_COMPLETE,
        payload: { success: false, error: errMsg }
      }, '*');
    }
  } else if (data.type === MESSAGE_TYPES.ACTION_RESPONSE) {
    const { id, success, error, value } = data.payload;
    const pending = pendingActions.get(id);
    if (pending) {
      pendingActions.delete(id);
      if (success) {
        pending.resolve(value);
      } else {
        pending.reject(new Error(error || 'Action failed'));
      }
    }
  }
});

class ElementHandle {
  private selectorPath: string[];

  constructor(selectorPath: string[]) {
    this.selectorPath = selectorPath;
  }

  query(subSelector: string): ElementHandle {
    return new ElementHandle([...this.selectorPath, subSelector]);
  }

  private get fullSelector(): string {
    return this.selectorPath.join(' ');
  }

  async click(): Promise<any> {
    return (globalThis as any).click(this.fullSelector);
  }

  async type(value: string): Promise<any> {
    return (globalThis as any).type(this.fullSelector, value);
  }

  async scroll(): Promise<any> {
    return (globalThis as any).scroll(this.fullSelector);
  }

  async hover(): Promise<any> {
    return (globalThis as any).hover(this.fullSelector);
  }

  async getText(): Promise<string> {
    return (globalThis as any).readDom(this.fullSelector, 'textContent');
  }

  async getValue(): Promise<string> {
    return (globalThis as any).readDom(this.fullSelector, 'value');
  }

  async getAttribute(attributeName: string): Promise<string> {
    return (globalThis as any).readDom(this.fullSelector, `attr:${attributeName}`);
  }

  async isDisabled(): Promise<boolean> {
    const res = await (globalThis as any).readDom(this.fullSelector, 'disabled');
    return !!res;
  }

  async isVisible(): Promise<boolean> {
    const res = await (globalThis as any).readDom(this.fullSelector, '__isVisible');
    return !!res;
  }

  async exists(): Promise<boolean> {
    const res = await (globalThis as any).readDom(this.fullSelector, '__exists');
    return !!res;
  }
}

(globalThis as any).ElementHandle = ElementHandle;
(globalThis as any).query = (selector: string) => {
  return new ElementHandle([selector]);
};

export {};
