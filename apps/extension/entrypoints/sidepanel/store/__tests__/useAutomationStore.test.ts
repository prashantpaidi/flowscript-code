import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { useAutomationStore } from '../useAutomationStore';

// Mock automation-service APIs that use browser APIs
vi.mock('@/utils/automation-service', () => ({
  executeActionOnTab: vi.fn(),
  queryActiveTab: vi.fn().mockResolvedValue({ id: 123, url: 'https://example.com' }),
}));

describe('useAutomationStore', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    
    // Clear Zustand store state before each test
    useAutomationStore.setState({
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
      files: [],
      activeFileId: null,
      fileExplorerOpen: true,
    });
  });

  it('should initialize store correctly (initStore)', async () => {
    const store = useAutomationStore.getState();
    expect(store.isInitialized).toBe(false);

    await store.initStore();

    // Since storage is empty, it should migrate or create a default-main file
    const updatedStore = useAutomationStore.getState();
    expect(updatedStore.isInitialized).toBe(true);
    expect(updatedStore.activeFileId).toBe('default-main');
    expect(updatedStore.files).toHaveLength(1);
    expect(updatedStore.files[0].name).toBe('main.ts');
    expect(updatedStore.code).toContain('FlowScript Automation');
  });

  it('should set code and parse triggers (setCode)', async () => {
    const store = useAutomationStore.getState();
    await store.initStore();

    useAutomationStore.getState().setCode(`
      // @trigger('hotkey', 'ctrl+shift+k')
      async function myAction() {}
    `);

    const updatedStore = useAutomationStore.getState();
    expect(updatedStore.code).toContain('ctrl+shift+k');
    expect(updatedStore.triggers).toHaveLength(1);
    expect(updatedStore.triggers[0]).toEqual({
      type: 'hotkey',
      triggerVal: 'ctrl+shift+k',
      displayLabel: 'Ctrl + Shift + K',
      functionName: 'myAction',
    });
    expect(updatedStore.validationError).toBeNull();
  });

  it('should detect validation error with duplicate triggers', async () => {
    const store = useAutomationStore.getState();
    await store.initStore();

    useAutomationStore.getState().setCode(`
      // @trigger('hotkey', 'ctrl+shift+k')
      async function act1() {}

      // @trigger('hotkey', 'ctrl+shift+k')
      async function act2() {}
    `);

    const updatedStore = useAutomationStore.getState();
    expect(updatedStore.validationError).toContain('Hotkey collision');
  });

  it('should create a file and folder', async () => {
    const store = useAutomationStore.getState();
    await store.initStore();

    const fileId = useAutomationStore.getState().createFile('new-file', null);
    const folderId = useAutomationStore.getState().createFolder('my-folder', null);

    const updatedStore = useAutomationStore.getState();
    expect(updatedStore.files).toHaveLength(3); // default-main + new-file + my-folder
    expect(updatedStore.activeFileId).toBe(fileId);
    expect(updatedStore.files.find(f => f.id === fileId)?.name).toBe('new-file.ts');
    expect(updatedStore.files.find(f => f.id === folderId)?.type).toBe('folder');
  });

  it('should rename a node', async () => {
    const store = useAutomationStore.getState();
    await store.initStore();

    const fileId = useAutomationStore.getState().createFile('test', null);
    useAutomationStore.getState().renameNode(fileId, 'renamed-test');

    const updatedStore = useAutomationStore.getState();
    expect(updatedStore.files.find(f => f.id === fileId)?.name).toBe('renamed-test.ts');
  });

  it('should delete a node and handle active file selection', async () => {
    const store = useAutomationStore.getState();
    await store.initStore();

    const fileId = useAutomationStore.getState().createFile('test-del', null);
    expect(useAutomationStore.getState().activeFileId).toBe(fileId);

    useAutomationStore.getState().deleteNode(fileId);

    const updatedStore = useAutomationStore.getState();
    expect(updatedStore.files.find(f => f.id === fileId)).toBeUndefined();
    // Active file should revert to the remaining file
    await vi.waitFor(() => {
      expect(useAutomationStore.getState().activeFileId).toBe('default-main');
    });
  });

  it('should handle console logging', () => {
    const store = useAutomationStore.getState();
    store.addLog({ type: 'log', message: 'Hello Log', timestamp: 1000 });
    expect(useAutomationStore.getState().logs).toHaveLength(1);

    store.clearConsole();
    expect(useAutomationStore.getState().logs).toHaveLength(0);
    expect(useAutomationStore.getState().status).toBe('idle');
  });

  it('should control active tabs and execution state', () => {
    const store = useAutomationStore.getState();
    store.setActiveTab('console');
    expect(useAutomationStore.getState().activeTab).toBe('console');

    // Manually trigger running status
    useAutomationStore.setState({ isRunning: true });
    store.setExecutionComplete({ success: true });
    expect(useAutomationStore.getState().isRunning).toBe(false);
    expect(useAutomationStore.getState().status).toBe('success');
  });

  it('should toggle recording state', async () => {
    const store = useAutomationStore.getState();
    await store.initStore();

    await store.startRecording();
    expect(useAutomationStore.getState().isRecording).toBe(true);

    await store.stopRecording();
    expect(useAutomationStore.getState().isRecording).toBe(false);
  });
});
