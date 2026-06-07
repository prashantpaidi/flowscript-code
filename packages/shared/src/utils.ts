import { AutomationAction, VALID_ACTION_TYPES, ParsedTrigger } from './types.js';

/**
 * Validates whether the given object is a valid AutomationAction.
 */
export function isValidAction(action: any): action is AutomationAction {
  if (!action || typeof action !== 'object') return false;
  
  const hasValidType = (VALID_ACTION_TYPES as readonly string[]).includes(action.type);
  const hasValidSelector = typeof action.selector === 'string' && action.selector.trim().length > 0;
  
  if (!hasValidType || !hasValidSelector) return false;
  
  if (action.type === 'type' || action.type === 'nativeType') {
    return typeof action.value === 'string';
  }

  if (action.type === 'readDom') {
    return typeof action.property === 'string' && action.property.trim().length > 0;
  }

  if (action.type === 'updateDom') {
    return typeof action.property === 'string' && action.property.trim().length > 0 && action.value !== undefined;
  }
  
  return true;
}

/**
 * Helper promise-based delay function.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to format hotkey display label, e.g. 'ctrl+shift+k' -> 'Ctrl + Shift + K'
 */
export function formatHotkey(hotkey: string): string {
  return hotkey
    .split('+')
    .map(part => {
      const trimmed = part.trim();
      if (!trimmed) return '';
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    })
    .filter(Boolean)
    .join(' + ');
}

/**
 * Parses @trigger('hotkey' | 'expander', ...) annotations from the script
 */
