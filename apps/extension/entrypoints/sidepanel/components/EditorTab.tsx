import React, { useRef } from 'react';
import { useAutomationStore } from '../store/useAutomationStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MousePointerClick, Keyboard, Scroll, Clock, Terminal, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function EditorTab() {
  const code = useAutomationStore((s) => s.code);
  const setCode = useAutomationStore((s) => s.setCode);
  const validationError = useAutomationStore((s) => s.validationError);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const insertSnippet = (snippet: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    const newCode = code.substring(0, start) + snippet + code.substring(end);
    setCode(newCode);

    // Refocus and place cursor after the snippet
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + snippet.length;
      }
    }, 50);
  };

  // Compute line numbers
  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  return (
    <div className="h-full flex flex-col gap-3.5 m-0 animate-in fade-in duration-200">
      {validationError && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="size-4" />
          <AlertTitle className="text-xs font-bold">Trigger Validation Error</AlertTitle>
          <AlertDescription className="text-[10px] mt-0.5 leading-relaxed">
            {validationError}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex-1 flex border border-input rounded-md bg-card focus-within:ring-1 focus-within:ring-ring focus-within:border-ring overflow-hidden min-h-0">
        {/* Line Numbers column */}
        <div 
          ref={lineNumbersRef}
          className="code-editor-lines flex flex-col text-right text-muted-foreground/40 bg-muted/30 select-none border-r border-border pl-3 pr-2 py-3.5 text-[11px] overflow-hidden"
        >
          {lineNumbers.map((num) => (
            <div key={num} className="h-[18px]">{num}</div>
          ))}
        </div>

        {/* Textarea Code Input */}
        <Textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onScroll={handleScroll}
          className="flex-1 h-full code-editor-textarea bg-transparent text-foreground p-3.5 border-none outline-none resize-none focus:ring-0 focus-visible:ring-0 focus-visible:border-transparent text-[11px] font-mono leading-[18px] overflow-y-auto"
          placeholder="// Write code here..."
          spellCheck="false"
        />
      </div>

      {/* Quick Actions Panel */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Quick Actions</span>
        <div className="flex flex-wrap gap-1.5">
          <SnippetButton tooltip="Click on an element matching a CSS selector" onClick={() => insertSnippet("await click('selector');")}>
            <MousePointerClick className="size-3 text-muted-foreground" data-icon="inline-start" />
            click()
          </SnippetButton>
          <SnippetButton tooltip="Type text into a form input or text area" onClick={() => insertSnippet("await type('selector', 'text');")}>
            <Keyboard className="size-3 text-muted-foreground" data-icon="inline-start" />
            type()
          </SnippetButton>
          <SnippetButton tooltip="CDP Native click using browser debugger protocol (bypasses overrides)" onClick={() => insertSnippet("await nativeClick('selector');")}>
            <MousePointerClick className="size-3 text-primary" data-icon="inline-start" />
            nativeClick()
          </SnippetButton>
          <SnippetButton tooltip="CDP Native typing using browser debugger protocol (simulates real keystrokes)" onClick={() => insertSnippet("await nativeType('selector', 'text');")}>
            <Keyboard className="size-3 text-primary" data-icon="inline-start" />
            nativeType()
          </SnippetButton>
          <SnippetButton tooltip="Smooth scroll the page to center an element" onClick={() => insertSnippet("await scroll('selector');")}>
            <Scroll className="size-3 text-muted-foreground" data-icon="inline-start" />
            scroll()
          </SnippetButton>
          <SnippetButton tooltip="Delay script execution by a number of milliseconds" onClick={() => insertSnippet("await sleep(1000);")}>
            <Clock className="size-3 text-muted-foreground" data-icon="inline-start" />
            sleep()
          </SnippetButton>
          <SnippetButton tooltip="Write a debug message to the logs tab console" onClick={() => insertSnippet("console.log('Log message');")}>
            <Terminal className="size-3 text-muted-foreground" data-icon="inline-start" />
            log()
          </SnippetButton>
        </div>
      </div>
    </div>
  );
}

interface SnippetButtonProps {
  onClick: () => void;
  tooltip: string;
  children: React.ReactNode;
}

function SnippetButton({ onClick, tooltip, children }: SnippetButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          onClick={onClick}
          variant="outline" 
          size="xs" 
          className="cursor-pointer text-[10px]"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
