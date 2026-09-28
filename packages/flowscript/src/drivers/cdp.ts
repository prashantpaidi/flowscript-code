import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FlowScriptDriver } from './driver.js';

export type LiveBrowserType = 'auto' | 'edge' | 'chrome' | 'chromium' | 'brave';

export interface TargetInfo {
  targetId: string;
  type: string;
  title: string;
  url: string;
  attached: boolean;
  browserContextId?: string;
  openerId?: string;
}

export interface TargetFilterOptions {
  url?: string | RegExp | ((url: string) => boolean);
  title?: string | RegExp | ((title: string) => boolean);
  targetId?: string;
}

export interface AttachLiveOptions extends TargetFilterOptions {
  /**
   * Browser flavor to detect. Defaults to 'auto'.
   */
  browser?: LiveBrowserType;

  /**
   * Custom user data directory where DevToolsActivePort is located.
   */
  userDataDir?: string;

  /**
   * Explicit absolute path to DevToolsActivePort file.
   */
  devToolsActivePortPath?: string;

  /**
   * Host address. Defaults to '127.0.0.1'.
   */
  host?: string;

  /**
   * If true, creates a new tab if no matching page target is found. Defaults to true.
   */
  createTabIfNone?: boolean;

  /**
   * Initial URL to navigate if a new tab is created. Defaults to 'about:blank'.
   */
  newTabUrl?: string;

  /**
   * Optional fallback port if DevToolsActivePort file cannot be found (e.g. 9222).
   */
  fallbackPort?: number;
}

export interface CdpDriverOptions {
  wsEndpoint?: string;
  host?: string;
  port?: number;
  targetId?: string;
  sessionId?: string;
}

export interface ActivePortInfo {
  port: number;
  wsPath: string;
  filePath: string;
}

/**
 * Searches standard system paths for DevToolsActivePort files.
 */
