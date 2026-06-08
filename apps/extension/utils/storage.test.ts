import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { getPreferences, updatePreferences, getRecordingStatus, saveRecordingStatus } from './storage.js';

describe('WXT Storage Utility', () => {
  beforeEach(() => {
    // Reset fakeBrowser's in-memory storage before each test
    fakeBrowser.reset();
  });

  it('should return default preferences if none are saved', async () => {
    const prefs = await getPreferences();
    expect(prefs).toEqual({
      theme: 'light',
      notificationsEnabled: true,
    });
  });

  it('should update and save preferences', async () => {
    await updatePreferences({ theme: 'dark' });
    const prefs = await getPreferences();
    expect(prefs.theme).toBe('dark');
    expect(prefs.notificationsEnabled).toBe(true);
  });

  it('should toggle notification settings', async () => {
    await updatePreferences({ notificationsEnabled: false });
    const prefs = await getPreferences();
    expect(prefs.notificationsEnabled).toBe(false);
  });

  it('should default recording status to false', async () => {
    const status = await getRecordingStatus();
    expect(status).toBe(false);
  });

  it('should save and update recording status', async () => {
    await saveRecordingStatus(true);
    let status = await getRecordingStatus();
    expect(status).toBe(true);

    await saveRecordingStatus(false);
    status = await getRecordingStatus();
    expect(status).toBe(false);
  });
});
