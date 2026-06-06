import { storage } from 'wxt/utils/storage';

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

/**
 * Updates user preferences in browser storage.
 */
export async function updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = await getPreferences();
  const updated = { ...current, ...updates };
  await preferenceStorage.setValue(updated);
  return updated;
}

const scriptStorage = storage.defineItem<string>('local:automation_script', {
  defaultValue: 
    `// FlowScript Automation Script\n` +
    `// Write await click() or type() to automate tasks\n\n` +
    `// 1. Click a search box or input\n` +
    `await click('input[type="search"]');\n\n` +
    `// 2. Wait 1 second\n` +
    `await sleep(1000);\n\n` +
    `// 3. Type into it\n` +
    `await type('input[type="search"]', 'FlowScript Automation');\n`
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

