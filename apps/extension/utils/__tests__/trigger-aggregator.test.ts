import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ParsedTrigger } from '@flowscript/shared';
import { aggregateAllTriggers } from '../trigger-aggregator';
import { saveFiles, saveFileContent, saveDynamicTriggers, FileNode } from '@/utils/storage';

const hotkeyScript = (hotkey: string, functionName: string, urlPattern?: string) =>
  `// @trigger('hotkey', '${hotkey}'${urlPattern ? `, '${urlPattern}'` : ''})\n` +
  `async function ${functionName}() {}\n`;

const makeFile = (id: string, name: string): FileNode => ({ id, name, type: 'file', parentId: null });

describe('aggregateAllTriggers', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty registry when there are no files or dynamic triggers', async () => {
    await expect(aggregateAllTriggers()).resolves.toEqual([]);
  });

  it('aggregates triggers from ALL flows and tags them with fileId', async () => {
    await saveFiles([makeFile('file-a', 'flow-a.ts'), makeFile('file-b', 'flow-b.ts')]);
    await saveFileContent('file-a', hotkeyScript('ctrl+shift+1', 'flowA'));
    await saveFileContent('file-b', hotkeyScript('ctrl+shift+2', 'flowB'));

    const result = await aggregateAllTriggers();

    expect(result).toHaveLength(2);
    expect(result.find((t) => t.functionName === 'flowA')).toMatchObject({
      type: 'hotkey',
      triggerVal: 'ctrl+shift+1',
      fileId: 'file-a',
    });
    expect(result.find((t) => t.functionName === 'flowB')).toMatchObject({
      type: 'hotkey',
      triggerVal: 'ctrl+shift+2',
      fileId: 'file-b',
    });
  });

  it('skips files with validation errors but keeps valid flows', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await saveFiles([makeFile('file-bad', 'bad.ts'), makeFile('file-good', 'good.ts')]);
    // Same hotkey twice in one file -> validateTriggers collision error
    await saveFileContent('file-bad', hotkeyScript('ctrl+shift+k', 'act1') + hotkeyScript('ctrl+shift+k', 'act2'));
    await saveFileContent('file-good', hotkeyScript('ctrl+shift+2', 'flowB'));

    const result = await aggregateAllTriggers();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ functionName: 'flowB', fileId: 'file-good' });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('keeps only the first flow when two flows register the same hotkey on overlapping urls', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await saveFiles([makeFile('file-a', 'flow-a.ts'), makeFile('file-b', 'flow-b.ts')]);
    await saveFileContent('file-a', hotkeyScript('ctrl+shift+k', 'flowA', 'https://a.example/*'));
    // No urlPattern -> treated as '*' which overlaps with file-a's pattern
    await saveFileContent('file-b', hotkeyScript('ctrl+shift+k', 'flowB'));

    const result = await aggregateAllTriggers();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ functionName: 'flowA', fileId: 'file-a' });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('keeps the same hotkey from different flows on non-overlapping url patterns', async () => {
    await saveFiles([makeFile('file-a', 'flow-a.ts'), makeFile('file-b', 'flow-b.ts')]);
    await saveFileContent('file-a', hotkeyScript('ctrl+shift+k', 'flowA', 'https://a.example/*'));
    await saveFileContent('file-b', hotkeyScript('ctrl+shift+k', 'flowB', 'https://b.example/*'));

    const result = await aggregateAllTriggers();

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.functionName).sort()).toEqual(['flowA', 'flowB']);
  });

  it('includes dynamic triggers and dedupes exact duplicates', async () => {
    await saveFiles([makeFile('file-a', 'flow-a.ts')]);
    await saveFileContent('file-a', hotkeyScript('ctrl+shift+1', 'flowA'));
    const dynamic: ParsedTrigger = {
      type: 'expander',
      triggerVal: ';;dyn',
      expansionText: 'dynamic text',
      functionName: 'dynFn',
    };
    await saveDynamicTriggers([dynamic, dynamic]);

    const result = await aggregateAllTriggers();

    expect(result).toHaveLength(2);
    expect(result.filter((t) => t.functionName === 'dynFn')).toHaveLength(1);
    expect(result.find((t) => t.functionName === 'dynFn')).toMatchObject({ triggerVal: ';;dyn' });
  });
});