export function findDevToolsActivePort(options: AttachLiveOptions = {}): ActivePortInfo {
  if (options.devToolsActivePortPath && fs.existsSync(options.devToolsActivePortPath)) {
    return readActivePortFile(options.devToolsActivePortPath);
  }

  if (options.userDataDir) {
    const candidate = path.join(options.userDataDir, 'DevToolsActivePort');
    if (fs.existsSync(candidate)) {
      return readActivePortFile(candidate);
    }
  }

  const browser = options.browser ?? 'auto';
  const platform = os.platform();
  const homeDir = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || '';

  const candidatePaths: { browser: LiveBrowserType; path: string }[] = [];

  if (platform === 'win32') {
    if (localAppData) {
      candidatePaths.push(
        { browser: 'edge', path: path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'DevToolsActivePort') },
        { browser: 'chrome', path: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'DevToolsActivePort') },
        { browser: 'edge', path: path.join(localAppData, 'Microsoft', 'Edge Beta', 'User Data', 'DevToolsActivePort') },
        { browser: 'chrome', path: path.join(localAppData, 'Google', 'Chrome SxS', 'User Data', 'DevToolsActivePort') },
        { browser: 'chromium', path: path.join(localAppData, 'Chromium', 'User Data', 'DevToolsActivePort') },
        { browser: 'brave', path: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'DevToolsActivePort') }
      );
    }
  } else if (platform === 'darwin') {
    candidatePaths.push(
      { browser: 'chrome', path: path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome', 'DevToolsActivePort') },
      { browser: 'edge', path: path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge', 'DevToolsActivePort') },
      { browser: 'brave', path: path.join(homeDir, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser', 'DevToolsActivePort') }
    );
  } else {
    // Linux
    candidatePaths.push(
      { browser: 'chrome', path: path.join(homeDir, '.config', 'google-chrome', 'DevToolsActivePort') },
      { browser: 'chromium', path: path.join(homeDir, '.config', 'chromium', 'DevToolsActivePort') },
      { browser: 'edge', path: path.join(homeDir, '.config', 'microsoft-edge', 'DevToolsActivePort') },
      { browser: 'brave', path: path.join(homeDir, '.config', 'BraveSoftware', 'Brave-Browser', 'DevToolsActivePort') }
    );
  }

  // Filter based on requested browser
  const matching = candidatePaths.filter(c => browser === 'auto' || c.browser === browser);
  const existing = matching
    .filter(c => fs.existsSync(c.path))
    .map(c => ({
      ...c,
      mtime: fs.statSync(c.path).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime); // Prefer most recently touched

  if (existing.length > 0) {
    return readActivePortFile(existing[0].path);
  }

  throw new Error(
    `[FlowScript] Could not find DevToolsActivePort file for browser: '${browser}'.\n` +
    `Ensure remote debugging is enabled in your live browser:\n` +
    `  - In Edge: Navigate to edge://inspect/#remote-debugging and turn on remote debugging\n` +
    `  - In Chrome: Navigate to chrome://inspect/#remote-debugging or launch with --remote-debugging-port\n` +
    `Checked paths:\n${matching.map(m => '  - ' + m.path).join('\n')}`
  );
}

function readActivePortFile(filePath: string): ActivePortInfo {
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/);
    const port = parseInt(raw[0], 10);
    const wsPath = raw[1] || '';
    if (!port || isNaN(port)) {
      throw new Error(`Invalid port in ${filePath}: ${raw[0]}`);
    }
    return { port, wsPath, filePath };
  } catch (err: any) {
    throw new Error(`Failed to parse DevToolsActivePort file (${filePath}): ${err.message}`);
  }
}

function matchesTarget(target: TargetInfo, options: TargetFilterOptions): boolean {
  if (target.type !== 'page') return false;
  if (options.targetId && target.targetId !== options.targetId) return false;

  if (options.url) {
    if (typeof options.url === 'string' && !target.url.toLowerCase().includes(options.url.toLowerCase())) {
      return false;
    }
    if (options.url instanceof RegExp && !options.url.test(target.url)) {
      return false;
    }
    if (typeof options.url === 'function' && !options.url(target.url)) {
      return false;
    }
  }

  if (options.title) {
    if (typeof options.title === 'string' && !target.title.toLowerCase().includes(options.title.toLowerCase())) {
      return false;
    }
    if (options.title instanceof RegExp && !options.title.test(target.title)) {
      return false;
    }
    if (typeof options.title === 'function' && !options.title(target.title)) {
      return false;
    }
  }

  return true;
}

export class CdpDriver implements FlowScriptDriver {
  private ws: WebSocket | null = null;
  private messageId: number = 0;
  private pendingRequests: Map<number, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  
  public targetUrl: string = '';
  public targetId?: string;
  public sessionId?: string;
  public isBrowserSession: boolean = false;

  constructor(private options: CdpDriverOptions = {}) {
    this.sessionId = options.sessionId;
    this.targetId = options.targetId;
  }

  /**
   * Connect to an existing live browser (Chrome / Edge) using DevToolsActivePort discovery.
   * Attaches to target tab in 1 line of code.
   */
  static async attachLive(options: AttachLiveOptions = {}): Promise<CdpDriver> {
    const host = options.host ?? '127.0.0.1';
    let portInfo: ActivePortInfo;

    try {
      portInfo = findDevToolsActivePort(options);
    } catch (err: any) {
      if (options.fallbackPort) {
        portInfo = { port: options.fallbackPort, wsPath: '', filePath: 'fallback' };
      } else {
        throw err;
      }
    }

    const browserWsEndpoint = `ws://${host}:${portInfo.port}${portInfo.wsPath}`;
    const driver = new CdpDriver({
      wsEndpoint: browserWsEndpoint,
      host,
      port: portInfo.port
    });

    driver.isBrowserSession = true;
    await driver.connectRaw(browserWsEndpoint);

    // List all available targets
    const targets = await driver.listTabs();

    // Find matching target
    let target = targets.find(t => matchesTarget(t, options));

    // If no specific match and no filter specified, pick first non-internal page or first page
    if (!target && !options.url && !options.title && !options.targetId) {
      target = targets.find(t => t.type === 'page' && !t.url.startsWith('edge://') && !t.url.startsWith('chrome://')) 
        || targets.find(t => t.type === 'page');
    }

    if (!target) {
      if (options.createTabIfNone !== false) {
        const newUrl = options.newTabUrl || 'about:blank';
        const newTargetId = await driver.newTab(newUrl);
        await driver.attachToTab(newTargetId);
        return driver;
      }

      const available = targets.map(t => `  - [${t.type}] "${t.title}" (${t.url}) [id: ${t.targetId}]`).join('\n');
      throw new Error(`[FlowScript] No matching browser tab found.\nAvailable targets:\n${available}`);
    }

    await driver.attachToTab(target.targetId);
    driver.targetUrl = target.url;
    return driver;
  }

  /**
   * Connect to a remote browser via direct CDP WebSocket URL (e.g., Steel.dev or page ws).
   */
  static async connect(options: CdpDriverOptions = {}): Promise<CdpDriver> {
    const driver = new CdpDriver(options);
    await driver.init();
    return driver;
  }

  async init(): Promise<void> {
    let endpoint = this.options.wsEndpoint;

    // If no direct wsEndpoint provided, query Chrome's HTTP endpoint
    if (!endpoint) {
      const host = this.options.host ?? '127.0.0.1';
      const port = this.options.port ?? 9222;
      const listUrl = `http://${host}:${port}/json/list`;

      try {
        const res = await fetch(listUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const targets = await res.json() as any[];
        const pageTarget = targets.find((t) => t.type === 'page');

        if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
          const newTargetRes = await fetch(`http://${host}:${port}/json/new`);
          const newTarget = await newTargetRes.json() as any;
          endpoint = newTarget.webSocketDebuggerUrl;
        } else {
          endpoint = pageTarget.webSocketDebuggerUrl;
          this.targetUrl = pageTarget.url || '';
        }
      } catch (err: any) {
        throw new Error(
          `Failed to discover CDP endpoint at http://${this.options.host ?? '127.0.0.1'}:${this.options.port ?? 9222}/json/list.\n` +
          `Make sure Chrome is running with: --remote-debugging-port=${this.options.port ?? 9222}\n` +
          `Original error: ${err.message}`
        );
      }
    }

    if (!endpoint) {
      throw new Error('No WebSocket CDP endpoint available.');
    }

    await this.connectRaw(endpoint);

    // Enable domains for direct page connection
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('DOM.enable');
  }

  private connectRaw(endpoint: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(endpoint);
        this.ws = ws;

        ws.onopen = () => {
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data.toString());
            if (data.id && this.pendingRequests.has(data.id)) {
              const { resolve: reqResolve, reject: reqReject } = this.pendingRequests.get(data.id)!;
              this.pendingRequests.delete(data.id);
              if (data.error) {
                reqReject(new Error(data.error.message || JSON.stringify(data.error)));
              } else {
                reqResolve(data.result);
              }
            }
          } catch (parseErr) {
            console.error('[CdpDriver] Failed to parse message:', parseErr);
          }
        };

        ws.onerror = (err) => {
          reject(new Error(`WebSocket connection failed: ${err}`));
        };

        ws.onclose = () => {
          for (const [, { reject: reqReject }] of this.pendingRequests) {
            reqReject(new Error('WebSocket connection closed'));
          }
          this.pendingRequests.clear();
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Send a CDP command and await response.
   * If attached to a tab session, automatically includes sessionId unless browser = true.
   */
  async send<T = any>(method: string, params: Record<string, any> = {}, options?: { browser?: boolean }): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('CDP WebSocket is not connected.');
    }

    const id = ++this.messageId;
    const payload: Record<string, any> = { id, method, params };

    if (this.sessionId && !options?.browser) {
      payload.sessionId = this.sessionId;
    }

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(payload));
    });
  }

  /**
   * List all targets (tabs) in the browser.
   */
  async listTabs(): Promise<TargetInfo[]> {
    const res = await this.send<{ targetInfos: TargetInfo[] }>('Target.getTargets', {}, { browser: true });
    return res.targetInfos || [];
  }

  /**
   * Attach to a specific tab target by ID.
   */
  async attachToTab(targetId: string): Promise<string> {
    const res = await this.send<{ sessionId: string }>('Target.attachToTarget', {
      targetId,
      flatten: true
    }, { browser: true });

    this.sessionId = res.sessionId;
    this.targetId = targetId;

    // Enable domains inside attached session
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('DOM.enable');

    return this.sessionId;
  }

  /**
   * Open a new tab in the live browser and attach to it.
   */
  async newTab(url: string = 'about:blank'): Promise<string> {
    const res = await this.send<{ targetId: string }>('Target.createTarget', { url }, { browser: true });
    await this.attachToTab(res.targetId);
    this.targetUrl = url;
    return res.targetId;
  }

  /**
   * Close a tab by target ID (defaults to current tab).
   */
  async closeTab(targetId?: string): Promise<void> {
    const id = targetId || this.targetId;
    if (!id) return;
    await this.send('Target.closeTarget', { targetId: id }, { browser: true });
  }

  /**
   * Evaluate a JavaScript expression inside the browser page context.
   */
  async evaluate<T = any>(expression: string): Promise<T> {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });

    if (res.exceptionDetails) {
      const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
      throw new Error(`In-page evaluation error: ${desc}`);
    }

    return res.result?.value;
  }

  /**
   * Navigate the browser page to a specific URL.
   */
  async navigate(url: string): Promise<void> {
    await this.send('Page.navigate', { url });
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  async goto(url: string): Promise<void> {
    return this.navigate(url);
  }

  async click(selector: string): Promise<void> {
    const coords = await this.evaluate<{ x: number; y: number }>(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error("Element not found: " + ${JSON.stringify(selector)});
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        const rect = el.getBoundingClientRect();
        return {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2)
        };
      })()
    `);

    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: coords.x,
      y: coords.y
    });
    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: coords.x,
      y: coords.y,
      button: 'left',
      clickCount: 1
    });
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: coords.x,
      y: coords.y,
      button: 'left',
      clickCount: 1
    });
  }

  async type(selector: string, value: string): Promise<void> {
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error("Element not found: " + ${JSON.stringify(selector)});
        el.focus();
        if ('value' in el) {
          el.value = '';
        }
      })()
    `);

    await this.send('Input.insertText', { text: value });

    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
  }

  async scroll(selector: string): Promise<void> {
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error("Element not found: " + ${JSON.stringify(selector)});
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })()
    `);
  }

  async hover(selector: string): Promise<void> {
    const coords = await this.evaluate<{ x: number; y: number }>(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error("Element not found: " + ${JSON.stringify(selector)});
        const rect = el.getBoundingClientRect();
        return {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2)
        };
      })()
    `);

    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: coords.x,
      y: coords.y
    });
  }

  async readDom(selector: string, property: string = 'textContent'): Promise<any> {
    return this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        const prop = ${JSON.stringify(property)};
        if (!el) {
          if (prop === '__exists') return false;
          if (prop === '__isVisible') return false;
          return null;
        }
        if (prop === '__exists') return true;
        if (prop === '__isVisible') {
          return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        }
        if (prop.startsWith('attr:')) {
          return el.getAttribute(prop.slice(5));
        }
        return el[prop] ?? el.getAttribute(prop);
      })()
    `);
  }

  async updateDom(selector: string, property: string, value: any): Promise<void> {
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error("Element not found: " + ${JSON.stringify(selector)});
        const prop = ${JSON.stringify(property)};
        if (prop.startsWith('attr:')) {
          el.setAttribute(prop.slice(5), ${JSON.stringify(value)});
        } else {
          el[prop] = ${JSON.stringify(value)};
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);
  }

  async nativeClick(selector: string): Promise<void> {
    return this.click(selector);
  }

  async nativeType(selector: string, value: string): Promise<void> {
    return this.type(selector, value);
  }

  async press(key: string): Promise<void> {
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key
    });
  }

  async typeActive(value: string): Promise<void> {
    await this.send('Input.insertText', { text: value });
  }

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async close(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
