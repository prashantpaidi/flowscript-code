import { FlowScriptDriver } from './driver.js';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

export interface PlaywrightDriverOptions {
  headless?: boolean;
  slowMo?: number;
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
}

export class PlaywrightDriver implements FlowScriptDriver {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private ownsBrowser: boolean = false;
  private options: PlaywrightDriverOptions;

  constructor(options: PlaywrightDriverOptions = {}) {
    this.options = options;
    if (options.page) {
      this.page = options.page;
      this.context = options.context || options.page.context();
      this.browser = options.browser || this.context.browser() || undefined;
    }
  }

  async init(): Promise<Page> {
    if (!this.page) {
      this.ownsBrowser = true;
      this.browser = await chromium.launch({
        headless: this.options.headless ?? false,
        slowMo: this.options.slowMo ?? 100,
      });
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();
    }
    return this.page;
  }

  getPage(): Page {
    if (!this.page) {
      throw new Error('PlaywrightDriver not initialized. Call init() or pass page in options.');
    }
    return this.page;
  }

  async goto(url: string): Promise<void> {
    const page = this.page || (await this.init());
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async navigate(url: string): Promise<void> {
    await this.goto(url);
  }

  async click(selector: string): Promise<void> {
    const page = this.getPage();
    await page.locator(selector).first().click();
  }

  async type(selector: string, value: string): Promise<void> {
    const page = this.getPage();
    await page.locator(selector).first().fill(value);
  }

  async scroll(selector: string): Promise<void> {
    const page = this.getPage();
    await page.locator(selector).first().scrollIntoViewIfNeeded();
  }

  async hover(selector: string): Promise<void> {
    const page = this.getPage();
    await page.locator(selector).first().hover();
  }

  async readDom(selector: string, property: string): Promise<any> {
    const page = this.getPage();
    const locator = page.locator(selector).first();

    if (property === 'textContent' || property === 'innerText') {
      return locator.textContent();
    }
    if (property === 'value') {
      return locator.inputValue();
    }
    if (property.startsWith('attr:')) {
      const attrName = property.slice(5);
      return locator.getAttribute(attrName);
    }
    if (property === 'disabled') {
      return locator.isDisabled();
    }
    if (property === '__isVisible') {
      return locator.isVisible();
    }
    if (property === '__exists') {
      const count = await page.locator(selector).count();
      return count > 0;
    }

    return locator.evaluate((el: any, prop: string) => el[prop], property);
  }

  async updateDom(selector: string, property: string, value: any): Promise<void> {
    const page = this.getPage();
    await page.locator(selector).first().evaluate((el: any, { prop, val }: { prop: string; val: any }) => {
      el[prop] = val;
    }, { prop: property, val: value });
  }

  async nativeClick(selector: string): Promise<void> {
    const page = this.getPage();
    await page.locator(selector).first().click();
  }

  async nativeType(selector: string, value: string): Promise<void> {
    const page = this.getPage();
    await page.locator(selector).first().pressSequentially(value);
  }

  async press(key: string): Promise<void> {
    const page = this.getPage();
    await page.keyboard.press(key);
  }

  async typeActive(value: string): Promise<void> {
    const page = this.getPage();
    await page.keyboard.type(value);
  }

  async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async close(): Promise<void> {
    if (this.ownsBrowser && this.browser) {
      await this.browser.close();
    } else if (this.page) {
      await this.page.close();
    }
  }
}
