import { FlowScriptDriver } from './driver.js';
import { DriverActionCall } from '../types.js';

export class MockDriver implements FlowScriptDriver {
  public actions: DriverActionCall[] = [];
  public domState: Map<string, Map<string, any>> = new Map();
  public enableRealSleep: boolean;

  constructor(options?: { enableRealSleep?: boolean }) {
    this.enableRealSleep = options?.enableRealSleep ?? false;
  }

  private record(action: DriverActionCall['action'], ...args: any[]) {
    this.actions.push({
      action,
      args,
      timestamp: Date.now()
    });
  }

  setMockDom(selector: string, property: string, value: any): void {
    if (!this.domState.has(selector)) {
      this.domState.set(selector, new Map());
    }
    this.domState.get(selector)!.set(property, value);
  }

  async click(selector: string): Promise<void> {
    this.record('click', selector);
  }

  async type(selector: string, value: string): Promise<void> {
    this.record('type', selector, value);
    this.setMockDom(selector, 'value', value);
  }

  async scroll(selector: string): Promise<void> {
    this.record('scroll', selector);
  }

  async hover(selector: string): Promise<void> {
    this.record('hover', selector);
  }

  async readDom(selector: string, property: string): Promise<any> {
    this.record('readDom', selector, property);
    return this.domState.get(selector)?.get(property) ?? null;
  }

  async updateDom(selector: string, property: string, value: any): Promise<void> {
    this.record('updateDom', selector, property, value);
    this.setMockDom(selector, property, value);
  }

  async nativeClick(selector: string): Promise<void> {
    this.record('nativeClick', selector);
  }

  async nativeType(selector: string, value: string): Promise<void> {
    this.record('nativeType', selector, value);
  }

  async press(key: string): Promise<void> {
    this.record('press', key);
  }

  async typeActive(value: string): Promise<void> {
    this.record('typeActive', value);
  }

  async sleep(ms: number): Promise<void> {
    this.record('sleep', ms);
    if (this.enableRealSleep) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  reset(): void {
    this.actions = [];
    this.domState.clear();
  }
}
