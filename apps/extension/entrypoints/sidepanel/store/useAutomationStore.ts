import { create } from 'zustand';
import { MESSAGE_TYPES, parseTriggers, ParsedTrigger, validateTriggers } from '@flowscript/shared';
import { getSavedScript, saveScript, saveTriggers } from '@/utils/storage';
import { executeActionOnTab, queryActiveTab } from '@/utils/automation-service';
import { browser } from 'wxt/browser';

let saveTriggersTimeout: any = null;

const debouncedSaveTriggers = (triggers: ParsedTrigger[]) => {
  if (saveTriggersTimeout) clearTimeout(saveTriggersTimeout);
  saveTriggersTimeout = setTimeout(() => {
    saveTriggers(triggers).catch((err) => {
      console.error('Failed to save triggers to storage:', err);
    });
  }, 1000);
};

export interface ConsoleLog {
  type: 'log' | 'error' | 'step';
  message: string;
  timestamp: number;
}

export interface AutomationState {
  code: string;
  isRunning: boolean;
  logs: ConsoleLog[];
  status: 'idle' | 'running' | 'success' | 'error';
  errorMessage: string;
  activeTab: string;
  targetTabId?: number;
  triggers: ParsedTrigger[];
  validationError: string | null;
  isInitialized: boolean;
  isSelectingElement: boolean;
  selectedSelector: { primary: string; fallback: string } | null;
  
  // Actions
  initStore: () => Promise<void>;
  setCode: (code: string) => void;
  setActiveTab: (tab: string) => void;
  clearConsole: () => void;
  addLog: (log: ConsoleLog) => void;
  setExecutionComplete: (payload: { success: boolean; error?: string }) => void;
  runScript: (iframeEl: HTMLIFrameElement | null) => Promise<void>;
  stopScript: (iframeEl: HTMLIFrameElement | null) => void;
  handleActionRequest: (payload: { id: number; action: any }, iframeEl: HTMLIFrameElement | null) => Promise<void>;
  runTriggerFunction: (functionName: string, tabId: number | undefined, iframeEl: HTMLIFrameElement | null) => Promise<void>;
  startSelectingElement: () => Promise<void>;
  stopSelectingElement: () => Promise<void>;
  setSelectedSelector: (selector: { primary: string; fallback: string } | null) => void;
  setSelectingState: (isSelecting: boolean) => void;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  code: '',
  isRunning: false,
  logs: [],
  status: 'idle',
  errorMessage: '',
  activeTab: 'editor',
  targetTabId: undefined,
  triggers: [],
  validationError: null,
  isInitialized: false,
  isSelectingElement: false,
  selectedSelector: null,

  initStore: async () => {
    const saved = await getSavedScript();
    if (saved) {
      const parsed = parseTriggers(saved);
      const valError = validateTriggers(parsed);
      set({ 
        code: saved,
        triggers: parsed,
        validationError: valError,
        isInitialized: true
      });
      saveTriggers(valError ? [] : parsed).catch((err) => {
        console.error('Failed to initialize triggers in storage:', err);
      });
    } else {
      set({ isInitialized: true });
    }
  },

  setCode: (code: string) => {
    const parsed = parseTriggers(code);
    const valError = validateTriggers(parsed);
    set({ 
      code, 
      triggers: parsed,
      validationError: valError
    });
    saveScript(code).catch((err) => {
      console.error('Failed to save script to storage:', err);
      get().addLog({
        type: 'error',
        message: `Storage error: Failed to save script changes: ${err?.message || String(err)}`,
        timestamp: Date.now()
      });
    });
    
    if (!valError) {
      debouncedSaveTriggers(parsed);
    } else {
      debouncedSaveTriggers([]);
    }
  },

  setActiveTab: (activeTab: string) => {
    set({ activeTab });
  },

  clearConsole: () => {
    set({ logs: [], status: 'idle', errorMessage: '' });
  },

  addLog: (log: ConsoleLog) => {
    set((state) => {
      const MAX_LOGS = 1000;
      const nextLogs = [...state.logs, log];
      if (nextLogs.length > MAX_LOGS) {
        return { logs: nextLogs.slice(nextLogs.length - MAX_LOGS) };
      }
      return { logs: nextLogs };
    });
  },

  setExecutionComplete: ({ success, error }) => {
    if (!get().isRunning) return;
    set({
      isRunning: false,
      status: success ? 'success' : 'error',
      errorMessage: error || '',
      targetTabId: undefined
    });
  },

