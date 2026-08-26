import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadScript } from '../main';
import { MESSAGE_TYPES } from '@flowscript/shared';

describe('loadScript Sandbox Helper', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      parent: {
        postMessage: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch, auto-await, and evaluate external script code', async () => {
    const mockCode = `
      globalThis.testRemoteValue = "hello_from_remote";
    `;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockCode),
    }));

    await loadScript('http://localhost:3000/script.js');

    expect((globalThis as any).testRemoteValue).toBe('hello_from_remote');
  });

  it('should parse @trigger annotations in external script and post REGISTER_DYNAMIC_TRIGGERS to parent', async () => {
    const mockCodeWithTrigger = `
      // @trigger('hotkey', 'alt+a', 'https://example.com/*')
      async function applyAndScrape1() {
        console.log('triggered');
      }
    `;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockCodeWithTrigger),
    }));

    await loadScript('http://localhost:3000/automation.js');

    expect(window.parent.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'sandbox',
        type: MESSAGE_TYPES.REGISTER_DYNAMIC_TRIGGERS,
        payload: expect.objectContaining({
          triggers: expect.arrayContaining([
            expect.objectContaining({
              type: 'hotkey',
              triggerVal: 'alt+a',
              urlPattern: 'https://example.com/*',
            }),
          ]),
        }),
      }),
      '*'
    );
  });

  it('should throw an error if fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }));

    await expect(loadScript('http://localhost:3000/non-existent.js')).rejects.toThrow('HTTP 404: Not Found');
  });
});
