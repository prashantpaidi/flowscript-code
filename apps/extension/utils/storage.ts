import { storage } from 'wxt/utils/storage';
import { ParsedTrigger } from '@flowscript/shared';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  content?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
}

const preferenceStorage = storage.defineItem<UserPreferences>('local:preferences', {
  defaultValue: {
    theme: 'light',
    notificationsEnabled: true,
  },
});

/**
 * Gets user preferences from browser storage.
 */
export async function getPreferences(): Promise<UserPreferences> {
  const value = await preferenceStorage.getValue();
  return value!;
}

let updateQueue: Promise<any> = Promise.resolve();

/**
 * Updates user preferences in browser storage.
 */
export async function updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
  return new Promise((resolve, reject) => {
    updateQueue = updateQueue.then(async () => {
      try {
        const current = await getPreferences();
        const updated = { ...current, ...updates };
        await preferenceStorage.setValue(updated);
        resolve(updated);
      } catch (error) {
        reject(error);
      }
    });
  });
}

const scriptStorage = storage.defineItem<string>('local:automation_script', {
  defaultValue: 
    `// FlowScript Automation Script\n` +
    `// Write click() or type() to automate tasks\n\n` +
    `// 1. Click a search box or input\n` +
    `click('input[type="search"]');\n\n` +
    `// 2. Wait 1 second\n` +
    `sleep(1000);\n\n` +
    `// 3. Type into it\n` +
    `type('input[type="search"]', 'FlowScript Automation');\n`
});

/**
 * Gets the saved automation script from browser storage.
 */
export async function getSavedScript(): Promise<string> {
  const value = await scriptStorage.getValue();
  return value!;
}

/**
 * Saves the automation script to browser storage.
 */
export async function saveScript(code: string): Promise<void> {
  await scriptStorage.setValue(code);
}

/**
 * Watch for changes to the saved script.
 */
export function watchScript(callback: (code: string | null) => void): () => void {
  return scriptStorage.watch(callback);
}

const triggersStorage = storage.defineItem<ParsedTrigger[]>('local:automation_triggers', {
  defaultValue: [],
});

/**
 * Gets the saved parsed triggers from browser storage.
 */
export async function getSavedTriggers(): Promise<ParsedTrigger[]> {
  const value = await triggersStorage.getValue();
  return value!;
}

/**
 * Saves the parsed triggers to browser storage.
 */
export async function saveTriggers(triggers: ParsedTrigger[]): Promise<void> {
  await triggersStorage.setValue(triggers);
}

/**
 * Watch for changes to the saved triggers.
 */
export function watchTriggers(callback: (triggers: ParsedTrigger[] | null) => void): () => void {
  return triggersStorage.watch(callback);
}

export interface PendingTrigger {
  functionName: string;
  tabId: number;
}

const pendingTriggerStorage = storage.defineItem<PendingTrigger | null>('session:pending_trigger', {
  defaultValue: null,
});

/**
 * Gets the saved pending trigger from browser storage.
 */
export async function getPendingTrigger(): Promise<PendingTrigger | null> {
  const value = await pendingTriggerStorage.getValue();
  return value;
}

/**
 * Saves the pending trigger to browser storage.
 */
export async function savePendingTrigger(pending: PendingTrigger | null): Promise<void> {
  await pendingTriggerStorage.setValue(pending);
}

const filesStorage = storage.defineItem<FileNode[]>('local:automation_files', {
  defaultValue: [],
});

const activeFileIdStorage = storage.defineItem<string | null>('local:active_file_id', {
  defaultValue: null,
});

/**
 * Gets the list of files from storage.
 */
export async function getSavedFiles(): Promise<FileNode[]> {
  const value = await filesStorage.getValue();
  return value!;
}

/**
 * Saves the list of files to storage.
 */
export async function saveFiles(files: FileNode[]): Promise<void> {
  await filesStorage.setValue(files);
}

/**
 * Gets the active file ID from storage.
 */
export async function getActiveFileId(): Promise<string | null> {
  const value = await activeFileIdStorage.getValue();
  return value;
}

/**
 * Saves the active file ID to storage.
 */
export async function saveActiveFileId(id: string | null): Promise<void> {
  await activeFileIdStorage.setValue(id);
}

/**
 * Gets the contents of a specific file by ID.
 */
export async function getFileContent(id: string): Promise<string> {
  const contentStorage = storage.defineItem<string>(`local:file_content_${id}`, {
    defaultValue: '',
  });
  const value = await contentStorage.getValue();
  return value!;
}

/**
 * Saves the contents of a specific file by ID.
 */
export async function saveFileContent(id: string, content: string): Promise<void> {
  const contentStorage = storage.defineItem<string>(`local:file_content_${id}`, {
    defaultValue: '',
  });
  await contentStorage.setValue(content);
}

/**
 * Deletes the contents of a specific file by ID.
 */
export async function deleteFileContent(id: string): Promise<void> {
  const contentStorage = storage.defineItem<string>(`local:file_content_${id}`);
  await contentStorage.setValue(null as any);
}

