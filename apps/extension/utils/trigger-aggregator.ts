import { ParsedTrigger, parseTriggers, urlPatternsOverlap, validateTriggers } from '@flowscript/shared';
import { getDynamicTriggers, getFileContent, getSavedFiles } from '@/utils/storage';

const normalizeTriggerVal = (val: string | undefined): string =>
  (val || '').toLowerCase().replace(/\s+/g, '');

/**
 * Aggregates triggers from ALL flows (files) plus dynamically registered
 * triggers into a single registry. Triggers are tagged with the id of the
 * file that owns them so they can execute even when another flow is open.
 *
 * Files with validation errors are skipped (their triggers are not
 * registered) instead of wiping the whole registry.
 */
export async function aggregateAllTriggers(): Promise<ParsedTrigger[]> {
  const collected: ParsedTrigger[] = [];

  try {
    const files = (await getSavedFiles()).filter((f) => f.type === 'file');

    const perFileTriggers = await Promise.all(
      files.map(async (file) => {
        try {
          const content = await getFileContent(file.id);
          const parsed = parseTriggers(content).map((t) => ({ ...t, fileId: file.id }));
          if (parsed.length === 0) return [];

          const valError = validateTriggers(parsed);
          if (valError) {
            console.warn(`FlowScript: Skipping triggers of '${file.name}': ${valError}`);
            return [];
          }
          return parsed;
        } catch (err) {
          console.warn(`FlowScript: Failed to aggregate triggers of '${file.name}':`, err);
          return [];
        }
      })
    );

    perFileTriggers.forEach((triggers) => collected.push(...triggers));
  } catch (err) {
    console.warn('FlowScript: Failed to aggregate file triggers:', err);
  }

  try {
    collected.push(...(await getDynamicTriggers()));
  } catch (err) {
    console.warn('FlowScript: Failed to load dynamic triggers:', err);
  }

  const result: ParsedTrigger[] = [];
  for (const trigger of collected) {
    const existing = result.find((t) => t.type === trigger.type && t.functionName === trigger.functionName);
    if (existing) {
      const isExactDuplicate =
        normalizeTriggerVal(existing.triggerVal) === normalizeTriggerVal(trigger.triggerVal) &&
        (existing.urlPattern || '') === (trigger.urlPattern || '') &&
        existing.fileId === trigger.fileId;
      if (isExactDuplicate) continue;
    }

    if (trigger.type !== 'load' && trigger.triggerVal) {
      const conflict = result.find(
        (t) =>
          t.type === trigger.type &&
          normalizeTriggerVal(t.triggerVal) === normalizeTriggerVal(trigger.triggerVal) &&
          urlPatternsOverlap(t.urlPattern, trigger.urlPattern)
      );
      if (conflict) {
        console.warn(
          `FlowScript: Trigger conflict for '${trigger.triggerVal}' (${trigger.functionName} from file ${trigger.fileId}) overlaps '${conflict.functionName}' from file ${conflict.fileId}. Keeping the first.`
        );
        continue;
      }
    }

    result.push(trigger);
  }

  return result;
}
