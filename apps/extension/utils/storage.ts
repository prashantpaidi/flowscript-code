import { storage } from 'wxt/utils/storage';
import { ParsedTrigger } from '@flowscript/shared';

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


