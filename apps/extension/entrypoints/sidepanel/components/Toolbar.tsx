import { useAutomationStore } from '../store/useAutomationStore';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2, MousePointerClick, Circle } from 'lucide-react';
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
  const isRecording = useAutomationStore((s) => s.isRecording);
  const startRecording = useAutomationStore((s) => s.startRecording);
  const stopRecording = useAutomationStore((s) => s.stopRecording);

  const handleRun = () => runScript(iframeRef.current);
  const handleStop = () => stopScript(iframeRef.current);
  return (
    <div className="flex items-center gap-2 p-3 border-b border-border bg-card">
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Button 
              onClick={isSelectingElement ? stopSelectingElement : startSelectingElement} 
              disabled={isRunning || isRecording} 
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
          <div>
            <Button 
              onClick={isRecording ? stopRecording : startRecording} 
              disabled={isRunning || isSelectingElement} 
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              className={`cursor-pointer transition-all duration-200 ${
                isRecording 
                  ? 'animate-pulse border-red-500/50 text-red-500 bg-red-500/10 hover:bg-red-500/20' 
                  : ''
              }`}
            >
              <Circle className={`size-3.5 fill-red-500 text-red-500 ${isRecording ? 'animate-pulse' : ''}`} data-icon="inline-start" />
              {isRecording ? 'Stop Rec' : 'Record'}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{isRecording ? 'Stop recording interactions' : 'Record actions from the active page'}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-1 flex">
            <Button 
              onClick={handleRun} 
              disabled={isRunning || isSelectingElement || isRecording} 
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
              disabled={!isRunning || isRecording} 
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
