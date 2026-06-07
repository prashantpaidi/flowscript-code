import { useAutomationStore } from '../store/useAutomationStore';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2, MousePointerClick } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ToolbarProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export function Toolbar({ iframeRef }: ToolbarProps) {
  const isRunning = useAutomationStore((s) => s.isRunning);
  const runScript = useAutomationStore((s) => s.runScript);
  const stopScript = useAutomationStore((s) => s.stopScript);
  const isSelectingElement = useAutomationStore((s) => s.isSelectingElement);
  const startSelectingElement = useAutomationStore((s) => s.startSelectingElement);
  const stopSelectingElement = useAutomationStore((s) => s.stopSelectingElement);

  const handleRun = () => runScript(iframeRef.current);
  const handleStop = () => stopScript(iframeRef.current);
  return (
    <div className="flex items-center gap-2 p-3 border-b border-border bg-card">
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Button 
              onClick={isSelectingElement ? stopSelectingElement : startSelectingElement} 
              disabled={isRunning} 
              variant={isSelectingElement ? "destructive" : "outline"}
              size="sm"
              className={`cursor-pointer transition-all duration-200 ${isSelectingElement ? 'animate-pulse' : ''}`}
            >
              <MousePointerClick className="size-4" data-icon="inline-start" />
              {isSelectingElement ? 'Cancel' : 'Inspect'}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{isSelectingElement ? 'Cancel element inspection' : 'Inspect element on the active page'}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-1 flex">
            <Button 
              onClick={handleRun} 
              disabled={isRunning || isSelectingElement} 
              variant="default"
              size="sm"
              className="w-full cursor-pointer transition-all duration-200"
            >
              {isRunning ? (
                <>
                  <Loader2 className="animate-spin size-4" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="size-4" data-icon="inline-start" />
                  Run Script
                </>
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Execute the automation script on the active page</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Button 
              onClick={handleStop} 
              disabled={!isRunning} 
              variant="destructive"
              size="sm"
              className="cursor-pointer transition-all duration-200"
            >
              <Square className="size-4" data-icon="inline-start" />
              Stop
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Forcefully stop the running script</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
