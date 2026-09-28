import { FlowScriptDriver } from '../drivers/driver.js';

export class ElementHandle {
  private selectorPath: string[];
  private driver: FlowScriptDriver;

  constructor(selectorPath: string[], driver: FlowScriptDriver) {
    this.selectorPath = selectorPath;
    this.driver = driver;
  }

  query(subSelector: string): ElementHandle {
    return new ElementHandle([...this.selectorPath, subSelector], this.driver);
  }

  private get fullSelector(): string {
    return this.selectorPath.join(' ');
  }

  async click(): Promise<void> {
    return this.driver.click(this.fullSelector);
  }

  async type(value: string): Promise<void> {
    return this.driver.type(this.fullSelector, value);
  }

  async scroll(): Promise<void> {
    return this.driver.scroll(this.fullSelector);
  }

  async hover(): Promise<void> {
    return this.driver.hover(this.fullSelector);
  }

  async getText(): Promise<string> {
    return this.driver.readDom(this.fullSelector, 'textContent');
  }

  async getValue(): Promise<string> {
    return this.driver.readDom(this.fullSelector, 'value');
  }

  async getAttribute(attributeName: string): Promise<string> {
    return this.driver.readDom(this.fullSelector, `attr:${attributeName}`);
  }

  async isDisabled(): Promise<boolean> {
    const res = await this.driver.readDom(this.fullSelector, 'disabled');
    return Boolean(res);
  }

  async isVisible(): Promise<boolean> {
    const res = await this.driver.readDom(this.fullSelector, '__isVisible');
    return Boolean(res);
  }

  async exists(): Promise<boolean> {
    const res = await this.driver.readDom(this.fullSelector, '__exists');
    return Boolean(res);
  }
}
