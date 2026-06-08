import { create } from 'zustand';
import { MESSAGE_TYPES, parseTriggers, ParsedTrigger, validateTriggers } from '@flowscript/shared';
import { 
  getSavedScript, 
  saveScript, 
  saveTriggers, 
  FileNode, 
  getSavedFiles, 
  saveFiles, 
  getActiveFileId, 
  saveActiveFileId,
  getFileContent,
  saveFileContent,
  deleteFileContent,
  getRecordingStatus,
  saveRecordingStatus
} from '@/utils/storage';
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

const saveFileContentTimeouts = new Map<string, any>();

const debouncedSaveFileContent = (id: string, content: string) => {
  const existingTimeout = saveFileContentTimeouts.get(id);
  if (existingTimeout) clearTimeout(existingTimeout);
  
  const timeout = setTimeout(() => {
    saveFileContentTimeouts.delete(id);
    saveFileContent(id, content).catch((err) => {
      console.error('Failed to save file content to storage:', err);
    });
  }, 250);
  
  saveFileContentTimeouts.set(id, timeout);
};

const getDescendantIds = (nodes: FileNode[], parentId: string): string[] => {
  const ids: string[] = [];
  const children = nodes.filter((n) => n.parentId === parentId);
  for (const child of children) {
    ids.push(child.id);
    if (child.type === 'folder') {
      ids.push(...getDescendantIds(nodes, child.id));
    }
  }
  return ids;
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
  isRecording: boolean;
  
  // Virtual File Tree State
  files: FileNode[];
  activeFileId: string | null;
  fileExplorerOpen: boolean;

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
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  recordAction: (action: { type: 'click' | 'type'; selector: string; value?: string }) => void;

  // Virtual File Tree Actions
  createFile: (name: string, parentId: string | null) => string;
  createFolder: (name: string, parentId: string | null) => string;
  renameNode: (id: string, newName: string) => void;
  deleteNode: (id: string) => void;
  setActiveFileId: (id: string) => void | Promise<void>;
  setFileExplorerOpen: (open: boolean) => void;
}

