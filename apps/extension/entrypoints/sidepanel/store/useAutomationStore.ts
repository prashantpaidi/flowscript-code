import { create } from 'zustand';
import { MESSAGE_TYPES } from '@flowscript/shared';
import { getSavedScript, saveScript } from '@/utils/storage';
import { executeActionOnTab } from '@/utils/automation-service';

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
  
  // Actions
  initStore: () => Promise<void>;
  setCode: (code: string) => void;
  setActiveTab: (tab: string) => void;
  clearConsole: () => void;
  addLog: (log: ConsoleLog) => void;
  setExecutionComplete: (payload: { success: boolean; error?: string }) => void;
  runScript: (iframeEl: HTMLIFrameElement | null) => void;
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

  initStore: async () => {
    const saved = await getSavedScript();
    if (saved) {
      set({ code: saved });
    }
  },

  setCode: (code: string) => {
    set({ code });
    saveScript(code);
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
    set({
      isRunning: false,
      status: success ? 'success' : 'error',
      errorMessage: error || ''
    });
  },

  runScript: (iframeEl) => {
    if (get().isRunning) return;

    set({
      logs: [],
      errorMessage: '',
      isRunning: true,
      status: 'running',
      activeTab: 'console'
    });

    iframeEl?.contentWindow?.postMessage({
      type: MESSAGE_TYPES.RUN_CODE,
      payload: { code: get().code }
    }, '*');
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
      logs: [...state.logs, {
        type: 'error',
        message: 'Execution stopped by user.',
        timestamp: Date.now()
      }]
    }));
  },

  handleActionRequest: async ({ id, action }, iframeEl) => {
    try {
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || 'hsl(0 0% 98%)';
      const response = await executeActionOnTab(id, action, primaryColor);

      // Send action response back to sandbox
      iframeEl?.contentWindow?.postMessage({
        type: MESSAGE_TYPES.ACTION_RESPONSE,
        payload: response
      }, '*');
    } catch (error: any) {
      // Return failure to sandbox so the promise rejects
      iframeEl?.contentWindow?.postMessage({
        type: MESSAGE_TYPES.ACTION_RESPONSE,
        payload: { id, success: false, error: error?.message || 'Failed to communicate with webpage.' }
      }, '*');
    }
  }
}));
