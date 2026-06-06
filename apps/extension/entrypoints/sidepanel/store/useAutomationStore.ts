import { create } from 'zustand';
import { MESSAGE_TYPES } from '@flowscript/shared';
import { getSavedScript, saveScript } from '@/utils/storage';
import { executeActionOnTab, queryActiveTab } from '@/utils/automation-service';

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
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  code: '',
  isRunning: false,
  logs: [],
  status: 'idle',
  errorMessage: '',
  activeTab: 'editor',
  targetTabId: undefined,

  initStore: async () => {
    const saved = await getSavedScript();
    if (saved) {
      set({ code: saved });
    }
  },

  setCode: (code: string) => {
    set({ code });
    saveScript(code).catch((err) => {
      console.error('Failed to save script to storage:', err);
      get().addLog({
        type: 'error',
        message: `Storage error: Failed to save script changes: ${err?.message || String(err)}`,
        timestamp: Date.now()
      });
    });
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
      const tab = await queryActiveTab();
      set({
        logs: [],
        errorMessage: '',
        isRunning: true,
        status: 'running',
        activeTab: 'console',
        targetTabId: tab.id
      });

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
  }
}));
