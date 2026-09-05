import { test, expect, chromium, type BrowserContext, type Worker } from '@playwright/test';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Minimal chrome API typings for code evaluated inside the extension contexts
declare const chrome: {
  storage: {
    local: {
      get: (keys: string | string[]) => Promise<Record<string, any>>;
      set: (items: Record<string, unknown>) => Promise<void>;
    };
    session: {
      get: (keys: string | string[]) => Promise<Record<string, any>>;
    };
  };
  sidePanel: { open: (options: { tabId: number }) => Promise<void> };
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const extensionPath = resolve(__dirname, '../.output/chrome-mv3');

const FILE_A_CODE = `// @trigger('hotkey', 'ctrl+shift+a')\nasync function flowA() {\n  console.log('A ran');\n}\n`;
const FILE_B_CODE = `// @trigger('hotkey', 'ctrl+shift+b')\nasync function flowB() {\n  console.log('B ran');\n}\n`;

test.describe('FlowScript multi-flow triggers E2E', () => {
  let context: BrowserContext;
  let extensionId: string;
  let background: Worker;
  let server: http.Server;
  let baseUrl: string;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-first-run',
      ],
    });

    [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 10000 });
    }
    extensionId = background.url().split('/')[2];

    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><head><title>Target</title></head><body>FlowScript e2e target page</body></html>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${address.port}/`;

    // Seed two flows (B is the opened/active one) before any sidepanel is launched
    await background.evaluate((seed) => chrome.storage.local.set(seed), {
      automation_files: [
        { id: 'file-a', name: 'flow-a.ts', type: 'file', parentId: null },
        { id: 'file-b', name: 'flow-b.ts', type: 'file', parentId: null },
      ],
      active_file_id: 'file-b',
      'file_content_file-a': FILE_A_CODE,
      'file_content_file-b': FILE_B_CODE,
    });

    // The real Chrome side panel UI is not observable by Playwright; if it opens it
    // would drain pending triggers invisibly. Stub open() so the background still
    // exercises the pending-trigger path but the drain lands in the page we open.
    await background.evaluate(() => {
      (chrome.sidePanel as any).open = () => Promise.resolve();
    });
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const openSidepanel = async () => {
    const sidepanel = await context.newPage();
    await sidepanel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    return sidepanel;
  };

  const openTargetPage = async () => {
    const target = await context.newPage();
    await target.goto(baseUrl);
    await expect(target.locator('body')).toContainText('FlowScript e2e target page');
    return target;
  };

  const waitForRegistry = async () => {
    // The sidepanel aggregates all flows into the registry content scripts consume
    await expect
      .poll(
        () =>
          background.evaluate(() =>
            chrome.storage.local
              .get('automation_triggers')
              .then((result) => ((result['automation_triggers'] as any[]) ?? []).length)
          ),
        { timeout: 15000 }
      )
      .toBe(2);
  };

  test('fires both flows hotkeys while another flow is opened', async () => {
    const sidepanel = await openSidepanel();
    await waitForRegistry();

    const target = await openTargetPage();

    // Flow A hotkey must work even though flow B is the opened flow
    await target.keyboard.press('Control+Shift+a');
    await expect(sidepanel.getByText('A ran')).toBeVisible({ timeout: 20000 });

    // Flow B hotkey keeps working too
    await target.keyboard.press('Control+Shift+b');
    await expect(sidepanel.getByText('B ran')).toBeVisible({ timeout: 20000 });

    await sidepanel.close();
    await target.close();
  });

  test('queues a trigger fired while the sidepanel is closed and runs the owning flow on reopen', async () => {
    const target = await openTargetPage();

    // Sidepanel is closed -> background should queue the pending trigger with its fileId
    await target.keyboard.press('Control+Shift+a');

    await expect
      .poll(
        () =>
          background.evaluate(() =>
            chrome.storage.session.get('pending_trigger').then((result) => result['pending_trigger'] ?? null)
          ),
        { timeout: 15000 }
      )
      .toBeTruthy();

    const pending = (await background.evaluate(() =>
      chrome.storage.session.get('pending_trigger').then((result) => result['pending_trigger'])
    )) as { functionName: string; tabId: number; fileId?: string } | null;
    expect(pending).toMatchObject({ functionName: 'flowA', fileId: 'file-a' });
    expect(typeof pending?.tabId).toBe('number');

    // Reopening the sidepanel drains the pending trigger and executes flow A's code
    const sidepanel = await openSidepanel();
    await expect(sidepanel.getByText('A ran')).toBeVisible({ timeout: 20000 });

    await sidepanel.close();
    await target.close();
  });
});
