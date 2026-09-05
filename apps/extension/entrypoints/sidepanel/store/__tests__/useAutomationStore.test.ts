import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ParsedTrigger } from '@flowscript/shared';
import { useAutomationStore } from '../useAutomationStore';
import {
  saveFiles,
  saveFileContent,
  saveActiveFileId,
  getSavedTriggers,
  getDynamicTriggers,
  FileNode,
} from '@/utils/storage';

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

  describe('multi-flow triggers', () => {
    const FILE_A: FileNode = { id: 'file-a', name: 'flow-a.ts', type: 'file', parentId: null };
    const FILE_B: FileNode = { id: 'file-b', name: 'flow-b.ts', type: 'file', parentId: null };
    const CODE_A = `// @trigger('hotkey', 'ctrl+shift+1')\nasync function flowA() {}\n`;
    const CODE_B = `// @trigger('hotkey', 'ctrl+shift+2')\nasync function flowB() {}\n`;

    const seedTwoFlows = async () => {
      await saveFiles([FILE_A, FILE_B]);
      await saveFileContent(FILE_A.id, CODE_A);
      await saveFileContent(FILE_B.id, CODE_B);
      await saveActiveFileId(FILE_A.id);
    };

    const fakeIframe = () => {
      const postMessage = vi.fn();
      return {
        postMessage,
        iframe: { contentWindow: { postMessage } } as unknown as HTMLIFrameElement,
      };
    };

    it('keeps all flows in the global registry when switching between flows', async () => {
      await seedTwoFlows();
      await useAutomationStore.getState().initStore();

      await vi.waitFor(
        async () => {
          const saved = await getSavedTriggers();
          expect(saved.map((t) => t.functionName).sort()).toEqual(['flowA', 'flowB']);
        },
        { timeout: 3000, interval: 200 }
      );

      await useAutomationStore.getState().setActiveFileId('file-b');
      expect(useAutomationStore.getState().activeFileId).toBe('file-b');

      // Wait past the 1s rebuild debounce to prove the switch did not overwrite the registry
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const afterSwitch = await getSavedTriggers();
      expect(afterSwitch.map((t) => t.functionName).sort()).toEqual(['flowA', 'flowB']);
    });

    it('rebuilds the registry from all flows when the active flow is edited', async () => {
      await seedTwoFlows();
      await useAutomationStore.getState().initStore();

      await vi.waitFor(
        async () => {
          expect(await getSavedTriggers()).toHaveLength(2);
        },
        { timeout: 3000, interval: 200 }
      );

      useAutomationStore.getState().setCode("// @trigger('hotkey', 'ctrl+shift+9')\nasync function flowA() {}\n");

      await vi.waitFor(
        async () => {
          const saved = await getSavedTriggers();
          expect(saved.map((t) => t.functionName).sort()).toEqual(['flowA', 'flowB']);
          expect(saved.find((t) => t.functionName === 'flowA')?.triggerVal).toBe('ctrl+shift+9');
        },
        { timeout: 3000, interval: 250 }
      );
    });

    it('executes the owning flow code when a trigger fires with a fileId', async () => {
      await seedTwoFlows();
      await useAutomationStore.getState().initStore();
      await useAutomationStore.getState().setActiveFileId('file-b');
      const { postMessage, iframe } = fakeIframe();

      await useAutomationStore.getState().runTriggerFunction('flowA', 5, iframe, 'file-a');

      expect(postMessage).toHaveBeenCalledTimes(1);
      const { type, payload } = postMessage.mock.calls[0][0];
      expect(type).toBe('RUN_TRIGGER');
      expect(payload.functionName).toBe('flowA');
      expect(payload.code).toBe(CODE_A);
    });

    it('falls back to the active flow code when no fileId is provided', async () => {
      await seedTwoFlows();
      await useAutomationStore.getState().initStore();
      const { postMessage, iframe } = fakeIframe();

      await useAutomationStore.getState().runTriggerFunction('flowB', 5, iframe);

      expect(postMessage).toHaveBeenCalledTimes(1);
      const { payload } = postMessage.mock.calls[0][0];
      expect(payload.functionName).toBe('flowB');
      expect(payload.code).toBe(CODE_A);
    });

    it('replaces a dynamic trigger when the same function re-registers with a new hotkey', async () => {
      const register = (hotkey: string) =>
        useAutomationStore.getState().registerDynamicTriggers([
          {
            type: 'hotkey',
            triggerVal: hotkey,
            displayLabel: 'Ctrl + Shift + ' + hotkey.slice(-1).toUpperCase(),
            functionName: 'dynFn',
          } as ParsedTrigger,
        ]);

      register('ctrl+shift+1');
      register('ctrl+shift+2');

      const triggers = useAutomationStore.getState().triggers;
      expect(triggers).toHaveLength(1);
      expect(triggers[0].triggerVal).toBe('ctrl+shift+2');

      await vi.waitFor(
        async () => {
          const dynamic = await getDynamicTriggers();
          expect(dynamic).toHaveLength(1);
          expect(dynamic[0].triggerVal).toBe('ctrl+shift+2');
        },
        { timeout: 3000, interval: 200 }
      );
    });
  });
});