let lastRequestedFileId: string | null = null;

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
  isRecording: false,
  
  // Virtual File Tree Defaults
  files: [],
  activeFileId: null,
  fileExplorerOpen: true,

  initStore: async () => {
    try {
      const isRecording = await getRecordingStatus();
      const savedFiles = await getSavedFiles();
      const savedActiveId = await getActiveFileId();

      if (savedFiles && savedFiles.length > 0) {
        let activeId = savedActiveId;
        let activeFile = savedFiles.find(f => f.id === activeId && f.type === 'file');
        
        if (!activeFile) {
          const filesOnly = savedFiles.filter(f => f.type === 'file');
          if (filesOnly.length > 0) {
            activeFile = filesOnly[0];
            activeId = activeFile.id;
          }
        }

        if (activeId) {
          const activeContent = await getFileContent(activeId);
          const parsed = parseTriggers(activeContent);
          const valError = validateTriggers(parsed);
          set({
            files: savedFiles,
            activeFileId: activeId,
            code: activeContent,
            triggers: parsed,
            validationError: valError,
            isRecording,
            isInitialized: true
          });
          saveActiveFileId(activeId).catch(console.error);
          saveTriggers(valError ? [] : parsed).catch((err) => {
            console.error('Failed to initialize triggers in storage:', err);
          });
        } else {
          set({ files: savedFiles, isRecording, isInitialized: true });
        }
      } else {
        // Migration: read from legacy scriptStorage
        const savedLegacyScript = await getSavedScript();
        const defaultId = 'default-main';
        const defaultCode = savedLegacyScript || 
          `// FlowScript Automation Script\n` +
          `// Write click() or type() to automate tasks\n\n` +
          `// 1. Click a search box or input\n` +
          `click('input[type="search"]');\n\n` +
          `// 2. Wait 1 second\n` +
          `sleep(1000);\n\n` +
          `// 3. Type into it\n` +
          `type('input[type="search"]', 'FlowScript Automation');\n`;

        const defaultFile: FileNode = {
          id: defaultId,
          name: 'main.ts',
          type: 'file',
          parentId: null
        };

        const initialFiles = [defaultFile];
        const parsed = parseTriggers(defaultCode);
        const valError = validateTriggers(parsed);

        set({
          files: initialFiles,
          activeFileId: defaultId,
          code: defaultCode,
          triggers: parsed,
          validationError: valError,
          isRecording,
          isInitialized: true
        });

        saveFiles(initialFiles).catch(console.error);
        saveFileContent(defaultId, defaultCode).catch(console.error);
        saveActiveFileId(defaultId).catch(console.error);
        saveTriggers(valError ? [] : parsed).catch((err) => {
          console.error('Failed to initialize triggers in storage:', err);
        });
      }
    } catch (error) {
      console.error('Error during initStore:', error);
      set({ isInitialized: true });
    }
  },

  setCode: (code: string) => {
    const activeId = get().activeFileId;
    if (!activeId) return;

    const parsed = parseTriggers(code);
    const valError = validateTriggers(parsed);
    
    set({ 
      code, 
      triggers: parsed,
      validationError: valError
    });

    debouncedSaveFileContent(activeId, code);
    saveScript(code).catch(err => console.error('Failed to save legacy script:', err));
    
    if (!valError) {
      debouncedSaveTriggers(parsed);
    } else {
      debouncedSaveTriggers([]);
    }
  },

  createFile: (name: string, parentId: string | null) => {
    const id = Math.random().toString(36).substring(2, 11);
    const fileName = name.trim();
    const finalName = fileName.endsWith('.ts') || fileName.endsWith('.js') ? fileName : `${fileName}.ts`;
    
    const newFile: FileNode = {
      id,
      name: finalName,
      type: 'file',
      parentId
    };

    const defaultContent = '// New FlowScript File\n';
    const updatedFiles = [...get().files, newFile];
    
    set({ files: updatedFiles, activeFileId: id, code: defaultContent });
    saveFiles(updatedFiles).catch(console.error);
    saveFileContent(id, defaultContent).catch(console.error);
    saveActiveFileId(id).catch(console.error);

    const parsed = parseTriggers(defaultContent);
    const valError = validateTriggers(parsed);
    set({ triggers: parsed, validationError: valError });
    debouncedSaveTriggers(parsed);

    return id;
  },

  createFolder: (name: string, parentId: string | null) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newFolder: FileNode = {
      id,
      name: name.trim(),
      type: 'folder',
      parentId
    };

    const updatedFiles = [...get().files, newFolder];
    set({ files: updatedFiles });
    saveFiles(updatedFiles).catch(console.error);

    return id;
  },

  renameNode: (id: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const updatedFiles = get().files.map(node => {
      if (node.id === id) {
        let name = trimmedName;
        if (node.type === 'file' && !name.includes('.')) {
          const oldExt = node.name.split('.').pop();
          name = `${trimmedName}.${oldExt || 'ts'}`;
        }
        return { ...node, name };
      }
      return node;
    });

    set({ files: updatedFiles });
    saveFiles(updatedFiles).catch(console.error);
  },

  deleteNode: (id: string) => {
    const currentFiles = get().files;
    const targetNode = currentFiles.find(n => n.id === id);
    if (!targetNode) return;

    const idsToDelete = [id];
    if (targetNode.type === 'folder') {
      idsToDelete.push(...getDescendantIds(currentFiles, id));
    }

    const updatedFiles = currentFiles.filter(n => !idsToDelete.includes(n.id));
    set({ files: updatedFiles });
    saveFiles(updatedFiles).catch(console.error);

    idsToDelete.forEach(deletedId => {
      const timeout = saveFileContentTimeouts.get(deletedId);
      if (timeout) {
        clearTimeout(timeout);
        saveFileContentTimeouts.delete(deletedId);
      }

      const deletedNode = currentFiles.find(n => n.id === deletedId);
      if (deletedNode && deletedNode.type === 'file') {
        deleteFileContent(deletedId).catch(console.error);
      }
    });

    if (idsToDelete.includes(get().activeFileId || '')) {
      const remainingFiles = updatedFiles.filter(n => n.type === 'file');
      if (remainingFiles.length > 0) {
        const nextActiveId = remainingFiles[0].id;
        get().setActiveFileId(nextActiveId);
      } else {
        const defaultId = 'default-main';
        const defaultCode = '// FlowScript Automation Script\n';
        const defaultFile: FileNode = {
          id: defaultId,
          name: 'main.ts',
          type: 'file',
          parentId: null
        };
        const finalFiles = [...updatedFiles, defaultFile];
        set({
          files: finalFiles,
          activeFileId: defaultId,
          code: defaultCode,
          triggers: [],
          validationError: null
        });
        saveFiles(finalFiles).catch(console.error);
        saveFileContent(defaultId, defaultCode).catch(console.error);
        saveActiveFileId(defaultId).catch(console.error);
        debouncedSaveTriggers([]);
      }
    }
  },

  setActiveFileId: async (id: string) => {
    const activeId = get().activeFileId;
    if (activeId) {
      const timeout = saveFileContentTimeouts.get(activeId);
      if (timeout) {
        clearTimeout(timeout);
        saveFileContentTimeouts.delete(activeId);
        await saveFileContent(activeId, get().code).catch(console.error);
      }
    }

    const targetFile = get().files.find(n => n.id === id && n.type === 'file');
    if (!targetFile) return;

    lastRequestedFileId = id;

    try {
      const content = await getFileContent(id);
      if (lastRequestedFileId !== id) return;

      set({ activeFileId: id, code: content });
      saveActiveFileId(id).catch(console.error);

      const parsed = parseTriggers(content);
      const valError = validateTriggers(parsed);
      set({ triggers: parsed, validationError: valError });

      if (!valError) {
        debouncedSaveTriggers(parsed);
      } else {
        debouncedSaveTriggers([]);
      }
    } catch (err) {
      console.error('Failed to load file content on activation:', err);
    }
  },

  setFileExplorerOpen: (fileExplorerOpen: boolean) => {
    set({ fileExplorerOpen });
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
        await browser.tabs.sendMessage(tab.id, {
          source: 'dashboard',
          type: MESSAGE_TYPES.START_DOM_SELECT
        });
        set({ isSelectingElement: true, selectedSelector: null });
      }
    } catch (error: any) {
      set({ isSelectingElement: false, selectedSelector: null });
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
  },

  startRecording: async () => {
    if (get().isRunning || get().isSelectingElement) return;
    try {
      await saveRecordingStatus(true);
      set({ isRecording: true });
    } catch (error: any) {
      get().addLog({
        type: 'error',
        message: `Failed to start recording: ${error?.message || String(error)}`,
        timestamp: Date.now()
      });
    }
  },

  stopRecording: async () => {
    try {
      await saveRecordingStatus(false);
      set({ isRecording: false });
    } catch (error: any) {
      get().addLog({
        type: 'error',
        message: `Failed to stop recording: ${error?.message || String(error)}`,
        timestamp: Date.now()
      });
    }
  },

  recordAction: (action) => {
    if (!get().isRecording) return;
    const activeId = get().activeFileId;
    if (!activeId) return;

    let statement = '';
    if (action.type === 'click') {
      statement = `click('${action.selector}');`;
    } else if (action.type === 'type') {
      const escapedValue = (action.value || '').replace(/'/g, "\\'");
      statement = `type('${action.selector}', '${escapedValue}');`;
    }

    if (!statement) return;

    const currentCode = get().code;
    const separator = currentCode && !currentCode.endsWith('\n') ? '\n' : '';
    get().setCode(currentCode + separator + statement + '\n');
  }
}));
