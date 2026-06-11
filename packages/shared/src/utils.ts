import { AutomationAction, VALID_ACTION_TYPES, ParsedTrigger, HotkeyTrigger, ExpanderTrigger } from './types.js';

/**
 * Validates whether the given object is a valid AutomationAction.
 */
export function isValidAction(action: any): action is AutomationAction {
  if (!action || typeof action !== 'object') return false;
  
  const hasValidType = (VALID_ACTION_TYPES as readonly string[]).includes(action.type);
  if (!hasValidType) return false;

  const isGlobalAction = action.type === 'typeActive' || action.type === 'press';
  const hasValidSelector = isGlobalAction || (typeof action.selector === 'string' && action.selector.trim().length > 0);
  
  if (!hasValidSelector) return false;
  
  if (action.type === 'type' || action.type === 'nativeType' || action.type === 'typeActive' || action.type === 'press') {
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
 * Helper to match a glob URL pattern (e.g. *://github.com/*) against a URL.
 */
export function matchUrlPattern(pattern: string, url: string): boolean {
  const pat = pattern.trim();
  if (pat === '<all_urls>' || pat === '*' || !pat) return true;
  
  let formattedPattern = pat;
  // If pattern does not start with a scheme, make it match http/https optionally
  if (!/^[a-zA-Z*]+:\/\//.test(formattedPattern)) {
    formattedPattern = `*://${formattedPattern}`;
  }

  const regexString = '^' + formattedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*/g, '.*');               // Convert wildcards to regex .*
  return new RegExp(regexString, 'i').test(url);
}

function urlPatternsOverlap(p1: string | undefined, p2: string | undefined): boolean {
  let pat1 = (p1 || '').trim() || '*';
  let pat2 = (p2 || '').trim() || '*';
  
  if (pat1 !== '*' && pat1 !== '<all_urls>' && !/^[a-zA-Z*]+:\/\//.test(pat1)) {
    pat1 = `*://${pat1}`;
  }
  if (pat2 !== '*' && pat2 !== '<all_urls>' && !/^[a-zA-Z*]+:\/\//.test(pat2)) {
    pat2 = `*://${pat2}`;
  }

  if (pat1 === '*' || pat2 === '*' || pat1 === '<all_urls>' || pat2 === '<all_urls>') return true;
  if (pat1 === pat2) return true;
  
  const toRegex = (p: string) => {
    const escaped = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`, 'i');
  };
  
  const clean1 = pat1.replace(/\*/g, 'wildcard');
  const clean2 = pat2.replace(/\*/g, 'wildcard');
  
  return toRegex(pat1).test(clean2) || toRegex(pat2).test(clean1);
}

/**
 * Extracts the raw argument string inside @trigger(...) by scanning for the matching closing parenthesis,
 * ignoring parentheses inside string literals.
 */
function extractTriggerArgs(line: string): string | null {
  const triggerIdx = line.indexOf('@trigger');
  if (triggerIdx === -1) return null;

  const startIdx = line.indexOf('(', triggerIdx);
  if (startIdx === -1) return null;

  let depth = 1;
  let inString: string | null = null;
  let isEscaped = false;

  for (let i = startIdx + 1; i < line.length; i++) {
    const char = line[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (inString) {
      if (char === inString) {
        inString = null;
      }
    } else {
      if (char === "'" || char === '"' || char === '`') {
        inString = char;
      } else if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
        if (depth === 0) {
          return line.slice(startIdx + 1, i);
        }
      }
    }
  }

  return null;
}

/**
 * Parses @trigger('hotkey' | 'expander' | 'load', ...) annotations from the script
 */
