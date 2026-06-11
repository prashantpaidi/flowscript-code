import React from 'react';
import { useAutomationStore } from '../store/useAutomationStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Keyboard, Type, Play, Plus, Info, AlertCircle, Globe } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface TriggersTabProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export function TriggersTab({ iframeRef }: TriggersTabProps) {
  const triggers = useAutomationStore((s) => s.triggers);
  const runTriggerFunction = useAutomationStore((s) => s.runTriggerFunction);
  const setCode = useAutomationStore((s) => s.setCode);
  const code = useAutomationStore((s) => s.code);
  const validationError = useAutomationStore((s) => s.validationError);

  const insertSnippet = (snippet: string) => {
    setCode(code + (code.endsWith('\n') ? '' : '\n') + snippet);
  };

  const hotkeyExample = 
    `// @trigger('hotkey', 'ctrl+shift+k')\n` +
    `async function openMenu() {\n` +
    `  console.log('Hotkey pressed: Ctrl + Shift + K');\n` +
    `}`;

  const expanderExample = 
    `// @trigger('expander', ';;tq', 'thank you very much')\n` +
    `async function autoGreet() {\n` +
    `  console.log('Text expanded! ;;tq replaced.');\n` +
    `}`;

  const loadExample = 
    `// @trigger('load', '*://github.com/*')\n` +
    `async function onGithubLoad() {\n` +
    `  console.log('GitHub automation loaded automatically!');\n` +
    `}`;

  if (triggers.length === 0) {
    return (
      <div className="h-full flex flex-col gap-3.5 m-0 overflow-y-auto pr-1 animate-in fade-in duration-200 pb-4">
        <Card className="border-dashed border-2">
          <CardHeader className="p-4 text-center">
            <Zap className="size-8 text-muted-foreground/50 mx-auto mb-2 animate-pulse" />
            <CardTitle className="text-sm font-bold">No Triggers Active</CardTitle>
            <CardDescription className="text-[11px] leading-relaxed">
              Triggers let you run script functions when hotkeys are pressed, text shortcuts are typed, or web pages load.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="p-3.5 pb-2">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
              <Keyboard className="size-3.5 text-blue-500" />
              Hotkey Trigger Example
            </CardTitle>
            <CardDescription className="text-[10px]">
              Execute a function when pressing key combinations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 flex flex-col gap-2">
            <pre className="bg-muted p-2 rounded font-mono text-[9px] overflow-x-auto text-foreground leading-4">
              {hotkeyExample}
            </pre>
            <Button 
              onClick={() => insertSnippet('\n' + hotkeyExample + '\n')}
              variant="outline" 
              size="xs" 
              className="w-full text-[10px] cursor-pointer"
            >
              <Plus className="size-3 mr-1" /> Add Hotkey Trigger to Editor
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3.5 pb-2">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
              <Type className="size-3.5 text-purple-500" />
              Text Expander Example
            </CardTitle>
            <CardDescription className="text-[10px]">
              Type a prefix to auto-expand it and run the script.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 flex flex-col gap-2">
            <pre className="bg-muted p-2 rounded font-mono text-[9px] overflow-x-auto text-foreground leading-4">
              {expanderExample}
            </pre>
            <Button 
              onClick={() => insertSnippet('\n' + expanderExample + '\n')}
              variant="outline" 
              size="xs" 
              className="w-full text-[10px] cursor-pointer"
            >
              <Plus className="size-3 mr-1" /> Add Expander Trigger to Editor
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3.5 pb-2">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
              <Globe className="size-3.5 text-green-500" />
              Page Load Example
            </CardTitle>
            <CardDescription className="text-[10px]">
              Execute a function automatically when a matching URL loads.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 flex flex-col gap-2">
            <pre className="bg-muted p-2 rounded font-mono text-[9px] overflow-x-auto text-foreground leading-4">
              {loadExample}
            </pre>
            <Button 
              onClick={() => insertSnippet('\n' + loadExample + '\n')}
              variant="outline" 
              size="xs" 
              className="w-full text-[10px] cursor-pointer"
            >
              <Plus className="size-3 mr-1" /> Add Page Load Trigger to Editor
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3.5 m-0 overflow-y-auto pr-1 animate-in fade-in duration-200">
      {validationError && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="size-4" />
          <AlertTitle className="text-xs font-bold">Trigger Validation Error</AlertTitle>
          <AlertDescription className="text-[10px] mt-0.5 leading-relaxed">
            {validationError}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
        <Info className="size-3.5 text-primary" />
        <span>Triggers are monitored on all open web pages.</span>
      </div>

      <div className="flex flex-col gap-2">
        {triggers.map((trigger, index) => {
          const isHotkey = trigger.type === 'hotkey';
          const isExpander = trigger.type === 'expander';
          const isLoad = trigger.type === 'load';

          let badgeText = 'Hotkey';
          let badgeStyle = 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/15 border-none';
          if (isExpander) {
            badgeText = 'Text Expander';
            badgeStyle = 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/15 border-none';
          } else if (isLoad) {
            badgeText = 'Page Load';
            badgeStyle = 'bg-green-500/10 text-green-500 hover:bg-green-500/15 border-none';
          }

          return (
            <Card key={index} className="overflow-hidden hover:border-muted-foreground/30 transition-all duration-200">
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Badge 
                      variant="secondary" 
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeStyle}`}
                    >
                      {badgeText}
                    </Badge>
                    <code className="text-xs font-mono font-bold text-foreground truncate max-w-[150px]">
                      {isLoad ? trigger.urlPattern : (isHotkey ? trigger.displayLabel : trigger.triggerVal)}
                    </code>
                  </div>
                  
                  <div className="text-[10px] text-muted-foreground flex flex-col gap-0.5">
                    <div>
                      Calls: <span className="font-mono text-foreground font-semibold">{trigger.functionName}()</span>
                    </div>
                    {isExpander && (
                      <div className="truncate max-w-[200px]">
                        Expands to: <span className="font-semibold text-foreground">"{trigger.expansionText}"</span>
                      </div>
                    )}
                    {!isLoad && trigger.urlPattern && (
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
                        <Globe className="size-3 text-sky-500" />
                        <span className="truncate max-w-[180px]">Active on: <code className="font-semibold text-foreground">{trigger.urlPattern}</code></span>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={() => runTriggerFunction(trigger.functionName, undefined, iframeRef.current)}
                  variant="outline" 
                  size="icon" 
                  className="size-7 rounded-full text-muted-foreground hover:text-primary hover:border-primary shrink-0 transition-all duration-200 cursor-pointer"
                  title="Test Trigger Function"
                >
                  <Play className="size-3 fill-current" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
