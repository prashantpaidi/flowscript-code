import { 
  autoAwaitCommands, 
  cleanScriptCode, 
  parseTriggers, 
  validateTriggers 
} from '@flowscript/shared';

export interface CompileOptions {
  autoAwait?: boolean;
  stripTriggers?: boolean;
}

export interface CompileResult {
  code: string;
  originalCode: string;
  triggers: ReturnType<typeof parseTriggers>;
  validationError: string | null;
}

export function compileScript(sourceCode: string, options: CompileOptions = {}): CompileResult {
  const { autoAwait = true, stripTriggers = true } = options;

  const triggers = parseTriggers(sourceCode);
  const validationError = validateTriggers(triggers);

  let processed = sourceCode;
  if (stripTriggers) {
    processed = cleanScriptCode(processed);
  }
  if (autoAwait) {
    processed = autoAwaitCommands(processed);
  }

  return {
    code: processed,
    originalCode: sourceCode,
    triggers,
    validationError
  };
}

export { autoAwaitCommands, cleanScriptCode, parseTriggers, validateTriggers };
