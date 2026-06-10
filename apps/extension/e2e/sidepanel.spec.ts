import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const extensionPath = resolve(__dirname, '../.output/chrome-mv3');

test.describe('FlowScript Sidepanel E2E Tests', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    // Launch Chrome with the unpacked WXT extension
    // Playwright Chrome Extension testing officially requires headless: false
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    // Retrieve the extension's ID
    let [background] = context.serviceWorkers();
    if (!background) {
      try {
        background = await context.waitForEvent('serviceworker', { timeout: 5000 });
      } catch {
        [background] = context.serviceWorkers();
      }
    }
    
    if (!background) {
      throw new Error('Failed to find background service worker for the extension');
    }
    
    // Extract ID from e.g. "chrome-extension://<id>/background.js"
    extensionId = background.url().split('/')[2];
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('should render extension sidepanel UI correctly', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

    // Verify Title / Brand is present
    await expect(page.locator('h1:has-text("FlowScript Studio")')).toBeVisible();

    // Verify Toolbar buttons are rendered
    await expect(page.getByRole('button', { name: 'Inspect' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Record' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Script' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();

    // Verify Editor workspace text area is present
    await expect(page.locator('textarea')).toBeVisible();
    
    await page.close();
  });

  test('should switch between tabs in sidepanel', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);

    // 1. Console Tab
    const consoleTabBtn = page.getByRole('tab', { name: 'Console' });
    await expect(consoleTabBtn).toBeVisible();
    await consoleTabBtn.click();
    // Verify Console empty state text
    await expect(page.locator('text=Console is empty')).toBeVisible();

    // 2. Triggers Tab
    const triggersTabBtn = page.getByRole('tab', { name: 'Triggers' });
    await expect(triggersTabBtn).toBeVisible();
    await triggersTabBtn.click();
    // Verify triggers tab elements
    await expect(page.locator('text=No Triggers Active')).toBeVisible();

    // 3. Helpers Tab
    const helpersTabBtn = page.getByRole('tab', { name: 'Helpers' });
    await expect(helpersTabBtn).toBeVisible();
    await helpersTabBtn.click();
    // Verify helpers tab shows snippets list
    await expect(page.locator('text=Selectors Guide')).toBeVisible();
    await expect(page.locator('text=nativeClick(selector)')).toBeVisible();

    // 4. Editor Tab
    const editorTabBtn = page.getByRole('tab', { name: 'Editor' });
    await expect(editorTabBtn).toBeVisible();
    await editorTabBtn.click();
    await expect(page.locator('textarea')).toBeVisible();

    await page.close();
  });
});