export function parseTriggers(code: string): ParsedTrigger[] {
  const triggers: ParsedTrigger[] = [];
  const lines = code.split('\n');
  
  let pendingTriggers: Array<
    | { type: 'hotkey'; triggerVal: string; displayLabel: string; urlPattern?: string }
    | { type: 'expander'; triggerVal: string; expansionText: string; urlPattern?: string }
    | { type: 'load'; urlPattern: string }
  > = [];
  
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

    const isTriggerComment = /^\s*(?:\/\/|\/\*|\*)*\s*@trigger/.test(line);
    if (isTriggerComment) {
      const argsRaw = extractTriggerArgs(line);
      if (argsRaw !== null) {
        const args: string[] = [];
        const argRegex = /(['"`])(.*?)\1/g;
        let argMatch;
        while ((argMatch = argRegex.exec(argsRaw)) !== null) {
          args.push(argMatch[2]);
        }
        
        if (args.length > 0) {
          const type = args[0] as 'hotkey' | 'expander' | 'load';
          if (type === 'hotkey') {
            const triggerVal = args[1] || '';
            const urlPattern = args[2] || undefined;
            pendingTriggers.push({
              type,
              triggerVal,
              displayLabel: formatHotkey(triggerVal),
              urlPattern
            });
          } else if (type === 'expander') {
            const triggerVal = args[1] || '';
            const expansionText = args[2] || '';
            const urlPattern = args[3] || undefined;
            pendingTriggers.push({
              type,
              triggerVal,
              expansionText,
              urlPattern
            });
          } else if (type === 'load') {
            const urlPattern = args[1] || '*';
            pendingTriggers.push({
              type,
              urlPattern
            });
          }
        }
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
                urlPattern: pending.urlPattern,
                functionName
              });
            } else if (pending.type === 'expander') {
              triggers.push({
                type: 'expander',
                triggerVal: pending.triggerVal,
                expansionText: pending.expansionText,
                urlPattern: pending.urlPattern,
                functionName
              });
            } else if (pending.type === 'load') {
              triggers.push({
                type: 'load',
                urlPattern: pending.urlPattern,
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
  const lines = code.split('\n');
  const cleanedLines = lines.map(line => {
    const trimmed = line.trim();
    if (/^(?:\/\/|\/\*|\*|\s)*@trigger\b/.test(trimmed)) {
      const triggerIdx = line.indexOf('@trigger');
      const startIdx = line.indexOf('(', triggerIdx);
      if (startIdx !== -1) {
        let depth = 1;
        let inString: string | null = null;
        let isEscaped = false;
        let endIdx = -1;

        for (let i = startIdx + 1; i < line.length; i++) {
          const char = line[i];
          if (isEscaped) {
            isEscaped = false;
            continue;
          }
          if (char === '\\') {
            isEscaped = true;
            continue;
          }
          if (inString) {
            if (char === inString) {
              inString = null;
            }
          } else {
            if (char === "'" || char === '"' || char === '`') {
              inString = char;
            } else if (char === '(') {
              depth++;
            } else if (char === ')') {
              depth--;
              if (depth === 0) {
                endIdx = i;
                break;
              }
            }
          }
        }

        if (endIdx !== -1) {
          const beforeTrigger = line.slice(0, triggerIdx);
          const afterTrigger = line.slice(endIdx + 1);

          const cleanBefore = beforeTrigger.replace(/(?:\/\/|\/\*|\*|\s)+$/, '');
          const cleanAfter = afterTrigger.replace(/^\s*(?:\*\/)?/, '');

          if (cleanBefore.trim() === '' && cleanAfter.trim() === '') {
            return '';
          }
          return cleanBefore + cleanAfter;
        }
      }
    }
    return line;
  });
  return cleanedLines.join('\n');
}

/**
 * Validates parsed triggers for duplicate function names, hotkey collisions, or expander collisions.
 */
export function validateTriggers(triggers: ParsedTrigger[]): string | null {
  const hotkeys: HotkeyTrigger[] = [];
  const expanders: ExpanderTrigger[] = [];

  for (const trigger of triggers) {
    if (trigger.type === 'hotkey') {
      hotkeys.push(trigger as HotkeyTrigger);
    } else if (trigger.type === 'expander') {
      expanders.push(trigger as ExpanderTrigger);
    }
  }

  // Check hotkey collisions
  for (let i = 0; i < hotkeys.length; i++) {
    for (let j = i + 1; j < hotkeys.length; j++) {
      const h1 = hotkeys[i];
      const h2 = hotkeys[j];
      if (h1.triggerVal.toLowerCase().replace(/\s+/g, '') === h2.triggerVal.toLowerCase().replace(/\s+/g, '')) {
        if (urlPatternsOverlap(h1.urlPattern, h2.urlPattern)) {
          return `Hotkey collision: '${h1.triggerVal}' is assigned to multiple functions on overlapping URL patterns.`;
        }
      }
    }
  }

  // Check expander collisions
  for (let i = 0; i < expanders.length; i++) {
    for (let j = i + 1; j < expanders.length; j++) {
      const e1 = expanders[i] as ExpanderTrigger;
      const e2 = expanders[j] as ExpanderTrigger;
      if (e1.triggerVal.toLowerCase().trim() === e2.triggerVal.toLowerCase().trim()) {
        if (urlPatternsOverlap(e1.urlPattern, e2.urlPattern)) {
          return `Text expander collision: '${e1.triggerVal}' is assigned to multiple functions on overlapping URL patterns.`;
        }
      }
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
  const defRegex = /\b(?:function|class|const|let|var|async|public|private|protected|static|get|set)\s+[\w$]+\s*\([^)]*\)\s*(?::\s*[^{]+)?\{|\b(?:click|type|scroll|hover|nativeClick|nativeType|readDom|updateDom|typeActive|press|sleep)\s*\([^)]*\)\s*(?::\s*[^{]+)?\{/g;

  tempCode = tempCode.replace(defRegex, (match) => {
    const placeholder = `${prefix}${placeholders.length}__`;
    placeholders.push(match);
    return placeholder;
  });

  // 2. Prepend 'await ' to commands if they are not preceded by 'await' or definition keywords
  const actionRegex = /\b(function|class|const|let|var)\s+(\w+)\s*\(|\b(await\s+)?(?:(\b(click|type|scroll|hover|nativeClick|nativeType|readDom|updateDom|typeActive|press|sleep)\b)|((?<!\.)[\w$]+(?:\s*\([^)]*\))?(?:\s*\.\s*[\w$]+(?:\s*\([^)]*\))?)*\s*\.\s*(?:click|type|scroll|hover|getText|getValue|getAttribute|isDisabled|isVisible|exists)))\s*\(/g;

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




