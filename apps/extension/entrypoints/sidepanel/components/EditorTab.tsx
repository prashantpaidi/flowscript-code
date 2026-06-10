import React, { useRef } from 'react';
import { useAutomationStore } from '../store/useAutomationStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  MousePointerClick, 
  Keyboard, 
  Scroll, 
  Clock, 
  Terminal, 
  AlertCircle, 
  Eye, 
  Edit, 
  Sparkles, 
  X, 
  Loader2,
  Sidebar,
  Zap
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FileTree } from './FileTree';

export function EditorTab() {
  const code = useAutomationStore((s) => s.code);
  const setCode = useAutomationStore((s) => s.setCode);
  const validationError = useAutomationStore((s) => s.validationError);
  const selectedSelector = useAutomationStore((s) => s.selectedSelector);
  const setSelectedSelector = useAutomationStore((s) => s.setSelectedSelector);
  const isSelectingElement = useAutomationStore((s) => s.isSelectingElement);
  const isRecording = useAutomationStore((s) => s.isRecording);
  const fileExplorerOpen = useAutomationStore((s) => s.fileExplorerOpen);
  const setFileExplorerOpen = useAutomationStore((s) => s.setFileExplorerOpen);
  const files = useAutomationStore((s) => s.files);
  const activeFileId = useAutomationStore((s) => s.activeFileId);

  const activeFile = files.find(f => f.id === activeFileId);
  const activeFileName = activeFile ? activeFile.name : '';

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

      {isSelectingElement && (
        <Alert className="py-2 animate-pulse border-sky-500 bg-sky-500/5">
          <Loader2 className="size-4 animate-spin text-sky-500" />
          <AlertTitle className="text-xs font-bold text-sky-500">Inspecting Page...</AlertTitle>
          <AlertDescription className="text-[10px] mt-0.5 leading-relaxed text-sky-500/80">
            Hover over elements on the web page to highlight them. Click any element to select, or press <kbd className="bg-muted px-1 rounded text-[9px] border border-border">Esc</kbd> to cancel.
          </AlertDescription>
        </Alert>
      )}

      {isRecording && (
        <Alert className="py-2.5 animate-pulse border-red-500 bg-red-500/5 flex items-start">
          <span className="relative flex size-2.5 mr-2.5 mt-1 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2.5 bg-red-500"></span>
          </span>
          <div>
            <AlertTitle className="text-xs font-bold text-red-500">Recording Actions...</AlertTitle>
            <AlertDescription className="text-[10px] mt-0.5 leading-relaxed text-red-500/80">
              Interact with the active page. Clicks and text inputs will automatically be appended to your script in real-time.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {selectedSelector && (
        <div className="border border-border rounded-lg bg-card p-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
            <span className="text-xs font-bold flex items-center gap-1.5 text-primary">
              <Sparkles className="size-3.5" />
              Selected DOM Selector
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-5 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedSelector(null)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          
          <div className="flex flex-col gap-2.5">
            {/* Primary Selector Row */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Primary Selector</span>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 text-[11px] font-mono bg-muted/40 p-1.5 rounded border border-border select-all truncate">
                  {selectedSelector.primary}
                </code>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="xs"
                    className="cursor-pointer text-[10px]"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedSelector.primary);
                    }}
                  >
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    className="cursor-pointer text-[10px]"
                    onClick={() => insertSnippet(`'${selectedSelector.primary}'`)}
                  >
                    Insert
                  </Button>
                </div>
              </div>
            </div>

            {/* Fallback Selector Row */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Fallback Selector</span>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 text-[11px] font-mono bg-muted/40 p-1.5 rounded border border-border select-all truncate">
                  {selectedSelector.fallback}
                </code>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="xs"
                    className="cursor-pointer text-[10px]"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedSelector.fallback);
                    }}
                  >
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    className="cursor-pointer text-[10px]"
                    onClick={() => insertSnippet(`'${selectedSelector.fallback}'`)}
                  >
                    Insert
                  </Button>
                </div>
              </div>
            </div>

            {/* Snippet Insertion Quick Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border">
              <span className="text-[9px] uppercase font-bold text-muted-foreground mr-1">Insert as:</span>
              <Button
                variant="secondary"
                size="xs"
                className="cursor-pointer text-[9px] h-6 px-2"
                onClick={() => insertSnippet(`click('${selectedSelector.primary}');`)}
              >
                click()
              </Button>
              <Button
                variant="secondary"
                size="xs"
                className="cursor-pointer text-[9px] h-6 px-2"
                onClick={() => insertSnippet(`const el = query('${selectedSelector.primary}');`)}
              >
                query()
              </Button>
              <Button
                variant="secondary"
                size="xs"
                className="cursor-pointer text-[9px] h-6 px-2"
                onClick={() => insertSnippet(`type('${selectedSelector.primary}', 'text');`)}
              >
                type()
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col border border-input rounded-md bg-card focus-within:ring-1 focus-within:ring-ring focus-within:border-ring overflow-hidden min-h-0">
        {/* Editor Tab Header */}
        <div className="h-8.5 border-b border-border bg-muted/10 flex items-center justify-between px-3 select-none shrink-0">
          <div className="flex items-center gap-2">
            {/* Toggle Sidebar Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFileExplorerOpen(!fileExplorerOpen)}
                  className="size-5.5 text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted/50 rounded"
                >
                  <Sidebar className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-[10px] p-1 px-1.5">
                {fileExplorerOpen ? 'Hide File Explorer' : 'Show File Explorer'}
              </TooltipContent>
            </Tooltip>

            {/* Active File Indicator */}
            {activeFileName && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                <span className="text-muted-foreground/30">/</span>
                <span className="text-foreground font-semibold">{activeFileName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Inner Content Area (FileTree + Code Editor) */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Sidebar File Explorer */}
          {fileExplorerOpen && (
            <div className="w-48 border-r border-border p-3.5 flex flex-col bg-muted/5 shrink-0 min-h-0 overflow-hidden">
              <FileTree />
            </div>
          )}

          {/* Main Editor Component */}
          <div className="flex-1 flex min-w-0 overflow-hidden">
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
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Quick Actions</span>
        <div className="flex flex-wrap gap-1.5">
          <SnippetButton tooltip="Query an element dynamically to chain checks or actions" onClick={() => insertSnippet("const title = query('selector');\nconst text = title.getText();")}>
            <Eye className="size-3 text-muted-foreground" data-icon="inline-start" />
            query()
          </SnippetButton>
          <SnippetButton tooltip="Update properties or attributes of an element" onClick={() => insertSnippet("updateDom('selector', 'style.color', 'red');")}>
            <Edit className="size-3 text-muted-foreground" data-icon="inline-start" />
            updateDom()
          </SnippetButton>
          <SnippetButton tooltip="Click on an element matching a CSS selector" onClick={() => insertSnippet("click('selector');")}>
            <MousePointerClick className="size-3 text-muted-foreground" data-icon="inline-start" />
            click()
          </SnippetButton>
          <SnippetButton tooltip="Type text into a form input or text area" onClick={() => insertSnippet("type('selector', 'text');")}>
            <Keyboard className="size-3 text-muted-foreground" data-icon="inline-start" />
            type()
          </SnippetButton>
          <SnippetButton tooltip="CDP Native click using browser debugger protocol (bypasses overrides)" onClick={() => insertSnippet("nativeClick('selector');")}>
            <MousePointerClick className="size-3 text-primary" data-icon="inline-start" />
            nativeClick()
          </SnippetButton>
          <SnippetButton tooltip="CDP Native typing using browser debugger protocol (simulates real keystrokes)" onClick={() => insertSnippet("nativeType('selector', 'text');")}>
            <Keyboard className="size-3 text-primary" data-icon="inline-start" />
            nativeType()
          </SnippetButton>
          <SnippetButton tooltip="Smooth scroll the page to center an element" onClick={() => insertSnippet("scroll('selector');")}>
            <Scroll className="size-3 text-muted-foreground" data-icon="inline-start" />
            scroll()
          </SnippetButton>
          <SnippetButton tooltip="Delay script execution by a number of milliseconds" onClick={() => insertSnippet("sleep(1000);")}>
            <Clock className="size-3 text-muted-foreground" data-icon="inline-start" />
            sleep()
          </SnippetButton>
          <SnippetButton tooltip="Write a debug message to the logs tab console" onClick={() => insertSnippet("console.log('Log message');")}>
            <Terminal className="size-3 text-muted-foreground" data-icon="inline-start" />
            log()
          </SnippetButton>
          <SnippetButton tooltip="Add a hotkey trigger function (runs on shortcut press)" onClick={() => insertSnippet("\n// @trigger('hotkey', 'ctrl+shift+k')\nasync function onHotkey() {\n  console.log('Hotkey pressed');\n}\n")}>
            <Zap className="size-3 text-blue-500" data-icon="inline-start" />
            trigger(hotkey)
          </SnippetButton>
          <SnippetButton tooltip="Add a text expander trigger function (expands text shortcuts)" onClick={() => insertSnippet("\n// @trigger('expander', ';;shortcut', 'expansion text')\nasync function onExpand() {\n  console.log('Text expanded');\n}\n")}>
            <Zap className="size-3 text-purple-500" data-icon="inline-start" />
            trigger(expander)
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
