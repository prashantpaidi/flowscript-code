import { MESSAGE_TYPES, sleep } from '@flowscript/shared';

const pendingActions = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
let actionIdCounter = 0;

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
export {};
