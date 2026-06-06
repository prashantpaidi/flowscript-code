import React, { useEffect, useRef } from 'react';
import { useAutomationStore, ConsoleLog } from '../store/useAutomationStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal, Trash2, MousePointerClick, AlertTriangle } from 'lucide-react';

export function ConsoleTab() {
  const logs = useAutomationStore((s) => s.logs);
  const errorMessage = useAutomationStore((s) => s.errorMessage);
  const handleClearConsole = useAutomationStore((s) => s.clearConsole);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Scroll console to bottom on new logs
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Format time helper
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col gap-2.5 m-0 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Console Output</span>
        <Button 
          onClick={handleClearConsole} 
          variant="ghost" 
          size="xs" 
          className="h-6 px-2 cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="size-3 mr-1" />
          Clear
        </Button>
      </div>
      <Separator />

      {/* Logs List Container */}
      <div className="flex-1 border border-border bg-card rounded-lg p-3 overflow-hidden flex flex-col">
        {logs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <Terminal className="size-8 stroke-[1.25] text-muted-foreground/30 mb-2" />
            <p className="text-xs font-medium">Console is empty</p>
            <p className="text-[10px] text-muted-foreground/60 max-w-[200px] mt-0.5">
              Logs and execution steps will appear here when you run a script.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 h-full">
            <div className="flex flex-col gap-2 font-mono text-[11px] leading-5 pr-2">
              {logs.map((log, index) => {
                let colorClass = 'text-muted-foreground';
                let Icon = Terminal;
                
                if (log.type === 'error') {
                  colorClass = 'text-destructive bg-destructive/10 border border-destructive/20 rounded px-1.5 py-0.5';
                  Icon = AlertTriangle;
                } else if (log.type === 'step') {
                  colorClass = 'text-foreground font-semibold bg-secondary border border-border rounded px-1.5 py-0.5';
                  Icon = MousePointerClick;
                }
                
                return (
                  <div key={index} className={`flex items-start gap-2 py-0.5 ${colorClass}`}>
                    <span className="text-[9px] opacity-40 select-none pt-0.5">{formatTime(log.timestamp)}</span>
                    <Icon className="size-3.5 shrink-0 mt-0.5 opacity-60" />
                    <span className="break-all whitespace-pre-wrap flex-1">{log.message}</span>
                  </div>
                );
              })}
              <div ref={consoleBottomRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Error Message Card if failed */}
      {errorMessage && (
        <Alert variant="destructive" className="animate-in slide-in-from-bottom-2 duration-200">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-[10px] font-bold uppercase tracking-wide">Error Details</AlertTitle>
          <AlertDescription className="text-xs font-mono break-all mt-0.5">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
