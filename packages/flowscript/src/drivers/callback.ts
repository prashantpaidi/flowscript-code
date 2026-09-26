import { FlowScriptDriver } from './driver.js';

export type ActionCallback = (action: string, args: any[]) => Promise<any>;

export class CallbackDriver implements FlowScriptDriver {
  constructor(private callback: ActionCallback) {}

  async click(selector: string): Promise<void> {
    await this.callback('click', [selector]);
  }

  async type(selector: string, value: string): Promise<void> {
    await this.callback('type', [selector, value]);
  }

  async scroll(selector: string): Promise<void> {
    await this.callback('scroll', [selector]);
  }

  async hover(selector: string): Promise<void> {
    await this.callback('hover', [selector]);
  }

  async readDom(selector: string, property: string): Promise<any> {
    return this.callback('readDom', [selector, property]);
  }

  async updateDom(selector: string, property: string, value: any): Promise<void> {
    await this.callback('updateDom', [selector, property, value]);
  }

  async nativeClick(selector: string): Promise<void> {
    await this.callback('nativeClick', [selector]);
  }

  async nativeType(selector: string, value: string): Promise<void> {
    await this.callback('nativeType', [selector, value]);
  }

  async press(key: string): Promise<void> {
    await this.callback('press', [key]);
  }

  async typeActive(value: string): Promise<void> {
    await this.callback('typeActive', [value]);
  }

  async sleep(ms: number): Promise<void> {
    await this.callback('sleep', [ms]);
  }
}