export function parseTriggers(code: string): ParsedTrigger[] {
  const triggers: ParsedTrigger[] = [];
  const lines = code.split('\n');
  
  let pendingTriggers: Array<
    | { type: 'hotkey'; triggerVal: string; displayLabel: string }
    | { type: 'expander'; triggerVal: string; expansionText: string }
  > = [];
  
  const triggerRegex = /@trigger\s*\(\s*(['"`])(hotkey|expander)\1\s*,\s*(['"`])(.*?)\3\s*(?:,\s*(['"`])(.*?)\5\s*)?\)/;
  const functionRegex = /(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)|(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)?\s*(?:=>|function\b)/;

  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check block comment state
    const isCommentLine = inBlockComment || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*');

    if (line.startsWith('/*') && !line.includes('*/')) {
      inBlockComment = true;
    } else if (line.includes('*/')) {
      inBlockComment = false;
    }

    const triggerMatch = line.match(triggerRegex);
    if (triggerMatch) {
      const type = triggerMatch[2] as 'hotkey' | 'expander';
      const triggerVal = triggerMatch[4];
      const extraVal = triggerMatch[6] || '';
      
      if (type === 'hotkey') {
        pendingTriggers.push({
          type,
          triggerVal,
          displayLabel: formatHotkey(triggerVal)
        });
      } else {
        pendingTriggers.push({
          type,
          triggerVal,
          expansionText: extraVal
        });
      }
      continue;
    }
    
    if (pendingTriggers.length > 0) {
      if (isCommentLine) {
        continue;
      }
      
      const funcMatch = line.match(functionRegex);
      if (funcMatch) {
        const functionName = funcMatch[1] || funcMatch[2];
        if (functionName) {
          for (const pending of pendingTriggers) {
            if (pending.type === 'hotkey') {
              triggers.push({
                type: 'hotkey',
                triggerVal: pending.triggerVal,
                displayLabel: pending.displayLabel,
                functionName
              });
            } else {
              triggers.push({
                type: 'expander',
                triggerVal: pending.triggerVal,
                expansionText: pending.expansionText,
                functionName
              });
            }
          }
        }
        pendingTriggers = [];
      } else {
        pendingTriggers = [];
      }
    }
  }
  
  return triggers;
}

/**
 * Cleans @trigger(...) annotations from the script code to avoid SyntaxError
 */
export function cleanScriptCode(code: string): string {
  return code.replace(/^[ \t]*(?:\/\/|\/\*|\*)?[ \t]*@trigger\s*\(\s*(['"`])(?:hotkey|expander)\1\s*,\s*(['"`]).*?\2\s*(?:,\s*(['"`]).*?\3\s*)?\)[ \t]*\*?\/?/gm, '');
}

/**
 * Validates parsed triggers for duplicate function names, hotkey collisions, or expander collisions.
 */
export function validateTriggers(triggers: ParsedTrigger[]): string | null {
  const hotkeySeen = new Set<string>();
  const expanderSeen = new Set<string>();

  for (const trigger of triggers) {
    if (trigger.type === 'hotkey') {
      const key = trigger.triggerVal.toLowerCase().replace(/\s+/g, '');
      if (hotkeySeen.has(key)) {
        return `Hotkey collision: '${trigger.triggerVal}' is assigned to multiple functions.`;
      }
      hotkeySeen.add(key);
    }

    if (trigger.type === 'expander') {
      const shortcut = trigger.triggerVal.toLowerCase().trim();
      if (expanderSeen.has(shortcut)) {
        return `Text expander collision: '${trigger.triggerVal}' is assigned to multiple functions.`;
      }
      expanderSeen.add(shortcut);
    }
  }

  return null;
}

/**
 * Automatically prepends 'await ' to recognized async automation commands and element method calls
 * if they are not already awaited, while leaving comments, string literals, and function/class/variable
 * declarations untouched.
 */
export function autoAwaitCommands(code: string): string {
  const placeholders: string[] = [];
  const prefix = `__FLOWSCRIPT_STR_COMMENT_PH_${Math.random().toString(36).substring(2, 10)}__`;

  // 1. Temporarily extract block comments, single-line comments, and strings to avoid matching within them
  const tokenRegex = /\/\*[\s\S]*?\*\/|\/\/.*|`([^`\\]|\\.)*`|"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g;
  
  let tempCode = code.replace(tokenRegex, (match) => {
    const placeholder = `${prefix}${placeholders.length}__`;
    placeholders.push(match);
    return placeholder;
  });

  // 1b. Temporarily extract function and method declarations/signatures to avoid prepending await to them.
  // This matches declarations/signatures using definition keywords or method definitions ending in '{'.
  const defRegex = /\b(?:function|class|const|let|var|async|public|private|protected|static|get|set)\s+[\w$]+\s*\([^)]*\)\s*(?::\s*[^{]+)?\{|\b(?:click|type|scroll|hover|nativeClick|nativeType|readDom|updateDom|sleep)\s*\([^)]*\)\s*(?::\s*[^{]+)?\{/g;

  tempCode = tempCode.replace(defRegex, (match) => {
    const placeholder = `${prefix}${placeholders.length}__`;
    placeholders.push(match);
    return placeholder;
  });

  // 2. Prepend 'await ' to commands if they are not preceded by 'await' or definition keywords
  const actionRegex = /\b(function|class|const|let|var)\s+(\w+)\s*\(|\b(await\s+)?(?:(\b(click|type|scroll|hover|nativeClick|nativeType|readDom|updateDom|sleep)\b)|((?<!\.)[\w$]+(?:\s*\([^)]*\))?(?:\s*\.\s*[\w$]+(?:\s*\([^)]*\))?)*\s*\.\s*(?:click|type|scroll|hover|getText|getValue|getAttribute|isDisabled|isVisible|exists)))\s*\(/g;

  tempCode = tempCode.replace(actionRegex, (match, defKeyword, defName, awaitKeyword) => {
    if (defKeyword) {
      return match;
    }
    if (awaitKeyword) {
      return match;
    }
    return `await ${match}`;
  });

  // 3. Restore the comments, string literals, and definitions in reverse order to properly nest placeholders
  for (let idx = placeholders.length - 1; idx >= 0; idx--) {
    tempCode = tempCode.replace(`${prefix}${idx}__`, () => placeholders[idx]);
  }

  return tempCode;
}