  runScript: async (iframeEl) => {
    if (get().isRunning) return;

    try {
      set({
        logs: [],
        errorMessage: '',
        isRunning: true,
        status: 'running',
        activeTab: 'console',
        targetTabId: undefined
      });

      const tab = await queryActiveTab();
      set({ targetTabId: tab.id });

      iframeEl?.contentWindow?.postMessage({
        type: MESSAGE_TYPES.RUN_CODE,
        payload: { code: get().code }
      }, '*');
    } catch (error: any) {
      set({
        isRunning: false,
        status: 'error',
        errorMessage: error?.message || 'No active tab found to automate.'
      });
      get().addLog({
        type: 'error',
        message: `Failed to start: ${error?.message || String(error)}`,
        timestamp: Date.now()
      });
    }
  },

  stopScript: (iframeEl) => {
    if (!get().isRunning) return;

    if (iframeEl) {
      const currentSrc = iframeEl.src;
      iframeEl.src = currentSrc;
    }

    set((state) => ({
      isRunning: false,
      status: 'idle',
      targetTabId: undefined,
      logs: [...state.logs, {
        type: 'error',
        message: 'Execution stopped by user.',
        timestamp: Date.now()
      }]
    }));
  },

  handleActionRequest: async ({ id, action }, iframeEl) => {
    if (!get().isRunning) return;
    try {
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || 'hsl(0 0% 98%)';
      const targetTabId = get().targetTabId;
      const response = await executeActionOnTab(id, action, primaryColor, targetTabId);

      if (get().isRunning) {
        // Send action response back to sandbox
        iframeEl?.contentWindow?.postMessage({
          type: MESSAGE_TYPES.ACTION_RESPONSE,
          payload: response
        }, '*');
      }
    } catch (error: any) {
      if (get().isRunning) {
        // Return failure to sandbox so the promise rejects
        iframeEl?.contentWindow?.postMessage({
          type: MESSAGE_TYPES.ACTION_RESPONSE,
          payload: { id, success: false, error: error?.message || 'Failed to communicate with webpage.' }
        }, '*');
      }
    }
  },

  runTriggerFunction: async (functionName, tabId, iframeEl) => {
    if (get().isRunning) return;

    try {
      set({
        logs: [],
        errorMessage: '',
        isRunning: true,
        status: 'running',
        activeTab: 'console',
        targetTabId: undefined
      });

      let finalTabId = tabId;
      if (!finalTabId) {
        const tab = await queryActiveTab();
        finalTabId = tab.id;
      }
      set({ targetTabId: finalTabId });

      iframeEl?.contentWindow?.postMessage({
        type: 'RUN_TRIGGER',
        payload: { code: get().code, functionName }
      }, '*');
    } catch (error: any) {
      set({
        isRunning: false,
        status: 'error',
        errorMessage: error?.message || 'Failed to start trigger execution.'
      });
      get().addLog({
        type: 'error',
        message: `Trigger execution failed: ${error?.message || String(error)}`,
        timestamp: Date.now()
      });
    }
  },

  startSelectingElement: async () => {
    if (get().isRunning) return;
    try {
      const tab = await queryActiveTab();
      if (tab && tab.id) {
        set({ isSelectingElement: true, selectedSelector: null });
        await browser.tabs.sendMessage(tab.id, {
          source: 'dashboard',
          type: MESSAGE_TYPES.START_DOM_SELECT
        });
      }
    } catch (error: any) {
      get().addLog({
        type: 'error',
        message: `Failed to start element selector: ${error?.message || String(error)}`,
        timestamp: Date.now()
      });
    }
  },

  stopSelectingElement: async () => {
    try {
      const tab = await queryActiveTab();
      if (tab && tab.id) {
        set({ isSelectingElement: false });
        await browser.tabs.sendMessage(tab.id, {
          source: 'dashboard',
          type: MESSAGE_TYPES.STOP_DOM_SELECT
        });
      }
    } catch (error) {
      set({ isSelectingElement: false });
    }
  },

  setSelectedSelector: (selector: { primary: string; fallback: string } | null) => {
    set({ selectedSelector: selector });
  },

  setSelectingState: (isSelecting: boolean) => {
    set({ isSelectingElement: isSelecting });
  }
}));
